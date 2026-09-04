import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { Perfil } from "@/generated/prisma/enums";
import { lerSessao } from "@/lib/sessao";
import { pode, type Acao, type Recurso } from "@/modules/auth/permissoes";

/**
 * Camada de acesso a dados (DAL) da autorização.
 *
 * Toda página e toda Server Action da área interna passa por aqui. O
 * `proxy.ts` na raiz também redireciona quem não tem cookie, mas isso é só
 * conveniência de navegação: a checagem que vale é esta, junto do banco.
 * Nenhuma tela deve confiar apenas no proxy.
 */

export type UsuarioAtual = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
};

/**
 * `cache` do React memoiza por render: várias chamadas na mesma requisição
 * (layout, página e componentes) resultam em uma consulta só.
 */
export const usuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const sessao = await lerSessao();
  return sessao?.usuario ?? null;
});

/** Para páginas: sem sessão válida, volta para o login. */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Para páginas: sessão válida mas sem direito ao recurso. */
export async function exigirPermissao(
  recurso: Recurso,
  acao: Acao,
): Promise<UsuarioAtual> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.perfil, recurso, acao)) {
    redirect(`/sem-permissao?recurso=${recurso}&acao=${acao}`);
  }
  return usuario;
}

export type Negado = { ok: false; erro: string };
export type Autorizado = { ok: true; usuario: UsuarioAtual };

/**
 * Para Server Actions: devolve um resultado em vez de redirecionar, para a
 * action conseguir responder o formulário com a mensagem no lugar certo.
 */
export async function autorizar(
  recurso: Recurso,
  acao: Acao,
): Promise<Autorizado | Negado> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (!pode(usuario.perfil, recurso, acao)) {
    return { ok: false, erro: "Seu perfil não permite esta ação." };
  }
  return { ok: true, usuario };
}
