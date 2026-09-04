import { Card } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";

export const metadata = { title: "Histórico" };

/** Aba prevista no mockup; o conteúdo chega na etapa 10. */
export default async function HistoricoPage() {
  await exigirPermissao("obra", "ver");
  return (
    <Card titulo="Histórico">
      <Vazio mensagem="A linha do tempo da obra entra na etapa 10." />
    </Card>
  );
}
