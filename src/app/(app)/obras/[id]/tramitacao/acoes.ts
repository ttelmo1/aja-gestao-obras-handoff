"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { StatusEtapa, TipoEtapa } from "@/generated/prisma/enums";
import { dataOpcional, textoOpcional } from "@/lib/campos";
import { autorizar } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { AcaoAuditoria, diff, registrar } from "@/modules/auditoria/registrar";
import { ROTULOS_ETAPA } from "@/modules/tramitacao/fluxo";
import {
  MENSAGENS_ERRO,
  situacaoDaTramitacao,
  validarNovaEntrada,
  validarSaida,
} from "@/modules/tramitacao/movimentos";

export type EstadoTramitacao = { erro?: string; sucesso?: string } | undefined;

/** Data obrigatória — entrada e saída de setor não são opcionais. */
const dataObrigatoria = dataOpcional.refine((d) => d !== null, "Informe a data.");

const entradaSchema = z.object({
  etapaObraId: z.string().min(1),
  medicaoId: textoOpcional,
  setorDestinoId: z.string().min(1, "Selecione o setor."),
  dataEntrada: dataObrigatoria,
  observacoes: textoOpcional,
});

const saidaSchema = z.object({
  movimentoId: z.string().min(1),
  dataSaida: dataObrigatoria,
  observacoes: textoOpcional,
});

const etapaSchema = z.object({
  etapaObraId: z.string().min(1),
  status: z.enum(StatusEtapa),
  dataInicio: dataOpcional,
  dataConclusao: dataOpcional,
  observacoes: textoOpcional,
});

function ler<T extends z.ZodType>(schema: T, formData: FormData, campos: string[]) {
  const bruto: Record<string, unknown> = {};
  for (const c of campos) bruto[c] = String(formData.get(c) ?? "");
  return schema.safeParse(bruto);
}

/** Recalcula o cache de dias da etapa. A verdade continua nos movimentos. */
async function recalcularEtapa(tx: Tx, etapaObraId: string): Promise<void> {
  const movimentos = await tx.tramitacaoMovimento.findMany({
    where: { etapaObraId },
    select: { dataEntrada: true, dataSaida: true },
  });
  const { diasTotais } = situacaoDaTramitacao(movimentos);
  await tx.etapaObra.update({
    where: { id: etapaObraId },
    data: { diasPermanencia: movimentos.length > 0 ? diasTotais : null },
  });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function contexto(etapaObraId: string) {
  return prisma.etapaObra.findUnique({
    where: { id: etapaObraId },
    select: {
      id: true,
      tipo: true,
      status: true,
      obraId: true,
      obra: { select: { codigo: true } },
    },
  });
}

/**
 * Registra a entrada do processo em um setor.
 *
 * Fecha nada e abre um movimento: a saída do setor anterior é um ato
 * separado, porque no mundo real o processo sai de um lugar num dia e chega
 * no outro dias depois — colapsar os dois esconderia justamente o tempo
 * perdido no caminho, que é o que o cliente quer medir.
 */
export async function registrarEntrada(
  _estado: EstadoTramitacao,
  formData: FormData,
): Promise<EstadoTramitacao> {
  const permissao = await autorizar("tramitacao", "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const analise = ler(entradaSchema, formData, [
    "etapaObraId",
    "medicaoId",
    "setorDestinoId",
    "dataEntrada",
    "observacoes",
  ]);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = analise.data;

  const etapa = await contexto(dados.etapaObraId);
  if (!etapa) return { erro: "Etapa não encontrada." };
  if (etapa.status === StatusEtapa.NAO_SE_APLICA) {
    return {
      erro: "Esta etapa está marcada como não se aplica. Reative-a antes de tramitar o processo.",
    };
  }
  // Na etapa de medições o processo é sempre o de uma medição: cada uma tem
  // protocolo próprio e caminha sozinha. Permitir um movimento solto aqui
  // criaria um percurso paralelo sem dono, e a etapa passaria a ter dois
  // "setor atual" ao mesmo tempo.
  if (etapa.tipo === TipoEtapa.MEDICOES && !dados.medicaoId) {
    return {
      erro: "A tramitação da etapa de medições é feita medição a medição, pela aba Medições — cada uma tem protocolo próprio.",
    };
  }
  if (dados.medicaoId) {
    const medicao = await prisma.medicao.findUnique({
      where: { id: dados.medicaoId },
      select: { obraId: true },
    });
    if (!medicao || medicao.obraId !== etapa.obraId) {
      return { erro: "Medição não encontrada nesta obra." };
    }
  }

  // O escopo do "já existe aberto" é a medição quando ela existe, e a etapa
  // quando não — duas medições diferentes podem estar em setores diferentes
  // ao mesmo tempo, e isso é normal.
  const irmaos = await prisma.tramitacaoMovimento.findMany({
    where: dados.medicaoId
      ? { medicaoId: dados.medicaoId }
      : { etapaObraId: dados.etapaObraId, medicaoId: null },
    select: { dataEntrada: true, dataSaida: true },
  });

  const erro = validarNovaEntrada(irmaos, dados.dataEntrada);
  if (erro) return { erro: MENSAGENS_ERRO[erro] };

  const anterior = irmaos.length > 0 ? await setorAnterior(dados) : null;
  const { ip } = await origemDaRequisicao();

  await prisma.$transaction(async (tx) => {
    const movimento = await tx.tramitacaoMovimento.create({
      data: {
        etapaObraId: dados.etapaObraId,
        medicaoId: dados.medicaoId,
        setorOrigemId: anterior,
        setorDestinoId: dados.setorDestinoId,
        dataEntrada: dados.dataEntrada,
        observacoes: dados.observacoes,
        registradoPorId: permissao.usuario.id,
      },
      include: { setorDestino: { select: { nome: true } } },
    });

    // A primeira entrada tira a etapa de Pendente: o processo andou.
    if (etapa.status === StatusEtapa.PENDENTE) {
      await tx.etapaObra.update({
        where: { id: etapa.id },
        data: { status: StatusEtapa.EM_ANDAMENTO, dataInicio: dados.dataEntrada },
      });
    }
    await recalcularEtapa(tx, etapa.id);

    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.CRIAR,
        entidade: "TramitacaoMovimento",
        entidadeId: movimento.id,
        obraId: etapa.obraId,
        descricao: `Processo de ${ROTULOS_ETAPA[etapa.tipo]} da obra ${etapa.obra.codigo} entrou em ${movimento.setorDestino.nome}.`,
        dadosDepois: {
          setor: movimento.setorDestino.nome,
          dataEntrada: movimento.dataEntrada,
        },
      },
      tx,
    );
  });

  revalidatePath("/obras");
  revalidatePath(`/obras/${etapa.obraId}/tramitacao`);
  revalidatePath(`/obras/${etapa.obraId}/medicoes`);
  return { sucesso: "Entrada registrada." };
}

/** Setor de onde o processo veio — o destino do movimento fechado mais recente. */
async function setorAnterior(dados: {
  etapaObraId: string;
  medicaoId: string | null;
}): Promise<string | null> {
  const ultimo = await prisma.tramitacaoMovimento.findFirst({
    where: dados.medicaoId
      ? { medicaoId: dados.medicaoId }
      : { etapaObraId: dados.etapaObraId, medicaoId: null },
    orderBy: { dataEntrada: "desc" },
    select: { setorDestinoId: true },
  });
  return ultimo?.setorDestinoId ?? null;
}

export async function registrarSaida(
  _estado: EstadoTramitacao,
  formData: FormData,
): Promise<EstadoTramitacao> {
  const permissao = await autorizar("tramitacao", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const analise = ler(saidaSchema, formData, [
    "movimentoId",
    "dataSaida",
    "observacoes",
  ]);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = analise.data;

  const movimento = await prisma.tramitacaoMovimento.findUnique({
    where: { id: dados.movimentoId },
    include: {
      setorDestino: { select: { nome: true } },
      etapaObra: {
        select: { id: true, tipo: true, obraId: true, obra: { select: { codigo: true } } },
      },
    },
  });
  if (!movimento) return { erro: "Movimento não encontrado." };
  if (movimento.dataSaida) return { erro: "Este movimento já tem saída registrada." };

  const erro = validarSaida(movimento, dados.dataSaida);
  if (erro) return { erro: MENSAGENS_ERRO[erro] };

  const { ip } = await origemDaRequisicao();
  const dias = Math.max(
    0,
    Math.round(
      (Date.UTC(
        dados.dataSaida.getFullYear(),
        dados.dataSaida.getMonth(),
        dados.dataSaida.getDate(),
      ) -
        Date.UTC(
          movimento.dataEntrada.getFullYear(),
          movimento.dataEntrada.getMonth(),
          movimento.dataEntrada.getDate(),
        )) /
        86_400_000,
    ),
  );

  await prisma.$transaction(async (tx) => {
    await tx.tramitacaoMovimento.update({
      where: { id: movimento.id },
      data: {
        dataSaida: dados.dataSaida,
        diasPermanencia: dias,
        observacoes: dados.observacoes ?? movimento.observacoes,
      },
    });
    await recalcularEtapa(tx, movimento.etapaObra.id);

    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "TramitacaoMovimento",
        entidadeId: movimento.id,
        obraId: movimento.etapaObra.obraId,
        descricao: `Processo de ${ROTULOS_ETAPA[movimento.etapaObra.tipo]} da obra ${movimento.etapaObra.obra.codigo} saiu de ${movimento.setorDestino.nome} após ${dias} dia(s).`,
        dadosDepois: { dataSaida: dados.dataSaida, diasPermanencia: dias },
      },
      tx,
    );
  });

  revalidatePath("/obras");
  revalidatePath(`/obras/${movimento.etapaObra.obraId}/tramitacao`);
  revalidatePath(`/obras/${movimento.etapaObra.obraId}/medicoes`);
  return { sucesso: `Saída registrada — ${dias} dia(s) no setor.` };
}

/**
 * Situação e datas da etapa. É aqui que a etapa vira "não se aplica" — a
 * única flexibilidade que o fluxo fixo admite (requisitos.md 1.5).
 */
export async function salvarEtapa(
  _estado: EstadoTramitacao,
  formData: FormData,
): Promise<EstadoTramitacao> {
  const permissao = await autorizar("tramitacao", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const analise = ler(etapaSchema, formData, [
    "etapaObraId",
    "status",
    "dataInicio",
    "dataConclusao",
    "observacoes",
  ]);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { etapaObraId, ...dados } = analise.data;

  const antes = await prisma.etapaObra.findUnique({
    where: { id: etapaObraId },
    include: {
      obra: { select: { codigo: true } },
      _count: { select: { movimentos: true } },
    },
  });
  if (!antes) return { erro: "Etapa não encontrada." };

  if (dados.status === StatusEtapa.NAO_SE_APLICA && antes._count.movimentos > 0) {
    return {
      erro: `Esta etapa já tem ${antes._count.movimentos} movimento(s) de tramitação registrados. Apague-os antes de marcá-la como não se aplica — senão o histórico diria que o processo passou por uma etapa que nunca existiu.`,
    };
  }
  if (
    dados.status === StatusEtapa.CONCLUIDA &&
    dados.dataConclusao === null
  ) {
    return { erro: "Etapa concluída precisa da data de conclusão." };
  }
  if (
    dados.dataInicio &&
    dados.dataConclusao &&
    dados.dataConclusao < dados.dataInicio
  ) {
    return { erro: "A conclusão não pode ser anterior ao início da etapa." };
  }

  const mudancas = diff(antes as unknown as Record<string, unknown>, dados);
  if (Object.keys(mudancas.depois).length === 0) return { sucesso: "Nada mudou." };

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.etapaObra.update({ where: { id: etapaObraId }, data: dados });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "EtapaObra",
        entidadeId: etapaObraId,
        obraId: antes.obraId,
        descricao: `Etapa ${ROTULOS_ETAPA[antes.tipo]} da obra ${antes.obra.codigo} atualizada.`,
        dadosAntes: mudancas.antes,
        dadosDepois: mudancas.depois,
      },
      tx,
    );
  });

  revalidatePath("/obras");
  revalidatePath(`/obras/${antes.obraId}/tramitacao`);
  return { sucesso: "Etapa atualizada." };
}

export async function excluirMovimento(
  _estado: EstadoTramitacao,
  formData: FormData,
): Promise<EstadoTramitacao> {
  const permissao = await autorizar("tramitacao", "excluir");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("movimentoId") ?? "");
  const movimento = await prisma.tramitacaoMovimento.findUnique({
    where: { id },
    include: {
      setorDestino: { select: { nome: true } },
      etapaObra: {
        select: { id: true, tipo: true, obraId: true, obra: { select: { codigo: true } } },
      },
      _count: { select: { documentos: { where: { excluidoEm: null } } } },
    },
  });
  if (!movimento) return { erro: "Movimento não encontrado." };

  // `Documento.movimento` é `onDelete: Cascade` no schema, então apagar o
  // movimento apagaria de verdade os anexos daquele passo — contra o desenho
  // de exclusão lógica do documento, e deixando o arquivo órfão em disco.
  // Mesma trava de `excluirMedicao` e `excluirObra`: barra antes de chegar lá.
  if (movimento._count.documentos > 0) {
    return {
      erro: `Este movimento tem ${movimento._count.documentos} documento(s) anexado(s). Remova-os antes de apagá-lo.`,
    };
  }

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.tramitacaoMovimento.delete({ where: { id } });
    await recalcularEtapa(tx, movimento.etapaObra.id);
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.EXCLUIR,
        entidade: "TramitacaoMovimento",
        entidadeId: id,
        obraId: movimento.etapaObra.obraId,
        descricao: `Movimento em ${movimento.setorDestino.nome} (${ROTULOS_ETAPA[movimento.etapaObra.tipo]}) da obra ${movimento.etapaObra.obra.codigo} excluído.`,
        dadosAntes: {
          setor: movimento.setorDestino.nome,
          dataEntrada: movimento.dataEntrada,
          dataSaida: movimento.dataSaida,
        },
      },
      tx,
    );
  });

  revalidatePath("/obras");
  revalidatePath(`/obras/${movimento.etapaObra.obraId}/tramitacao`);
  revalidatePath(`/obras/${movimento.etapaObra.obraId}/medicoes`);
  return { sucesso: "Movimento excluído." };
}
