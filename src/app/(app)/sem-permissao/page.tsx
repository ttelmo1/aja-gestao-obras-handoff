import Link from "next/link";

import { exigirUsuario } from "@/lib/guarda";
import { ROTULOS_PERFIL } from "@/modules/auth/permissoes";

export const metadata = { title: "Sem permissão" };

export default async function SemPermissaoPage({
  searchParams,
}: PageProps<"/sem-permissao">) {
  const usuario = await exigirUsuario();
  const { recurso } = await searchParams;

  return (
    <div className="mx-auto max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <h1 className="text-base font-semibold">Você não tem acesso a esta tela</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Seu perfil é <strong>{ROTULOS_PERFIL[usuario.perfil]}</strong>
        {typeof recurso === "string" && <> e não alcança {recurso}</>}. Se
        precisar deste acesso, fale com o administrador do sistema.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm text-[var(--primary)] underline underline-offset-2"
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
