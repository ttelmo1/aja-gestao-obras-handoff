import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  condicaoDeAuditoria,
  lerFiltrosAuditoria,
  POR_PAGINA,
  pularRegistros,
  queryDaPagina,
  temFiltroAuditoria,
} from "@/modules/auditoria/filtros";
import {
  ACOES_AUDITORIA,
  ENTIDADES_AUDITAVEIS,
  ROTULOS_ACAO,
  ROTULOS_ENTIDADE,
  rotuloDaEntidade,
} from "@/modules/auditoria/rotulos";

describe("filtros da auditoria", () => {
  it("sem query, começa na primeira página e sem filtro", () => {
    const f = lerFiltrosAuditoria({});
    assert.equal(f.pagina, 1);
    assert.equal(temFiltroAuditoria(f), false);
  });

  it("lê ação, entidade, autor e busca", () => {
    const f = lerFiltrosAuditoria({
      acao: "EXCLUIR",
      entidade: "Medicao",
      usuario: "u-1",
      busca: "  nota  ",
    });
    assert.equal(f.acao, "EXCLUIR");
    assert.equal(f.entidade, "Medicao");
    assert.equal(f.usuarioId, "u-1");
    assert.equal(f.busca, "nota");
    assert.equal(temFiltroAuditoria(f), true);
  });

  it("valor inválido na URL é ignorado em vez de quebrar a tela", () => {
    const f = lerFiltrosAuditoria({ acao: "INVENTADA", entidade: "Fantasma" });
    assert.equal(f.acao, null);
    assert.equal(f.entidade, null);
  });

  it("página inválida volta para a primeira", () => {
    for (const p of ["0", "-3", "abc", ""]) {
      assert.equal(lerFiltrosAuditoria({ pagina: p }).pagina, 1, p);
    }
    assert.equal(lerFiltrosAuditoria({ pagina: "4" }).pagina, 4);
  });

  it("o intervalo pega o dia inteiro, das 00:00 às 23:59", () => {
    // Sem isso, filtrar "até hoje" perderia tudo que aconteceu hoje.
    const f = lerFiltrosAuditoria({ de: "2026-09-01", ate: "2026-09-07" });
    assert.equal(f.de?.getHours(), 0);
    assert.equal(f.ate?.getHours(), 23);
    assert.equal(f.ate?.getMinutes(), 59);
  });

  it("data malformada é ignorada", () => {
    assert.equal(lerFiltrosAuditoria({ de: "01/09/2026" }).de, null);
  });
});

describe("consulta da auditoria", () => {
  it("a obra entra por fora, não pela query", () => {
    const where = condicaoDeAuditoria(lerFiltrosAuditoria({}), "obra-1");
    assert.equal(where.obraId, "obra-1");
    assert.equal(condicaoDeAuditoria(lerFiltrosAuditoria({})).obraId, undefined);
  });

  it("monta o intervalo de datas quando há filtro", () => {
    const where = condicaoDeAuditoria(
      lerFiltrosAuditoria({ de: "2026-09-01", ate: "2026-09-07" }),
    );
    const c = where.criadoEm as { gte?: Date; lte?: Date };
    assert.ok(c.gte instanceof Date);
    assert.ok(c.lte instanceof Date);
  });

  it("sem filtro de data, não restringe o período", () => {
    assert.equal(condicaoDeAuditoria(lerFiltrosAuditoria({})).criadoEm, undefined);
  });

  it("a busca cobre descrição e nome do autor", () => {
    const where = condicaoDeAuditoria(lerFiltrosAuditoria({ busca: "joão" }));
    assert.equal((where.OR as unknown[]).length, 2);
  });
});

describe("paginação", () => {
  it("a primeira página não pula registro", () => {
    assert.equal(pularRegistros(lerFiltrosAuditoria({})), 0);
    assert.equal(pularRegistros(lerFiltrosAuditoria({ pagina: "3" })), POR_PAGINA * 2);
  });

  it("o link da próxima página preserva os filtros", () => {
    const f = lerFiltrosAuditoria({ acao: "CRIAR", busca: "obra" });
    const q = queryDaPagina(f, 2);
    assert.match(q, /acao=CRIAR/);
    assert.match(q, /busca=obra/);
    assert.match(q, /pagina=2/);
  });

  it("voltar para a primeira página tira o parâmetro da URL", () => {
    assert.equal(queryDaPagina(lerFiltrosAuditoria({}), 1), "");
  });
});

describe("rótulos da auditoria", () => {
  it("toda ação do enum tem verbo em português", () => {
    for (const a of ACOES_AUDITORIA) {
      assert.ok(ROTULOS_ACAO[a], `sem rótulo: ${a}`);
    }
  });

  it("o nome do model vira o nome que o usuário usa", () => {
    assert.equal(rotuloDaEntidade("TramitacaoMovimento"), "Tramitação");
    assert.equal(rotuloDaEntidade("Medicao"), "Medição");
  });

  it("entidade desconhecida não some da tela — cai no próprio nome", () => {
    assert.equal(rotuloDaEntidade("CoisaNova"), "CoisaNova");
  });

  it("toda entidade do filtro está declarada nos rótulos", () => {
    // Sem entrada explícita o filtro mostraria "TramitacaoMovimento" cru.
    for (const e of ENTIDADES_AUDITAVEIS) {
      assert.ok(e in ROTULOS_ENTIDADE, `entidade sem rótulo declarado: ${e}`);
    }
  });
});
