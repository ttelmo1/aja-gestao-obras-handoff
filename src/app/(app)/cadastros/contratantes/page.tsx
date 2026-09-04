import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Celula, Linha, Situacao, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";
import { formatarCnpj } from "@/modules/cadastros/cnpj";
import { ROTULOS_ESFERA } from "@/modules/cadastros/rotulos";

export const metadata = { title: "Contratantes" };
export const dynamic = "force-dynamic";

export default async function ContratantesPage() {
  const usuario = await exigirPermissao("cadastro", "ver");
  const contratantes = await prisma.contratante.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      cnpj: true,
      esfera: true,
      contato: true,
      ativo: true,
      _count: { select: { obras: true } },
    },
  });

  return (
    <Card
      titulo={`Contratantes (${contratantes.length})`}
      acao={
        pode(usuario.perfil, "cadastro", "criar") && (
          <Link
            href="/cadastros/contratantes/novo"
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Novo contratante
          </Link>
        )
      }
    >
      {contratantes.length === 0 ? (
        <Vazio mensagem="Nenhum contratante cadastrado." />
      ) : (
        <Tabela colunas={["Nome", "CNPJ", "Esfera", "Contato", "Obras", "Situação"]}>
          {contratantes.map((c) => (
            <Linha key={c.id}>
              <Celula>
                <Link
                  href={`/cadastros/contratantes/${c.id}`}
                  className="font-bold text-[var(--primary)] underline-offset-2 hover:underline"
                >
                  {c.nome}
                </Link>
              </Celula>
              <Celula apagada tabular>
                {formatarCnpj(c.cnpj) || "—"}
              </Celula>
              <Celula apagada>{c.esfera ? ROTULOS_ESFERA[c.esfera] : "—"}</Celula>
              <Celula apagada>{c.contato ?? "—"}</Celula>
              <Celula tabular>{c._count.obras}</Celula>
              <Celula>
                <Situacao ativo={c.ativo} />
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </Card>
  );
}
