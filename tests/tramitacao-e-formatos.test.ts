import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FLUXO_FIXO, etapasIniciais, ordemDaEtapa } from "@/modules/tramitacao/fluxo";
import { TipoEtapa } from "@/generated/prisma/enums";
import { ENGENHARIA_HABILITADA, validarArquivo, TAMANHO_MAXIMO_BYTES } from "@/modules/documentos/formatos";
import { pode } from "@/modules/auth/permissoes";

describe("fluxo fixo de tramitação", () => {
  it("tem as 11 etapas do requisito", () => {
    assert.equal(FLUXO_FIXO.length, 11);
  });

  it("cobre todos os tipos de etapa do schema — nenhuma órfã", () => {
    const doSchema = Object.values(TipoEtapa).sort();
    const doFluxo = [...FLUXO_FIXO].sort();
    assert.deepEqual(doFluxo, doSchema);
  });

  it("mantém a ordem contratada", () => {
    assert.equal(ordemDaEtapa(TipoEtapa.BUSCA_LICITACAO), 1);
    assert.equal(ordemDaEtapa(TipoEtapa.MEDICOES), 7);
    assert.equal(ordemDaEtapa(TipoEtapa.ATESTADO), 11);
  });

  it("etapasIniciais devolve as 11 numeradas de 1 a 11", () => {
    const etapas = etapasIniciais();
    assert.deepEqual(
      etapas.map((e) => e.ordem),
      Array.from({ length: 11 }, (_, i) => i + 1),
    );
  });
});

describe("allowlist de formatos", () => {
  it("aceita os formatos confirmados em contrato", () => {
    for (const nome of ["a.pdf", "b.xlsx", "c.xls", "d.csv", "e.jpg", "f.png"]) {
      assert.equal(validarArquivo(nome, "", 1000).ok, true, nome);
    }
  });

  it("DWG e RVT seguem bloqueados até o cliente confirmar", () => {
    assert.equal(ENGENHARIA_HABILITADA, false);
    const r = validarArquivo("projeto.dwg", "", 1000);
    assert.equal(r.ok, false);
    assert.match(r.ok === false ? r.motivo : "", /ainda não liberado/);
  });

  it("rejeita executável", () => {
    assert.equal(validarArquivo("virus.exe", "", 1000).ok, false);
  });

  it("rejeita arquivo sem extensão e arquivo vazio", () => {
    assert.equal(validarArquivo("semextensao", "", 1000).ok, false);
    assert.equal(validarArquivo("a.pdf", "", 0).ok, false);
  });

  it("rejeita acima do limite de tamanho", () => {
    assert.equal(validarArquivo("a.pdf", "", TAMANHO_MAXIMO_BYTES + 1).ok, false);
  });

  it("rejeita extensão que contradiz o conteúdo", () => {
    assert.equal(validarArquivo("falso.pdf", "image/png", 1000).ok, false);
  });
});

describe("matriz de permissões", () => {
  it("administrador gerencia usuários; gestor não", () => {
    assert.equal(pode("ADMINISTRADOR", "usuario", "criar"), true);
    assert.equal(pode("GESTOR", "usuario", "criar"), false);
  });

  it("visualizador não escreve em nada", () => {
    assert.equal(pode("VISUALIZADOR", "obra", "editar"), false);
    assert.equal(pode("VISUALIZADOR", "medicao", "criar"), false);
    assert.equal(pode("VISUALIZADOR", "obra", "ver"), true);
  });

  it("ninguém edita ou apaga a auditoria — nem o administrador", () => {
    assert.equal(pode("ADMINISTRADOR", "auditoria", "editar"), false);
    assert.equal(pode("ADMINISTRADOR", "auditoria", "excluir"), false);
    assert.equal(pode("ADMINISTRADOR", "auditoria", "ver"), true);
  });
});
