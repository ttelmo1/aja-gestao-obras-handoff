/**
 * Monta o kit de instalação: um `.zip` com tudo que a PRIMEIRA instalação
 * precisa numa máquina sem internet — o pacote do sistema, o instalador do
 * PostgreSQL, o NSSM e o INSTALAR.cmd.
 *
 * Uso, depois do empacotar.mjs e com a mesma versão:
 *   node scripts/montar-kit.mjs --versao 2026.09.15 [--saida dist]
 *
 * O instalador do PostgreSQL é baixado aqui — no runner, que tem internet — e
 * conferido contra o SHA-256 fixado em scripts/kit/componentes.json. Hash que
 * não bate derruba o build: é o que impede um kit com arquivo trocado. O NSSM
 * mora no repositório (scripts/kit/componentes/nssm.exe) porque o site dele
 * cai com frequência, e o build não pode depender disso.
 *
 * Atualização não usa o kit: continua sendo o `.zip` do empacotar.mjs, sem os
 * ~350 MB do PostgreSQL.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONTES = path.join(RAIZ, "scripts", "kit");

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

async function sha256(arquivo) {
  const hash = createHash("sha256");
  for await (const pedaco of createReadStream(arquivo)) hash.update(pedaco);
  return hash.digest("hex");
}

function tamanho(arquivo) {
  return `${(statSync(arquivo).size / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------- versão

const versao = argumento("versao");
if (!versao) abortar("informe a versão: --versao 2026.09.15 (a mesma do empacotar.mjs)");
if (!/^[0-9A-Za-z._-]+$/.test(versao)) abortar(`versão inválida: "${versao}"`);

const saida = path.resolve(RAIZ, argumento("saida", "dist"));
const pacoteZip = path.join(saida, `aja-obras-${versao}.zip`);
const kit = path.join(saida, `aja-obras-kit-${versao}`);
const kitZip = `${kit}.zip`;

console.log(`Montando o kit da versão ${versao}`);

if (!existsSync(pacoteZip) || !existsSync(`${pacoteZip}.sha256`)) {
  abortar(
    `não achei ${path.basename(pacoteZip)} e o .sha256 em ${saida}. ` +
      `Rode antes: node scripts/empacotar.mjs --versao ${versao}`,
  );
}

const { postgresql, nssm } = JSON.parse(
  readFileSync(path.join(FONTES, "componentes.json"), "utf8"),
);
if (!postgresql?.url || !postgresql?.arquivo || !nssm?.arquivo) {
  abortar("scripts/kit/componentes.json incompleto");
}

// ------------------------------------------------------------ PostgreSQL

passo(`PostgreSQL ${postgresql.versao}`);
// O cache fica em dist/.cache, que o workflow guarda entre execuções: o
// instalador só muda quando a versão fixada muda.
const cache = path.join(saida, ".cache");
mkdirSync(cache, { recursive: true });
const instaladorPg = path.join(cache, postgresql.arquivo);

if (existsSync(instaladorPg) && (await sha256(instaladorPg)) === postgresql.sha256) {
  console.log("  do cache");
} else {
  console.log(`  baixando ${postgresql.url}`);
  const resposta = await fetch(postgresql.url);
  if (!resposta.ok || !resposta.body) abortar(`download falhou: HTTP ${resposta.status}`);
  // Baixa com outro nome e só renomeia no fim: download interrompido não deixa
  // um instalador pela metade com o nome do verdadeiro.
  const temporario = `${instaladorPg}.baixando`;
  await pipeline(Readable.fromWeb(resposta.body), createWriteStream(temporario));
  renameSync(temporario, instaladorPg);
}

const hashPg = await sha256(instaladorPg);
if (hashPg !== postgresql.sha256) {
  abortar(
    "o instalador do PostgreSQL não confere com o SHA-256 fixado em componentes.json.\n" +
      `  esperado:  ${postgresql.sha256 || "(vazio)"}\n` +
      `  calculado: ${hashPg}\n` +
      "Se a versão acabou de mudar, confira a origem e fixe o hash calculado. " +
      "Se não mudou, o arquivo servido não é o esperado: não gere o kit.",
  );
}
console.log(`  SHA-256 confere (${tamanho(instaladorPg)})`);

// ------------------------------------------------------------------ NSSM

passo(`NSSM ${nssm.versao}`);
const nssmExe = path.join(FONTES, "componentes", nssm.arquivo);
if (!existsSync(nssmExe)) abortar(`não achei ${nssmExe}`);
const hashNssm = await sha256(nssmExe);
if (hashNssm !== nssm.sha256) {
  abortar(`o nssm.exe do repositório não confere com componentes.json (calculado: ${hashNssm})`);
}
console.log("  SHA-256 confere");

// ------------------------------------------------------------- montagem

passo("Montando a pasta do kit");
rmSync(kit, { recursive: true, force: true });
rmSync(kitZip, { force: true });
rmSync(`${kitZip}.sha256`, { force: true });
mkdirSync(path.join(kit, "componentes"), { recursive: true });

cpSync(pacoteZip, path.join(kit, path.basename(pacoteZip)));
cpSync(`${pacoteZip}.sha256`, path.join(kit, `${path.basename(pacoteZip)}.sha256`));
cpSync(instaladorPg, path.join(kit, "componentes", postgresql.arquivo));
cpSync(nssmExe, path.join(kit, "componentes", nssm.arquivo));
cpSync(path.join(FONTES, "INSTALAR.cmd"), path.join(kit, "INSTALAR.cmd"));
cpSync(path.join(FONTES, "LEIAME.txt"), path.join(kit, "LEIAME.txt"));

// Com BOM, pelo mesmo motivo do empacotar.mjs: o Windows PowerShell 5.1 lê .ps1
// sem BOM como ANSI, e o "—" vira aspas curvas que quebram o script.
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const scriptKit = readFileSync(path.join(FONTES, "instalar-kit.ps1"));
writeFileSync(
  path.join(kit, "instalar-kit.ps1"),
  scriptKit.subarray(0, 3).equals(BOM) ? scriptKit : Buffer.concat([BOM, scriptKit]),
);

// O que o instalar-kit.ps1 confere na máquina antes de instalar: aqui o hash
// protege contra pen drive com defeito e cópia interrompida.
writeFileSync(
  path.join(kit, "componentes", "componentes.sha256"),
  `${hashPg}  ${postgresql.arquivo}\n${hashNssm}  ${nssm.arquivo}\n`,
  "utf8",
);

for (const obrigatorio of [
  "INSTALAR.cmd",
  "instalar-kit.ps1",
  "LEIAME.txt",
  path.basename(pacoteZip),
  `${path.basename(pacoteZip)}.sha256`,
  path.join("componentes", postgresql.arquivo),
  path.join("componentes", nssm.arquivo),
  path.join("componentes", "componentes.sha256"),
]) {
  if (!existsSync(path.join(kit, obrigatorio))) abortar(`o kit ficou sem ${obrigatorio}`);
}

// ---------------------------------------------------------------- zip

passo("Compactando");
// Compressão rápida: o pacote e o instalador do PostgreSQL já vêm comprimidos,
// e comprimir de novo só gasta tempo de build.
if (process.platform === "win32") {
  rodar("powershell", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${kit}\\*' -DestinationPath '${kitZip}' -CompressionLevel Fastest`,
  ]);
} else {
  // Só para testar a montagem fora do Windows. O kit publicado é o do runner.
  rodar("zip", ["-q", "-r", "-1", kitZip, "."], { cwd: kit });
}
if (!existsSync(kitZip)) abortar("o .zip do kit não foi gerado");

passo("Calculando o SHA-256");
const hashKit = await sha256(kitZip);
writeFileSync(`${kitZip}.sha256`, `${hashKit}  ${path.basename(kitZip)}\n`, "utf8");

console.log(`\nPronto.\n  ${kitZip} (${tamanho(kitZip)})\n  ${kitZip}.sha256\n  ${hashKit}`);
