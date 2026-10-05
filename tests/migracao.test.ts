import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import {
  etagConfere,
  formatarBytes,
  situacaoNoBucket,
} from "@/modules/documentos/migracao";

describe("cópia de ArquivoBlob para o bucket", () => {
  it("copia o que não está no bucket", () => {
    assert.equal(situacaoNoBucket(1000, null), "copiar");
  });

  it("pula o que já foi copiado numa rodada anterior", () => {
    assert.equal(situacaoNoBucket(1000, { tamanhoBytes: 1000 }), "ja-copiado");
  });

  it("não sobrescreve objeto de mesmo nome e outro tamanho", () => {
    assert.equal(situacaoNoBucket(1000, { tamanhoBytes: 999 }), "conflito");
  });
});

describe("conferência do que chegou ao bucket", () => {
  const md5 = createHash("md5").update("conteúdo").digest("hex");

  it("aceita o ETag com aspas, como o bucket devolve", () => {
    assert.equal(etagConfere(md5, `"${md5}"`), true);
  });

  it("aceita maiúsculas e minúsculas", () => {
    assert.equal(etagConfere(md5, md5.toUpperCase()), true);
  });

  it("recusa ETag diferente ou ausente", () => {
    assert.equal(etagConfere(md5, `"${"0".repeat(32)}"`), false);
    assert.equal(etagConfere(md5, undefined), false);
  });
});

describe("tamanho no relatório", () => {
  it("escolhe a unidade", () => {
    assert.equal(formatarBytes(500), "500 B");
    assert.equal(formatarBytes(1536), "1.5 KB");
    assert.equal(formatarBytes(40000009), "38.1 MB");
  });
});
