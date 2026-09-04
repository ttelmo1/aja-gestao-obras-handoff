import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";

import { FormContratante } from "../../formularios";

export const metadata = { title: "Novo contratante" };

export default async function NovoContratantePage() {
  await exigirPermissao("cadastro", "criar");
  return (
    <div className="max-w-2xl">
      <Card titulo="Novo contratante">
        <FormContratante />
      </Card>
    </div>
  );
}
