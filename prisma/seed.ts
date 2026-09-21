import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  Perfil,
  Esfera,
  StatusEtapa,
  StatusMedicao,
  StatusObra,
  TipoEtapa,
} from "../src/generated/prisma/enums";
import { env } from "../src/lib/env";
import { driver } from "../src/lib/storage/driver";
import { ROTULOS_TIPO_DOCUMENTO } from "../src/modules/documentos/rotulos";
import { gerarPdf } from "../src/modules/relatorios/pdf";
import { etapasIniciais } from "../src/modules/tramitacao/fluxo";
import {
  StatusRerratificacao,
  TipoDocumento,
} from "../src/generated/prisma/enums";
import { impactoDasRerratificacoes } from "../src/modules/rerratificacoes/calculos";

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
/**
 * Atribuição de operador nas obras de demonstração: assumida agora, ou
 * liberada há alguns dias — quando o nome fica só como o último que mexeu.
 */
type AtribuicaoDemo =
  | { assumidaHa: number; liberadaHa?: undefined }
  | { liberadaHa: number; assumidaHa?: undefined };

async function seedDemo() {
  // O operador das obras de demonstração é o próprio usuário que entra na
  // demonstração: assim dá para liberar a obra e assumir de volta na tela.
  const operadorDemo = await prisma.usuario.findFirstOrThrow({
    where: { perfil: Perfil.ADMINISTRADOR },
    orderBy: { criadoEm: "asc" },
  });

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

  // Quem assina os boletins da demonstração. Desde 21/09/2026 é texto na
  // própria medição, não mais um cadastro à parte.
  const RESPONSAVEL_DEMO = "João Silva";

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
      observacoes:
        "Obra de demonstração — término e medição próximos, farol de atenção.",
      // Assumida: mostra o bloco do operador com observação e o botão de
      // liberar, já que quem entra na demonstração é este mesmo usuário.
      operador: { assumidaHa: 3 } as AtribuicaoDemo,
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
      // Crítica e sem ninguém: o nome fica como último operador, que é o
      // desenho pedido — registro, não fila de tarefas.
      operador: { liberadaHa: 5 } as AtribuicaoDemo,
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
    Array<{ diasAtras: number; valor: string; status: StatusMedicao }>
  > = {
    // Em dia: última medição há 10 dias, próxima cai daqui a 20.
    "OBR-DEMO-001": [
      { diasAtras: 130, valor: "120000.00", status: StatusMedicao.PAGA },
      { diasAtras: 100, valor: "140000.00", status: StatusMedicao.PAGA },
      { diasAtras: 70, valor: "150000.00", status: StatusMedicao.PAGA },
      { diasAtras: 40, valor: "95000.00", status: StatusMedicao.APROVADA },
      { diasAtras: 10, valor: "95000.00", status: StatusMedicao.PROTOCOLADA },
    ],
    // Última medição há 25 dias: numa obra mensal, a próxima vence em 5 —
    // dentro dos dez dias de antecedência que acendem o amarelo. É o cartão
    // que demonstra o critério novo do farol, e ele soma dois motivos, porque
    // o término também está próximo.
    "OBR-DEMO-002": [
      { diasAtras: 85, valor: "90000.00", status: StatusMedicao.PAGA },
      { diasAtras: 55, valor: "110000.00", status: StatusMedicao.PAGA },
      { diasAtras: 25, valor: "100000.00", status: StatusMedicao.PROTOCOLADA },
    ],
    // Parada faz tempo: ciclo de medição vencido há 90 dias — é esta que
    // aparece no indicador "medições atrasadas" do painel.
    "OBR-DEMO-003": [
      { diasAtras: 200, valor: "80000.00", status: StatusMedicao.PAGA },
      { diasAtras: 160, valor: "60000.00", status: StatusMedicao.PAGA },
      { diasAtras: 120, valor: "40000.00", status: StatusMedicao.REJEITADA },
    ],
  };

  let totalMedicoes = 0;
  for (const obra of obras) {
    const { operador, ...dadosDaObra } = obra;
    const registro = await prisma.obra.upsert({
      where: { codigo: obra.codigo },
      update: {},
      create: {
        ...dadosDaObra,
        contratanteId: contratante.id,
        // Atribuição momentânea de operador: só as obras em atenção e crítica
        // têm, porque só nelas o campo aparece (requisitos.md 1.2).
        ...(operador
          ? {
              operadorId: operadorDemo.id,
              operadorAssumidoEm:
                operador.assumidaHa === undefined ? null : dias(-operador.assumidaHa),
              operadorLiberadoEm:
                operador.liberadaHa === undefined ? null : dias(-operador.liberadaHa),
              operadorObservacao:
                operador.assumidaHa === undefined
                  ? null
                  : "Aguardando a foto da obra para protocolar a medição.",
            }
          : {}),
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
          protocolo:
            m.status === StatusMedicao.RASCUNHO
              ? null
              : `${data.getFullYear()}.${String(100000 + numero * 7).slice(1)}`,
          dataProtocolo: m.status === StatusMedicao.RASCUNHO ? null : dias(-m.diasAtras + 2),
          notaFiscalNumero: `NF ${1800 + numero}`,
          notaFiscalValor: m.valor,
          issAliquota: "5.00",
          issValor: (Number(m.valor) * 0.05).toFixed(2),
          responsavelNome: RESPONSAVEL_DEMO,
          status: m.status,
          dataPagamento: m.status === StatusMedicao.PAGA ? dias(-m.diasAtras + 30) : null,
        },
      });
      totalMedicoes += 1;
    }
  }

  // --- Tramitação -------------------------------------------------------
  // As 11 etapas nascem com a obra desde a etapa 6; as obras de demonstração
  // criadas antes disso recebem as suas aqui.
  const setores = await prisma.setor.findMany({ select: { id: true, nome: true } });
  const setorPorNome = new Map(setores.map((s) => [s.nome, s.id]));

  /** Etapas já vencidas antes da execução — deixam a faixa do fluxo realista. */
  const CONCLUIDAS: TipoEtapa[] = [
    TipoEtapa.BUSCA_LICITACAO,
    TipoEtapa.HABILITACAO_HOMOLOGACAO,
    TipoEtapa.ASSINATURA_CONTRATO,
    TipoEtapa.GARANTIA,
    TipoEtapa.ORDEM_INICIO,
  ];

  /**
   * Percurso da última medição de cada obra pelos setores. O último trecho
   * fica sem saída de propósito: é o que alimenta "processo parado há N dias"
   * no painel e o critério do farol.
   */
  const PERCURSOS: Record<
    string,
    Array<{ setor: string; entrada: number; saida: number | null }>
  > = {
    // Anda bem: 4 dias na Controladoria, abaixo do limite de 10.
    "OBR-DEMO-001": [
      { setor: "Protocolo", entrada: -12, saida: -9 },
      { setor: "Engenharia", entrada: -9, saida: -4 },
      { setor: "Controladoria", entrada: -4, saida: null },
    ],
    // Travada: 25 dias na Controladoria — entra em "processos parados".
    "OBR-DEMO-002": [
      { setor: "Protocolo", entrada: -38, saida: -33 },
      { setor: "Fiscalização", entrada: -33, saida: -25 },
      { setor: "Controladoria", entrada: -25, saida: null },
    ],
    // Parada faz tempo: 60 dias no Financeiro, farol vermelho por isso também.
    "OBR-DEMO-003": [
      { setor: "Protocolo", entrada: -110, saida: -104 },
      { setor: "Engenharia", entrada: -104, saida: -95 },
      { setor: "Jurídico", entrada: -95, saida: -60 },
      { setor: "Financeiro", entrada: -60, saida: null },
    ],
  };

  let totalMovimentos = 0;
  for (const obra of obras) {
    const registro = await prisma.obra.findUniqueOrThrow({
      where: { codigo: obra.codigo },
      select: { id: true, status: true },
    });

    await prisma.etapaObra.createMany({
      data: etapasIniciais().map((e) => ({ ...e, obraId: registro.id })),
      skipDuplicates: true,
    });

    // Obra ainda em planejamento não teve nada concluído.
    if (registro.status !== StatusObra.PLANEJAMENTO) {
      await prisma.etapaObra.updateMany({
        where: { obraId: registro.id, tipo: { in: CONCLUIDAS } },
        data: { status: StatusEtapa.CONCLUIDA },
      });
      await prisma.etapaObra.updateMany({
        where: {
          obraId: registro.id,
          tipo: { in: [TipoEtapa.EXECUCAO_OBRA, TipoEtapa.MEDICOES] },
        },
        data: { status: StatusEtapa.EM_ANDAMENTO },
      });
      // Nenhuma obra de demonstração tem aditivo.
      await prisma.etapaObra.updateMany({
        where: { obraId: registro.id, tipo: TipoEtapa.RERRATIFICACAO },
        data: { status: StatusEtapa.NAO_SE_APLICA },
      });
    }

    const percurso = PERCURSOS[obra.codigo];
    if (!percurso) continue;

    const etapaMedicoes = await prisma.etapaObra.findUniqueOrThrow({
      where: { obraId_tipo: { obraId: registro.id, tipo: TipoEtapa.MEDICOES } },
      select: { id: true, _count: { select: { movimentos: true } } },
    });
    if (etapaMedicoes._count.movimentos > 0) continue; // idempotência

    const ultima = await prisma.medicao.findFirst({
      where: { obraId: registro.id },
      orderBy: { numero: "desc" },
      select: { id: true },
    });

    let anterior: string | null = null;
    for (const trecho of percurso) {
      const destino = setorPorNome.get(trecho.setor);
      if (!destino) continue;
      await prisma.tramitacaoMovimento.create({
        data: {
          etapaObraId: etapaMedicoes.id,
          medicaoId: ultima?.id ?? null,
          setorOrigemId: anterior,
          setorDestinoId: destino,
          dataEntrada: dias(trecho.entrada),
          dataSaida: trecho.saida === null ? null : dias(trecho.saida),
          diasPermanencia:
            trecho.saida === null ? null : trecho.saida - trecho.entrada,
          observacoes: `Movimento de demonstração — ${trecho.setor}.`,
        },
      });
      anterior = destino;
      totalMovimentos += 1;
    }
  }

  // --- Rerratificações ----------------------------------------------------
  // Uma aprovada (mexe no valor do contrato) e uma ainda tramitando (não
  // mexe) — é a distinção que a aba precisa deixar clara na demonstração.
  const RERRATIFICACOES: Record<
    string,
    Array<{
      numero: number;
      status: StatusRerratificacao;
      valor: string;
      percentual: string;
      itens: number;
      prazo: number | null;
      descricao: string;
      observacoes: string;
      diasAtras: number;
    }>
  > = {
    "OBR-DEMO-001": [
      {
        numero: 1,
        status: StatusRerratificacao.APROVADA,
        valor: "120000.00",
        percentual: "10.00",
        itens: 8,
        prazo: 45,
        descricao: "Ajuste de quantitativos e serviços",
        observacoes: "Acréscimo de 10% com prorrogação de 45 dias.",
        diasAtras: 60,
      },
    ],
    "OBR-DEMO-002": [
      {
        numero: 1,
        status: StatusRerratificacao.PROTOCOLADA,
        valor: "48000.00",
        percentual: "10.00",
        itens: 3,
        prazo: null,
        descricao: "Inclusão de quadro de distribuição",
        observacoes: "Aguardando parecer da Controladoria.",
        diasAtras: 20,
      },
    ],
  };

  let totalRerratificacoes = 0;
  for (const obra of obras) {
    const lista = RERRATIFICACOES[obra.codigo];
    if (!lista) continue;

    const registro = await prisma.obra.findUniqueOrThrow({
      where: { codigo: obra.codigo },
      select: { id: true },
    });

    for (const rr of lista) {
      const existe = await prisma.rerratificacao.findUnique({
        where: { obraId_numero: { obraId: registro.id, numero: rr.numero } },
        select: { id: true },
      });
      if (existe) continue;

      await prisma.rerratificacao.create({
        data: {
          obraId: registro.id,
          numero: rr.numero,
          data: dias(-rr.diasAtras),
          protocolo:
            rr.status === StatusRerratificacao.EM_ELABORACAO
              ? null
              : `${new Date().getFullYear()}.00${900 + rr.numero}`,
          descricao: rr.descricao,
          quantidadeItens: rr.itens,
          percentualAlcancado: rr.percentual,
          valorImpactado: rr.valor,
          prazoAdicionalDias: rr.prazo,
          status: rr.status,
          observacoes: rr.observacoes,
        },
      });
      totalRerratificacoes++;
    }

    // O cache do valor aditivado é reescrito a partir das aprovadas, igual
    // faz a Server Action — a coluna nunca é digitada à mão.
    const todas = await prisma.rerratificacao.findMany({
      where: { obraId: registro.id },
      select: { status: true, valorImpactado: true, prazoAdicionalDias: true },
    });
    await prisma.obra.update({
      where: { id: registro.id },
      data: {
        valorAditivado: impactoDasRerratificacoes(todas).valorAprovado.toFixed(2),
      },
    });

    // Obra com aditivo não tem a etapa de rerratificação "não se aplica".
    await prisma.etapaObra.updateMany({
      where: { obraId: registro.id, tipo: TipoEtapa.RERRATIFICACAO },
      data: { status: StatusEtapa.EM_ANDAMENTO },
    });
  }

  // --- Documentos ---------------------------------------------------------
  // Arquivos de verdade no armazenamento: a central de documentos só faz
  // sentido na demonstração se o botão "Abrir" abrir alguma coisa. Passa pelo
  // mesmo driver das rotas, então funciona tanto em disco (on-premise) quanto
  // em banco (demonstração serverless).
  const armazenamento = driver();

  // Quem "enviou" os documentos de demonstração é o admin criado no seed base.
  const admin = await prisma.usuario.findFirstOrThrow({
    where: { perfil: Perfil.ADMINISTRADOR },
    select: { id: true },
  });

  async function anexar(
    obraId: string,
    nome: string,
    tipo: TipoDocumento,
    descricao: string,
    vinculo: { medicaoId?: string; etapaObraId?: string; movimentoId?: string } = {},
  ) {
    const jaExiste = await prisma.documento.findFirst({
      where: { obraId, nomeOriginal: nome, ...vinculo },
      select: { id: true },
    });
    if (jaExiste) return false;

    // PDF de verdade, pelo mesmo gerador dos relatórios do sistema. Um stub
    // com só cabeçalho e `%%EOF` é recusado por qualquer leitor, e na
    // demonstração isso parece falha do sistema, não arquivo de mentira.
    const obra = await prisma.obra.findUniqueOrThrow({
      where: { id: obraId },
      select: { numeroContrato: true, objeto: true, contratante: { select: { nome: true } } },
    });
    const conteudo = gerarPdf({
      titulo: nome,
      subtitulo: descricao,
      filtros: [
        { rotulo: "Obra", valor: `${obra.numeroContrato} — ${obra.objeto}` },
        { rotulo: "Contratante", valor: obra.contratante.nome },
      ],
      colunas: [
        { chave: "campo", rotulo: "Campo" },
        { chave: "valor", rotulo: "Valor" },
      ],
      linhas: [
        [{ texto: "Tipo do documento" }, { texto: ROTULOS_TIPO_DOCUMENTO[tipo] }],
        [{ texto: "Contrato" }, { texto: obra.numeroContrato }],
        [{ texto: "Objeto" }, { texto: obra.objeto }],
      ],
      geradoEm: new Date(),
      geradoPor: "Seed de demonstração",
      observacao:
        "Documento fictício, gerado pelo seed apenas para demonstração. " +
        "Não corresponde a nenhum documento real e não tem valor legal.",
    });
    const salvo = await armazenamento.salvarArquivo(
      // `Buffer.from`: `gerarPdf` devolve `Uint8Array`, que o `File` não aceita
      // direto por causa do tipo do buffer subjacente.
      new File([Buffer.from(conteudo)], `${randomUUID()}.pdf`, {
        type: "application/pdf",
      }),
      obraId,
    );

    await prisma.documento.create({
      data: {
        nomeOriginal: nome,
        nomeArmazenado: salvo.nomeArmazenado,
        caminhoRelativo: salvo.caminhoRelativo,
        mimeType: "application/pdf",
        extensao: "pdf",
        tamanhoBytes: BigInt(salvo.tamanhoBytes),
        hashSha256: salvo.hashSha256,
        tipo,
        descricao,
        obraId,
        ...vinculo,
        enviadoPorId: admin.id,
      },
    });
    return true;
  }

  let totalDocumentos = 0;
  for (const obra of obras) {
    const registro = await prisma.obra.findUniqueOrThrow({
      where: { codigo: obra.codigo },
      select: { id: true, numeroContrato: true },
    });
    const num = registro.numeroContrato.replace("/", "_");

    // Documentos do contrato, presentes em toda obra.
    if (await anexar(registro.id, `contrato_${num}.pdf`, TipoDocumento.CONTRATO, "Contrato assinado.")) totalDocumentos++;
    if (await anexar(registro.id, `edital_${num}.pdf`, TipoDocumento.EDITAL, "Edital da licitação.")) totalDocumentos++;

    // Documentos da última medição e do setor onde ela está parada.
    const ultima = await prisma.medicao.findFirst({
      where: { obraId: registro.id },
      orderBy: { numero: "desc" },
      select: { id: true, numero: true },
    });
    if (!ultima) continue;

    const dois = String(ultima.numero).padStart(2, "0");
    if (await anexar(registro.id, `medicao_${dois}_assinada.pdf`, TipoDocumento.MEDICAO, "Medição aprovada internamente.", { medicaoId: ultima.id })) totalDocumentos++;
    if (await anexar(registro.id, `nf_medicao_${dois}.pdf`, TipoDocumento.NOTA_FISCAL, "Nota fiscal da medição.", { medicaoId: ultima.id })) totalDocumentos++;
    if (await anexar(registro.id, `iss_medicao_${dois}.pdf`, TipoDocumento.ISS, "Guia de recolhimento do ISS.", { medicaoId: ultima.id })) totalDocumentos++;

    const aberto = await prisma.tramitacaoMovimento.findFirst({
      where: { etapaObra: { obraId: registro.id }, dataSaida: null },
      select: { id: true, etapaObraId: true, setorDestino: { select: { nome: true } } },
    });
    if (aberto) {
      const vinculo = { etapaObraId: aberto.etapaObraId, movimentoId: aberto.id };
      if (await anexar(registro.id, `protocolo_${num}.pdf`, TipoDocumento.PROTOCOLO, "Abertura do processo.", vinculo)) totalDocumentos++;
      if (await anexar(registro.id, `parecer_${aberto.setorDestino.nome.toLowerCase()}.pdf`, TipoDocumento.PARECER, `Parecer da ${aberto.setorDestino.nome}.`, vinculo)) totalDocumentos++;
    }
  }

  console.log(`  demo: contratante ${contratante.nome}`);
  console.log(`  demo: ${obras.length} obras, com faróis diferentes`);
  console.log(`  demo: ${totalMedicoes} medições, uma obra com ciclo vencido`);
  console.log(
    `  demo: ${totalMovimentos} movimentos de tramitação, 3 processos em aberto`,
  );
  console.log(
    `  demo: ${totalDocumentos} documentos com arquivo em ${
      env().STORAGE_DRIVER === "db" ? "banco" : "disco"
    }`,
  );
  console.log(
    `  demo: ${totalRerratificacoes} rerratificações, uma aprovada e uma em tramitação`,
  );
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
