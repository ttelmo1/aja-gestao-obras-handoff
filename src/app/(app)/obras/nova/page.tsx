import Link from "next/link";

import { Card, TituloPagina } from "@/components/ui/card";
import { Alerta } from "@/components/ui/formulario";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";

import { FormularioObra } from "../formulario";

export const metadata = { title: "Nova obra" };
export const dynamic = "force-dynamic";

export default async function NovaObraPage() {
  await exigirPermissao("obra", "criar");

  const [contratantes, responsaveis] = await Promise.all([
    prisma.contratante.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.responsavel.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <TituloPagina titulo="Nova obra" />

      {contratantes.length === 0 ? (
        <Alerta tipo="erro">
          Não há contratante ativo cadastrado. Cadastre o contratante antes de
          abrir a obra —{" "}
          <Link href="/cadastros/contratantes/novo" className="underline">
            ir para o cadastro
          </Link>
          .
        </Alerta>
      ) : (
        <Card>
          <FormularioObra contratantes={contratantes} responsaveis={responsaveis} />
        </Card>
      )}
    </div>
  );
}
