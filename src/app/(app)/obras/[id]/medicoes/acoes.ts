"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { StatusMedicao } from "@/generated/prisma/enums";
import {
  competencia,
  dataOpcional,
  dinheiro,
  dinheiroOpcionalPositivo,
  inteiroOpcional,
  percentualOpcional,
  textoOpcional,
} from "@/lib/campos";
import { autorizar } from "@/lib/guarda";
import { dec } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { apagarArquivos } from "@/lib/storage";
import { AcaoAuditoria, diff, registrar } from "@/modules/auditoria/registrar";
import { calcularIss, proximoNumero } from "@/modules/medicoes/calculos";
import {
  bloqueioExclusaoMedicao,
  ondeDocumentosAtivosDaMedicao,
  ondeDocumentosDaMedicao,
} from "@/modules/medicoes/exclusao";

export type EstadoMedicao = { erro?: string; sucesso?: string } | undefined;

const medicaoSchema = z
  .object({
    numero: inteiroOpcional,
    competencia,
    dataMedicao: dataOpcional,
    periodoInicio: dataOpcional,
    periodoFim: dataOpcional,
    valorMedido: dinheiro,
    protocolo: textoOpcional,
    dataProtocolo: dataOpcional,
    notaFiscalNumero: textoOpcional,
    notaFiscalData: dataOpcional,
    notaFiscalValor: dinheiroOpcionalPositivo,
    issAliquota: percentualOpcional,
    issValor: dinheiroOpcionalPositivo,
    responsavelId: textoOpcional,
    status: z.enum(StatusMedicao),
    dataPagamento: dataOpcional,
    observacoes: textoOpcional,
  })
  .refine((m) => dec(m.valorMedido).gt(0), {
    message: "O valor medido precisa ser maior que zero.",
  })
  .refine(
    (m) => !m.periodoInicio || !m.periodoFim || m.periodoInicio <= m.periodoFim,
    { message: "O início do período não pode ser depois do fim." },
  )
  .refine(
    (m) => m.status !== StatusMedicao.PAGA || m.dataPagamento !== null,
    { message: "Medição marcada como paga precisa da data do pagamento." },
  )
  .refine(
    (m) => m.status === StatusMedicao.RASCUNHO || m.protocolo !== null,
    {
      message:
        "A partir de Protocolada, a medição precisa do número do protocolo — é por ele que o processo é encontrado no órgão.",
    },
  );

const CAMPOS = [
  "numero",
  "competencia",
  "dataMedicao",
  "periodoInicio",
  "periodoFim",
  "valorMedido",
  "protocolo",
  "dataProtocolo",
  "notaFiscalNumero",
  "notaFiscalData",
  "notaFiscalValor",
  "issAliquota",
  "issValor",
  "responsavelId",
  "status",
  "dataPagamento",
  "observacoes",
];

function lerFormulario(formData: FormData) {
  const bruto: Record<string, unknown> = {};
  for (const c of CAMPOS) bruto[c] = String(formData.get(c) ?? "");
  return medicaoSchema.safeParse(bruto);
}

/**
 * O ISS pode ser digitado ou deduzido. Se o usuário informou o valor, ele
 * manda — guia de recolhimento tem arredondamento próprio e o que vale é o
 * papel. Só quando o campo fica vazio e há alíquota é que o sistema calcula,
 * sobre o valor da nota (ou o da medição, se a nota ainda não foi emitida).
 */
function resolverIss(m: {
  issValor: string | null;
  issAliquota: string | null;
  notaFiscalValor: string | null;
  valorMedido: string;
}): string | null {
  if (m.issValor !== null) return m.issValor;
  if (m.issAliquota === null) return null;
  return calcularIss(m.notaFiscalValor ?? m.valorMedido, m.issAliquota).toFixed(2);
}

export async function salvarMedicao(
  _estado: EstadoMedicao,
  formData: FormData,
): Promise<EstadoMedicao> {
  const id = String(formData.get("id") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const permissao = await autorizar("medicao", id ? "editar" : "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const analise = lerFormulario(formData);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: { id: true, codigo: true },
  });
  if (!obra) return { erro: "Obra não encontrada." };

  const { numero, ...dados } = analise.data;
  const issValor = resolverIss(analise.data);
  const { ip } = await origemDaRequisicao();

  try {
    if (id) {
      const antes = await prisma.medicao.findUnique({ where: { id } });
      if (!antes || antes.obraId !== obraId) {
        return { erro: "Medição não encontrada nesta obra." };
      }

      const novo = { ...dados, issValor, numero: numero ?? antes.numero };
      const mudancas = diff(antes as unknown as Record<string, unknown>, novo);
      if (Object.keys(mudancas.depois).length === 0) return { sucesso: "Nada mudou." };

      await prisma.$transaction(async (tx) => {
        await tx.medicao.update({ where: { id }, data: novo });
        await registrar(
          {
            ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
            acao: AcaoAuditoria.ATUALIZAR,
            entidade: "Medicao",
            entidadeId: id,
            obraId,
            descricao: `Medição ${antes.numero} da obra ${obra.codigo} alterada.`,
            dadosAntes: mudancas.antes,
            dadosDepois: mudancas.depois,
          },
          tx,
        );
      });

      // `layout` porque a medição mexe no cabeçalho e no farol da obra, não
      // só na aba — mesma revalidação que as rerratificações já faziam.
      revalidatePath(`/obras/${obraId}`, "layout");
      revalidatePath("/obras");
      return { sucesso: "Alterações salvas." };
    }

    await prisma.$transaction(async (tx) => {
      const existentes = await tx.medicao.findMany({
        where: { obraId },
        select: { numero: true },
      });
      const medicao = await tx.medicao.create({
        data: {
          ...dados,
          issValor,
          obraId,
          numero: numero ?? proximoNumero(existentes.map((m: { numero: number }) => m.numero)),
        },
      });
      await registrar(
        {
          ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
          acao: AcaoAuditoria.CRIAR,
          entidade: "Medicao",
          entidadeId: medicao.id,
          obraId,
          descricao: `Medição ${medicao.numero} lançada na obra ${obra.codigo}.`,
          dadosDepois: {
            numero: medicao.numero,
            valorMedido: medicao.valorMedido,
            status: medicao.status,
          },
        },
        tx,
      );
    });
  } catch (erro) {
    if ((erro as { code?: string }).code === "P2002") {
      return { erro: "Já existe uma medição com esse número nesta obra." };
    }
    throw erro;
  }

  revalidatePath(`/obras/${obraId}`, "layout");
  revalidatePath("/obras");
  redirect(`/obras/${obraId}/medicoes?salva=1`);
}

export async function excluirMedicao(
  _estado: EstadoMedicao,
  formData: FormData,
): Promise<EstadoMedicao> {
  const permissao = await autorizar("medicao", "excluir");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const medicao = await prisma.medicao.findUnique({
    where: { id },
    select: {
      id: true,
      numero: true,
      obraId: true,
      status: true,
      valorMedido: true,
      obra: { select: { codigo: true } },
    },
  });
  if (!medicao) return { erro: "Medição não encontrada." };

  // Qualquer situação sai; só documento ativo trava — contando o que entrou
  // pela tramitação, que iria junto em cascata. Ver modules/medicoes/exclusao.
  const documentosAtivos = await prisma.documento.count({
    where: ondeDocumentosAtivosDaMedicao(id),
  });
  const bloqueio = bloqueioExclusaoMedicao(documentosAtivos);
  if (bloqueio) return { erro: bloqueio };

  const { ip } = await origemDaRequisicao();
  const caminhos = await prisma.$transaction(async (tx) => {
    // Lidos na mesma transação da exclusão: são os documentos já excluídos
    // logicamente que a cascata leva junto, e cujos arquivos saem depois.
    const documentos = await tx.documento.findMany({
      where: ondeDocumentosDaMedicao(id),
      select: { caminhoRelativo: true },
    });
    await tx.medicao.delete({ where: { id } });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.EXCLUIR,
        entidade: "Medicao",
        entidadeId: id,
        obraId: medicao.obraId,
        descricao: `Medição ${medicao.numero} da obra ${medicao.obra.codigo} excluída.`,
        dadosAntes: {
          numero: medicao.numero,
          valorMedido: medicao.valorMedido,
          status: medicao.status,
        },
      },
      tx,
    );
    return documentos.map((d) => d.caminhoRelativo);
  });
  await apagarArquivos(caminhos);

  revalidatePath(`/obras/${medicao.obraId}`, "layout");
  revalidatePath("/obras");
  redirect(`/obras/${medicao.obraId}/medicoes`);
}
