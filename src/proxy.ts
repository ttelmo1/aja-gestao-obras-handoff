import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_SESSAO } from "@/modules/auth/constantes";

/**
 * Redirecionamento otimista (Next 16 renomeou `middleware` para `proxy`).
 *
 * Só olha se o cookie existe — nunca consulta o banco. O proxy roda em toda
 * requisição, inclusive nos prefetches de navegação, e uma consulta aqui
 * multiplicaria carga sem ganhar segurança: um cookie forjado passa por esta
 * checagem e morre em `lib/guarda.ts`, que é onde a autorização de verdade
 * acontece. Aqui é só para o usuário deslogado cair no login em vez de numa
 * tela vazia.
 */

const ROTAS_PUBLICAS = ["/login", "/esqueci-senha", "/redefinir-senha"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const temCookie = Boolean(request.cookies.get(COOKIE_SESSAO)?.value);
  const publica = ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );

  if (!temCookie && !publica) {
    const url = new URL("/login", request.url);
    // Guarda o destino para voltar a ele depois de entrar.
    if (pathname !== "/") url.searchParams.set("destino", pathname);
    return NextResponse.redirect(url);
  }

  if (temCookie && publica) {
    return NextResponse.redirect(new URL("/obras", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // `envios/` fica de fora: o proxy guarda em memória só os primeiros 10 MB
  // do corpo, e o upload chegaria cortado à rota (ver `app/envios/[id]`).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|envios/|.*\\.svg$).*)"],
};
