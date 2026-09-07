import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { proximoNumeroRerratificacao } from "@/modules/rerratificacoes/calculos";

import { carregarObra, carregarRerratificacoes } from "../../dados";
import { FormularioRerratificacao } from "../formulario";

export const metadata = { title: "Nova rerratificação" };
export const dynamic = "force-dynamic";

export default async function NovaRerratificacaoPage({
  params,
}: PageProps<"/obras/[id]/rerratificacoes/nova">) {
  await exigirPermissao("rerratificacao", "criar");
  const { id } = await params;

  const [obra, rerratificacoes] = await Promise.all([
    carregarObra(id),
    carregarRerratificacoes(id),
  ]);
  if (!obra) notFound();

  return (
    <Card titulo="Nova rerratificação">
      <FormularioRerratificacao
        obraId={obra.id}
        numeroSugerido={proximoNumeroRerratificacao(
          rerratificacoes.map((r) => r.numero),
        )}
      />
    </Card>
  );
}
