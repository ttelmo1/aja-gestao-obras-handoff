import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { proximoNumero } from "@/modules/medicoes/calculos";

import { carregarMedicoes, carregarObra, paraCampoMes } from "../../dados";
import { FormularioMedicao } from "../formulario";

export const metadata = { title: "Nova medição" };
export const dynamic = "force-dynamic";

/**
 * O número e a competência já chegam preenchidos: quem lança medição lança
 * várias seguidas, e a sequência é previsível. Ambos continuam editáveis —
 * contrato que começou fora do sistema tem medição anterior à instalação.
 */
export default async function NovaMedicaoPage({
  params,
}: PageProps<"/obras/[id]/medicoes/nova">) {
  await exigirPermissao("medicao", "criar");
  const { id } = await params;

  const [obra, medicoes] = await Promise.all([
    carregarObra(id),
    carregarMedicoes(id),
  ]);
  if (!obra) notFound();

  const hoje = new Date();

  return (
    <Card titulo="Nova medição">
      <FormularioMedicao
        obraId={obra.id}
        numeroSugerido={proximoNumero(medicoes.map((m) => m.numero))}
        competenciaSugerida={paraCampoMes(hoje) ?? ""}
      />
    </Card>
  );
}
