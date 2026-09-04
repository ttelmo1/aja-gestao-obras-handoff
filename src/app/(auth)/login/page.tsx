import Link from "next/link";

import { Alerta } from "@/components/ui/formulario";

import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const destino = typeof params.destino === "string" ? params.destino : undefined;

  return (
    <div className="flex flex-col gap-4">
      {params.redefinida && (
        <Alerta tipo="sucesso">Senha alterada. Entre com a nova senha.</Alerta>
      )}
      <FormularioLogin destino={destino} />
      <Link
        href="/esqueci-senha"
        className="text-center text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
      >
        Esqueci minha senha
      </Link>
    </div>
  );
}
