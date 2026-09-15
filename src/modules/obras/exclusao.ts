/**
 * Quando uma obra pode ser apagada.
 *
 * Só documento ativo trava (pedido do cliente em 15/09/2026). Medições,
 * rerratificações e tramitação saem em cascata com a obra; a auditoria não
 * tem chave estrangeira e continua registrando o que existiu. O documento
 * trava porque é o único registro que o usuário apaga por conta própria, na
 * aba Documentos — o caminho é esvaziar a aba e então apagar a obra. Ver
 * ponto #8 de docs/pontos-para-reuniao.md.
 */
export function bloqueioExclusaoObra(documentosAtivos: number): string | null {
  if (documentosAtivos === 0) return null;
  return `Esta obra tem ${documentosAtivos} documento(s) ativo(s). Exclua-os na aba Documentos antes de apagar a obra.`;
}
