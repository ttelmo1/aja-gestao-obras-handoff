import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Celula, Linha, Situacao, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

export const metadata = { title: "Setores" };
export const dynamic = "force-dynamic";

/**
 * Setores por onde o processo tramita. A lista é editável, mas a **sequência**
 * do fluxo não é: ela é fixa em `modules/tramitacao/fluxo.ts` por decisão de
 * requisito (1.5). Cadastrar um setor aqui não cria etapa nenhuma.
 */
export default async function SetoresPage() {
  const usuario = await exigirPermissao("cadastro", "ver");
  const setores = await prisma.setor.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      sigla: true,
      ativo: true,
      _count: { select: { entradas: true, saidas: true } },
    },
  });

  return (
    <Card
      titulo={`Setores (${setores.length})`}
      acao={
        pode(usuario.perfil, "cadastro", "criar") && (
          <Link
            href="/cadastros/setores/novo"
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Novo setor
          </Link>
        )
      }
    >
      <p className="mb-4 text-xs text-[var(--muted)]">
        Setores por onde o processo passa. A ordem das etapas de tramitação é
        fixa e não depende desta lista.
      </p>
      {setores.length === 0 ? (
        <Vazio mensagem="Nenhum setor cadastrado." />
      ) : (
        <Tabela colunas={["Nome", "Sigla", "Movimentos", "Situação"]}>
          {setores.map((s) => (
            <Linha key={s.id}>
              <Celula>
                <Link
                  href={`/cadastros/setores/${s.id}`}
                  className="font-bold text-[var(--primary)] underline-offset-2 hover:underline"
                >
                  {s.nome}
                </Link>
              </Celula>
              <Celula apagada>{s.sigla ?? "—"}</Celula>
              <Celula tabular>{s._count.entradas + s._count.saidas}</Celula>
              <Celula>
                <Situacao ativo={s.ativo} />
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </Card>
  );
}
