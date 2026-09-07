"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TipoDocumento } from "@/generated/prisma/enums";
import { textoOpcional } from "@/lib/campos";
import { autorizar } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { apagarArquivo, salvarArquivo } from "@/lib/storage";
import { AcaoAuditoria, registrar } from "@/modules/auditoria/registrar";
import { validarArquivo } from "@/modules/documentos/formatos";

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
 * Upload múltiplo (requisitos.md 1.6). Cada arquivo vira um `Documento`
 * próprio, com o mesmo tipo e a mesma descrição — que é como o mockup
 * apresenta: "é possível anexar mais de um documento à mesma etapa".
 *
 * A gravação no disco vem antes da linha no banco, e um arquivo que grave e
 * depois falhe no banco é removido: arquivo órfão no disco ninguém encontra,
 * mas linha órfã no banco vira botão de download quebrado na tela.
 */
export async function enviarDocumentos(
  _estado: EstadoDocumento,
  formData: FormData,
): Promise<EstadoDocumento> {
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

  const arquivos = formData
    .getAll("arquivos")
    .filter((a): a is File => a instanceof File && a.size > 0);
  if (arquivos.length === 0) return { erro: "Selecione ao menos um arquivo." };

  // Valida todos antes de gravar qualquer um: melhor recusar o lote inteiro
  // do que deixar metade no disco e reclamar da outra metade.
  for (const arquivo of arquivos) {
    const check = validarArquivo(arquivo.name, arquivo.type, arquivo.size);
    if (!check.ok) return { erro: `${arquivo.name}: ${check.motivo}` };
  }

  const { ip } = await origemDaRequisicao();
  const salvos: string[] = [];

  try {
    for (const arquivo of arquivos) {
      const salvo = await salvarArquivo(arquivo, dados.obraId);
      salvos.push(salvo.caminhoRelativo);

      await prisma.$transaction(async (tx) => {
        const documento = await tx.documento.create({
          data: {
            nomeOriginal: arquivo.name,
            nomeArmazenado: salvo.nomeArmazenado,
            caminhoRelativo: salvo.caminhoRelativo,
            mimeType: arquivo.type || "application/octet-stream",
            extensao: salvo.nomeArmazenado.split(".").pop() ?? "",
            tamanhoBytes: BigInt(salvo.tamanhoBytes),
            hashSha256: salvo.hashSha256,
            tipo: dados.tipo,
            descricao: dados.descricao,
            obraId: dados.obraId,
            medicaoId: dados.medicaoId,
            etapaObraId: dados.etapaObraId,
            movimentoId: dados.movimentoId,
            rerratificacaoId: dados.rerratificacaoId,
            enviadoPorId: permissao.usuario.id,
          },
        });
        await registrar(
          {
            ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
            acao: AcaoAuditoria.CRIAR,
            entidade: "Documento",
            entidadeId: documento.id,
            obraId: dados.obraId,
            descricao: `Documento "${arquivo.name}" enviado.`,
            dadosDepois: {
              nome: arquivo.name,
              tipo: dados.tipo,
              tamanhoBytes: salvo.tamanhoBytes,
            },
          },
          tx,
        );
      });
    }
  } catch (erro) {
    await Promise.all(salvos.map((c) => apagarArquivo(c).catch(() => {})));
    throw erro;
  }

  revalidatePath(`/obras/${dados.obraId}`, "layout");
  return {
    sucesso:
      arquivos.length === 1
        ? "Documento enviado."
        : `${arquivos.length} documentos enviados.`,
  };
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
