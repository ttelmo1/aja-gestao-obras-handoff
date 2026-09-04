import Link from "next/link";

import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/date-br";
import { Card } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { pode, ROTULOS_PERFIL } from "@/modules/auth/permissoes";

export const metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const atual = await exigirPermissao("usuario", "ver");

  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      ultimoLogin: true,
      _count: {
        select: {
          tokensSenha: { where: { usadoEm: null, expiraEm: { gt: new Date() } } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card
        titulo={`Usuários (${usuarios.length})`}
        acao={
          pode(atual.perfil, "usuario", "criar") && (
            <Link
              href="/usuarios/novo"
              className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
            >
              Novo usuário
            </Link>
          )
        }
      >
        {usuarios.length === 0 ? (
          <Vazio mensagem="Nenhum usuário cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">E-mail</th>
                  <th className="py-2 pr-4 font-medium">Perfil</th>
                  <th className="py-2 pr-4 font-medium">Situação</th>
                  <th className="py-2 font-medium">Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/usuarios/${u.id}`}
                        className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
                      >
                        {u.nome}
                      </Link>
                      {u.id === atual.id && (
                        <span className="ml-2 text-xs text-[var(--muted)]">(você)</span>
                      )}
                      {u._count.tokensSenha > 0 && (
                        <span className="ml-2 rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
                          redefinição pendente
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--muted)]">{u.email}</td>
                    <td className="py-2.5 pr-4">{ROTULOS_PERFIL[u.perfil]}</td>
                    <td className="py-2.5 pr-4">
                      {u.ativo ? (
                        "Ativo"
                      ) : (
                        <span className="text-[var(--muted)]">Inativo</span>
                      )}
                    </td>
                    <td className="tabular py-2.5 text-[var(--muted)]">
                      {u.ultimoLogin ? formatarDataHora(u.ultimoLogin) : "nunca entrou"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
