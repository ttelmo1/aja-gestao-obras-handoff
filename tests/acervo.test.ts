import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TipoDocumento } from "@/generated/prisma/enums";
import {
  acervoDaMedicao,
  acervoDoContrato,
  aceitaMaisDeUm,
  ehDoContrato,
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
  TipoDocumento.GARANTIA,
  TipoDocumento.OUTRO,
];

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

  it("“Outro” aceita repetição e continua oferecendo inclusão", () => {
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

  it("arquivo de medição entra depois dos esperados, sem botão de incluir", () => {
    const daMedicao = doc("m", TipoDocumento.MEDICAO, "2026-06-01", {
      medicao: { numero: 3 },
    });
    assert.equal(ehDoContrato(daMedicao), false);

    const linhas = acervo([daMedicao]);
    const ultima = linhas.at(-1);

    assert.equal(ultima?.documento?.id, "m");
    assert.equal(ultima?.classe, "OUTRA_TELA");
    assert.equal(ultima?.aceitaInclusao, false);
    // Não pesa na cobrança: quem cobra a medição é a tela dela.
    assert.equal(resumoDoAcervo(linhas).cobrados, ESPERADOS.length);
  });

  it("dispensado fica cinza, desce para o fim e para de aceitar inclusão", () => {
    const linhas = acervo(
      [],
      [{ tipo: TipoDocumento.GARANTIA, motivo: "contrato sem garantia" }],
    );
    const garantia = linhaDe(linhas, TipoDocumento.GARANTIA);

    assert.equal(garantia?.situacao, "DISPENSADO");
    assert.equal(garantia?.motivo, "contrato sem garantia");
    assert.equal(garantia?.aceitaInclusao, false);
    assert.equal(linhas.at(-1)?.tipo, TipoDocumento.GARANTIA);
  });

  it("dispensa vence anexo: o arquivo continua listado, mas no fim e sem cobrança", () => {
    const linhas = acervo(
      [doc("g", TipoDocumento.GARANTIA, "2026-02-01")],
      [{ tipo: TipoDocumento.GARANTIA, motivo: null }],
    );

    assert.equal(linhas.at(-1)?.documento?.id, "g");
    assert.equal(linhas.at(-1)?.situacao, "DISPENSADO");

    const resumo = resumoDoAcervo(linhas);
    assert.equal(resumo.dispensados, 1);
    assert.equal(resumo.cobrados, ESPERADOS.length - 1);
  });

  it("o resumo conta tipos, não arquivos", () => {
    const linhas = acervo([
      doc("a", TipoDocumento.OUTRO, "2026-03-01"),
      doc("b", TipoDocumento.OUTRO, "2026-03-02"),
      doc("c", TipoDocumento.CONTRATO, "2026-03-03"),
    ]);
    const resumo = resumoDoAcervo(linhas);

    assert.equal(resumo.anexados, 2);
    assert.equal(resumo.faltando, 1);
    assert.equal(resumo.cobrados, 3);
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
