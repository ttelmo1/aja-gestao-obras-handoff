"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { env } from "@/lib/env";
import { autorizar } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { encerrarSessoesDoUsuario, origemDaRequisicao } from "@/lib/sessao";
import { AcaoAuditoria, diff, registrar } from "@/modules/auditoria/registrar";
import { Perfil } from "@/generated/prisma/enums";
import { DURACAO_TOKEN_SENHA_MS, expiraEm, gerarToken, hashToken } from "@/modules/auth/token";

export type EstadoUsuario = { erro?: string; sucesso?: string; link?: string } | undefined;

const dadosSchema = z.object({
  nome: z.string().trim().min(3, "O nome precisa de pelo menos 3 caracteres."),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  perfil: z.enum(Perfil),
});

/**
 * Monta a URL de redefinição a partir do host da requisição.
 *
 * Sem variável de ambiente com o endereço: a instalação é na rede local e o
 * servidor pode ser alcançado por IP ou por nome, dependendo de quem acessa.
 * Usar o host de quem pediu garante um link que funciona para essa pessoa.
 */
async function montarLink(token: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo = env().COOKIE_SEGURO ? "https" : "http";
  return `${protocolo}://${host}/redefinir-senha/${token}`;
}

async function criarTokenDeSenha(usuarioId: string): Promise<string> {
  const token = gerarToken();
  await prisma.$transaction([
    // Um pedido por vez: gerar um link novo invalida o anterior.
    prisma.tokenSenha.updateMany({
      where: { usuarioId, usadoEm: null },
      data: { usadoEm: new Date() },
    }),
    prisma.tokenSenha.create({
      data: {
        usuarioId,
        tokenHash: hashToken(token, env().SESSION_SECRET),
        expiraEm: expiraEm(DURACAO_TOKEN_SENHA_MS),
      },
    }),
  ]);
  return montarLink(token);
}

export async function criarUsuario(
  _estado: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const permissao = await autorizar("usuario", "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const dados = dadosSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    perfil: formData.get("perfil"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const jaExiste = await prisma.usuario.findUnique({
    where: { email: dados.data.email },
    select: { id: true },
  });
  if (jaExiste) return { erro: "Já existe um usuário com esse e-mail." };

  const { ip } = await origemDaRequisicao();
  const criado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        ...dados.data,
        // Hash impossível de casar: a conta nasce sem senha utilizável e só
        // entra em uso depois que a pessoa usa o link de definição.
        senhaHash: "!",
      },
      select: { id: true, nome: true, email: true, perfil: true },
    });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.CRIAR,
        entidade: "Usuario",
        entidadeId: usuario.id,
        descricao: `Usuário ${usuario.nome} criado com perfil ${usuario.perfil}.`,
        dadosDepois: usuario,
      },
      tx,
    );
    return usuario;
  });

  const link = await criarTokenDeSenha(criado.id);
  revalidatePath("/usuarios");
  return {
    sucesso: `Usuário ${criado.nome} criado. Entregue o link abaixo para que ele defina a senha.`,
    link,
  };
}

const atualizarSchema = dadosSchema.extend({
  id: z.string().min(1),
  ativo: z.boolean(),
});

export async function atualizarUsuario(
  _estado: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const permissao = await autorizar("usuario", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const dados = atualizarSchema.safeParse({
    id: formData.get("id"),
    nome: formData.get("nome"),
    email: formData.get("email"),
    perfil: formData.get("perfil"),
    ativo: formData.get("ativo") === "on",
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, ...novo } = dados.data;

  const antes = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });
  if (!antes) return { erro: "Usuário não encontrado." };

  const conflito = await prisma.usuario.findFirst({
    where: { email: novo.email, id: { not: id } },
    select: { id: true },
  });
  if (conflito) return { erro: "Já existe outro usuário com esse e-mail." };

  const impedimento = await impedimentoDeAlteracao(antes, novo, permissao.usuario.id);
  if (impedimento) return { erro: impedimento };

  const { ip } = await origemDaRequisicao();
  const mudancas = diff(antes, novo);

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: novo });
    await registrar(
      {
        ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "Usuario",
        entidadeId: id,
        descricao: `Usuário ${antes.nome} alterado.`,
        dadosAntes: mudancas.antes,
        dadosDepois: mudancas.depois,
      },
      tx,
    );
  });

  // Perfil e situação valem a partir de agora, não a partir do próximo login:
  // uma sessão aberta continuaria carregando a permissão antiga.
  if (antes.perfil !== novo.perfil || (antes.ativo && !novo.ativo)) {
    await encerrarSessoesDoUsuario(id);
  }

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${id}`);
  return { sucesso: "Alterações salvas." };
}

/**
 * Regras que protegem contra o erro clássico de administração: alguém tirar o
 * próprio acesso, ou o último administrador sair de cena e trancar todo mundo
 * do lado de fora.
 */
async function impedimentoDeAlteracao(
  antes: { id: string; perfil: Perfil; ativo: boolean },
  novo: { perfil: Perfil; ativo: boolean },
  atorId: string,
): Promise<string | null> {
  const ehVoce = antes.id === atorId;
  if (ehVoce && !novo.ativo) return "Você não pode desativar a própria conta.";
  if (ehVoce && novo.perfil !== Perfil.ADMINISTRADOR) {
    return "Você não pode retirar o próprio perfil de administrador.";
  }

  const perdeAdmin =
    antes.perfil === Perfil.ADMINISTRADOR &&
    antes.ativo &&
    (novo.perfil !== Perfil.ADMINISTRADOR || !novo.ativo);

  if (perdeAdmin) {
    const outros = await prisma.usuario.count({
      where: { perfil: Perfil.ADMINISTRADOR, ativo: true, id: { not: antes.id } },
    });
    if (outros === 0) {
      return "Este é o único administrador ativo. Promova outra pessoa antes de mudar este cadastro.";
    }
  }
  return null;
}

export async function gerarLinkDeSenha(
  _estado: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const permissao = await autorizar("usuario", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, ativo: true },
  });
  if (!usuario) return { erro: "Usuário não encontrado." };
  if (!usuario.ativo) return { erro: "Ative a conta antes de gerar o link." };

  const link = await criarTokenDeSenha(usuario.id);
  const { ip } = await origemDaRequisicao();
  await registrar({
    ator: { id: permissao.usuario.id, nome: permissao.usuario.nome, ip },
    acao: AcaoAuditoria.ATUALIZAR,
    entidade: "Usuario",
    entidadeId: usuario.id,
    descricao: `Link de redefinição de senha gerado para ${usuario.nome}.`,
  });

  revalidatePath(`/usuarios/${id}`);
  return { sucesso: "Link gerado. Vale por 24 horas e só pode ser usado uma vez.", link };
}

export async function encerrarSessoes(
  _estado: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const permissao = await autorizar("usuario", "editar");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const quantas = await encerrarSessoesDoUsuario(id);
  revalidatePath(`/usuarios/${id}`);
  return {
    sucesso:
      quantas === 0
        ? "Não havia sessão aberta."
        : `${quantas} sessão(ões) encerrada(s).`,
  };
}
