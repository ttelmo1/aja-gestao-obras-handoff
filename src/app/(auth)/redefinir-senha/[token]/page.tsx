import Link from "next/link";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { Alerta } from "@/components/ui/formulario";
import { expirou, hashToken } from "@/modules/auth/token";

import { FormularioRedefinir } from "./formulario";

export const metadata = { title: "Redefinir senha" };
export const dynamic = "force-dynamic";

export default async function RedefinirSenhaPage({
  params,
}: PageProps<"/redefinir-senha/[token]">) {
  const { token } = await params;

  // Confere o link antes de mostrar o formulário: melhor dizer "link vencido"
  // agora do que depois de a pessoa digitar a senha duas vezes.
  const registro = await prisma.tokenSenha.findUnique({
    where: { tokenHash: hashToken(token, env().SESSION_SECRET) },
    select: {
      usadoEm: true,
      expiraEm: true,
      usuario: { select: { nome: true, ativo: true } },
    },
  });

  const valido =
    registro && !registro.usadoEm && !expirou(registro.expiraEm) && registro.usuario.ativo;

  if (!valido) {
    return (
      <div className="flex flex-col gap-4">
        <Alerta tipo="erro">
          Este link não vale mais. Peça um novo ao administrador do sistema.
        </Alerta>
        <Link
          href="/login"
          className="text-center text-xs text-[var(--muted)] underline underline-offset-2"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Nova senha para <strong>{registro.usuario.nome}</strong>.
      </p>
      <FormularioRedefinir token={token} />
    </div>
  );
}
