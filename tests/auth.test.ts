import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTO_BCRYPT,
  conferirSenha,
  hashSenha,
  HASH_FALSO,
  senhaSchema,
} from "@/modules/auth/senha";
import {
  DURACAO_SESSAO_MS,
  expiraEm,
  expirou,
  gerarToken,
  hashToken,
} from "@/modules/auth/token";
import {
  BLOQUEIO_MS,
  bloqueadoPor,
  limparFalhas,
  registrarFalha,
  TENTATIVAS_ATE_BLOQUEIO,
} from "@/modules/auth/throttle";

describe("política de senha", () => {
  it("aceita senha com letra, número e tamanho mínimo", () => {
    assert.equal(senhaSchema.safeParse("obra2026").success, true);
  });

  it("recusa senha curta", () => {
    assert.equal(senhaSchema.safeParse("obra26").success, false);
  });

  it("recusa senha só de letras ou só de números", () => {
    assert.equal(senhaSchema.safeParse("obrasobras").success, false);
    assert.equal(senhaSchema.safeParse("12345678").success, false);
  });

  it("recusa senha acima de 72 bytes, em vez de deixar o bcrypt truncar", () => {
    assert.equal(senhaSchema.safeParse("a1" + "x".repeat(71)).success, false);
  });

  it("conta acentos como mais de um byte no limite do bcrypt", () => {
    // 36 "ã" = 72 bytes; com "a1" na frente passa de 72 e precisa ser recusada.
    assert.equal(senhaSchema.safeParse("a1" + "ã".repeat(36)).success, false);
  });
});

describe("hash de senha", () => {
  it("confere a senha correta e recusa a errada", async () => {
    const hash = await hashSenha("obra2026");
    assert.equal(await conferirSenha("obra2026", hash), true);
    assert.equal(await conferirSenha("obra2027", hash), false);
  });

  it("gera hash diferente para a mesma senha (salt por hash)", async () => {
    const [a, b] = await Promise.all([hashSenha("obra2026"), hashSenha("obra2026")]);
    assert.notEqual(a, b);
  });

  it("o hash falso é um bcrypt válido e não casa com nada", async () => {
    // Se deixasse de ser válido, o bcrypt responderia na hora e a diferença
    // de tempo entregaria quais e-mails existem no sistema.
    assert.match(HASH_FALSO, new RegExp(`^\\$2[aby]\\$${CUSTO_BCRYPT}\\$`));
    assert.equal(await conferirSenha("obra2026", HASH_FALSO), false);
  });
});

describe("tokens", () => {
  it("gera tokens distintos e longos", () => {
    const tokens = new Set(Array.from({ length: 200 }, gerarToken));
    assert.equal(tokens.size, 200);
    assert.ok(gerarToken().length >= 43); // 32 bytes em base64url
  });

  it("o hash é estável para o mesmo segredo e muda com outro segredo", () => {
    const t = gerarToken();
    assert.equal(hashToken(t, "segredo-a"), hashToken(t, "segredo-a"));
    assert.notEqual(hashToken(t, "segredo-a"), hashToken(t, "segredo-b"));
  });

  it("o hash não contém o token", () => {
    const t = gerarToken();
    assert.equal(hashToken(t, "segredo").includes(t), false);
  });

  it("expiração respeita o prazo", () => {
    const agora = new Date("2026-09-04T08:00:00Z");
    const fim = expiraEm(DURACAO_SESSAO_MS, agora);
    assert.equal(expirou(fim, agora), false);
    assert.equal(expirou(fim, new Date(fim.getTime())), true);
    assert.equal(expirou(fim, new Date(fim.getTime() + 1)), true);
  });
});

describe("freio de tentativas de login", () => {
  // A chave é o e-mail, não `email|ip`: o IP vinha de um header que o próprio
  // cliente escolhe, então rotacioná-lo dava tentativas infinitas.
  it("libera enquanto está abaixo do limite", () => {
    const chave = "abaixo@exemplo.com";
    limparFalhas(chave);
    for (let i = 0; i < TENTATIVAS_ATE_BLOQUEIO - 1; i++) registrarFalha(chave);
    assert.equal(bloqueadoPor(chave), 0);
  });

  it("bloqueia ao atingir o limite e solta quando o prazo vence", () => {
    const chave = "limite@exemplo.com";
    limparFalhas(chave);
    const agora = Date.now();
    for (let i = 0; i < TENTATIVAS_ATE_BLOQUEIO; i++) registrarFalha(chave, agora);
    assert.ok(bloqueadoPor(chave, agora) > 0);
    assert.equal(bloqueadoPor(chave, agora + BLOQUEIO_MS + 1), 0);
  });

  it("o acerto zera o contador", () => {
    const chave = "acerto@exemplo.com";
    limparFalhas(chave);
    for (let i = 0; i < TENTATIVAS_ATE_BLOQUEIO; i++) registrarFalha(chave);
    limparFalhas(chave);
    assert.equal(bloqueadoPor(chave), 0);
  });

  it("uma conta travada não trava as outras", () => {
    limparFalhas("alvo@exemplo.com");
    limparFalhas("vizinho@exemplo.com");
    for (let i = 0; i < TENTATIVAS_ATE_BLOQUEIO; i++) registrarFalha("alvo@exemplo.com");
    assert.ok(bloqueadoPor("alvo@exemplo.com") > 0);
    assert.equal(bloqueadoPor("vizinho@exemplo.com"), 0);
  });
});
