import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { Perfil, Esfera } from "../src/generated/prisma/enums";

/**
 * Seed de provisionamento inicial.
 *
 * Cria só o que o sistema precisa para funcionar: o administrador e os
 * setores de tramitação. É idempotente — pode rodar de novo sem duplicar.
 *
 * Dados fictícios para as reuniões de validação ficam em `--demo`:
 *   npm run db:seed -- --demo
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não definida.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Setores iniciais, com a nomenclatura do setor público usada pelo cliente.
 * O cliente ajusta esta lista pela tela de cadastros — não é lista fixa.
 */
const SETORES = [
  { nome: "Protocolo", sigla: "PROT" },
  { nome: "Engenharia", sigla: "ENG" },
  { nome: "Fiscalização", sigla: "FISC" },
  { nome: "Controladoria", sigla: "CTRL" },
  { nome: "Jurídico", sigla: "JUR" },
  { nome: "Financeiro", sigla: "FIN" },
  { nome: "Gabinete", sigla: "GAB" },
];

async function seedBase() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ajagrupo.local";
  const senha = process.env.SEED_ADMIN_SENHA ?? "mudar@123";

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, 12),
      perfil: Perfil.ADMINISTRADOR,
    },
  });
  console.log(`  usuário admin: ${admin.email}`);

  for (const setor of SETORES) {
    await prisma.setor.upsert({
      where: { nome: setor.nome },
      update: {},
      create: setor,
    });
  }
  console.log(`  setores: ${SETORES.length}`);
}

/** Dados fictícios para as 2 reuniões de validação previstas em contrato. */
async function seedDemo() {
  const contratante = await prisma.contratante.upsert({
    where: { cnpj: "12.345.678/0001-90" },
    update: {},
    create: {
      nome: "Prefeitura Municipal de Exemplo",
      cnpj: "12.345.678/0001-90",
      esfera: Esfera.MUNICIPAL,
      contato: "Secretaria de Obras",
    },
  });

  const responsavel = await prisma.responsavel.create({
    data: {
      nome: "Eng. Responsável Exemplo",
      cargo: "Engenheiro Civil",
      registro: "CREA-XX 000000",
    },
  });

  console.log(
    `  demo: contratante ${contratante.nome}, responsável ${responsavel.nome}`,
  );
  console.log("  (obras de demonstração entram junto com o CRUD de obras)");
}

async function main() {
  console.log("Seed:");
  await seedBase();
  if (process.argv.includes("--demo")) await seedDemo();
  console.log("Concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
