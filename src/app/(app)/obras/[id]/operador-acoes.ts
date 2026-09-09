"use server";

import { revalidatePath } from "next/cache";

import { autorizar } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { AcaoAuditoria, registrar } from "@/modules/auditoria/registrar";
import {
  MAX_OBSERVACAO_OPERADOR,
  podeAssumir,
  podeLiberar,
  situacaoDoOperador,
} from "@/modules/obras/operador";

export type EstadoOperador = { erro?: string; sucesso?: string } | undefined;

/**
 * Assumir e liberar a obra (requisitos.md 1.2).
 *
 * A permissão exigida é `obra:ver`, não `obra:editar`, de propósito: quem
 * assume é o operacional, que por matriz só lê a obra — e assumir não altera
 * dado nenhum do contrato, só diz quem está cuidando dele agora. Amarrar isso
 * a `editar` deixaria justamente as três pessoas a quem o campo serve de fora.
 * A matriz linha a linha ainda é ponto aberto com o cliente (ponto #3), então
 * esta escolha está registrada lá para ser confirmada.
 */
async function carregar(obraId: string) {
  return prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true,
      codigo: true,
      operadorId: true,
      operadorAssumidoEm: true,
      operadorLiberadoEm: true,
      operadorObservacao: true,
      operador: { select: { nome: true } },
    },
  });
}

type ObraDoOperador = NonNullable<Awaited<ReturnType<typeof carregar>>>;

function atribuicaoDe(o: ObraDoOperador) {
  return {
    operadorId: o.operadorId,
    operadorNome: o.operador?.nome ?? null,
    operadorAssumidoEm: o.operadorAssumidoEm,
    operadorLiberadoEm: o.operadorLiberadoEm,
    operadorObservacao: o.operadorObservacao,
  };
}

export async function assumirObra(
  _estado: EstadoOperador,
  formData: FormData,
): Promise<EstadoOperador> {
  const permissao = await autorizar("obra", "ver");
  if (!permissao.ok) return { erro: permissao.erro };

  const obraId = String(formData.get("obraId") ?? "");
  const observacao = String(formData.get("operadorObservacao") ?? "").trim();
  if (observacao.length > MAX_OBSERVACAO_OPERADOR) {
    return {
      erro: `A observação passa de ${MAX_OBSERVACAO_OPERADOR} caracteres — é a justificativa de uma linha, não o relatório.`,
    };
  }

  const obra = await carregar(obraId);
  if (!obra) return { erro: "Obra não encontrada." };

  const atribuicao = atribuicaoDe(obra);
  const situacao = situacaoDoOperador(atribuicao);
  if (!podeAssumir(situacao, atribuicao, permissao.usuario.id)) {
    return {
      erro: `${situacao.nome} assumiu esta obra. Peça para liberar antes de assumir — duas pessoas na mesma obra sem combinar é retrabalho.`,
    };
  }

  const agora = new Date();
  const { ip } = await origemDaRequisicao();
  const jaEra = obra.operadorId === permissao.usuario.id && situacao.assumida;

  await prisma.$transaction(async (tx) => {
    await tx.obra.update({
      where: { id: obraId },
      data: {
        operadorId: permissao.usuario.id,
        // Reassumir não reinicia o relógio: "desde quando" é da atribuição,
        // não da última vez que a observação mudou.
        operadorAssumidoEm: jaEra ? obra.operadorAssumidoEm : agora,
        operadorLiberadoEm: null,
        operadorObservacao: observacao || null,
      },
    });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "Obra",
        entidadeId: obraId,
        obraId,
        descricao: jaEra
          ? `${permissao.usuario.nome} atualizou a observação da obra ${obra.codigo}.`
          : `${permissao.usuario.nome} assumiu a obra ${obra.codigo} como operador.`,
        dadosAntes: {
          operador: situacao.nome,
          operadorObservacao: obra.operadorObservacao,
        },
        dadosDepois: {
          operador: permissao.usuario.nome,
          operadorObservacao: observacao || null,
        },
      },
      tx,
    );
  });

  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  return { sucesso: jaEra ? "Observação atualizada." : "Obra assumida." };
}

export async function liberarObra(
  _estado: EstadoOperador,
  formData: FormData,
): Promise<EstadoOperador> {
  const permissao = await autorizar("obra", "ver");
  if (!permissao.ok) return { erro: permissao.erro };

  const obraId = String(formData.get("obraId") ?? "");
  const obra = await carregar(obraId);
  if (!obra) return { erro: "Obra não encontrada." };

  if (!podeLiberar(atribuicaoDe(obra), permissao.usuario.id)) {
    return { erro: "Só quem assumiu a obra pode liberá-la." };
  }

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tx.obra.update({
      where: { id: obraId },
      data: {
        // `operadorId` FICA: liberada, o nome continua como o último que
        // mexeu. É registro, não fila de tarefas.
        operadorAssumidoEm: null,
        operadorLiberadoEm: new Date(),
        operadorObservacao: null,
      },
    });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "Obra",
        entidadeId: obraId,
        obraId,
        descricao: `${permissao.usuario.nome} liberou a obra ${obra.codigo}.`,
        dadosAntes: { operadorObservacao: obra.operadorObservacao },
        dadosDepois: { operadorObservacao: null },
      },
      tx,
    );
  });

  revalidatePath("/obras");
  revalidatePath(`/obras/${obraId}`);
  return { sucesso: "Obra liberada. Seu nome fica registrado como último operador." };
}
