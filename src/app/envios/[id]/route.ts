import { usuarioAtual } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { gravarFluxo, TamanhoNaoConfere } from "@/lib/storage";
import { pode } from "@/modules/auth/permissoes";

/**
 * Recebe os bytes de um envio autorizado quando não há bucket (drivers
 * `disco` e `db`) — é o "armazenamento" para onde `prepararEnvio` aponta a
 * tela nesses casos. Com `STORAGE_DRIVER=s3` a tela envia direto ao bucket e
 * esta rota responde 404.
 *
 * Fica **fora** do `matcher` do `proxy.ts`: o Next guarda em memória só os
 * primeiros 10 MB do corpo de toda requisição que passa pelo proxy, e um
 * arquivo maior chegaria aqui cortado, sem erro nenhum. A sessão é conferida
 * aqui mesmo, como em qualquer rota.
 */
export async function PUT(request: Request, ctx: RouteContext<"/envios/[id]">) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autenticado.", { status: 401 });
  if (!pode(usuario.perfil, "documento", "criar")) {
    return new Response("Sem permissão.", { status: 403 });
  }

  const { id } = await ctx.params;
  const envio = await prisma.envioPendente.findUnique({ where: { id } });
  // Envio de outra pessoa responde como inexistente.
  if (!envio || envio.usuarioId !== usuario.id) {
    return new Response("Envio não encontrado.", { status: 404 });
  }
  if (envio.expiraEm <= new Date()) {
    return new Response("A autorização de envio venceu.", { status: 410 });
  }
  if (envio.recebidoEm) {
    return new Response("Este envio já foi recebido.", { status: 409 });
  }
  if (!request.body) return new Response("Envio sem conteúdo.", { status: 400 });

  try {
    const gravacao = gravarFluxo(
      envio.caminhoRelativo,
      request.body,
      Number(envio.tamanhoBytes),
    );
    if (!gravacao) return new Response("Envio não encontrado.", { status: 404 });
    const { hashSha256 } = await gravacao;

    await prisma.envioPendente.update({
      where: { id },
      data: { recebidoEm: new Date(), hashSha256 },
    });
  } catch (erro) {
    if (erro instanceof TamanhoNaoConfere) {
      return new Response(erro.message, { status: 400 });
    }
    throw erro;
  }

  return new Response(null, { status: 204 });
}
