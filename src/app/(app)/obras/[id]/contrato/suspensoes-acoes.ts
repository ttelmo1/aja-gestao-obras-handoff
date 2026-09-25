"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dataOpcional, textoOpcional } from "@/lib/campos";
import { autorizar } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { AcaoAuditoria, diff, registrar } from "@/modules/auditoria/registrar";
import { erroNaSuspensao } from "@/modules/obras/suspensao";

export type EstadoSuspensao = { erro?: string; sucesso?: string } | undefined;

const suspensaoSchema = z.object({
  dataInicio: dataOpcional.refine((d) => d !== null, {
    message: "Informe a data de início da suspensão.",
  }),
  dataFim: dataOpcional,
  observacoes: textoOpcional,
});

/**
 * Lança ou altera uma suspensão de prazo — a aba Contrato, pedido de
 * 24/09/2026. A regra (sobreposição, ordem de início, fim depois do início)
 * mora em `modules/obras/suspensao.ts`; aqui só se lê, confere e grava.
 *
 * Mesma permissão de editar o contrato: a suspensão muda o término vigente,
 * que é dado contratual.
 */
export async function salvarSuspensao(
  _estado: EstadoSuspensao,
  formData: FormData,
): Promise<EstadoSuspensao> {
  const permissao = await autorizar("obra", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const analise = suspensaoSchema.safeParse({
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  });
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = { ...analise.data, dataInicio: analise.data.dataInicio! };

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true,
      numeroContrato: true,
      dataOrdemInicio: true,
      suspensoes: { select: { id: true, dataInicio: true, dataFim: true } },
    },
  });
  if (!obra) return { erro: "Obra não encontrada." };

  const antes = id ? obra.suspensoes.find((s) => s.id === id) : null;
  if (id && !antes) return { erro: "Suspensão não encontrada nesta obra." };

  const erro = erroNaSuspensao(
    dados,
    obra.suspensoes.filter((s) => s.id !== id),
    obra.dataOrdemInicio,
  );
  if (erro) return { erro };

  const { ip } = await origemDaRequisicao();
  const ator = { id: permissao.usuario.id, nome: permissao.usuario.nome, ip };

  if (id) {
    const completo = await prisma.suspensaoPrazo.findUniqueOrThrow({ where: { id } });
    const mudancas = diff(completo as unknown as Record<string, unknown>, dados);
    if (Object.keys(mudancas.depois).length === 0) return { sucesso: "Nada mudou." };

    await prisma.$transaction(async (tx) => {
      await tx.suspensaoPrazo.update({ where: { id }, data: dados });
      await registrar(
        {
          ator,
          acao: AcaoAuditoria.ATUALIZAR,
          entidade: "SuspensaoPrazo",
          entidadeId: id,
          obraId,
          descricao: `Suspensão de prazo da obra do contrato ${obra.numeroContrato} alterada.`,
          dadosAntes: mudancas.antes,
          dadosDepois: mudancas.depois,
        },
        tx,
      );
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const criada = await tx.suspensaoPrazo.create({ data: { ...dados, obraId } });
      await registrar(
        {
          ator,
          acao: AcaoAuditoria.CRIAR,
          entidade: "SuspensaoPrazo",
          entidadeId: criada.id,
          obraId,
          descricao: `Suspensão de prazo lançada na obra do contrato ${obra.numeroContrato}.`,
          dadosDepois: {
            dataInicio: criada.dataInicio,
            dataFim: criada.dataFim,
            observacoes: criada.observacoes,
          },
        },
        tx,
      );
    });
  }

  revalidarPrazo(obraId);
  return { sucesso: id ? "Suspensão alterada." : "Suspensão lançada." };
}

export async function excluirSuspensao(
  _estado: EstadoSuspensao,
  formData: FormData,
): Promise<EstadoSuspensao> {
  const permissao = await autorizar("obra", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const suspensao = await prisma.suspensaoPrazo.findUnique({
    where: { id },
    include: { obra: { select: { numeroContrato: true } } },
  });
  if (!suspensao) return { erro: "Suspensão não encontrada." };

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.suspensaoPrazo.delete({ where: { id } });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.EXCLUIR,
        entidade: "SuspensaoPrazo",
        entidadeId: id,
        obraId: suspensao.obraId,
        descricao: `Suspensão de prazo da obra do contrato ${suspensao.obra.numeroContrato} excluída.`,
        dadosAntes: {
          dataInicio: suspensao.dataInicio,
          dataFim: suspensao.dataFim,
          observacoes: suspensao.observacoes,
        },
      },
      tx,
    );
  });

  revalidarPrazo(suspensao.obraId);
  return { sucesso: "Suspensão excluída." };
}

/** A suspensão mexe no prazo e no farol: cabeçalho, abas e painel. */
function revalidarPrazo(obraId: string) {
  revalidatePath(`/obras/${obraId}`, "layout");
  revalidatePath("/obras");
}
