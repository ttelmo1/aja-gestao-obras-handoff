import { abrirArquivo } from "@/lib/storage";
import { usuarioAtual } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

/**
 * Download de documento.
 *
 * Existe como rota, e não como link para `public/`, exatamente por isto: o
 * arquivo só sai daqui depois de conferir sessão e permissão. Um contrato ou
 * uma nota fiscal em `public/` estaria a uma URL adivinhada de distância de
 * qualquer pessoa na rede.
 *
 * Documento excluído (exclusão lógica) também não é servido — some da tela e
 * some do download; o registro fica só para a auditoria.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/documentos/[id]">,
) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autenticado.", { status: 401 });
  if (!pode(usuario.perfil, "documento", "ver")) {
    return new Response("Sem permissão.", { status: 403 });
  }

  const { id } = await ctx.params;
  const documento = await prisma.documento.findUnique({
    where: { id },
    select: {
      nomeOriginal: true,
      caminhoRelativo: true,
      mimeType: true,
      tamanhoBytes: true,
      excluidoEm: true,
    },
  });
  if (!documento || documento.excluidoEm) {
    return new Response("Documento não encontrado.", { status: 404 });
  }

  const conteudo = await abrirArquivo(documento.caminhoRelativo);
  if (!conteudo) {
    // O registro existe mas o arquivo sumiu do disco — backup restaurado pela
    // metade, pasta movida à mão. Dizer isso é mais útil que um 404 seco.
    return new Response(
      "O arquivo não está no armazenamento do servidor. Verifique a pasta de documentos.",
      { status: 410 },
    );
  }

  return new Response(conteudo, {
    headers: {
      "Content-Type": documento.mimeType || "application/octet-stream",
      "Content-Length": String(documento.tamanhoBytes),
      // `inline` deixa o navegador abrir PDF e imagem sem baixar; o nome
      // original volta aqui, já que no disco o arquivo é um uuid.
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(documento.nomeOriginal)}`,
      // Documento de obra não entra em cache compartilhado: a resposta
      // depende de quem pediu.
      "Cache-Control": "private, no-store",
    },
  });
}
