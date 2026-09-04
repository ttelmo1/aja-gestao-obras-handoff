import Link from "next/link";

import { exigirPermissao } from "@/lib/guarda";
import { Card } from "@/components/ui/card";

import { FormularioNovoUsuario } from "./formulario";

export const metadata = { title: "Novo usuário" };

export default async function NovoUsuarioPage() {
  await exigirPermissao("usuario", "criar");

  return (
    <div className="mx-auto max-w-lg">
      <Card titulo="Novo usuário">
        <FormularioNovoUsuario />
      </Card>
      <Link
        href="/usuarios"
        className="mt-4 inline-block text-sm text-[var(--muted)] underline underline-offset-2"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
