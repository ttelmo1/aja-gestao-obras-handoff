/**
 * Cria o primeiro usuário administrador na máquina do cliente.
 *
 * Por que este arquivo existe: o seed do repositório (`prisma/seed.ts`) é
 * TypeScript e roda com `tsx`, que é dependência de desenvolvimento e não vai
 * no pacote. Sem alguém para criar o primeiro usuário, a instalação termina numa
 * tela de login por onde ninguém entra.
 *
 * Fala com o banco por SQL direto, via `pg`, e gera o hash com o mesmo
 * `bcryptjs` que o login confere (`src/modules/auth/senha.ts`) — custo 12,
 * o mesmo do resto do sistema. Não usa o client do Prisma porque o client gerado
 * é TypeScript e não roda solto.
 *
 * Idempotente: se o e-mail já existir, não faz nada e avisa. Rodar duas vezes
 * não recria nem troca a senha de ninguém.
 *
 * Uso (a partir da pasta ferramentas\ da release):
 *   node criar-admin.mjs --email admin@empresa.local --senha "..." --nome "Administrador"
 */
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Precisa bater com CUSTO_BCRYPT de src/modules/auth/senha.ts.
const CUSTO_BCRYPT = 12;

function argumento(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const email = (argumento("email") ?? "").trim().toLowerCase();
const senha = argumento("senha") ?? "";
const nome = argumento("nome") ?? "Administrador";
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL não está no ambiente.");
  process.exit(1);
}
if (!email.includes("@")) {
  console.error("informe um e-mail válido: --email admin@empresa.local");
  process.exit(1);
}
// A mesma política de `src/modules/auth/senha.ts`: se a senha criada aqui não
// passar pela validação da aplicação, o usuário não consegue nem trocá-la
// depois sem esbarrar na regra.
if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
  console.error("a senha precisa de pelo menos 8 caracteres, com uma letra e um número.");
  process.exit(1);
}
if (Buffer.byteLength(senha, "utf8") > 72) {
  console.error("a senha é longa demais (bcrypt ignora o que passa de 72 bytes).");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();

try {
  const existente = await cliente.query('SELECT id FROM "Usuario" WHERE email = $1', [email]);
  if (existente.rowCount > 0) {
    console.log(`Usuário ${email} já existe — nada a fazer.`);
    process.exit(0);
  }

  const total = await cliente.query('SELECT count(*)::int AS n FROM "Usuario"');
  if (total.rows[0].n > 0) {
    // Não é erro: só não é mais "o primeiro". Vale avisar para ninguém criar um
    // segundo administrador sem perceber que o banco já tinha usuários.
    console.log(`Atenção: o banco já tem ${total.rows[0].n} usuário(s). Criando um administrador a mais.`);
  }

  const hash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  await cliente.query(
    `INSERT INTO "Usuario" (id, nome, email, "senhaHash", perfil, ativo, "criadoEm", "atualizadoEm")
     VALUES ($1, $2, $3, $4, 'ADMINISTRADOR', true, now(), now())`,
    [randomUUID(), nome, email, hash],
  );

  console.log(`Administrador criado: ${email}`);
  console.log("Troque a senha no primeiro acesso.");
} finally {
  await cliente.end();
}
