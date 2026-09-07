import { join, resolve, sep } from "node:path";

/**
 * Resolução de caminho dentro do armazenamento.
 *
 * Vive fora de `lib/storage.ts` porque aquele arquivo é `server-only` e
 * importa `env()` — e esta é a regra de segurança mais importante do módulo
 * documental, justamente a que precisa de teste.
 *
 * A defesa não é procurar `..` no texto. É resolver o caminho e conferir onde
 * ele foi parar: assim cobre `..`, caminho absoluto, barra invertida no
 * Windows e as codificações que a checagem textual deixa passar.
 */
export function resolverDentroDe(raiz: string, caminhoRelativo: string): string {
  const base = resolve(raiz);
  const alvo = resolve(base, caminhoRelativo);
  if (alvo !== base && !alvo.startsWith(base + sep)) {
    throw new Error("Caminho de arquivo fora do armazenamento.");
  }
  return alvo;
}

/**
 * Onde o arquivo de uma obra mora: `obras/<obraId>/<nomeArmazenado>`.
 *
 * Uma pasta por obra mantém o diretório navegável para quem for fazer backup
 * ou precisar dos arquivos sem o sistema — o servidor é do cliente, e um dia
 * alguém abre essa pasta no Finder.
 */
export function caminhoDaObra(obraId: string, nomeArmazenado: string): string {
  return join("obras", obraId, nomeArmazenado);
}
