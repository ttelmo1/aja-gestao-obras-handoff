import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { consumirCorpo, novoCaminho, TamanhoNaoConfere } from "@/lib/storage/comum";
import {
  MAXIMO_ARQUIVOS_POR_ENVIO,
  lerArquivosDeclarados,
  recusaDaConfirmacao,
  type EnvioAutorizado,
} from "@/modules/documentos/envio";
import { TAMANHO_MAXIMO_BYTES } from "@/modules/documentos/formatos";

const agora = new Date("2026-10-05T12:00:00Z");

const envio: EnvioAutorizado = {
  nomeOriginal: "contrato.pdf",
  usuarioId: "u1",
  obraId: "o1",
  tamanhoBytes: BigInt(1000),
  expiraEm: new Date("2026-10-05T13:00:00Z"),
};
const quem = { usuarioId: "u1", obraId: "o1" };

describe("confirmação do envio", () => {
  it("aceita quando o arquivo chegou com o tamanho autorizado", () => {
    assert.equal(recusaDaConfirmacao(envio, quem, { tamanhoBytes: 1000 }, agora), null);
  });

  it("recusa envio de outra pessoa com a mesma mensagem de inexistente", () => {
    const motivo = recusaDaConfirmacao(
      envio,
      { usuarioId: "u2", obraId: "o1" },
      { tamanhoBytes: 1000 },
      agora,
    );
    assert.match(motivo ?? "", /não encontrado/);
  });

  it("recusa confirmar em obra diferente da autorizada", () => {
    const motivo = recusaDaConfirmacao(
      envio,
      { usuarioId: "u1", obraId: "o2" },
      { tamanhoBytes: 1000 },
      agora,
    );
    assert.match(motivo ?? "", /não encontrado/);
  });

  it("recusa autorização vencida", () => {
    const motivo = recusaDaConfirmacao(
      { ...envio, expiraEm: agora },
      quem,
      { tamanhoBytes: 1000 },
      agora,
    );
    assert.match(motivo ?? "", /venceu/);
  });

  it("recusa quando nada chegou ao armazenamento", () => {
    assert.match(recusaDaConfirmacao(envio, quem, null, agora) ?? "", /não chegou/);
  });

  it("recusa tamanho diferente do autorizado, para mais ou para menos", () => {
    for (const tamanhoBytes of [999, 1001]) {
      const motivo = recusaDaConfirmacao(envio, quem, { tamanhoBytes }, agora);
      assert.match(motivo ?? "", /tamanho diferente/);
    }
  });

  it("recusa acima do limite mesmo se o tamanho bater com o autorizado", () => {
    const grande = TAMANHO_MAXIMO_BYTES + 1;
    const motivo = recusaDaConfirmacao(
      { ...envio, tamanhoBytes: BigInt(grande) },
      quem,
      { tamanhoBytes: grande },
      agora,
    );
    assert.match(motivo ?? "", /limite/);
  });
});

describe("arquivos declarados pela tela", () => {
  const um = { nome: "a.pdf", tamanho: 10, tipo: "application/pdf" };

  it("lê uma lista válida", () => {
    const r = lerArquivosDeclarados(JSON.stringify([um]));
    assert.ok(r.ok);
    assert.equal(r.arquivos.length, 1);
  });

  it("recusa lista vazia, JSON quebrado e campos faltando", () => {
    assert.equal(lerArquivosDeclarados("[]").ok, false);
    assert.equal(lerArquivosDeclarados("{").ok, false);
    assert.equal(lerArquivosDeclarados(JSON.stringify([{ nome: "a.pdf" }])).ok, false);
  });

  it("recusa tamanho negativo ou fracionado", () => {
    for (const tamanho of [-1, 1.5]) {
      assert.equal(lerArquivosDeclarados(JSON.stringify([{ ...um, tamanho }])).ok, false);
    }
  });

  it("limita a quantidade de arquivos por envio", () => {
    const muitos = Array.from({ length: MAXIMO_ARQUIVOS_POR_ENVIO + 1 }, () => um);
    const r = lerArquivosDeclarados(JSON.stringify(muitos));
    assert.equal(r.ok, false);
  });
});

function corpo(...pedacos: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      for (const n of pedacos) c.enqueue(new Uint8Array(n).fill(1));
      c.close();
    },
  });
}

describe("corpo recebido pela rota de envio", () => {
  it("conta, calcula o hash e entrega todos os pedaços", async () => {
    let escritos = 0;
    const r = await consumirCorpo(corpo(3, 4), 7, async (p) => {
      escritos += p.byteLength;
    });
    assert.equal(r.tamanhoBytes, 7);
    assert.equal(escritos, 7);
    assert.match(r.hashSha256, /^[0-9a-f]{64}$/);
  });

  it("interrompe assim que passa do tamanho autorizado", async () => {
    let escritos = 0;
    await assert.rejects(
      consumirCorpo(corpo(5, 5, 5), 6, async (p) => {
        escritos += p.byteLength;
      }),
      TamanhoNaoConfere,
    );
    // O segundo pedaço já estoura: só o primeiro chegou a ser escrito.
    assert.equal(escritos, 5);
  });

  it("recusa corpo incompleto", async () => {
    await assert.rejects(
      consumirCorpo(corpo(3), 7, async () => {}),
      TamanhoNaoConfere,
    );
  });
});

describe("caminho de um arquivo novo", () => {
  it("usa uuid com a extensão do original e barra normal", () => {
    const { nomeArmazenado, caminhoRelativo } = novoCaminho("o1", "../../Contrato.PDF");
    assert.match(nomeArmazenado, /^[0-9a-f-]{36}\.pdf$/);
    assert.equal(caminhoRelativo, `obras/o1/${nomeArmazenado}`);
  });
});
