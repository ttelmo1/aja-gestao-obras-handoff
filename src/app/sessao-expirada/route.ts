import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { lerSessao } from "@/lib/sessao";
import { COOKIE_SESSAO } from "@/modules/auth/constantes";

/**
 * Saída para cookie órfão: o navegador ainda manda `aja_sessao`, mas a sessão
 * não existe mais no banco (senha trocada, perfil alterado, conta desativada,
 * sessão vencida).
 *
 * Sem isto o usuário fica preso num laço: a guarda manda para `/login`, e o
 * `proxy.ts`, que só olha se o cookie existe, manda de volta para `/obras`.
 * Server Component não consegue apagar cookie — por isso a guarda redireciona
 * para cá, e só aqui o cookie é removido.
 *
 * É GET porque é destino de `redirect()`. Não serve para deslogar ninguém:
 * com sessão válida, apenas devolve para o painel.
 */
export async function GET(request: Request) {
  if (await lerSessao()) {
    return NextResponse.redirect(new URL("/obras", request.url));
  }
  (await cookies()).delete(COOKIE_SESSAO);
  return NextResponse.redirect(new URL("/login", request.url));
}
