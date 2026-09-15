"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { StatusRerratificacao } from "@/generated/prisma/enums";
import {
  dataOpcional,
  dinheiro,
  inteiroOpcional,
  percentualObrigatorio,
  textoOpcional,
} from "@/lib/campos";
import { autorizar } from "@/lib/guarda";
import { dec } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { AcaoAuditoria, registrar } from "@/modules/auditoria/registrar";
import { diff } from "@/modules/auditoria/diff";
import {
  impactoDasRerratificacoes,
  proximoNumeroRerratificacao,
} from "@/modules/rerratificacoes/calculos";

export type EstadoRerratificacao = { erro?: string; sucesso?: string } | undefined;

/** Valor do aditivo pode ser negativo: supressão é rerratificação também. */
const rerratificacaoSchema = z
  .object({
    numero: inteiroOpcional,
    data: dataOpcional,
    protocolo: textoOpcional,
    descricao: textoOpcional,
    quantidadeItens: inteiroOpcional,
    percentualAlcancado: percentualObrigatorio,
    valorImpactado: dinheiro,
    prazoAdicionalDias: inteiroOpcional,
    status: z.enum(StatusRerratificacao),
    observacoes: textoOpcional,
  })
  /**
   * Aditivo só de prazo existe e é comum — prorrogação sem custo. O que não
   * existe é rerratificação que não muda nem valor nem prazo: o campo de
   * valor em branco vira zero, e sem esta checagem o formulário aceitaria um
   * registro que não altera coisa alguma do contrato.
   */
  .refine(
    (r) => dec(r.valorImpactado).isZero() === false || r.prazoAdicionalDias !== null,
    {
      message:
        "Informe o valor impactado ou o prazo adicional — uma rerratificação que não muda nem valor nem prazo não altera o contrato.",
    },
  );

const CAMPOS = [
  "numero",
  "data",
  "protocolo",
  "descricao",
  "quantidadeItens",
  "percentualAlcancado",
  "valorImpactado",
  "prazoAdicionalDias",
  "status",
  "observacoes",
];

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Reescreve `Obra.valorAditivado` a partir das rerratificações aprovadas.
 *
 * A coluna é cache — a regra mora em `modules/rerratificacoes/calculos.ts`.
 * Diferente do farol, que envelhece sozinho com o tempo e por isso é sempre
 * recalculado na leitura, o valor aditivado só muda quando alguém mexe numa
 * rerratificação. Recalcular aqui, na mesma transação da escrita, mantém a
 * coluna sempre correta e evita uma consulta a mais em cada cartão do painel.
 */
async function recalcularAditivado(tx: Tx, obraId: string): Promise<void> {
  const rerratificacoes = await tx.rerratificacao.findMany({
    where: { obraId },
    select: { status: true, valorImpactado: true, prazoAdicionalDias: true },
  });
  const impacto = impactoDasRerratificacoes(rerratificacoes);
  await tx.obra.update({
    where: { id: obraId },
    data: { valorAditivado: impacto.valorAprovado.toFixed(2) },
  });
}

export async function salvarRerratificacao(
  _estado: EstadoRerratificacao,
  formData: FormData,
): Promise<EstadoRerratificacao> {
  const id = String(formData.get("id") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const permissao = await autorizar("rerratificacao", id ? "editar" : "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const bruto: Record<string, unknown> = {};
  for (const c of CAMPOS) bruto[c] = String(formData.get(c) ?? "");
  const analise = rerratificacaoSchema.safeParse(bruto);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: { id: true, numeroContrato: true },
  });
  if (!obra) return { erro: "Obra não encontrada." };

  const { numero, ...dados } = analise.data;
  const { ip } = await origemDaRequisicao();

  if (
    dados.status !== StatusRerratificacao.EM_ELABORACAO &&
    dados.protocolo === null
  ) {
    return {
      erro: "A partir de Protocolada, a rerratificação precisa do número do protocolo.",
    };
  }

  try {
    if (id) {
      const antes = await prisma.rerratificacao.findUnique({ where: { id } });
      if (!antes || antes.obraId !== obraId) {
        return { erro: "Rerratificação não encontrada nesta obra." };
      }

      const novo = { ...dados, numero: numero ?? antes.numero };
      const mudancas = diff(antes as unknown as Record<string, unknown>, novo);
      if (Object.keys(mudancas.depois).length === 0) return { sucesso: "Nada mudou." };

      await prisma.$transaction(async (tx) => {
        await tx.rerratificacao.update({ where: { id }, data: novo });
        await recalcularAditivado(tx, obraId);
        await registrar(
          {
            ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
            acao: AcaoAuditoria.ATUALIZAR,
            entidade: "Rerratificacao",
            entidadeId: id,
            obraId,
            descricao: `Rerratificação ${antes.numero} da obra do contrato ${obra.numeroContrato} alterada.`,
            dadosAntes: mudancas.antes,
            dadosDepois: mudancas.depois,
          },
          tx,
        );
      });

      revalidatePath(`/obras/${obraId}`, "layout");
      revalidatePath("/obras");
      return { sucesso: "Alterações salvas." };
    }

    await prisma.$transaction(async (tx) => {
      const existentes = await tx.rerratificacao.findMany({
        where: { obraId },
        select: { numero: true },
      });
      const criada = await tx.rerratificacao.create({
        data: {
          ...dados,
          obraId,
          numero:
            numero ??
            proximoNumeroRerratificacao(
              existentes.map((r: { numero: number }) => r.numero),
            ),
        },
      });
      await recalcularAditivado(tx, obraId);
      await registrar(
        {
          ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
          acao: AcaoAuditoria.CRIAR,
          entidade: "Rerratificacao",
          entidadeId: criada.id,
          obraId,
          descricao: `Rerratificação ${criada.numero} registrada na obra do contrato ${obra.numeroContrato}.`,
          dadosDepois: {
            numero: criada.numero,
            valorImpactado: criada.valorImpactado,
            status: criada.status,
          },
        },
        tx,
      );
    });
  } catch (erro) {
    if ((erro as { code?: string }).code === "P2002") {
      return { erro: "Já existe uma rerratificação com esse número nesta obra." };
    }
    throw erro;
  }

  revalidatePath(`/obras/${obraId}`, "layout");
  revalidatePath("/obras");
  redirect(`/obras/${obraId}/rerratificacoes?salva=1`);
}

export async function excluirRerratificacao(
  _estado: EstadoRerratificacao,
  formData: FormData,
): Promise<EstadoRerratificacao> {
  const permissao = await autorizar("rerratificacao", "excluir");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const rerratificacao = await prisma.rerratificacao.findUnique({
    where: { id },
    select: {
      id: true,
      numero: true,
      obraId: true,
      status: true,
      valorImpactado: true,
      obra: { select: { numeroContrato: true } },
      _count: { select: { documentos: { where: { excluidoEm: null } } } },
    },
  });
  if (!rerratificacao) return { erro: "Rerratificação não encontrada." };

  // Mesma regra da medição: depois de protocolada existe processo no órgão.
  if (rerratificacao.status !== StatusRerratificacao.EM_ELABORACAO) {
    return {
      erro: "Só rerratificação em elaboração pode ser apagada. Uma já protocolada deve ser marcada como Rejeitada — o histórico do processo precisa continuar existindo.",
    };
  }
  if (rerratificacao._count.documentos > 0) {
    return {
      erro: `Esta rerratificação tem ${rerratificacao._count.documentos} documento(s) anexado(s). Remova-os antes de apagá-la.`,
    };
  }

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.rerratificacao.delete({ where: { id } });
    await recalcularAditivado(tx, rerratificacao.obraId);
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.EXCLUIR,
        entidade: "Rerratificacao",
        entidadeId: id,
        obraId: rerratificacao.obraId,
        descricao: `Rerratificação ${rerratificacao.numero} da obra do contrato ${rerratificacao.obra.numeroContrato} excluída.`,
        dadosAntes: {
          numero: rerratificacao.numero,
          valorImpactado: rerratificacao.valorImpactado,
        },
      },
      tx,
    );
  });

  revalidatePath(`/obras/${rerratificacao.obraId}`, "layout");
  revalidatePath("/obras");
  redirect(`/obras/${rerratificacao.obraId}/rerratificacoes`);
}
