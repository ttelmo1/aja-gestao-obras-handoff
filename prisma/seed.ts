import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  Perfil,
  Esfera,
  StatusMedicao,
  StatusObra,
} from "../src/generated/prisma/enums";

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

/**
 * Dados fictícios para as 2 reuniões de validação previstas em contrato.
 *
 * As obras reproduzem os exemplos do mockup e são escolhidas para acender
 * faróis diferentes — verde, atenção, crítico e sem dados — porque é isso que
 * o cliente precisa ver funcionando na reunião. As datas são relativas a hoje,
 * então a demonstração não envelhece.
 */
async function seedDemo() {
  const contratante = await prisma.contratante.upsert({
    // CNPJ válido de verdade: o cadastro valida dígito verificador, e um
    // número inventado seria recusado pela própria tela na demonstração.
    where: { cnpj: "11222333000181" },
    update: {},
    create: {
      nome: "Prefeitura Municipal de Exemplo",
      cnpj: "11222333000181",
      esfera: Esfera.MUNICIPAL,
      contato: "Secretaria de Obras",
      telefone: "(00) 0000-0000",
    },
  });

  // `Responsavel` não tem coluna única para servir de chave de upsert, então
  // a idempotência é por busca — rodar o seed duas vezes não duplica ninguém.
  const responsavel =
    (await prisma.responsavel.findFirst({ where: { nome: "João Silva" } })) ??
    (await prisma.responsavel.create({
      data: {
        nome: "João Silva",
        cargo: "Engenheiro civil",
        registro: "CREA-BA 000000",
        email: "joao.silva@exemplo.local",
      },
    }));

  const hoje = new Date();
  const dias = (n: number) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + n);
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const obras = [
    {
      codigo: "OBR-DEMO-001",
      objeto: "Reforma da Unidade Centro",
      numeroContrato: "015/2026",
      numeroProcesso: "2026.004581",
      valorContratado: "1200000.00",
      dataAssinatura: dias(-200),
      dataOrdemInicio: dias(-180),
      prazoDias: 360,
      dataPrevistaTermino: dias(180),
      status: StatusObra.EM_ANDAMENTO,
      observacoes: "Obra de demonstração — prazo folgado, farol verde.",
    },
    {
      codigo: "OBR-DEMO-002",
      objeto: "Adequação Elétrica – Unidade Norte",
      numeroContrato: "021/2026",
      numeroProcesso: "2026.005112",
      valorContratado: "480000.00",
      dataAssinatura: dias(-150),
      dataOrdemInicio: dias(-140),
      prazoDias: 160,
      dataPrevistaTermino: dias(20),
      status: StatusObra.EM_ANDAMENTO,
      observacoes: "Obra de demonstração — término próximo, farol de atenção.",
    },
    {
      codigo: "OBR-DEMO-003",
      objeto: "Manutenção Predial – Bloco B",
      numeroContrato: "008/2025",
      numeroProcesso: "2025.009003",
      valorContratado: "260000.00",
      dataAssinatura: dias(-400),
      dataOrdemInicio: dias(-380),
      prazoDias: 300,
      dataPrevistaTermino: dias(-80),
      status: StatusObra.EM_ANDAMENTO,
      observacoes: "Obra de demonstração — prazo vencido, farol crítico.",
    },
    {
      codigo: "OBR-DEMO-004",
      objeto: "Ampliação do Almoxarifado Central",
      numeroContrato: "030/2026",
      valorContratado: "150000.00",
      dataAssinatura: dias(-10),
      dataOrdemInicio: null,
      prazoDias: 120,
      dataPrevistaTermino: null,
      status: StatusObra.PLANEJAMENTO,
      observacoes: "Obra de demonstração — sem ordem de início, farol cinza.",
    },
  ];

  // Medições de demonstração. `diasAtras` da última define se o ciclo está
  // vencido: é o que acende o indicador "medições atrasadas" no painel.
  const medicoesPorObra: Record<
    string,
    Array<{ diasAtras: number; valor: string; executado: string; status: StatusMedicao }>
  > = {
    // Em dia: última medição há 10 dias, próxima cai daqui a 20.
    "OBR-DEMO-001": [
      { diasAtras: 130, valor: "120000.00", executado: "12.00", status: StatusMedicao.PAGA },
      { diasAtras: 100, valor: "140000.00", executado: "24.00", status: StatusMedicao.PAGA },
      { diasAtras: 70, valor: "150000.00", executado: "36.00", status: StatusMedicao.PAGA },
      { diasAtras: 40, valor: "95000.00", executado: "44.00", status: StatusMedicao.APROVADA },
      { diasAtras: 10, valor: "95000.00", executado: "52.00", status: StatusMedicao.PROTOCOLADA },
    ],
    // Ciclo vencido há 10 dias — aparece em "medições atrasadas".
    "OBR-DEMO-002": [
      { diasAtras: 100, valor: "90000.00", executado: "20.00", status: StatusMedicao.PAGA },
      { diasAtras: 70, valor: "110000.00", executado: "42.00", status: StatusMedicao.PAGA },
      { diasAtras: 40, valor: "100000.00", executado: "60.00", status: StatusMedicao.PROTOCOLADA },
    ],
    // Parada faz tempo: ciclo vencido há 90 dias e execução atrás do prazo.
    "OBR-DEMO-003": [
      { diasAtras: 200, valor: "80000.00", executado: "25.00", status: StatusMedicao.PAGA },
      { diasAtras: 160, valor: "60000.00", executado: "40.00", status: StatusMedicao.PAGA },
      { diasAtras: 120, valor: "40000.00", executado: "48.00", status: StatusMedicao.REJEITADA },
    ],
  };

  let totalMedicoes = 0;
  for (const obra of obras) {
    const registro = await prisma.obra.upsert({
      where: { codigo: obra.codigo },
      update: {},
      create: {
        ...obra,
        contratanteId: contratante.id,
        responsavelId: responsavel.id,
      },
    });

    const lancamentos = medicoesPorObra[obra.codigo] ?? [];
    for (const [i, m] of lancamentos.entries()) {
      const data = dias(-m.diasAtras);
      const numero = i + 1;
      await prisma.medicao.upsert({
        where: { obraId_numero: { obraId: registro.id, numero } },
        update: {},
        create: {
          obraId: registro.id,
          numero,
          competencia: new Date(data.getFullYear(), data.getMonth(), 1, 12),
          dataMedicao: data,
          periodoInicio: dias(-m.diasAtras - 29),
          periodoFim: data,
          valorMedido: m.valor,
          percentualExecutado: m.executado,
          protocolo:
            m.status === StatusMedicao.RASCUNHO
              ? null
              : `${data.getFullYear()}.${String(100000 + numero * 7).slice(1)}`,
          dataProtocolo: m.status === StatusMedicao.RASCUNHO ? null : dias(-m.diasAtras + 2),
          notaFiscalNumero: `NF ${1800 + numero}`,
          notaFiscalValor: m.valor,
          issAliquota: "5.00",
          issValor: (Number(m.valor) * 0.05).toFixed(2),
          responsavelId: responsavel.id,
          status: m.status,
          dataPagamento: m.status === StatusMedicao.PAGA ? dias(-m.diasAtras + 30) : null,
        },
      });
      totalMedicoes += 1;
    }
  }

  console.log(
    `  demo: contratante ${contratante.nome}, responsável ${responsavel.nome}`,
  );
  console.log(`  demo: ${obras.length} obras, com faróis diferentes`);
  console.log(`  demo: ${totalMedicoes} medições, uma obra com ciclo vencido`);
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
