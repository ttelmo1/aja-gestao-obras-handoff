import { Card } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";

export const metadata = { title: "Documentos" };

/** Aba prevista no mockup; o conteúdo chega na etapa 7. */
export default async function DocumentosPage() {
  await exigirPermissao("obra", "ver");
  return (
    <Card titulo="Documentos">
      <Vazio mensagem="A central de documentos da obra entra na etapa 7." />
    </Card>
  );
}
