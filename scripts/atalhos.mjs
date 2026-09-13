/**
 * Atalhos (symlink/junction) dentro do pacote de instalação.
 *
 * O Next cria apelidos de pacote em `.next/node_modules` — `pg-<hash>` e
 * `@prisma/client-<hash>`, que é como o Turbopack nomeia externals — e os cria
 * como atalhos para o caminho ABSOLUTO da máquina que compilou. O
 * `Compress-Archive` do Windows descarta atalho em silêncio: o `.zip` chega ao
 * cliente sem eles, o serviço sobe e todas as rotas respondem 500 com "Cannot
 * find module" (foi a primeira instalação no cliente, 13/09/2026).
 *
 * O `dereference: true` do `cpSync` deveria resolver, mas o comportamento muda
 * com a versão de Node: no 24.14 ele dereferencia mesmo quando a opção está
 * desligada, e no 24.16 do runner deixou os dois atalhos passarem intactos.
 * Por isso o pacote não depende dessa opção — resolve à mão e confere depois.
 *
 * Mora em módulo separado do empacotador para ter teste: o empacotador roda o
 * build inteiro ao ser importado, e este pedaço já custou duas rodadas de CI.
 */
import { cpSync, readdirSync, realpathSync, rmdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

/** Todo atalho dentro de `raiz`, em caminho relativo a ela. */
export function atalhosEm(raiz) {
  const achados = [];
  (function procurar(diretorio) {
    for (const item of readdirSync(diretorio, { withFileTypes: true })) {
      const caminho = path.join(diretorio, item.name);
      if (item.isSymbolicLink()) achados.push(path.relative(raiz, caminho));
      else if (item.isDirectory()) procurar(caminho);
    }
  })(raiz);
  return achados;
}

/**
 * Troca cada atalho de `raiz` pelo conteúdo de verdade que ele aponta.
 *
 * Devolve os caminhos resolvidos. Explode se o alvo de algum atalho não
 * existir: pacote pela metade tem que parar aqui, não na máquina do cliente.
 */
export function resolverAtalhos(raiz) {
  const resolvidos = [];
  // Em passadas, porque o conteúdo que entra no lugar de um atalho pode trazer
  // outros. O limite evita rodar para sempre se um atalho apontar para cima.
  for (let passada = 0; passada < 5; passada += 1) {
    const atalhos = atalhosEm(raiz);
    if (atalhos.length === 0) return resolvidos;
    for (const relativo of atalhos) {
      const caminho = path.join(raiz, relativo);
      const alvo = realpathSync(caminho);
      const ehPasta = statSync(alvo).isDirectory();
      // Apaga só o atalho, nunca o que ele aponta: no Windows atalho de pasta
      // sai por `rmdir`, e um `rmSync` recursivo aqui arriscaria o alvo.
      if (ehPasta) rmdirSync(caminho);
      else unlinkSync(caminho);
      cpSync(alvo, caminho, { recursive: ehPasta, dereference: true });
      resolvidos.push(relativo);
    }
  }
  throw new Error(`atalhos demais em ${raiz}: ${atalhosEm(raiz).join(", ")}`);
}
