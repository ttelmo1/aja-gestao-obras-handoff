import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Dado } from "@/components/ui/dados";
import { exigirPermissao } from "@/lib/guarda";
import { pode } from "@/modules/auth/permissoes";
import {
  acervoDoContrato,
  ESPERADOS_DA_OBRA,
  resumoDoAcervo,
} from "@/modules/documentos/acervo";
import {
  filtrarLinhasDoAcervo,
  lerFiltrosDocumento,
  temFiltroDocumento,
} from "@/modules/documentos/filtros";
import { origensDisponiveis } from "@/modules/documentos/origem";
import { formatarTamanho, TIPOS_DOCUMENTO } from "@/modules/documentos/rotulos";

import { carregarDispensas, carregarDocumentos, carregarObra } from "../dados";
import { AcervoDeDocumentos } from "./acervo";
import { FiltrosDaCentral } from "./filtros";

export const metadata = { title: "Documentos" };
export const dynamic = "force-dynamic";

/**
 * Documentos da Obra — uma lista só.
 *
 * Em 17/09/2026 a aba tinha três blocos: "Conferência do contrato", que
 * listava o que se espera; "Documentos", que listava o que existe; e "Novo
 * documento do contrato", um formulário no fim da página onde o tipo era
 * escolhido de novo, solto de qualquer linha. Os três viraram esta tabela:
 * cada linha é um tipo esperado, e a coluna "Ação" traz o que se pode fazer
 * com ela — incluir o arquivo, abrir, excluir, marcar que não se aplica.
 *
 * O envio é **um arquivo por tipo**, com cinco exceções — "Outros", medições,
 * apólice, licenças e ART/RRT (ver `ACEITAM_REPETICAO`). Nos demais, o segundo
 * arquivo do mesmo assunto entra como "Outros".
 */
export default async function DocumentosPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]/documentos">) {
  const usuario = await exigirPermissao("documento", "ver");
  const { id } = await params;
  const filtros = lerFiltrosDocumento(await searchParams);

  const [obra, todos, dispensas] = await Promise.all([
    carregarObra(id),
    carregarDocumentos(id),
    carregarDispensas(id),
  ]);
  if (!obra) notFound();

  const linhas = acervoDoContrato({
    esperados: ESPERADOS_DA_OBRA,
    documentos: todos,
    // Dispensa de medição é assunto da tela da medição.
    dispensados: dispensas.filter((d) => d.medicaoId === null),
  });
  const resumo = resumoDoAcervo(linhas);

  // As opções do seletor saem do acervo inteiro, não do resultado filtrado:
  // um filtro que apaga as próprias opções trava o usuário na escolha atual.
  const origens = origensDisponiveis(todos);
  const visiveis = filtrarLinhasDoAcervo(linhas, filtros);

  const espaco = todos.reduce((s, d) => s + Number(d.tamanhoBytes), 0);

  return (
    <div className="flex flex-col gap-4">
      <Card
        titulo="Documentos da Obra"
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
        {/*
          O texto é curto de propósito. A versão anterior explicava as quatro
          regras da tela de uma vez — vermelho, uma vez por tipo, "não se
          aplica", arquivos de outras telas — e ninguém lia parágrafo desse
          tamanho. O resto a própria tabela mostra: o vermelho se vê, o botão
          "Não se aplica" está na linha, e o arquivo de outra tela vem marcado.
        */}
        <p className="mb-4 rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
          A lista mostra todos os documentos esperados do contrato, na ordem do
          processo. Cada tipo é anexado uma vez — <strong>apólice</strong>,{" "}
          <strong>ART/RRT</strong>, <strong>licenças</strong> e{" "}
          <strong>medições contratuais</strong> aceitam vários. Para o segundo
          arquivo dos demais, use <strong>&ldquo;Outros&rdquo;</strong>.
        </p>

        <FiltrosDaCentral
          base={`/obras/${obra.id}/documentos`}
          filtros={filtros}
          tipos={TIPOS_DOCUMENTO}
          origens={origens}
        />

        <div className="mt-4 grid gap-3 border-t border-b border-[var(--border)] py-4 sm:grid-cols-4">
          <Dado rotulo="Anexados">{resumo.anexados}</Dado>
          <Dado rotulo="Não anexados">{resumo.faltando}</Dado>
          <Dado rotulo="Não se aplicam">{resumo.dispensados}</Dado>
          <Dado rotulo="Espaço ocupado">
            <span className="tabular">{formatarTamanho(espaco)}</span>
          </Dado>
        </div>

        <div className="mt-4">
          <AcervoDeDocumentos
            obraId={obra.id}
            linhas={visiveis}
            podeIncluir={pode(usuario.perfil, "documento", "criar")}
            podeDispensar={pode(usuario.perfil, "documento", "editar")}
            podeExcluir={pode(usuario.perfil, "documento", "excluir")}
            vazio={
              temFiltroDocumento(filtros)
                ? "Nenhum documento encontrado com esses filtros."
                : "Nenhum documento previsto para esta obra."
            }
          />
        </div>
      </Card>
    </div>
  );
}
