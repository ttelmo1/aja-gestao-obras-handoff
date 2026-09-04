import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";

import { FormSetor } from "../../formularios";

export const metadata = { title: "Novo setor" };

export default async function NovoSetorPage() {
  await exigirPermissao("cadastro", "criar");
  return (
    <div className="max-w-lg">
      <Card titulo="Novo setor">
        <FormSetor />
      </Card>
    </div>
  );
}
