import { Card } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";

export const metadata = { title: "Rerratificações" };

/** Aba prevista no mockup; o conteúdo chega na etapa 8. */
export default async function RerratificacoesPage() {
  await exigirPermissao("obra", "ver");
  return (
    <Card titulo="Rerratificações">
      <Vazio mensagem="As rerratificações entram na etapa 8." />
    </Card>
  );
}
