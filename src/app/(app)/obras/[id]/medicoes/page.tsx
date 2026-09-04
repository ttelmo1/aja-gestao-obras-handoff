import { Card } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";

export const metadata = { title: "Medições" };

/** Aba prevista no mockup; o conteúdo chega na etapa 5. */
export default async function MedicoesPage() {
  await exigirPermissao("obra", "ver");
  return (
    <Card titulo="Medições">
      <Vazio mensagem="As medições da obra entram na etapa 5." />
    </Card>
  );
}
