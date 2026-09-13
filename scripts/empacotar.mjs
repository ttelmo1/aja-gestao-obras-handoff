/**
 * Monta o pacote de instalação on-premise: um `.zip` autocontido mais o
 * `.sha256` que o script de atualização confere na máquina do cliente.
 *
 * Uso:
 *   node scripts/empacotar.mjs --versao 2026.09.15 [--saida dist]
 *
 * **Por que Node e não PowerShell**, como previa o plano: este passo roda no
 * GitHub Actions, onde o Node é garantido — acabamos de compilar com ele. Em
 * Node o script é o mesmo no runner Windows e na máquina de quem desenvolve,
 * o que permite testá-lo antes de depender de um workflow que só falha depois
 * do push. Os scripts que rodam NA máquina do cliente continuam em PowerShell:
 * lá o assunto é serviço do Windows, junction e pg_dump.
 *
 * O que o pacote leva e por quê está em docs/instalacao-on-premise.md, seção 3.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  createReadStream,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { atalhosEm, resolverAtalhos } from "./atalhos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argumento(nome, padrao = null) {
  const i = process.argv.indexOf(`--${nome}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

function passo(texto) {
  console.log(`\n== ${texto}`);
}

function abortar(motivo) {
  console.error(`\nERRO: ${motivo}`);
  process.exit(1);
}

function rodar(comando, args, opcoes = {}) {
  execFileSync(comando, args, {
    cwd: RAIZ,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opcoes,
  });
}

// ---------------------------------------------------------------- versão

const versao = argumento("versao");
if (!versao) {
  abortar("informe a versão: --versao 2026.09.15");
}
// A versão vira nome de pasta em D:\aja-obras\releases\ e nome de arquivo.
if (!/^[0-9A-Za-z._-]+$/.test(versao)) {
  abortar(`versão inválida: "${versao}". Use apenas letras, números, ponto, hífen e underscore.`);
}

const saida = path.resolve(RAIZ, argumento("saida", "dist"));
const pacote = path.join(saida, `aja-obras-${versao}`);
const zip = `${pacote}.zip`;

console.log(`Empacotando a versão ${versao}`);
console.log(`Saída: ${saida}`);

// ---------------------------------------------------------------- build

passo("Compilando a aplicação (output: standalone)");
rmSync(path.join(RAIZ, ".next"), { recursive: true, force: true });
rodar("npm", ["run", "build"], {
  env: { ...process.env, EMPACOTAR_STANDALONE: "1", NODE_ENV: "production" },
});

const standalone = path.join(RAIZ, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
  abortar(
    "o build não gerou .next/standalone/server.js — confirme output: \"standalone\" em next.config.ts",
  );
}

// ---------------------------------------------------------------- staging

passo("Montando a pasta do pacote");
rmSync(pacote, { recursive: true, force: true });
mkdirSync(pacote, { recursive: true });
// `dereference: true` pede para o copiador seguir os atalhos que o Next deixa
// em `.next/node_modules`, mas o que ele faz muda com a versão de Node — quem
// termina o serviço, igual em qualquer runner, é o `resolverAtalhos`
// (scripts/atalhos.mjs explica o estrago que atalho no `.zip` causa).
cpSync(standalone, pacote, { recursive: true, dereference: true });
for (const resolvido of resolverAtalhos(pacote)) {
  console.log(`  atalho resolvido: ${resolvido}`);
}

// `server.js` não serve `public/` nem `.next/static` sozinho: o build não os
// copia para dentro do standalone (é o comportamento documentado do Next, que
// assume CDN na frente). Aqui não há CDN — sem estes dois passos o sistema
// sobe sem CSS nem JS, e o sintoma é uma tela branca com o HTML cru.
cpSync(path.join(RAIZ, ".next", "static"), path.join(pacote, ".next", "static"), {
  recursive: true,
});
if (existsSync(path.join(RAIZ, "public"))) {
  cpSync(path.join(RAIZ, "public"), path.join(pacote, "public"), { recursive: true });
}

// ------------------------------------------------ o que não vai ao cliente

passo("Limpando o que não é da instalação");
// O rastreador do Next copia para o standalone vários arquivos da raiz do
// repositório que a aplicação não lê em runtime. Nenhum é sigiloso, mas todos
// confundem quem abrir o pacote na máquina do cliente procurando o que mexer —
// e `prisma7.config.ts` é pior que confuso: quem rodar o CLI do Prisma a partir
// daqui cai num config TypeScript que depende de `dotenv` e de carregador de
// TS, nenhum dos dois no pacote. O caminho suportado é `ferramentas\`.
//
// Ficam de propósito: `server.js`, `.next\`, `node_modules\`, `public\`,
// `package.json` (resolução de módulo), `next.config.ts` e `src\` — este
// último porque o client gerado do Prisma mora nele.
for (const lixo of [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docker-compose.yml",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "vercel.json",
  "prisma7.config.ts",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.tsbuildinfo",
]) {
  const caminho = path.join(pacote, lixo);
  if (existsSync(caminho)) {
    rmSync(caminho, { recursive: true, force: true });
  }
}

passo("Removendo segredos do pacote");
// O Next copia o `.env` da máquina de build para dentro do standalone de
// propósito — é o arquivo que a aplicação lê em runtime — e a exclusão de
// tracing não o alcança (testado). Num pacote montado na máquina de quem
// desenvolve, isso levaria SESSION_SECRET e DATABASE_URL dentro do `.zip`, e
// sobrescreveria o `.env` do cliente na instalação.
for (const arquivo of [".env", ".env.local", ".env.production"]) {
  const caminho = path.join(pacote, arquivo);
  if (existsSync(caminho)) {
    rmSync(caminho, { force: true });
    console.log(`  removido: ${arquivo}`);
  }
}
for (const arquivo of [".env", ".env.local", ".env.production"]) {
  if (existsSync(path.join(pacote, arquivo))) {
    abortar(`${arquivo} continua no pacote — não publique este .zip`);
  }
}

// A versão que o /api/health devolve. Fica em arquivo, e não em variável de
// ambiente do serviço, para não envelhecer a cada atualização.
writeFileSync(path.join(pacote, "versao.txt"), `${versao}\n`, "utf8");

// A versão do Node com que este pacote foi compilado. `standalone` traz as
// dependências, NÃO traz o runtime: se a máquina do cliente tiver outra linha
// de Node, binário nativo (sharp, por exemplo) quebra. O instalador compara.
const versaoNode = readFileSync(path.join(RAIZ, ".nvmrc"), "utf8").trim();
if (!versaoNode) abortar(".nvmrc vazio — é dele que sai a versão de Node do pacote");
writeFileSync(path.join(pacote, "node-versao.txt"), `${versaoNode}\n`, "utf8");
console.log(`  node do pacote: ${versaoNode} (rodando em ${process.version})`);
if (process.version.replace(/^v/, "").split(".")[0] !== versaoNode.split(".")[0]) {
  abortar(
    `este empacotamento está rodando em ${process.version}, mas o .nvmrc pede ${versaoNode}. ` +
      "Compilar numa linha de Node diferente da que o cliente vai rodar é a receita de erro nativo em produção.",
  );
}

// ---------------------------------------------------------------- runtime

passo("Embutindo o Node");
// O pacote leva o próprio node.exe em runtime\ — exatamente o que compilou a
// aplicação. A máquina do cliente não precisa de instalador de Node, e a versão
// deixa de ser algo que alguém confere: vem junto com cada release, e a
// atualização troca o Node junto com o sistema.
if (process.platform === "win32") {
  if (process.version.replace(/^v/, "") !== versaoNode) {
    const recado = `este Node é ${process.version} e o .nvmrc pede ${versaoNode}: o node.exe embutido seria de outra versão.`;
    // No CI é erro: o pacote publicado tem que levar exatamente a versão
    // declarada. Fora dele é aviso, para dar para montar um pacote de teste na
    // máquina de quem desenvolve — foi o que faltou em 13/09/2026, quando o
    // pacote só pôde ser testado depois de ir ao cliente.
    if (process.env.CI) abortar(recado);
    console.log(`  AVISO: ${recado}`);
  }
  const runtime = path.join(pacote, "runtime");
  mkdirSync(runtime, { recursive: true });
  cpSync(process.execPath, path.join(runtime, "node.exe"));
  // A licença do Node pede que o aviso acompanhe o binário redistribuído.
  const licenca = path.join(path.dirname(process.execPath), "LICENSE");
  if (existsSync(licenca)) cpSync(licenca, path.join(runtime, "LICENSE"));
  console.log(`  runtime\\node.exe ${process.version}`);
} else {
  console.log("  fora do Windows: pacote sem runtime\\ — serve só para testar o empacotamento");
}

// ---------------------------------------------------------------- migrador

passo("Montando as ferramentas de instalação (CLI do Prisma e afins)");
// A máquina do cliente precisa rodar `prisma migrate deploy` e criar o
// primeiro usuário, e não tem internet — então as ferramentas vão dentro do
// pacote, com node_modules próprio. A pasta é separada da aplicação por dois
// motivos: o `prisma.config.js` daqui é JavaScript simples (o
// `prisma7.config.ts` do repositório é TypeScript e depende de `dotenv` e de um
// carregador de TS, que não vão no pacote), e `bcryptjs` — necessário para
// gerar a senha do primeiro admin no mesmo formato que o login confere — não
// sobrevive ao empacotamento do Next, que o embute nos chunks do servidor.
const migrador = path.join(pacote, "ferramentas");
mkdirSync(migrador, { recursive: true });

const raizPackage = JSON.parse(readFileSync(path.join(RAIZ, "package.json"), "utf8"));
const versaoPrisma = raizPackage.devDependencies?.prisma;
const versaoBcrypt = raizPackage.dependencies?.bcryptjs;
// `pg` não está no package.json da aplicação (entra por @prisma/adapter-pg),
// mas o criar-admin.mjs o importa direto — então a versão vem da árvore
// instalada, para o pacote não depender de hoisting.
const versaoPg = JSON.parse(
  readFileSync(path.join(RAIZ, "node_modules", "pg", "package.json"), "utf8"),
).version;
if (!versaoPrisma) abortar("não achei a versão do prisma em devDependencies");
if (!versaoBcrypt) abortar("não achei a versão do bcryptjs em dependencies");
if (!versaoPg) abortar("não achei a versão instalada do pg");

writeFileSync(
  path.join(migrador, "package.json"),
  `${JSON.stringify(
    {
      name: "aja-obras-ferramentas",
      private: true,
      description:
        "Ferramentas da instalação: aplicam migrations e criam o primeiro usuário numa máquina sem internet.",
      dependencies: {
        prisma: versaoPrisma,
        bcryptjs: versaoBcrypt,
        // `pg` para o criar-admin.mjs falar com o banco sem depender do
        // client gerado do Prisma, que é TypeScript e não roda solto.
        pg: versaoPg,
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  path.join(migrador, "prisma.config.js"),
  `/**
 * Config do Prisma usada SÓ na máquina do cliente, pelo atualizar.ps1.
 *
 * JavaScript simples de propósito: o prisma7.config.ts do repositório importa
 * "dotenv/config" e precisa de carregador de TypeScript, e nenhum dos dois vai
 * no pacote. A URL vem do ambiente, exportada pelo script a partir do .env da
 * instalação — nunca fica escrita aqui.
 */
module.exports = {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL },
};
`,
  "utf8",
);

cpSync(path.join(RAIZ, "prisma", "schema.prisma"), path.join(migrador, "prisma", "schema.prisma"), {
  recursive: true,
});
cpSync(
  path.join(RAIZ, "prisma", "migrations"),
  path.join(migrador, "prisma", "migrations"),
  { recursive: true },
);

// `--omit=dev` e versão exata: o que entra aqui é só o CLI e o engine da
// plataforma do runner. É por isso que o build tem que rodar em windows-latest
// (docs/instalacao-on-premise.md, seção 3).
rodar("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--loglevel=error"], {
  cwd: migrador,
});
if (!existsSync(path.join(migrador, "node_modules", "prisma", "build", "index.js"))) {
  abortar("o CLI do Prisma não ficou nas ferramentas");
}
if (!existsSync(path.join(migrador, "node_modules", "bcryptjs"))) {
  abortar("bcryptjs não ficou nas ferramentas — o primeiro admin não poderia ser criado");
}

// O criador do primeiro usuário mora DENTRO de ferramentas/ para que
// `import "bcryptjs"` resolva no node_modules daqui.
cpSync(
  path.join(RAIZ, "scripts", "instalacao", "criar-admin.mjs"),
  path.join(migrador, "criar-admin.mjs"),
);

// ---------------------------------------------------------------- scripts

passo("Copiando os scripts de instalação");
const instalacao = path.join(RAIZ, "scripts", "instalacao");
if (!existsSync(instalacao)) abortar("scripts/instalacao não existe");
// Garante que a pasta é só nossa: se o rastreador do Next voltar a copiar o
// scripts/ do repositório, o cliente receberia o empacotador junto.
rmSync(path.join(pacote, "scripts"), { recursive: true, force: true });
cpSync(instalacao, path.join(pacote, "scripts"), {
  recursive: true,
  // O criar-admin.mjs já foi para ferramentas/, onde as dependências dele
  // resolvem; uma segunda cópia em scripts/ só daria para rodar errado.
  filter: (origem) => path.basename(origem) !== "criar-admin.mjs",
});

// O Windows PowerShell 5.1, o que vem no Windows 10 do cliente, lê .ps1 sem BOM
// na página de código ANSI. Em Windows-1252 o "—" em UTF-8 (E2 80 94) vira
// "â€" seguido de 0x94, que é aspas curvas — e o PowerShell aceita aspas
// curvas como fim de string: o script quebra antes de rodar a primeira linha.
// Com o BOM ele lê como UTF-8. Posto aqui, e não confiado ao editor de quem
// mexer nos scripts, porque BOM some sem ninguém ver.
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
for (const nome of readdirSync(path.join(pacote, "scripts"))) {
  if (!nome.endsWith(".ps1")) continue;
  const arquivo = path.join(pacote, "scripts", nome);
  const bytes = readFileSync(arquivo);
  if (!bytes.subarray(0, 3).equals(BOM)) {
    writeFileSync(arquivo, Buffer.concat([BOM, bytes]));
  }
}

// ---------------------------------------------------------------- zip

// Última conferência antes de compactar: nenhum atalho pode sair no `.zip`,
// porque o Compress-Archive os descarta em silêncio. Aqui a lista já deve
// estar vazia — quem resolve é o `resolverAtalhos`, lá na montagem da pasta.
const atalhos = atalhosEm(pacote);
if (atalhos.length > 0) {
  abortar(`o pacote ficou com atalho(s), que não sobrevivem ao .zip: ${atalhos.join(", ")}`);
}

passo("Compactando");
rmSync(zip, { force: true });
if (process.platform === "win32") {
  rodar("powershell", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${pacote}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`,
  ]);
} else {
  // Só para poder testar o empacotamento fora do Windows. O pacote publicado
  // é sempre o do runner.
  rodar("zip", ["-qr", zip, "."], { cwd: pacote });
}
if (!existsSync(zip)) abortar("o .zip não foi gerado");

// Conferência final do que foi para o pacote: erro aqui é erro que só
// apareceria na frente do cliente, com o pen drive na mão.
for (const obrigatorio of [
  "server.js",
  "versao.txt",
  "node-versao.txt",
  path.join(".next", "static"),
  path.join("ferramentas", "prisma.config.js"),
  path.join("ferramentas", "criar-admin.mjs"),
  path.join("scripts", "instalar.ps1"),
  path.join("scripts", "atualizar.ps1"),
  path.join("scripts", "backup.ps1"),
  path.join("scripts", "comum.ps1"),
  path.join("scripts", "LEIAME.txt"),
  path.join("scripts", "ATUALIZAR.cmd"),
  // Só o pacote montado no Windows leva o Node (ver "Embutindo o Node").
  ...(process.platform === "win32" ? [path.join("runtime", "node.exe")] : []),
]) {
  if (!existsSync(path.join(pacote, obrigatorio))) {
    abortar(`o pacote ficou sem ${obrigatorio}`);
  }
}
if (existsSync(path.join(pacote, "scripts", "empacotar.mjs"))) {
  abortar("o empacotador vazou para dentro do pacote");
}

passo("Calculando o SHA-256");
const hash = await new Promise((resolve, reject) => {
  const h = createHash("sha256");
  createReadStream(zip)
    .on("data", (p) => h.update(p))
    .on("error", reject)
    .on("end", () => resolve(h.digest("hex")));
});
// Formato do `sha256sum`, que é o que o Get-FileHash do script compara.
writeFileSync(`${zip}.sha256`, `${hash}  ${path.basename(zip)}\n`, "utf8");

const mb = (readFileSync(zip).byteLength / 1024 / 1024).toFixed(1);
console.log(`\nPronto.`);
console.log(`  ${zip} (${mb} MB)`);
console.log(`  ${zip}.sha256`);
console.log(`  ${hash}`);
