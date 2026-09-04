import { redirect } from "next/navigation";

/**
 * O painel do mockup é a própria lista de obras — filtros, indicadores e
 * cartões na mesma tela. Manter duas telas de visão geral criaria dois lugares
 * para o mesmo número aparecer, e a chance de divergirem. `/dashboard`
 * continua existindo só como atalho para quem tiver o endereço salvo.
 */
export default function DashboardPage() {
  redirect("/obras");
}
