import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Celula, Linha, Situacao, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

export const metadata = { title: "Responsáveis" };
export const dynamic = "force-dynamic";

/**
 * Responsáveis técnicos são cadastro à parte dos usuários do sistema
 * (requisitos.md 1.2): o engenheiro que assina um boletim de medição não
 * precisa ter login, e quem tem login não é necessariamente responsável por
 * nada.
 *
 * Desde 09/09/2026 eles não são mais vinculados à obra — ali o campo virou
 * operador, que é usuário do sistema e se atribui sozinho. O vínculo que resta
 * é com a medição, o "Responsável AJA" do mockup.
 */
export default async function ResponsaveisPage() {
  const usuario = await exigirPermissao("cadastro", "ver");
  const responsaveis = await prisma.responsavel.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      cargo: true,
      registro: true,
      telefone: true,
      ativo: true,
      _count: { select: { medicoes: true } },
    },
  });

  return (
    <Card
      titulo={`Responsáveis (${responsaveis.length})`}
      acao={
        pode(usuario.perfil, "cadastro", "criar") && (
          <Link
            href="/cadastros/responsaveis/novo"
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Novo responsável
          </Link>
        )
      }
    >
      <p className="mb-4 text-xs text-[var(--muted)]">
        Cadastro de equipe técnica, separado dos usuários do sistema. Não dá
        acesso ao sistema.
      </p>
      {responsaveis.length === 0 ? (
        <Vazio mensagem="Nenhum responsável cadastrado." />
      ) : (
        <Tabela colunas={["Nome", "Cargo", "Registro", "Telefone", "Medições", "Situação"]}>
          {responsaveis.map((r) => (
            <Linha key={r.id}>
              <Celula>
                <Link
                  href={`/cadastros/responsaveis/${r.id}`}
                  className="font-bold text-[var(--primary)] underline-offset-2 hover:underline"
                >
                  {r.nome}
                </Link>
              </Celula>
              <Celula apagada>{r.cargo ?? "—"}</Celula>
              <Celula apagada tabular>
                {r.registro ?? "—"}
              </Celula>
              <Celula apagada tabular>
                {r.telefone ?? "—"}
              </Celula>
              <Celula tabular>{r._count.medicoes}</Celula>
              <Celula>
                <Situacao ativo={r.ativo} />
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </Card>
  );
}
