import assert from "node:assert/strict";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

// JavaScript de propósito, e não TypeScript: roda no runner do empacotamento,
// que não tem carregador de TS.
import { atalhosEm, resolverAtalhos } from "../scripts/atalhos.mjs";

/**
 * O empacotador não pode deixar atalho dentro do pacote: o Compress-Archive do
 * Windows os descarta em silêncio e o sistema chega ao cliente sem os apelidos
 * de pacote que o Next cria em `.next/node_modules`. O resultado é serviço no
 * ar com todas as rotas em 500. Aconteceu de verdade em 13/09/2026.
 */
describe("atalhos do pacote", () => {
  const base = mkdtempSync(join(tmpdir(), "aja-atalhos-"));
  after(() => rmSync(base, { recursive: true, force: true }));

  function cenario(nome: string) {
    const raiz = join(base, nome);
    // O alvo fica FORA da raiz de busca, como o `node_modules` do repositório
    // fica fora do standalone — é esse atalho que não sobrevive ao `.zip`.
    const alvo = join(base, `${nome}-alvo`);
    mkdirSync(join(raiz, "fundo"), { recursive: true });
    mkdirSync(join(alvo, "lib"), { recursive: true });
    writeFileSync(join(alvo, "package.json"), '{"name":"pg"}\n');
    writeFileSync(join(alvo, "lib", "index.js"), "module.exports = 1;\n");
    return { raiz, alvo };
  }

  it("troca o atalho de pasta pelo conteúdo, sem mexer no alvo", () => {
    const { raiz, alvo } = cenario("pasta");
    const apelido = join(raiz, "fundo", "pg-587764f78a6c7a9c");
    symlinkSync(alvo, apelido, "junction");

    assert.deepEqual(atalhosEm(raiz), [join("fundo", "pg-587764f78a6c7a9c")]);

    const resolvidos = resolverAtalhos(raiz);

    assert.deepEqual(resolvidos, [join("fundo", "pg-587764f78a6c7a9c")]);
    assert.deepEqual(atalhosEm(raiz), [], "não pode sobrar atalho");
    assert.equal(lstatSync(apelido).isSymbolicLink(), false);
    assert.equal(
      readFileSync(join(apelido, "lib", "index.js"), "utf8"),
      "module.exports = 1;\n",
      "o conteúdo apontado tem que estar dentro da pasta agora",
    );
    // Apagar o atalho não pode levar junto o que ele aponta.
    assert.equal(readFileSync(join(alvo, "package.json"), "utf8"), '{"name":"pg"}\n');
  });

  // Atalho de ARQUIVO no Windows só é criado com privilégio (ou modo de
  // desenvolvedor ligado); junction, que é o que o Next usa, não precisa. Onde
  // não dá para criar, o caso não tem como ser exercido — pular é honesto.
  const podeSymlinkDeArquivo = (() => {
    try {
      const origem = join(base, "sonda.txt");
      writeFileSync(origem, "x");
      symlinkSync(origem, join(base, "sonda-atalho.txt"), "file");
      return true;
    } catch {
      return false;
    }
  })();

  it("troca o atalho de arquivo pelo arquivo", { skip: !podeSymlinkDeArquivo }, () => {
    const { raiz, alvo } = cenario("arquivo");
    const apelido = join(raiz, "fundo", "index.js");
    symlinkSync(join(alvo, "lib", "index.js"), apelido, "file");

    resolverAtalhos(raiz);

    assert.deepEqual(atalhosEm(raiz), []);
    assert.equal(lstatSync(apelido).isSymbolicLink(), false);
    assert.equal(readFileSync(apelido, "utf8"), "module.exports = 1;\n");
  });

  it("explode quando o atalho aponta para o que não existe", () => {
    const { raiz } = cenario("quebrado");
    symlinkSync(join(base, "nao-existe"), join(raiz, "fundo", "orfao"), "junction");

    // Pacote pela metade tem que parar no empacotamento, não na máquina do
    // cliente — lá o sintoma seria "Cannot find module" em toda rota.
    assert.throws(() => resolverAtalhos(raiz));
  });

  it("não faz nada quando não há atalho", () => {
    const { raiz } = cenario("limpo");
    assert.deepEqual(resolverAtalhos(raiz), []);
    assert.deepEqual(atalhosEm(raiz), []);
  });
});
