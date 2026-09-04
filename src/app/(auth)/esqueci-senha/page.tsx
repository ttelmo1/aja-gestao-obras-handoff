import Link from "next/link";

import { FormularioEsqueciSenha } from "./formulario";

export const metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenhaPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--muted)]">
        O sistema roda na rede interna e não envia e-mails. Registre o pedido
        abaixo e procure o administrador para receber o link de redefinição.
      </p>
      <FormularioEsqueciSenha />
      <Link
        href="/login"
        className="text-center text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
      >
        Voltar para o login
      </Link>
    </div>
  );
}
