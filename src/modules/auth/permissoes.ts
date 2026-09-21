import { Perfil } from "@/generated/prisma/enums";

/**
 * Matriz de permissões em código, não em tabela.
 *
 * O detalhamento fino por perfil ainda é ponto em aberto com o cliente
 * (requisitos.md seção 3). Enquanto isso, manter aqui deixa o ajuste barato:
 * uma linha desta matriz, sem migration nem tela de administração.
 * Se o cliente pedir perfis customizáveis por usuário, isto vira tabela.
 */
export const RECURSOS = [
  "obra",
  "medicao",
  "tramitacao",
  "documento",
  "rerratificacao",
  "relatorio",
  "auditoria",
  "usuario",
  "cadastro", // contratantes, setores
] as const;

export type Recurso = (typeof RECURSOS)[number];

export const ACOES = ["ver", "criar", "editar", "excluir"] as const;
export type Acao = (typeof ACOES)[number];

type Matriz = Record<Perfil, Partial<Record<Recurso, readonly Acao[]>>>;

const TODAS: readonly Acao[] = ACOES;
const LEITURA: readonly Acao[] = ["ver"];
const ESCRITA: readonly Acao[] = ["ver", "criar", "editar"];

export const MATRIZ: Matriz = {
  ADMINISTRADOR: {
    obra: TODAS,
    medicao: TODAS,
    tramitacao: TODAS,
    documento: TODAS,
    rerratificacao: TODAS,
    relatorio: TODAS,
    auditoria: LEITURA, // auditoria é append-only: ninguém edita ou apaga
    usuario: TODAS,
    cadastro: TODAS,
  },
  GESTOR: {
    obra: ESCRITA,
    medicao: TODAS,
    tramitacao: TODAS,
    documento: TODAS,
    rerratificacao: TODAS,
    relatorio: LEITURA,
    auditoria: LEITURA,
    cadastro: ESCRITA,
  },
  OPERACIONAL: {
    obra: LEITURA,
    medicao: ESCRITA,
    tramitacao: ESCRITA,
    documento: ESCRITA,
    rerratificacao: LEITURA,
    relatorio: LEITURA,
    cadastro: LEITURA,
  },
  VISUALIZADOR: {
    obra: LEITURA,
    medicao: LEITURA,
    tramitacao: LEITURA,
    documento: LEITURA,
    rerratificacao: LEITURA,
    relatorio: LEITURA,
    cadastro: LEITURA,
  },
};

export function pode(perfil: Perfil, recurso: Recurso, acao: Acao): boolean {
  return MATRIZ[perfil][recurso]?.includes(acao) ?? false;
}

export const ROTULOS_PERFIL: Record<Perfil, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  VISUALIZADOR: "Visualizador",
};
