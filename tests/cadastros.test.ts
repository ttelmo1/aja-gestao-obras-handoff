import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatarCnpj, limparCnpj, validarCnpj } from "@/modules/cadastros/cnpj";

describe("CNPJ numérico (formato antigo, ainda válido)", () => {
  it("aceita CNPJ correto, com e sem máscara", () => {
    assert.equal(validarCnpj("11222333000181"), true);
    assert.equal(validarCnpj("11.222.333/0001-81"), true);
    assert.equal(validarCnpj("04252011000110"), true);
  });

  it("recusa dígito verificador errado", () => {
    assert.equal(validarCnpj("11222333000182"), false);
    assert.equal(validarCnpj("11222333000191"), false);
  });

  it("recusa tamanho diferente de 14", () => {
    assert.equal(validarCnpj("1122233300018"), false);
    assert.equal(validarCnpj("112223330001811"), false);
    assert.equal(validarCnpj(""), false);
  });

  it("recusa sequência repetida, que passa no módulo 11 mas não existe", () => {
    for (const d of "0123456789") {
      assert.equal(validarCnpj(d.repeat(14)), false, d);
    }
  });
});

describe("CNPJ alfanumérico (obrigatório desde julho de 2026)", () => {
  it("aceita o exemplo oficial da Receita", () => {
    assert.equal(validarCnpj("12ABC34501DE35"), true);
  });

  it("aceita minúsculas, normalizando", () => {
    assert.equal(validarCnpj("12abc34501de35"), true);
  });

  it("recusa quando o verificador não bate", () => {
    assert.equal(validarCnpj("12ABC34501DE34"), false);
  });

  it("recusa letra nos dois dígitos verificadores, que são sempre numéricos", () => {
    assert.equal(validarCnpj("12ABC34501DEA5"), false);
  });

  it("recusa caractere fora de 0-9 A-Z", () => {
    // A pontuação é removida pela limpeza; o que sobra tem de ser válido.
    assert.equal(validarCnpj("12ABÇ34501DE35"), false);
  });
});

describe("limpeza e máscara", () => {
  it("limpa pontuação e normaliza caixa", () => {
    assert.equal(limparCnpj("12.abc.345/01de-35"), "12ABC34501DE35");
  });

  it("aplica a máscara igual para numérico e alfanumérico", () => {
    assert.equal(formatarCnpj("11222333000181"), "11.222.333/0001-81");
    assert.equal(formatarCnpj("12ABC34501DE35"), "12.ABC.345/01DE-35");
  });

  it("devolve vazio para nulo e não mascara o que não tem 14 caracteres", () => {
    assert.equal(formatarCnpj(null), "");
    assert.equal(formatarCnpj(""), "");
    assert.equal(formatarCnpj("123"), "123");
  });
});
