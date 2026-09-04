import { redirect } from "next/navigation";

/** `/cadastros` não tem conteúdo próprio: cai na primeira aba. */
export default function CadastrosPage() {
  redirect("/cadastros/contratantes");
}
