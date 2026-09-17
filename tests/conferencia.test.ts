import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TipoDocumento } from "@/generated/prisma/enums";
import {
  conferenciaDeDocumentos,
  ESPERADOS_DA_MEDICAO,
  ESPERADOS_DA_OBRA,
  resumoDaConferencia,
} from "@/modules/documentos/conferencia";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

const conferencia = (
  documentos: { tipo: TipoDocumento; criadoEm: Date }[] = [],
  dispensados: { tipo: TipoDocumento; motivo: string | null }[] = [],
  esperados = ESPERADOS_DA_MEDICAO,
) => conferenciaDeDocumentos({ esperados, documentos, dispensados });

const situacaoDe = (
  linhas: ReturnType<typeof conferencia>,
  tipo: TipoDocumento,
) => linhas.find((l) => l.tipo === tipo)?.situacao;

describe("lista de conferência de documentos", () => {
  it("tipo esperado sem arquivo está faltando", () => {
    const linhas = conferencia();
    assert.equal(linhas.length, ESPERADOS_DA_MEDICAO.length);
    assert.ok(linhas.every((l) => l.situacao === "FALTANDO"));
    assert.ok(linhas.every((l) => l.quantidade === 0));
  });

  it("tipo com arquivo aparece anexado, com a data do mais recente", () => {
    const linhas = conferencia([
      { tipo: TipoDocumento.MEDICAO, criadoEm: d("2026-03-01") },
      { tipo: TipoDocumento.MEDICAO, criadoEm: d("2026-05-10") },
    ]);
    const medicao = linhas.find((l) => l.tipo === TipoDocumento.MEDICAO);

    assert.equal(medicao?.situacao, "ANEXADO");
    assert.equal(medicao?.quantidade, 2);
    assert.equal(medicao?.ultimoEnvio?.toISOString().slice(0, 10), "2026-05-10");
  });

  it("mantém a ordem do processo entre os esperados", () => {
    const linhas = conferencia([
      { tipo: TipoDocumento.ISS, criadoEm: d("2026-05-10") },
    ]);
    assert.deepEqual(
      linhas.map((l) => l.tipo),
      ESPERADOS_DA_MEDICAO,
    );
  });

  it("dispensado fica cinza e vai para o fim, mesmo vindo antes na ordem", () => {
    const linhas = conferencia(
      [],
      [{ tipo: TipoDocumento.MEDICAO, motivo: "Contrato sem boletim" }],
    );

    assert.equal(linhas.at(-1)?.tipo, TipoDocumento.MEDICAO);
    assert.equal(linhas.at(-1)?.situacao, "DISPENSADO");
    assert.equal(linhas.at(-1)?.motivo, "Contrato sem boletim");
    // E some do meio da lista: não aparece duas vezes.
    assert.equal(linhas.filter((l) => l.tipo === TipoDocumento.MEDICAO).length, 1);
  });

  // Quem dispensou e anexou assim mesmo não deve continuar sendo cobrado.
  it("dispensa vence anexo, sem perder a contagem do arquivo", () => {
    const linhas = conferencia(
      [{ tipo: TipoDocumento.ISS, criadoEm: d("2026-05-10") }],
      [{ tipo: TipoDocumento.ISS, motivo: null }],
    );
    const iss = linhas.find((l) => l.tipo === TipoDocumento.ISS);

    assert.equal(iss?.situacao, "DISPENSADO");
    assert.equal(iss?.quantidade, 1);
  });

  it("arquivo de tipo fora da lista aparece no fim, marcado", () => {
    const linhas = conferencia([
      { tipo: TipoDocumento.OUTRO, criadoEm: d("2026-05-10") },
    ]);
    const outro = linhas.find((l) => l.tipo === TipoDocumento.OUTRO);

    assert.equal(outro?.situacao, "ANEXADO");
    assert.equal(outro?.foraDaLista, true);
    assert.equal(linhas.at(-1)?.tipo, TipoDocumento.OUTRO);
  });

  it("tipo fora da lista e sem arquivo não entra", () => {
    const linhas = conferencia();
    assert.equal(situacaoDe(linhas, TipoDocumento.EDITAL), undefined);
  });

  // "Outro" pode ter vários: é o caso que a Fernanda citou ao pedir mais de um.
  it("conta vários arquivos do mesmo tipo", () => {
    const linhas = conferencia([
      { tipo: TipoDocumento.OUTRO, criadoEm: d("2026-05-10") },
      { tipo: TipoDocumento.OUTRO, criadoEm: d("2026-05-11") },
      { tipo: TipoDocumento.OUTRO, criadoEm: d("2026-05-12") },
    ]);
    assert.equal(
      linhas.find((l) => l.tipo === TipoDocumento.OUTRO)?.quantidade,
      3,
    );
  });

  it("a lista da obra é a do seletor inteiro, na ordem da tela", () => {
    const linhas = conferencia([], [], ESPERADOS_DA_OBRA);
    assert.equal(linhas.length, ESPERADOS_DA_OBRA.length);
    assert.equal(linhas[0]?.tipo, TipoDocumento.CONTRATO);
  });
});

describe("resumo da conferência", () => {
  it("soma por situação e ignora o que está fora da lista", () => {
    const linhas = conferencia(
      [
        { tipo: TipoDocumento.MEDICAO, criadoEm: d("2026-05-10") },
        { tipo: TipoDocumento.OUTRO, criadoEm: d("2026-05-10") },
      ],
      [{ tipo: TipoDocumento.ISS, motivo: null }],
    );
    const r = resumoDaConferencia(linhas);

    assert.equal(r.anexados, 1);
    assert.equal(r.dispensados, 1);
    assert.equal(r.faltando, ESPERADOS_DA_MEDICAO.length - 2);
    assert.equal(r.cobrados, r.anexados + r.faltando);
  });
});
