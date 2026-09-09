import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";

/**
 * Endpoint de saúde — o passo 7 do script de atualização
 * (docs/instalacao-on-premise.md, seção 4).
 *
 * Existe para que "o serviço subiu" deixe de ser palpite. O script troca a
 * junction, sobe o serviço e pergunta aqui; sem resposta 200, ele desfaz.
 *
 * **Consulta o banco de propósito.** Um health check que devolve 200 só por o
 * processo Node estar de pé daria luz verde a uma atualização em que a
 * migration falhou ou o Postgres não subiu — exatamente os dois modos de falha
 * que o script precisa detectar. A consulta é a mais barata que existe.
 *
 * O corpo é deliberadamente magro: versão, se o banco respondeu e a hora. Sem
 * mensagem de erro do banco, que carregaria host e usuário da conexão para uma
 * rota sem login.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const versao = await lerVersao();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return Response.json(
      { ok: false, versao, banco: false, agora: new Date().toISOString() },
      { status: 503 },
    );
  }

  return Response.json({
    ok: true,
    versao,
    banco: true,
    agora: new Date().toISOString(),
  });
}

/**
 * A versão vem de `versao.txt`, escrito pelo empacotador na raiz da release —
 * não de `package.json`, que ficaria congelado no `0.1.0`, nem de variável de
 * ambiente, que envelheceria no serviço a cada atualização. Em
 * desenvolvimento o arquivo não existe.
 */
async function lerVersao(): Promise<string> {
  try {
    const bruto = await readFile(path.join(process.cwd(), "versao.txt"), "utf8");
    return bruto.trim() || "desconhecida";
  } catch {
    return "desenvolvimento";
  }
}
