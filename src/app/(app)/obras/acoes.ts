"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PeriodicidadeMedicao, StatusObra } from "@/generated/prisma/enums";
import { dataOpcional, dinheiro, inteiroOpcional, textoOpcional } from "@/lib/campos";
import { autorizar } from "@/lib/guarda";
import { dec } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { AcaoAuditoria, diff, registrar } from "@/modules/auditoria/registrar";
import { proximoCodigo } from "@/modules/obras/codigo";
import { terminoPrevisto } from "@/modules/obras/prazo";
import { etapasIniciais } from "@/modules/tramitacao/fluxo";

export type EstadoObra = { erro?: string; sucesso?: string } | undefined;

const obraSchema = z
  .object({
    codigo: z.string().trim(),
    objeto: z.string().trim().min(5, "Descreva o objeto da obra."),
    numeroContrato: z.string().trim().min(1, "Informe o número do contrato."),
    numeroProcesso: textoOpcional,
    contratanteId: z.string().min(1, "Selecione o contratante."),
    valorContratado: dinheiro,
    dataAssinatura: dataOpcional,
    dataOrdemInicio: dataOpcional,
    prazoDias: inteiroOpcional,
    dataPrevistaTermino: dataOpcional,
    dataTerminoReal: dataOpcional,
    status: z.enum(StatusObra),
    periodicidadeMedicao: z.enum(PeriodicidadeMedicao),
    intervaloMedicaoDias: inteiroOpcional,
    observacoes: textoOpcional,
  })
  .refine(
    (o) => !o.dataOrdemInicio || !o.dataAssinatura || o.dataOrdemInicio >= o.dataAssinatura,
    { message: "A ordem de início não pode ser anterior à assinatura do contrato." },
  )
  .refine((o) => dec(o.valorContratado).gt(0), {
    message: "O valor contratado precisa ser maior que zero.",
  })
  .refine(
    (o) =>
      o.periodicidadeMedicao !== PeriodicidadeMedicao.PERSONALIZADA ||
      o.intervaloMedicaoDias !== null,
    {
      message:
        "Periodicidade personalizada exige o intervalo em dias — sem ele o sistema não sabe quando a próxima medição vence.",
    },
  );

function lerFormulario(formData: FormData) {
  const campos = [
    "codigo",
    "objeto",
    "numeroContrato",
    "numeroProcesso",
    "contratanteId",
    "valorContratado",
    "dataAssinatura",
    "dataOrdemInicio",
    "prazoDias",
    "dataPrevistaTermino",
    "dataTerminoReal",
    "status",
    "periodicidadeMedicao",
    "intervaloMedicaoDias",
    "observacoes",
  ];
  const bruto: Record<string, unknown> = {};
  for (const c of campos) bruto[c] = String(formData.get(c) ?? "");
  return obraSchema.safeParse(bruto);
}

/**
 * O término previsto é derivado da ordem de início mais o prazo em dias.
 * Se o usuário digitou uma data à mão, ela vence — há casos de suspensão de
 * prazo que o sistema ainda não modela e que só existem na cabeça do fiscal.
 */
function resolverTermino(dados: {
  dataPrevistaTermino: Date | null;
  dataOrdemInicio: Date | null;
  prazoDias: number | null;
}): Date | null {
  return (
    dados.dataPrevistaTermino ??
    terminoPrevisto(dados.dataOrdemInicio, dados.prazoDias)
  );
}

export async function salvarObra(
  _estado: EstadoObra,
  formData: FormData,
): Promise<EstadoObra> {
  const id = String(formData.get("id") ?? "");
  const permissao = await autorizar("obra", id ? "editar" : "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const analise = lerFormulario(formData);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { codigo, ...dados } = analise.data;
  const dataPrevistaTermino = resolverTermino(dados);
  const { ip } = await origemDaRequisicao();

  try {
    if (id) {
      const antes = await prisma.obra.findUnique({ where: { id } });
      if (!antes) return { erro: "Obra não encontrada." };

      const novo = {
        ...dados,
        dataPrevistaTermino,
        codigo: codigo || antes.codigo,
      };
      const mudancas = diff(antes as unknown as Record<string, unknown>, novo);
      if (Object.keys(mudancas.depois).length === 0) return { sucesso: "Nada mudou." };

      await prisma.$transaction(async (tx) => {
        await tx.obra.update({ where: { id }, data: novo });
        await registrar(
          {
            ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
            acao: AcaoAuditoria.ATUALIZAR,
            entidade: "Obra",
            entidadeId: id,
            obraId: id,
            descricao: `Obra ${antes.codigo} alterada.`,
            dadosAntes: mudancas.antes,
            dadosDepois: mudancas.depois,
          },
          tx,
        );
      });

      revalidatePath("/obras");
      revalidatePath(`/obras/${id}`);
      return { sucesso: "Alterações salvas." };
    }

    const criada = await prisma.$transaction(async (tx) => {
      const obra = await tx.obra.create({
        data: {
          ...dados,
          dataPrevistaTermino,
          codigo: codigo || (await gerarCodigo(tx)),
          criadoPorId: permissao.usuario.id,
          // As 11 etapas do fluxo fixo nascem com a obra. Criar sob demanda
          // faria a aba Tramitação abrir vazia na primeira visita, como se o
          // fluxo fosse opcional — ele não é; o que varia é uma etapa ser
          // marcada "não se aplica".
          etapas: { create: etapasIniciais() },
        },
      });
      await registrar(
        {
          ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
          acao: AcaoAuditoria.CRIAR,
          entidade: "Obra",
          entidadeId: obra.id,
          obraId: obra.id,
          descricao: `Obra ${obra.codigo} cadastrada: ${obra.objeto}.`,
          dadosDepois: { codigo: obra.codigo, objeto: obra.objeto, status: obra.status },
        },
        tx,
      );
      return obra;
    });

    revalidatePath("/obras");
    redirect(`/obras/${criada.id}?criada=1`);
  } catch (erro) {
    if ((erro as { code?: string }).code === "P2002") {
      return { erro: "Já existe uma obra com esse código." };
    }
    throw erro;
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Sugere o próximo código do ano corrente a partir do que já existe. */
async function gerarCodigo(tx: Tx): Promise<string> {
  const ano = new Date().getFullYear();
  const existentes = await tx.obra.findMany({
    where: { codigo: { startsWith: `OBR-${ano}-` } },
    select: { codigo: true },
  });
  return proximoCodigo(
    ano,
    existentes.map((o: { codigo: string }) => o.codigo),
  );
}

export async function excluirObra(
  _estado: EstadoObra,
  formData: FormData,
): Promise<EstadoObra> {
  const permissao = await autorizar("obra", "excluir");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const obra = await prisma.obra.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      objeto: true,
      _count: {
        select: {
          medicoes: true,
          // Só documento vivo trava: o soft-deleted não aparece em tela
          // nenhuma, então exigir que o usuário o "remova" é beco sem saída.
          documentos: { where: { excluidoEm: null } },
          rerratificacoes: true,
        },
      },
    },
  });
  if (!obra) return { erro: "Obra não encontrada." };

  const dependentes =
    obra._count.medicoes + obra._count.documentos + obra._count.rerratificacoes;
  if (dependentes > 0) {
    return {
      erro: `Esta obra tem ${dependentes} registro(s) vinculados (medições, documentos ou rerratificações). Cancele-a pelo campo de situação em vez de apagar — o histórico do contrato precisa continuar existindo.`,
    };
  }

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.obra.delete({ where: { id } });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.EXCLUIR,
        entidade: "Obra",
        entidadeId: id,
        obraId: id,
        descricao: `Obra ${obra.codigo} excluída: ${obra.objeto}.`,
        dadosAntes: { codigo: obra.codigo, objeto: obra.objeto },
      },
      tx,
    );
  });

  revalidatePath("/obras");
  redirect("/obras");
}
