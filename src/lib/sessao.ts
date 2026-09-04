import "server-only";

import { cookies, headers } from "next/headers";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSAO } from "@/modules/auth/constantes";
import {
  DURACAO_SESSAO_MS,
  expiraEm,
  gerarToken,
  hashToken,
} from "@/modules/auth/token";

/**
 * Leitura e escrita da sessão: cookie de um lado, tabela `Sessao` do outro.
 *
 * A regra pura (gerar e derivar token, prazos) mora em
 * `modules/auth/token.ts`. Aqui fica só a orquestração com Next e Prisma,
 * que é o que não dá para testar sem um servidor de pé.
 */

function opcoesCookie(expira: Date) {
  return {
    httpOnly: true,
    secure: env().COOKIE_SEGURO,
    sameSite: "lax" as const,
    path: "/",
    expires: expira,
  };
}

/** IP e navegador de quem está pedindo — para a auditoria e para a tela de sessões. */
export async function origemDaRequisicao(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  // Numa instalação de rede local não há CDN; `x-forwarded-for` só aparece se
  // o cliente colocar um proxy reverso na frente. O primeiro item é o cliente.
  const encaminhado = h.get("x-forwarded-for");
  const ip = encaminhado?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent") };
}

export async function criarSessao(usuarioId: string): Promise<void> {
  const token = gerarToken();
  const expira = expiraEm(DURACAO_SESSAO_MS);
  const { ip, userAgent } = await origemDaRequisicao();

  await prisma.sessao.create({
    data: {
      usuarioId,
      tokenHash: hashToken(token, env().SESSION_SECRET),
      expiraEm: expira,
      ip,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
  });

  (await cookies()).set(COOKIE_SESSAO, token, opcoesCookie(expira));
}

export type SessaoAtiva = {
  sessaoId: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    perfil: import("@/generated/prisma/enums").Perfil;
  };
};

/**
 * Resolve o cookie para um usuário, ou `null`.
 *
 * Confere o vínculo no banco a cada requisição, de propósito: é isso que faz
 * "desativar usuário" e "sair" terem efeito imediato. Numa instalação de rede
 * local, com dezenas de usuários, o custo dessa consulta é irrelevante perto
 * da garantia que ela dá.
 */
export async function lerSessao(): Promise<SessaoAtiva | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  const sessao = await prisma.sessao.findUnique({
    where: { tokenHash: hashToken(token, env().SESSION_SECRET) },
    select: {
      id: true,
      expiraEm: true,
      usuario: {
        select: { id: true, nome: true, email: true, perfil: true, ativo: true },
      },
    },
  });

  if (!sessao) return null;
  if (sessao.expiraEm.getTime() <= Date.now()) {
    await prisma.sessao.delete({ where: { id: sessao.id } }).catch(() => {});
    return null;
  }
  if (!sessao.usuario.ativo) return null;

  const { id, nome, email, perfil } = sessao.usuario;
  return { sessaoId: sessao.id, usuario: { id, nome, email, perfil } };
}

/** Encerra a sessão atual: apaga a linha e o cookie. */
export async function encerrarSessao(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSAO)?.value;
  cookieStore.delete(COOKIE_SESSAO);
  if (!token) return null;

  const hash = hashToken(token, env().SESSION_SECRET);
  const sessao = await prisma.sessao
    .delete({ where: { tokenHash: hash }, select: { usuarioId: true } })
    .catch(() => null);
  return sessao?.usuarioId ?? null;
}

/**
 * Derruba todas as sessões de um usuário. Chamado ao trocar senha, desativar
 * a conta ou mudar o perfil — momentos em que uma sessão já aberta passaria a
 * carregar uma permissão que o usuário não tem mais.
 */
export async function encerrarSessoesDoUsuario(usuarioId: string): Promise<number> {
  const { count } = await prisma.sessao.deleteMany({ where: { usuarioId } });
  return count;
}

/** Limpeza de sessões vencidas. Sem cron: roda de carona no login. */
export async function limparSessoesVencidas(): Promise<void> {
  await prisma.sessao
    .deleteMany({ where: { expiraEm: { lte: new Date() } } })
    .catch(() => {});
}
