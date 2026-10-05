import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { caminhoDaObra, resolverDentroDe } from "@/modules/documentos/caminho";
import {
  TAMANHO_MAXIMO_BYTES,
  abreInline,
  tipoDeConteudo,
  validarArquivo,
} from "@/modules/documentos/formatos";
import {
  condicaoDeBuscaDocumento,
  filtrarPorOrigem,
  lerFiltrosDocumento,
  temFiltroDocumento,
} from "@/modules/documentos/filtros";
import { origemDoDocumento, origensDisponiveis } from "@/modules/documentos/origem";
import {
  formatarTamanho,
  tiposOrdenados,
  TIPOS_DOCUMENTO,
  ROTULOS_TIPO_DOCUMENTO,
} from "@/modules/documentos/rotulos";

const vazio = {
  medicao: null,
  etapaObra: null,
  movimento: null,
  rerratificacao: null,
};

describe("origem do documento", () => {
  it("sem vínculo além da obra, é do contrato", () => {
    const o = origemDoDocumento(vazio);
    assert.equal(o.rotulo, "Contrato");
    assert.equal(o.chave, "contrato");
    assert.equal(o.setorOuEtapa, null);
  });

  it("medição ganha do setor: o setor é onde ele entrou, não o que ele é", () => {
    const o = origemDoDocumento({
      ...vazio,
      medicao: { numero: 5 },
      movimento: { setorDestino: { nome: "Controladoria" } },
    });
    assert.equal(o.rotulo, "Medição 05");
    assert.equal(o.setorOuEtapa, "Controladoria");
  });

  it("documento de etapa sem medição mostra a etapa", () => {
    const o = origemDoDocumento({ ...vazio, etapaObra: { tipo: "GARANTIA" } });
    assert.equal(o.rotulo, "Garantia");
    assert.equal(o.chave, "etapa:GARANTIA");
  });

  it("rerratificação ganha da etapa", () => {
    const o = origemDoDocumento({
      ...vazio,
      etapaObra: { tipo: "RERRATIFICACAO" },
      rerratificacao: { numero: 1 },
    });
    assert.equal(o.rotulo, "Rerratificação 01");
  });

  it("numera com dois dígitos, como o mockup", () => {
    assert.equal(
      origemDoDocumento({ ...vazio, medicao: { numero: 5 } }).rotulo,
      "Medição 05",
    );
    assert.equal(
      origemDoDocumento({ ...vazio, medicao: { numero: 12 } }).rotulo,
      "Medição 12",
    );
  });
});

describe("origens disponíveis para o seletor", () => {
  it("não repete e põe Contrato em primeiro", () => {
    const lista = origensDisponiveis([
      { ...vazio, medicao: { numero: 2 } },
      { ...vazio, medicao: { numero: 2 } },
      vazio,
      { ...vazio, medicao: { numero: 1 } },
    ]);
    assert.deepEqual(
      lista.map((o) => o.rotulo),
      ["Contrato", "Medição 01", "Medição 02"],
    );
  });

  it("acervo vazio devolve lista vazia", () => {
    assert.deepEqual(origensDisponiveis([]), []);
  });
});

describe("filtros da central", () => {
  it("lê os filtros da query", () => {
    const f = lerFiltrosDocumento({ busca: " nf ", tipo: "NOTA_FISCAL", origem: "contrato" });
    assert.equal(f.busca, "nf");
    assert.equal(f.tipo, "NOTA_FISCAL");
    assert.equal(f.origem, "contrato");
  });

  it("tipo inválido na URL é ignorado, não quebra a tela", () => {
    assert.equal(lerFiltrosDocumento({ tipo: "INVENTADO" }).tipo, null);
  });

  it("sem query, nenhum filtro ativo", () => {
    assert.equal(temFiltroDocumento(lerFiltrosDocumento({})), false);
    assert.equal(temFiltroDocumento(lerFiltrosDocumento({ busca: "x" })), true);
  });

  it("a consulta sempre exclui o que foi apagado", () => {
    const where = condicaoDeBuscaDocumento(lerFiltrosDocumento({}));
    assert.equal(where.excluidoEm, null);
  });

  it("busca cobre nome e descrição", () => {
    const where = condicaoDeBuscaDocumento(lerFiltrosDocumento({ busca: "nf" }));
    assert.equal(Array.isArray(where.OR), true);
    assert.equal((where.OR as unknown[]).length, 2);
  });

  it("filtra por origem depois da consulta", () => {
    const docs = [
      { ...vazio, medicao: { numero: 5 } },
      vazio,
    ];
    assert.equal(filtrarPorOrigem(docs, "contrato").length, 1);
    assert.equal(filtrarPorOrigem(docs, "medicao:5").length, 1);
    assert.equal(filtrarPorOrigem(docs, null).length, 2);
  });
});

describe("tipos de documento", () => {
  it("todo tipo do enum tem rótulo em português", () => {
    for (const t of TIPOS_DOCUMENTO) {
      assert.ok(ROTULOS_TIPO_DOCUMENTO[t], `sem rótulo: ${t}`);
    }
  });

  it("o contexto sugere primeiro e não perde nenhum tipo", () => {
    const daMedicao = tiposOrdenados("medicao");
    assert.equal(daMedicao[0], "MEDICAO");
    assert.equal(daMedicao.length, TIPOS_DOCUMENTO.length);
    assert.equal(new Set(daMedicao).size, TIPOS_DOCUMENTO.length);
  });

  it("a etapa sugere o vocabulário do mockup", () => {
    assert.deepEqual(tiposOrdenados("etapa").slice(0, 3), [
      "DESPACHO",
      "PARECER",
      "AUTORIZACAO",
    ]);
  });
});

describe("tamanho legível", () => {
  it("escala de bytes a gigabytes", () => {
    assert.equal(formatarTamanho(512), "512 B");
    assert.equal(formatarTamanho(2048), "2 KB");
    assert.equal(formatarTamanho(5 * 1024 * 1024), "5.0 MB");
    assert.equal(formatarTamanho(BigInt(3 * 1024 * 1024 * 1024)), "3.00 GB");
  });
});

describe("caminho dentro do armazenamento", () => {
  // A raiz e o esperado passam por resolve/join porque o retorno é caminho de
  // disco, e disco no Windows usa "\" e tem letra de unidade: comparar com o
  // texto POSIX cru passaria aqui e quebraria no servidor do cliente, que é
  // onde isso roda de verdade.
  const RAIZ = resolve("/srv/aja/storage");
  const dentroDaRaiz = (...partes: string[]) => join(RAIZ, ...partes);

  it("aceita caminho normal de obra", () => {
    assert.equal(
      resolverDentroDe(RAIZ, "obras/abc/arquivo.pdf"),
      dentroDaRaiz("obras", "abc", "arquivo.pdf"),
    );
  });

  it("recusa subir de diretório", () => {
    // O ataque óbvio: um caminho vindo do banco (ou adulterado) que sai da
    // pasta e alcança /etc/passwd ou o .env do projeto.
    assert.throws(() => resolverDentroDe(RAIZ, "../../etc/passwd"));
    assert.throws(() => resolverDentroDe(RAIZ, "obras/../../../.env"));
  });

  it("recusa caminho absoluto", () => {
    assert.throws(() => resolverDentroDe(RAIZ, "/etc/passwd"));
  });

  it("recusa prefixo parecido com a raiz", () => {
    // "/srv/aja/storage-publico" começa com a raiz como texto, mas está fora
    // dela — é o caso que uma checagem por startsWith ingênua deixaria passar.
    assert.throws(() => resolverDentroDe(RAIZ, "../storage-publico/x.pdf"));
  });

  it("normaliza ponto e barras redundantes sem reclamar", () => {
    assert.equal(
      resolverDentroDe(RAIZ, "./obras/abc/./arquivo.pdf"),
      dentroDaRaiz("obras", "abc", "arquivo.pdf"),
    );
  });

  it("o arquivo da obra mora na pasta da obra, sempre com barra normal", () => {
    // Sem sep do sistema de propósito: este valor vai para o banco. Gravado
    // como "obras\obra-1\uuid.pdf" no Windows, um dump restaurado em Linux ou
    // macOS leria isso como um nome de arquivo só, e o documento não abriria.
    assert.equal(caminhoDaObra("obra-1", "uuid.pdf"), "obras/obra-1/uuid.pdf");
  });
});

describe("validação de arquivo enviado", () => {
  it("aceita os formatos confirmados em contrato", () => {
    assert.equal(validarArquivo("contrato.pdf", "application/pdf", 1024).ok, true);
    assert.equal(validarArquivo("planilha.xlsx", "", 1024).ok, true);
  });

  it("DWG e RVT continuam bloqueados, com motivo explícito", () => {
    const r = validarArquivo("projeto.dwg", "", 1024);
    assert.equal(r.ok, false);
    assert.match(r.ok === false ? r.motivo : "", /engenharia/i);
  });

  it("recusa executável e arquivo vazio", () => {
    assert.equal(validarArquivo("virus.exe", "", 1024).ok, false);
    assert.equal(validarArquivo("vazio.pdf", "application/pdf", 0).ok, false);
  });

  it("recusa acima do teto de 300MB", () => {
    assert.equal(
      validarArquivo("grande.pdf", "application/pdf", TAMANHO_MAXIMO_BYTES + 1).ok,
      false,
    );
  });

  it("não grava mime de fora da allowlist, mesmo aceitando o arquivo", () => {
    // `.png` com `text/html` declarado: a extensão manda, o arquivo entra —
    // mas o que vai para o banco é o mime canônico da extensão, senão o
    // download devolveria `text/html` e o payload rodaria na nossa origem.
    const r = validarArquivo("laudo.png", "text/html", 1024);
    assert.equal(r.ok, true);
    assert.equal(r.ok === true ? r.mimeNormalizado : "", "image/png");

    const svg = validarArquivo("foto.jpg", "image/svg+xml", 1024);
    assert.equal(svg.ok === true ? svg.mimeNormalizado : "", "image/jpeg");
  });

  it("preserva o mime quando a allowlist o reconhece", () => {
    const r = validarArquivo("lista.csv", "text/csv", 1024);
    assert.equal(r.ok === true ? r.mimeNormalizado : "", "text/csv");
  });
});

describe("resposta de download", () => {
  it("o tipo vem da extensão, não do mime gravado", () => {
    assert.equal(tipoDeConteudo("png"), "image/png");
    assert.equal(tipoDeConteudo("PDF"), "application/pdf");
    assert.equal(tipoDeConteudo("exe"), "application/octet-stream");
  });

  it("só PDF e imagem abrem na aba", () => {
    for (const ext of ["pdf", "jpg", "jpeg", "png"]) {
      assert.equal(abreInline(ext), true, ext);
    }
    for (const ext of ["xlsx", "xls", "csv", "html"]) {
      assert.equal(abreInline(ext), false, ext);
    }
  });
});
