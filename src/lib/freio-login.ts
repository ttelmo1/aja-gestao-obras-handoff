import "server-only";

import { prisma } from "@/lib/prisma";
import {
  JANELA_MS,
  aposFalha,
  segundosDeBloqueio,
  type RegistroFreio,
} from "@/modules/auth/throttle";

/**
 * Onde o freio de login guarda o estado: a tabela `FreioLogin`. A regra está
 * em `modules/auth/throttle.ts`.
 */

type Linha = { tentativas: number; bloqueadoAte: Date; visto: Date };

function deLinha(l: Linha): RegistroFreio {
  return {
    tentativas: l.tentativas,
    bloqueadoAte: l.bloqueadoAte.getTime(),
    visto: l.visto.getTime(),
  };
}

export async function bloqueadoPor(chave: string): Promise<number> {
  const linha = await prisma.freioLogin.findUnique({ where: { chave } });
  return segundosDeBloqueio(linha && deLinha(linha), Date.now());
}

/**
 * Conta mais uma senha errada.
 *
 * Ler, calcular e regravar sem trava deixaria várias tentativas em paralelo
 * lerem o mesmo contador e gravarem o mesmo "+1" — exatamente o que um ataque
 * de força bruta faz. A linha é criada se não existir e travada
 * (`FOR UPDATE`) antes da leitura, então as tentativas da mesma conta entram
 * uma de cada vez.
 */
export async function registrarFalha(chave: string): Promise<void> {
  const agora = Date.now();

  await prisma.$transaction(async (tx) => {
    // Linha zerada: `visto` na época faz `aposFalha` começar contagem nova.
    await tx.$executeRaw`
      INSERT INTO "FreioLogin" ("chave", "tentativas", "bloqueadoAte", "visto")
      VALUES (${chave}, 0, to_timestamp(0), to_timestamp(0))
      ON CONFLICT ("chave") DO NOTHING`;
    const [linha] = await tx.$queryRaw<Linha[]>`
      SELECT "tentativas", "bloqueadoAte", "visto" FROM "FreioLogin"
      WHERE "chave" = ${chave} FOR UPDATE`;

    const novo = aposFalha(deLinha(linha), agora);
    await tx.freioLogin.update({
      where: { chave },
      data: {
        tentativas: novo.tentativas,
        bloqueadoAte: new Date(novo.bloqueadoAte),
        visto: new Date(novo.visto),
      },
    });
  });

  // Esquece registros parados e já desbloqueados (`esquecivel`), para a
  // tabela não guardar para sempre cada e-mail errado digitado.
  await prisma.freioLogin.deleteMany({
    where: {
      bloqueadoAte: { lte: new Date(agora) },
      visto: { lt: new Date(agora - JANELA_MS) },
    },
  });
}

export async function limparFalhas(chave: string): Promise<void> {
  await prisma.freioLogin.deleteMany({ where: { chave } });
}
