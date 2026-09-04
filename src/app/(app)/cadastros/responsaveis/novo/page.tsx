import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";

import { FormResponsavel } from "../../formularios";

export const metadata = { title: "Novo responsável" };

export default async function NovoResponsavelPage() {
  await exigirPermissao("cadastro", "criar");
  return (
    <div className="max-w-2xl">
      <Card titulo="Novo responsável">
        <FormResponsavel />
      </Card>
    </div>
  );
}
