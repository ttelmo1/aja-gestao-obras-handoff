import { AcaoAuditoria } from "@/generated/prisma/enums";

/**
 * Rótulos da trilha de auditoria (requisitos.md 1.8).
 *
 * O verbo está no passado e na terceira pessoa porque a frase da linha do
 * tempo é montada como "Fulano <ação> ...": "João Silva criou", "Maria Souza
 * excluiu". No mockup a leitura é essa, em texto corrido.
 */
export const ACOES_AUDITORIA = [
  AcaoAuditoria.CRIAR,
  AcaoAuditoria.ATUALIZAR,
  AcaoAuditoria.EXCLUIR,
  AcaoAuditoria.TRAMITAR,
  AcaoAuditoria.UPLOAD,
  AcaoAuditoria.DOWNLOAD,
  AcaoAuditoria.EXPORTAR,
  AcaoAuditoria.LOGIN,
  AcaoAuditoria.LOGOUT,
] as const;

export const ROTULOS_ACAO: Record<AcaoAuditoria, string> = {
  CRIAR: "Criou",
  ATUALIZAR: "Alterou",
  EXCLUIR: "Excluiu",
  TRAMITAR: "Tramitou",
  UPLOAD: "Enviou",
  DOWNLOAD: "Baixou",
  EXPORTAR: "Exportou",
  LOGIN: "Entrou",
  LOGOUT: "Saiu",
};

/**
 * Cor do ponto na linha do tempo. Exclusão em vermelho e criação em verde
 * dão o mesmo relevo que o resto do sistema; o dourado do mockup fica para
 * o que não é nem nascimento nem morte de registro.
 */
export const CORES_ACAO: Record<AcaoAuditoria, string> = {
  CRIAR: "var(--success)",
  ATUALIZAR: "var(--gold)",
  EXCLUIR: "var(--danger)",
  TRAMITAR: "var(--blue)",
  UPLOAD: "var(--gold)",
  DOWNLOAD: "var(--muted)",
  EXPORTAR: "var(--muted)",
  LOGIN: "var(--muted)",
  LOGOUT: "var(--muted)",
};

/**
 * Nome legível da entidade. A coluna guarda o nome do model em código
 * ("TramitacaoMovimento"), que não é o que o usuário chama a coisa.
 */
export const ROTULOS_ENTIDADE: Record<string, string> = {
  Obra: "Obra",
  Medicao: "Medição",
  EtapaObra: "Etapa de tramitação",
  TramitacaoMovimento: "Tramitação",
  Documento: "Documento",
  Rerratificacao: "Rerratificação",
  Contratante: "Contratante",
  // O cadastro de responsáveis saiu em 21/09/2026; o rótulo fica para os
  // registros antigos da trilha, que são append-only e continuam lá.
  Responsavel: "Responsável",
  Setor: "Setor",
  Usuario: "Usuário",
  Sessao: "Sessão",
};

export function rotuloDaEntidade(entidade: string): string {
  return ROTULOS_ENTIDADE[entidade] ?? entidade;
}

/** Entidades que aparecem no filtro, na ordem em que fazem sentido. */
export const ENTIDADES_AUDITAVEIS = [
  "Obra",
  "Medicao",
  "TramitacaoMovimento",
  "EtapaObra",
  "Documento",
  "Rerratificacao",
  "Contratante",
  "Setor",
  "Usuario",
] as const;
