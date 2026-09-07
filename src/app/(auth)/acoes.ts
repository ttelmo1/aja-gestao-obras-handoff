"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { criarSessao, encerrarSessao, encerrarSessoesDoUsuario, limparSessoesVencidas, origemDaRequisicao } from "@/lib/sessao";
import { bloqueadoPor, limparFalhas, registrarFalha } from "@/modules/auth/throttle";
import { AcaoAuditoria, registrar } from "@/modules/auditoria/registrar";
import { conferirSenha, hashSenha, HASH_FALSO, senhaSchema } from "@/modules/auth/senha";
import { DURACAO_TOKEN_SENHA_MS, expiraEm, expirou, gerarToken, hashToken } from "@/modules/auth/token";
import { env } from "@/lib/env";

export type EstadoFormulario = { erro?: string; sucesso?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Informe o e-mail."),
  senha: z.string().min(1, "Informe a senha."),
});

/**
 * Só aceita caminho interno. Sem isso, `?destino=https://…` transformaria o
 * login numa página de redirecionamento aberto.
 */
function destinoSeguro(valor: FormDataEntryValue | null): string {
  const s = typeof valor === "string" ? valor : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function entrar(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { email, senha } = dados.data;

  const { ip } = await origemDaRequisicao();

  // Freio por e-mail, sem IP na chave: o IP não é confiável (ver
  // `origemDaRequisicao`), e incluí-lo dava tentativas infinitas a quem
  // rotacionasse o header. O preço é que dá para travar o login de alguém por
  // alguns minutos errando a senha de propósito — bloqueio temporário e
  // registrado, contra uma força bruta que antes passava direto.
  const chave = email;
  const segundos = bloqueadoPor(chave);
  if (segundos > 0) {
    const minutos = Math.ceil(segundos / 60);
    return { erro: `Tentativas demais. Espere ${minutos} minuto(s) e tente de novo.` };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, nome: true, senhaHash: true, ativo: true },
  });

  // Compara mesmo sem usuário: a resposta demora o mesmo tanto nos dois casos,
  // e a mensagem é a mesma, para a tela não virar um verificador de e-mails.
  // Contas recém-criadas guardam um hash impossível ("!") até a pessoa usar o
  // link de definição de senha; trocar por HASH_FALSO mantém o tempo de
  // resposta igual ao de uma senha errada comum.
  const hashParaComparar = usuario?.senhaHash.startsWith("$2")
    ? usuario.senhaHash
    : HASH_FALSO;
  const confere = await conferirSenha(senha, hashParaComparar);

  if (!usuario || !usuario.ativo || !confere) {
    registrarFalha(chave);
    return { erro: "E-mail ou senha incorretos." };
  }

  limparFalhas(chave);
  await limparSessoesVencidas();
  await criarSessao(usuario.id);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLogin: new Date() },
  });
  await registrar({
    ator: { id: usuario.id, nome: usuario.nome, ip },
    acao: AcaoAuditoria.LOGIN,
    entidade: "Usuario",
    entidadeId: usuario.id,
    descricao: "Entrou no sistema.",
  });

  // `redirect` funciona lançando: precisa ficar fora de qualquer try/catch.
  redirect(destinoSeguro(formData.get("destino")));
}

export async function sair(): Promise<void> {
  const { ip } = await origemDaRequisicao();
  const usuarioId = await encerrarSessao();
  if (usuarioId) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { nome: true },
    });
    await registrar({
      ator: { id: usuarioId, nome: usuario?.nome ?? "(desconhecido)", ip },
      acao: AcaoAuditoria.LOGOUT,
      entidade: "Usuario",
      entidadeId: usuarioId,
      descricao: "Saiu do sistema.",
    });
  }
  redirect("/login");
}

/**
 * Pedido de redefinição de senha.
 *
 * Não há servidor de e-mail na instalação (rede local, sem internet), então
 * este formulário não envia nada: ele registra o pedido, que aparece para o
 * administrador na tela de usuários. O administrador gera o link e entrega à
 * pessoa. Ver `docs/pontos-para-reuniao.md`, ponto 12.
 */
export async function pedirRedefinicao(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, ativo: true },
  });

  if (usuario?.ativo) {
    const token = gerarToken();
    await prisma.tokenSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(token, env().SESSION_SECRET),
        expiraEm: expiraEm(DURACAO_TOKEN_SENHA_MS),
      },
    });
  }

  // Mensagem igual exista ou não a conta — a tela é pública.
  return {
    sucesso:
      "Pedido registrado. Procure o administrador do sistema para receber o link de redefinição.",
  };
}

const redefinirSchema = z
  .object({
    token: z.string().min(1),
    senha: senhaSchema,
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    message: "As duas senhas não conferem.",
    path: ["confirmacao"],
  });

export async function redefinirSenha(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = redefinirSchema.safeParse({
    token: formData.get("token"),
    senha: formData.get("senha"),
    confirmacao: formData.get("confirmacao"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const registro = await prisma.tokenSenha.findUnique({
    where: { tokenHash: hashToken(dados.data.token, env().SESSION_SECRET) },
    select: {
      id: true,
      usadoEm: true,
      expiraEm: true,
      usuario: { select: { id: true, nome: true, ativo: true } },
    },
  });

  if (!registro || registro.usadoEm || expirou(registro.expiraEm) || !registro.usuario.ativo) {
    return { erro: "Link inválido ou vencido. Peça um novo ao administrador." };
  }

  const { ip } = await origemDaRequisicao();
  const senhaHash = await hashSenha(dados.data.senha);

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: registro.usuario.id },
      data: { senhaHash },
    });
    await tx.tokenSenha.update({
      where: { id: registro.id },
      data: { usadoEm: new Date() },
    });
    // Invalida os outros pedidos pendentes da mesma pessoa.
    await tx.tokenSenha.updateMany({
      where: { usuarioId: registro.usuario.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    await registrar(
      {
        ator: { id: registro.usuario.id, nome: registro.usuario.nome, ip },
        acao: AcaoAuditoria.ATUALIZAR,
        entidade: "Usuario",
        entidadeId: registro.usuario.id,
        descricao: "Senha redefinida pelo próprio usuário.",
      },
      tx,
    );
  });

  // Trocar a senha derruba tudo que estava aberto, inclusive em outra máquina.
  await encerrarSessoesDoUsuario(registro.usuario.id);

  redirect("/login?redefinida=1");
}
