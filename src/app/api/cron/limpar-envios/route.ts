import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { apagarArquivos } from "@/lib/storage";

/**
 * Limpeza diária dos envios abandonados (etapa 15).
 *
 * Quem fecha a aba no meio de um upload deixa a autorização em
 * `EnvioPendente` e, às vezes, o arquivo já no armazenamento, sem `Documento`
 * que aponte para ele. Vencida a autorização, os dois saem.
 *
 * Chamada pelo Vercel Cron (`vercel.json`), que manda
 * `Authorization: Bearer <CRON_SECRET>`. Sem `CRON_SECRET` configurado a rota
 * recusa tudo — melhor a limpeza parada do que uma rota aberta que apaga
 * arquivos. Fica fora do `matcher` do `proxy.ts`, que mandaria a chamada sem
 * cookie para o login.
 */

/** Por chamada; o que sobrar sai no dia seguinte. */
const LOTE = 500;

function autorizado(request: Request): boolean {
  const segredo = env().CRON_SECRET;
  if (!segredo) return false;
  const recebido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${segredo}`);
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export async function GET(request: Request) {
  if (!autorizado(request)) return new Response("Não autorizado.", { status: 401 });

  const vencidos = await prisma.envioPendente.findMany({
    where: { expiraEm: { lt: new Date() } },
    select: { id: true, caminhoRelativo: true },
    orderBy: { expiraEm: "asc" },
    take: LOTE,
  });

  await apagarArquivos(vencidos.map((v) => v.caminhoRelativo));
  await prisma.envioPendente.deleteMany({
    where: { id: { in: vencidos.map((v) => v.id) } },
  });

  return Response.json({ apagados: vencidos.length });
}
