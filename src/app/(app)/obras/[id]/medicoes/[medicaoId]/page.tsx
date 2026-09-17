import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { paraCampoDinheiro } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";
import {
  acervoDaMedicao,
  ESPERADOS_DA_MEDICAO,
  resumoDoAcervo,
} from "@/modules/documentos/acervo";
import { contarDocumentosPorMedicao } from "@/modules/medicoes/exclusao";

import {
  carregarDispensas,
  carregarDocumentos,
  carregarMedicoes,
  carregarObra,
  paraCampoData,
  paraCampoMes,
} from "../../dados";
import { AcervoDeDocumentos } from "../../documentos/acervo";
import { medicaoParaExcluir } from "../exclusao";
import { BotaoExcluirMedicao, FormularioMedicao } from "../formulario";

export const metadata = { title: "Medição" };
export const dynamic = "force-dynamic";

export default async function EditarMedicaoPage({
  params,
}: PageProps<"/obras/[id]/medicoes/[medicaoId]">) {
  const usuario = await exigirPermissao("medicao", "editar");
  const { id, medicaoId } = await params;

  const [obra, medicoes, documentos, dispensas, responsaveis] = await Promise.all([
    carregarObra(id),
    carregarMedicoes(id),
    carregarDocumentos(id),
    carregarDispensas(id),
    prisma.responsavel.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);
  if (!obra) notFound();

  const medicao = medicoes.find((m) => m.id === medicaoId);
  if (!medicao) notFound();

  const documentosDaMedicao = documentos.filter((d) => d.medicaoId === medicao.id);
  // Uma lista só: o que a medição precisa e o que ela já tem, na mesma tabela
  // — a aba Documentos da obra virou isso em 17/09 e a medição segue junto.
  const linhas = acervoDaMedicao({
    esperados: ESPERADOS_DA_MEDICAO,
    documentos: documentosDaMedicao,
    dispensados: dispensas.filter((d) => d.medicaoId === medicao.id),
  });
  const resumo = resumoDoAcervo(linhas);

  const podeIncluir = pode(usuario.perfil, "documento", "criar");
  const podeExcluir = pode(usuario.perfil, "medicao", "excluir");

  return (
    <div className="flex flex-col gap-4">
      <Card
        titulo={`Medição nº ${String(medicao.numero).padStart(2, "0")}${
          medicao.protocolo ? ` · Protocolo ${medicao.protocolo}` : ""
        }`}
        acao={
          <div className="flex flex-wrap gap-2">
            <AtalhoDaMedicao para="documentos">Documentação</AtalhoDaMedicao>
            {podeExcluir && (
              <AtalhoDaMedicao para="excluir-medicao">
                Excluir medição
              </AtalhoDaMedicao>
            )}
          </div>
        }
      >
        <FormularioMedicao
          obraId={obra.id}
          responsaveis={responsaveis}
          numeroSugerido={medicao.numero}
          competenciaSugerida={paraCampoMes(medicao.competencia) ?? ""}
          padrao={{
            id: medicao.id,
            numero: medicao.numero,
            competencia: paraCampoMes(medicao.competencia) ?? "",
            dataMedicao: paraCampoData(medicao.dataMedicao),
            periodoInicio: paraCampoData(medicao.periodoInicio),
            periodoFim: paraCampoData(medicao.periodoFim),
            valorMedido: paraCampoDinheiro(medicao.valorMedido) ?? "",
            protocolo: medicao.protocolo,
            dataProtocolo: paraCampoData(medicao.dataProtocolo),
            notaFiscalNumero: medicao.notaFiscalNumero,
            notaFiscalData: paraCampoData(medicao.notaFiscalData),
            notaFiscalValor: paraCampoDinheiro(medicao.notaFiscalValor),
            issAliquota: medicao.issAliquota?.toFixed(2).replace(".", ",") ?? null,
            issValor: paraCampoDinheiro(medicao.issValor),
            responsavelId: medicao.responsavelId,
            status: medicao.status,
            dataPagamento: paraCampoData(medicao.dataPagamento),
            observacoes: medicao.observacoes,
          }}
        />
      </Card>

      <Card
        id="documentos"
        titulo={`Documentos da medição (${documentosDaMedicao.length})`}
        acao={
          <span
            className="text-sm font-bold"
            style={{
              color: resumo.faltando > 0 ? "var(--danger)" : "var(--success)",
            }}
          >
            {resumo.faltando > 0
              ? `${resumo.faltando} de ${resumo.cobrados} não anexado(s)`
              : "Nada em falta"}
          </span>
        }
      >
        <p className="mb-4 rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
          A lista mostra os documentos necessários da medição. Cada tipo aceita
          quantos arquivos precisar; o que não tem tipo próprio entra pela linha
          &ldquo;Outro&rdquo;, com a descrição.
        </p>

        <AcervoDeDocumentos
          obraId={obra.id}
          medicaoId={medicao.id}
          linhas={linhas}
          podeIncluir={podeIncluir}
          podeDispensar={pode(usuario.perfil, "documento", "editar")}
          podeExcluir={pode(usuario.perfil, "documento", "excluir")}
          mostrarOrigem={false}
          vazio="Nenhum documento previsto para esta medição."
        />
      </Card>

      {podeExcluir && (
        <Card id="excluir-medicao" titulo="Excluir medição">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              A exclusão apaga a medição. Medição com documento ativo não pode
              ser apagada: exclua os documentos antes, no bloco acima.
            </p>
            <BotaoExcluirMedicao
              medicao={medicaoParaExcluir(
                medicao,
                contarDocumentosPorMedicao(documentos),
              )}
              gatilho="botao"
            />
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Atalho do cabeçalho para um bloco mais abaixo da página.
 *
 * A tela da medição é comprida — o formulário inteiro fica antes dos
 * documentos e da exclusão —, e quem entra para anexar um arquivo estava
 * rolando tudo. É link com âncora, e não botão com JavaScript: funciona com o
 * teclado, abre em nova aba se alguém quiser, e a rolagem suave vem do CSS.
 */
function AtalhoDaMedicao({
  para,
  children,
}: {
  para: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${para}`}
      className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-bold text-[var(--primary)] transition-colors hover:bg-[var(--background)]"
    >
      {children}
    </a>
  );
}
