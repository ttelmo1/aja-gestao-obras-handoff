import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { formatarDataHora } from "@/lib/date-br";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";

import { FormularioEditarUsuario, AcoesDeAcesso } from "./formulario";

export const metadata = { title: "Usuário" };
export const dynamic = "force-dynamic";

export default async function UsuarioPage({ params }: PageProps<"/usuarios/[id]">) {
  const atual = await exigirPermissao("usuario", "ver");
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      ultimoLogin: true,
      criadoEm: true,
      sessoes: {
        where: { expiraEm: { gt: new Date() } },
        orderBy: { ultimoUsoEm: "desc" },
        select: { id: true, ip: true, criadoEm: true, expiraEm: true },
      },
      tokensSenha: {
        where: { usadoEm: null, expiraEm: { gt: new Date() } },
        select: { id: true, criadoEm: true },
      },
    },
  });

  if (!usuario) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Card titulo={usuario.nome}>
        <FormularioEditarUsuario
          usuario={{
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil,
            ativo: usuario.ativo,
          }}
          ehVoce={usuario.id === atual.id}
        />
      </Card>

      <Card titulo="Acesso">
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-[var(--muted)]">
            Cadastrado em {formatarDataHora(usuario.criadoEm)}. Último acesso:{" "}
            {usuario.ultimoLogin ? formatarDataHora(usuario.ultimoLogin) : "nunca entrou"}.
          </p>
          {usuario.tokensSenha.length > 0 && (
            <p className="text-[var(--muted)]">
              Há um pedido de redefinição pendente desde{" "}
              {formatarDataHora(usuario.tokensSenha[0]!.criadoEm)}.
            </p>
          )}
          <p className="text-[var(--muted)]">
            {usuario.sessoes.length === 0
              ? "Nenhuma sessão aberta."
              : `${usuario.sessoes.length} sessão(ões) aberta(s), a mais recente de ${usuario.sessoes[0]!.ip ?? "origem desconhecida"}.`}
          </p>
          <AcoesDeAcesso id={usuario.id} />
        </div>
      </Card>

      <Link
        href="/usuarios"
        className="text-sm text-[var(--muted)] underline underline-offset-2"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
