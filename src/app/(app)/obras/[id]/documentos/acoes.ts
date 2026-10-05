"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TipoDocumento } from "@/generated/prisma/enums";
import { textoOpcional } from "@/lib/campos";
import { autorizar } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import {
  apagarArquivo,
  destinoDoEnvio,
  infoArquivo,
  novoCaminho,
} from "@/lib/storage";
import { AcaoAuditoria, registrar } from "@/modules/auditoria/registrar";
import { aceitaMaisDeUm } from "@/modules/documentos/acervo";
import {
  MAXIMO_ARQUIVOS_POR_ENVIO,
  VALIDADE_ENVIO_MS,
  lerArquivosDeclarados,
  recusaDaConfirmacao,
} from "@/modules/documentos/envio";
import { validarArquivo } from "@/modules/documentos/formatos";
import { ROTULOS_TIPO_DOCUMENTO } from "@/modules/documentos/rotulos";

export type EstadoDocumento = { erro?: string; sucesso?: string } | undefined;

const envioSchema = z.object({
  obraId: z.string().min(1),
  tipo: z.enum(TipoDocumento),
  descricao: textoOpcional,
  medicaoId: textoOpcional,
  etapaObraId: textoOpcional,
  movimentoId: textoOpcional,
  rerratificacaoId: textoOpcional,
});

type Vinculos = z.infer<typeof envioSchema>;

/**
 * Confere que cada vínculo recebido pertence mesmo a esta obra.
 *
 * O formulário manda os ids em campos ocultos, e campo oculto é entrada de
 * usuário como qualquer outra: sem esta checagem, trocar o valor no HTML
 * anexaria um documento à medição de outra obra — inclusive de uma obra que
 * o usuário não pode ver.
 */
async function vinculosValidos(v: Vinculos): Promise<string | null> {
  if (v.medicaoId) {
    const m = await prisma.medicao.findUnique({
      where: { id: v.medicaoId },
      select: { obraId: true },
    });
    if (m?.obraId !== v.obraId) return "Medição não pertence a esta obra.";
  }
  if (v.etapaObraId) {
    const e = await prisma.etapaObra.findUnique({
      where: { id: v.etapaObraId },
      select: { obraId: true },
    });
    if (e?.obraId !== v.obraId) return "Etapa não pertence a esta obra.";
  }
  if (v.movimentoId) {
    const mov = await prisma.tramitacaoMovimento.findUnique({
      where: { id: v.movimentoId },
      select: { etapaObra: { select: { obraId: true } } },
    });
    if (mov?.etapaObra.obraId !== v.obraId) {
      return "Movimento não pertence a esta obra.";
    }
  }
  if (v.rerratificacaoId) {
    const r = await prisma.rerratificacao.findUnique({
      where: { id: v.rerratificacaoId },
      select: { obraId: true },
    });
    if (r?.obraId !== v.obraId) return "Rerratificação não pertence a esta obra.";
  }
  return null;
}

/**
 * Um tipo, um arquivo — no contrato.
 *
 * A aba Documentos virou uma lista de tipos esperados, com uma linha cada:
 * dois arquivos no mesmo tipo desdobrariam a linha e desfariam a leitura de
 * "o que falta". Quem precisa de um segundo arquivo do mesmo assunto usa
 * "Outro", o único tipo que aceita repetição.
 *
 * Vale só para o que é do contrato: medição, rerratificação e tramitação
 * continuam aceitando quantos arquivos precisarem, porque lá a lista é do
 * anexo e não do tipo.
 */
async function recusaPorRepeticao(
  v: Vinculos,
  quantosArquivos: number,
): Promise<string | null> {
  const doContrato =
    !v.medicaoId && !v.movimentoId && !v.rerratificacaoId && !v.etapaObraId;
  if (!doContrato || aceitaMaisDeUm(v.tipo)) return null;

  const rotulo = ROTULOS_TIPO_DOCUMENTO[v.tipo];
  if (quantosArquivos > 1) {
    return `“${rotulo}” aceita um arquivo só. Envie os demais como “${ROTULOS_TIPO_DOCUMENTO[TipoDocumento.OUTRO]}”.`;
  }

  const jaTem = await prisma.documento.findFirst({
    where: {
      obraId: v.obraId,
      tipo: v.tipo,
      excluidoEm: null,
      medicaoId: null,
      movimentoId: null,
      rerratificacaoId: null,
      etapaObraId: null,
    },
    select: { nomeOriginal: true },
  });
  if (jaTem) {
    return `Já existe um documento do tipo “${rotulo}” neste contrato (${jaTem.nomeOriginal}). Exclua o atual ou envie este como “${ROTULOS_TIPO_DOCUMENTO[TipoDocumento.OUTRO]}”.`;
  }
  return null;
}

export type EnvioPreparado =
  | { erro: string }
  | { envios: { id: string; url: string; cabecalhos: Record<string, string> }[] };

/**
 * Primeiro passo do upload (requisitos.md 1.6, etapa 15): autoriza o envio e
 * diz à tela para onde mandar cada arquivo.
 *
 * O arquivo não passa por aqui. A plataforma corta requisições acima de
 * ~4,5 MB, e os documentos chegam a 300 MB — então a tela manda só nome,
 * tamanho e tipo, e todas as checagens que antes olhavam o arquivo (sessão,
 * permissão, vínculos, formato, repetição de tipo) acontecem sobre essa
 * declaração. O que foi autorizado fica gravado em `EnvioPendente`, e a
 * confirmação confere no armazenamento se o que chegou bate com ele.
 *
 * Valida todos antes de autorizar qualquer um: melhor recusar o lote inteiro
 * do que deixar metade subir e reclamar da outra metade.
 */
export async function prepararEnvio(formData: FormData): Promise<EnvioPreparado> {
  const permissao = await autorizar("documento", "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const bruto: Record<string, unknown> = {};
  for (const c of [
    "obraId",
    "tipo",
    "descricao",
    "medicaoId",
    "etapaObraId",
    "movimentoId",
    "rerratificacaoId",
  ]) {
    bruto[c] = String(formData.get(c) ?? "");
  }
  const analise = envioSchema.safeParse(bruto);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = analise.data;

  const problema = await vinculosValidos(dados);
  if (problema) return { erro: problema };

  const declarados = lerArquivosDeclarados(String(formData.get("arquivos") ?? ""));
  if (!declarados.ok) return { erro: declarados.erro };
  const arquivos = declarados.arquivos;

  const recusa = await recusaPorRepeticao(dados, arquivos.length);
  if (recusa) return { erro: recusa };

  const validados: { nome: string; tamanho: number; mime: string }[] = [];
  for (const a of arquivos) {
    const check = validarArquivo(a.nome, a.tipo, a.tamanho);
    if (!check.ok) return { erro: `${a.nome}: ${check.motivo}` };
    validados.push({ nome: a.nome, tamanho: a.tamanho, mime: check.mimeNormalizado });
  }

  const expiraEm = new Date(Date.now() + VALIDADE_ENVIO_MS);
  const envios = [];
  for (const a of validados) {
    const { nomeArmazenado, caminhoRelativo } = novoCaminho(dados.obraId, a.nome);
    const pendente = await prisma.envioPendente.create({
      data: {
        caminhoRelativo,
        nomeArmazenado,
        nomeOriginal: a.nome,
        mimeType: a.mime,
        tamanhoBytes: BigInt(a.tamanho),
        tipo: dados.tipo,
        descricao: dados.descricao,
        obraId: dados.obraId,
        medicaoId: dados.medicaoId,
        etapaObraId: dados.etapaObraId,
        movimentoId: dados.movimentoId,
        rerratificacaoId: dados.rerratificacaoId,
        usuarioId: permissao.usuario.id,
        expiraEm,
      },
      select: { id: true },
    });
    const destino = await destinoDoEnvio(pendente.id, caminhoRelativo, a.tamanho, a.mime);
    envios.push({ id: pendente.id, ...destino });
  }

  return { envios };
}

const idsSchema = z.array(z.string().min(1)).min(1).max(MAXIMO_ARQUIVOS_POR_ENVIO);

/** Apaga os arquivos que chegaram e as autorizações. Nunca lança. */
async function descartarEnvios(
  pendentes: { id: string; caminhoRelativo: string }[],
): Promise<void> {
  await Promise.allSettled(pendentes.map((p) => apagarArquivo(p.caminhoRelativo)));
  await prisma.envioPendente
    .deleteMany({ where: { id: { in: pendentes.map((p) => p.id) } } })
    .catch(() => {});
}

/**
 * Último passo do upload: confere no armazenamento o que chegou e só então
 * cria os `Documento`. Cada arquivo vira um documento próprio, com o mesmo
 * tipo e a mesma descrição — que é como o mockup apresenta: "é possível
 * anexar mais de um documento à mesma etapa".
 *
 * Do navegador só se aceita o `id` de cada envio; obra, vínculos, tipo e
 * tamanho vêm da autorização gravada. Se qualquer arquivo do lote não
 * conferir, o lote inteiro é descartado — documento pela metade numa medição
 * é pior que pedir o envio de novo.
 */
export async function confirmarEnvio(
  obraId: string,
  ids: string[],
): Promise<EstadoDocumento> {
  const permissao = await autorizar("documento", "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const analise = idsSchema.safeParse(ids);
  if (!analise.success) return { erro: "Envio inválido." };

  const pendentes = await prisma.envioPendente.findMany({
    where: { id: { in: analise.data } },
  });
  if (pendentes.length !== new Set(analise.data).size) {
    return { erro: "Envio não encontrado. Envie o arquivo de novo." };
  }

  const quem = { usuarioId: permissao.usuario.id, obraId };
  const agora = new Date();
  for (const p of pendentes) {
    const motivo = recusaDaConfirmacao(p, quem, await infoArquivo(p.caminhoRelativo), agora);
    if (motivo) {
      // Envio de outra pessoa não é descartado por quem não é dono dele.
      if (p.usuarioId === quem.usuarioId) await descartarEnvios(pendentes);
      return { erro: motivo };
    }
  }

  // De novo, agora que os arquivos chegaram: dois envios do mesmo tipo
  // autorizados em paralelo passariam os dois pela checagem do preparo.
  const primeiro = pendentes[0];
  const recusa = await recusaPorRepeticao(
    {
      obraId,
      tipo: primeiro.tipo,
      descricao: primeiro.descricao,
      medicaoId: primeiro.medicaoId,
      etapaObraId: primeiro.etapaObraId,
      movimentoId: primeiro.movimentoId,
      rerratificacaoId: primeiro.rerratificacaoId,
    },
    pendentes.length,
  );
  if (recusa) {
    await descartarEnvios(pendentes);
    return { erro: recusa };
  }

  const { ip } = await origemDaRequisicao();
  try {
    await prisma.$transaction(async (tx) => {
      for (const p of pendentes) {
        const documento = await tx.documento.create({
          data: {
            nomeOriginal: p.nomeOriginal,
            nomeArmazenado: p.nomeArmazenado,
            caminhoRelativo: p.caminhoRelativo,
            mimeType: p.mimeType,
            extensao: p.nomeArmazenado.split(".").pop() ?? "",
            tamanhoBytes: p.tamanhoBytes,
            hashSha256: p.hashSha256,
            tipo: p.tipo,
            descricao: p.descricao,
            obraId: p.obraId,
            medicaoId: p.medicaoId,
            etapaObraId: p.etapaObraId,
            movimentoId: p.movimentoId,
            rerratificacaoId: p.rerratificacaoId,
            enviadoPorId: permissao.usuario.id,
          },
        });
        await registrar(
          {
            ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
            acao: AcaoAuditoria.CRIAR,
            entidade: "Documento",
            entidadeId: documento.id,
            obraId: p.obraId,
            descricao: `Documento "${p.nomeOriginal}" enviado.`,
            dadosDepois: {
              nome: p.nomeOriginal,
              tipo: p.tipo,
              tamanhoBytes: Number(p.tamanhoBytes),
            },
          },
          tx,
        );
      }
      await tx.envioPendente.deleteMany({
        where: { id: { in: pendentes.map((p) => p.id) } },
      });
    });
  } catch (erro) {
    // Arquivo sem linha ninguém encontra; linha sem arquivo vira botão de
    // download quebrado. Se a transação falhou, os arquivos saem.
    await descartarEnvios(pendentes);
    throw erro;
  }

  revalidatePath(`/obras/${obraId}`, "layout");
  return {
    sucesso:
      pendentes.length === 1
        ? "Documento enviado."
        : `${pendentes.length} documentos enviados.`,
  };
}

/**
 * A tela desistiu no meio (falha de rede, erro do armazenamento): apaga o que
 * chegou. Se nem isto rodar, a limpeza diária apaga quando a autorização
 * vencer.
 */
export async function cancelarEnvio(ids: string[]): Promise<void> {
  const usuario = await autorizar("documento", "criar");
  if (!usuario.ok) return;
  const analise = idsSchema.safeParse(ids);
  if (!analise.success) return;

  const pendentes = await prisma.envioPendente.findMany({
    where: { id: { in: analise.data }, usuarioId: usuario.usuario.id },
    select: { id: true, caminhoRelativo: true },
  });
  await descartarEnvios(pendentes);
}

/**
 * Exclusão lógica (ponto #8 da reunião): o arquivo some da tela, mas o
 * registro e o arquivo permanecem. A auditoria precisa poder mostrar o que
 * foi enviado, e apontar para um arquivo que não existe mais não serve.
 */
export async function excluirDocumento(
  _estado: EstadoDocumento,
  formData: FormData,
): Promise<EstadoDocumento> {
  const permissao = await autorizar("documento", "excluir");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("documentoId") ?? "");
  const documento = await prisma.documento.findUnique({
    where: { id },
    select: { id: true, nomeOriginal: true, obraId: true, excluidoEm: true },
  });
  if (!documento) return { erro: "Documento não encontrado." };
  if (documento.excluidoEm) return { erro: "Documento já excluído." };

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.documento.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.EXCLUIR,
        entidade: "Documento",
        entidadeId: id,
        obraId: documento.obraId,
        descricao: `Documento "${documento.nomeOriginal}" excluído.`,
        dadosAntes: { nome: documento.nomeOriginal },
      },
      tx,
    );
  });

  if (documento.obraId) revalidatePath(`/obras/${documento.obraId}`, "layout");
  return { sucesso: "Documento excluído." };
}

const dispensaSchema = z.object({
  obraId: z.string().min(1),
  medicaoId: textoOpcional,
  tipo: z.enum(TipoDocumento),
  motivo: textoOpcional,
});

/**
 * Marca um tipo como "não se aplica" nesta obra — ou nesta medição.
 *
 * A lista de conferência cobra o que falta em vermelho, e nem todo contrato
 * entrega tudo: sem esta marcação, a obra sem garantia carregaria uma linha
 * vermelha para sempre e o vermelho deixaria de significar alguma coisa. Na
 * tela o tipo fica cinza e desce para o fim da lista.
 */
export async function dispensarDocumento(
  _estado: EstadoDocumento,
  formData: FormData,
): Promise<EstadoDocumento> {
  const permissao = await autorizar("documento", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const bruto: Record<string, unknown> = {};
  for (const c of ["obraId", "medicaoId", "tipo", "motivo"]) {
    bruto[c] = String(formData.get(c) ?? "");
  }
  const analise = dispensaSchema.safeParse(bruto);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { obraId, medicaoId, tipo, motivo } = analise.data;

  // Medição de outra obra não pode ser dispensada por aqui: o id vem de campo
  // oculto, que é entrada de usuário como qualquer outra.
  if (medicaoId) {
    const m = await prisma.medicao.findUnique({
      where: { id: medicaoId },
      select: { obraId: true },
    });
    if (m?.obraId !== obraId) return { erro: "Medição não pertence a esta obra." };
  }

  const jaExiste = await prisma.documentoDispensado.findFirst({
    where: { obraId, medicaoId: medicaoId ?? null, tipo },
    select: { id: true },
  });
  if (jaExiste) return { sucesso: "Este documento já estava dispensado." };

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    const dispensa = await tx.documentoDispensado.create({
      data: {
        obraId,
        medicaoId: medicaoId ?? null,
        tipo,
        motivo,
        marcadoPorId: permissao.usuario.id,
      },
    });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "DocumentoDispensado",
        entidadeId: dispensa.id,
        obraId,
        descricao: `Documento "${ROTULOS_TIPO_DOCUMENTO[tipo]}" marcado como não se aplica${
          medicaoId ? " nesta medição" : ""
        }.`,
        dadosDepois: { tipo, medicaoId: medicaoId ?? null, motivo },
      },
      tx,
    );
  });

  revalidatePath(`/obras/${obraId}`, "layout");
  return { sucesso: "Documento marcado como não se aplica." };
}

/** Desfaz a dispensa: o tipo volta a ser cobrado na lista. */
export async function exigirDocumento(
  _estado: EstadoDocumento,
  formData: FormData,
): Promise<EstadoDocumento> {
  const permissao = await autorizar("documento", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const analise = dispensaSchema.safeParse({
    obraId: String(formData.get("obraId") ?? ""),
    medicaoId: String(formData.get("medicaoId") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    motivo: "",
  });
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { obraId, medicaoId, tipo } = analise.data;

  const dispensa = await prisma.documentoDispensado.findFirst({
    where: { obraId, medicaoId: medicaoId ?? null, tipo },
    select: { id: true, motivo: true },
  });
  if (!dispensa) return { erro: "Este documento já era exigido." };

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.documentoDispensado.delete({ where: { id: dispensa.id } });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "DocumentoDispensado",
        entidadeId: dispensa.id,
        obraId,
        descricao: `Documento "${ROTULOS_TIPO_DOCUMENTO[tipo]}" voltou a ser exigido${
          medicaoId ? " nesta medição" : ""
        }.`,
        dadosAntes: { tipo, medicaoId: medicaoId ?? null, motivo: dispensa.motivo },
      },
      tx,
    );
  });

  revalidatePath(`/obras/${obraId}`, "layout");
  return { sucesso: "Documento voltou a ser exigido." };
}
