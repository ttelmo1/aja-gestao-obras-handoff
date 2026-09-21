import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TipoDocumento } from "@/generated/prisma/enums";
import {
  acervoDaMedicao,
  acervoDoContrato,
  aceitaMaisDeUm,
  ehDoContrato,
  ehOpcional,
  ESPERADOS_DA_MEDICAO,
  ESPERADOS_DA_OBRA,
  resumoDoAcervo,
} from "@/modules/documentos/acervo";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

const SEM_VINCULO = {
  medicao: null,
  etapaObra: null,
  movimento: null,
  rerratificacao: null,
};

type Doc = typeof SEM_VINCULO & {
  id: string;
  tipo: TipoDocumento;
  criadoEm: Date;
};

const doc = (id: string, tipo: TipoDocumento, iso: string, vinculo = {}): Doc => ({
  ...SEM_VINCULO,
  ...vinculo,
  id,
  tipo,
  criadoEm: d(iso),
});

const ESPERADOS = [
  TipoDocumento.CONTRATO,
  TipoDocumento.APOLICE_SEGURO,
  TipoDocumento.OUTRO,
];

/** "Outros" tem linha, mas não é cobrado: é a porta do que não tem tipo. */
const COBRADOS = ESPERADOS.length - 1;

const acervo = (documentos: Doc[] = [], dispensados: { tipo: TipoDocumento; motivo: string | null }[] = []) =>
  acervoDoContrato({ esperados: ESPERADOS, documentos, dispensados });

const linhaDe = (linhas: ReturnType<typeof acervo>, tipo: TipoDocumento) =>
  linhas.find((l) => l.tipo === tipo);

describe("acervo do contrato", () => {
  it("sem arquivo nenhum, toda linha esperada aparece em falta e aceita inclusão", () => {
    const linhas = acervo();

    assert.equal(linhas.length, ESPERADOS.length);
    assert.ok(linhas.every((l) => l.situacao === "FALTANDO"));
    assert.ok(linhas.every((l) => l.aceitaInclusao));
    assert.ok(linhas.every((l) => l.documento === null));
  });

  it("tipo com arquivo vira a linha do arquivo, sem linha vazia duplicada", () => {
    const linhas = acervo([doc("a", TipoDocumento.CONTRATO, "2026-03-01")]);
    const contrato = linhas.filter((l) => l.tipo === TipoDocumento.CONTRATO);

    assert.equal(contrato.length, 1);
    assert.equal(contrato[0]?.situacao, "ANEXADO");
    assert.equal(contrato[0]?.documento?.id, "a");
    // Tipo de arquivo único: anexado, a linha não convida a incluir de novo.
    assert.equal(contrato[0]?.aceitaInclusao, false);
  });

  it("“Outros” aceita repetição e continua oferecendo inclusão", () => {
    assert.ok(aceitaMaisDeUm(TipoDocumento.OUTRO));
    assert.equal(aceitaMaisDeUm(TipoDocumento.CONTRATO), false);

    const linhas = acervo([
      doc("b", TipoDocumento.OUTRO, "2026-05-10"),
      doc("a", TipoDocumento.OUTRO, "2026-03-01"),
    ]);
    const outros = linhas.filter((l) => l.tipo === TipoDocumento.OUTRO);

    assert.deepEqual(
      outros.map((l) => l.documento?.id),
      ["a", "b"],
    );
    assert.ok(outros.every((l) => l.aceitaInclusao));
  });

  it("arquivo de outra tela entra depois dos esperados, sem botão de incluir", () => {
    const daRerratificacao = doc("r", TipoDocumento.PARECER, "2026-06-01", {
      rerratificacao: { numero: 1 },
    });
    assert.equal(ehDoContrato(daRerratificacao), false);

    const linhas = acervo([daRerratificacao]);
    const ultima = linhas.at(-1);

    assert.equal(ultima?.documento?.id, "r");
    assert.equal(ultima?.classe, "OUTRA_TELA");
    assert.equal(ultima?.aceitaInclusao, false);
    // Não pesa na cobrança: quem cobra o anexo é a tela de origem.
    assert.equal(resumoDoAcervo(linhas).cobrados, COBRADOS);
  });

  it("dispensado fica cinza, desce para o fim e para de aceitar inclusão", () => {
    const linhas = acervo(
      [],
      [{ tipo: TipoDocumento.APOLICE_SEGURO, motivo: "contrato sem garantia" }],
    );
    const garantia = linhaDe(linhas, TipoDocumento.APOLICE_SEGURO);

    assert.equal(garantia?.situacao, "DISPENSADO");
    assert.equal(garantia?.motivo, "contrato sem garantia");
    assert.equal(garantia?.aceitaInclusao, false);
    assert.equal(linhas.at(-1)?.tipo, TipoDocumento.APOLICE_SEGURO);
  });

  it("dispensa vence anexo: o arquivo continua listado, mas no fim e sem cobrança", () => {
    const linhas = acervo(
      [doc("g", TipoDocumento.APOLICE_SEGURO, "2026-02-01")],
      [{ tipo: TipoDocumento.APOLICE_SEGURO, motivo: null }],
    );

    assert.equal(linhas.at(-1)?.documento?.id, "g");
    assert.equal(linhas.at(-1)?.situacao, "DISPENSADO");

    const resumo = resumoDoAcervo(linhas);
    assert.equal(resumo.dispensados, 1);
    assert.equal(resumo.cobrados, COBRADOS - 1);
  });

  it("o resumo conta tipos, não arquivos", () => {
    const linhas = acervo([
      doc("a", TipoDocumento.PROPOSTA, "2026-03-01"),
      doc("b", TipoDocumento.CONTRATO, "2026-03-02"),
      doc("c", TipoDocumento.CONTRATO, "2026-03-03"),
    ]);
    const resumo = resumoDoAcervo(linhas);

    // Contrato tem dois arquivos e conta uma vez; proposta está fora da lista
    // cobrada e não conta. Falta a apólice.
    assert.equal(resumo.anexados, 1);
    assert.equal(resumo.faltando, 1);
    assert.equal(resumo.cobrados, COBRADOS);
  });

  // Cobrar "Outro" deixaria toda obra com uma pendência que nunca fecha.
  it("“Outro” tem linha mas não entra na cobrança, cheio ou vazio", () => {
    const vazio = resumoDoAcervo(acervo());
    assert.equal(vazio.cobrados, COBRADOS);
    assert.equal(vazio.faltando, COBRADOS);

    const cheio = resumoDoAcervo(
      acervo([doc("o", TipoDocumento.OUTRO, "2026-03-01")]),
    );
    assert.equal(cheio.cobrados, COBRADOS);
    assert.equal(cheio.anexados, 0);
  });
});

describe("os documentos necessários de cada tela", () => {
  // A lista que a Fernanda mandou em 21/09/2026, na ordem em que ela veio.
  it("o contrato cobra os dezessete documentos do cliente, na ordem", () => {
    assert.deepEqual(ESPERADOS_DA_OBRA, [
      TipoDocumento.TERMO_ADJUDICACAO,
      TipoDocumento.TERMO_HOMOLOGACAO,
      TipoDocumento.EMPENHO,
      TipoDocumento.CONTRATO,
      TipoDocumento.PUBLICACAO_EXTRATO_CONTRATO,
      TipoDocumento.APOLICE_SEGURO,
      TipoDocumento.PUBLICACAO_COMISSAO_FISCALIZACAO,
      TipoDocumento.ORDEM_INICIO,
      TipoDocumento.ART_RRT,
      TipoDocumento.CNO,
      TipoDocumento.MEDICAO,
      TipoDocumento.TERMO_ADITIVO,
      TipoDocumento.APOSTILAMENTO,
      TipoDocumento.RECEBIMENTO_PROVISORIO,
      TipoDocumento.RECEBIMENTO_DEFINITIVO,
      TipoDocumento.LICENCA,
      TipoDocumento.OUTRO,
    ]);
  });

  // "(Em caso de necessidade)", nas palavras do cliente: contrato sem aditivo
  // não está em falta com nada.
  it("termo aditivo e apostilamento têm linha, mas não são cobrados", () => {
    assert.ok(ehOpcional(TipoDocumento.TERMO_ADITIVO));
    assert.ok(ehOpcional(TipoDocumento.APOSTILAMENTO));
    assert.ok(ehOpcional(TipoDocumento.OUTRO));
    assert.equal(ehOpcional(TipoDocumento.CONTRATO), false);

    const linhas = acervoDoContrato({
      esperados: ESPERADOS_DA_OBRA,
      documentos: [],
      dispensados: [],
    });
    // Dezessete linhas, catorze cobradas: os três opcionais ficam de fora.
    assert.equal(linhas.length, ESPERADOS_DA_OBRA.length);
    assert.equal(resumoDoAcervo(linhas).cobrados, ESPERADOS_DA_OBRA.length - 3);
  });

  // Um seguro-garantia e um risco de engenharia; três licenças; uma ART por
  // profissional. Mandados repetir em 21/09, depois de a lista subir.
  it("apólice, licenças e ART/RRT aceitam mais de um arquivo no contrato", () => {
    for (const tipo of [
      TipoDocumento.APOLICE_SEGURO,
      TipoDocumento.LICENCA,
      TipoDocumento.ART_RRT,
    ]) {
      assert.ok(aceitaMaisDeUm(tipo), tipo);

      const linhas = acervoDoContrato({
        esperados: ESPERADOS_DA_OBRA,
        documentos: [
          doc("a", tipo, "2026-03-01"),
          doc("b", tipo, "2026-04-01"),
        ],
        dispensados: [],
      });
      const doTipo = linhas.filter((l) => l.tipo === tipo);

      // Os dois arquivos aparecem, na ordem de envio, e a linha continua
      // convidando a incluir o próximo.
      assert.deepEqual(doTipo.map((l) => l.documento?.id), ["a", "b"]);
      assert.ok(doTipo.every((l) => l.aceitaInclusao));
      // Dois arquivos, um tipo: a cobrança conta o tipo uma vez só.
      assert.equal(resumoDoAcervo(linhas).anexados, 1);
    }
  });

  // Continua valendo para o resto da lista: um tipo, um arquivo.
  it("os demais tipos do contrato seguem aceitando um arquivo só", () => {
    for (const tipo of [
      TipoDocumento.CONTRATO,
      TipoDocumento.EMPENHO,
      TipoDocumento.ORDEM_INICIO,
      TipoDocumento.RECEBIMENTO_DEFINITIVO,
    ]) {
      assert.equal(aceitaMaisDeUm(tipo), false, tipo);
    }
  });

  // Item 11 da lista. Os boletins são anexados na tela de cada medição — a
  // linha do contrato ficaria vermelha para sempre se ignorasse isso.
  it("o boletim anexado na medição cumpre a linha “Medições contratuais”", () => {
    const linhas = acervoDoContrato({
      esperados: ESPERADOS_DA_OBRA,
      documentos: [
        doc("b", TipoDocumento.MEDICAO, "2026-06-01", { medicao: { numero: 3 } }),
      ],
      dispensados: [],
    });
    const medicao = linhaDe(linhas, TipoDocumento.MEDICAO);

    assert.equal(medicao?.classe, "ESPERADO");
    assert.equal(medicao?.situacao, "ANEXADO");
    assert.equal(medicao?.documento?.id, "b");
    // Um contrato tem várias medições: a linha continua aceitando arquivo.
    assert.ok(medicao?.aceitaInclusao);
    assert.equal(resumoDoAcervo(linhas).anexados, 1);
  });

  // Ditos pelo cliente em 17/09/2026, nesta ordem, mais a linha "Outro".
  it("a medição cobra os seis que o cliente nomeou, na ordem", () => {
    assert.deepEqual(ESPERADOS_DA_MEDICAO, [
      TipoDocumento.MEDICAO,
      TipoDocumento.MEMORIA_CALCULO,
      TipoDocumento.CRONOGRAMA,
      TipoDocumento.RELATORIO_FOTOGRAFICO,
      TipoDocumento.DIARIO_OBRA,
      TipoDocumento.NOTA_FISCAL,
      TipoDocumento.OUTRO,
    ]);
  });

  // Senão toda obra abriria com quatro linhas vermelhas que nunca fecham.
  it("o contrato não cobra os documentos que são da medição", () => {
    for (const tipo of [
      TipoDocumento.MEMORIA_CALCULO,
      TipoDocumento.CRONOGRAMA,
      TipoDocumento.RELATORIO_FOTOGRAFICO,
      TipoDocumento.DIARIO_OBRA,
    ]) {
      assert.ok(!ESPERADOS_DA_OBRA.includes(tipo), tipo);
    }
    assert.ok(ESPERADOS_DA_OBRA.includes(TipoDocumento.CONTRATO));
  });

  // Anexado no contrato assim mesmo, ainda aparece — só que fora da lista.
  it("documento de medição anexado ao contrato não some da tela", () => {
    const linhas = acervoDoContrato({
      esperados: ESPERADOS_DA_OBRA,
      documentos: [doc("c", TipoDocumento.CRONOGRAMA, "2026-03-01")],
      dispensados: [],
    });
    const cronograma = linhaDe(linhas, TipoDocumento.CRONOGRAMA);

    assert.equal(cronograma?.classe, "EXTRA");
    assert.equal(cronograma?.situacao, "ANEXADO");
  });
});

describe("acervo da medição", () => {
  it("todo tipo aceita repetição: a linha preenchida continua oferecendo incluir", () => {
    const linhas = acervoDaMedicao({
      esperados: [TipoDocumento.MEDICAO, TipoDocumento.NOTA_FISCAL],
      documentos: [doc("a", TipoDocumento.MEDICAO, "2026-03-01")],
      dispensados: [],
    });

    assert.ok(linhas.every((l) => l.aceitaInclusao));
    // Um tipo anexado não vira dois: a linha do arquivo é a linha do tipo.
    assert.equal(linhas.length, 2);
  });

  it("arquivo de tipo fora da lista aparece no fim, marcado como extra", () => {
    const linhas = acervoDaMedicao({
      esperados: [TipoDocumento.MEDICAO],
      documentos: [doc("p", TipoDocumento.PARECER, "2026-04-01")],
      dispensados: [],
    });

    assert.deepEqual(
      linhas.map((l) => l.classe),
      ["ESPERADO", "EXTRA"],
    );
    // O extra não entra na cobrança — o cabeçalho conta o que a tela exige.
    assert.equal(resumoDoAcervo(linhas).cobrados, 1);
  });
});
