import { abrirArquivo, infoArquivo, linkDeDownload } from "@/lib/storage";
import { usuarioAtual } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";
import { abreInline, tipoDeConteudo } from "@/modules/documentos/formatos";

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
 *
 * Com bucket (`STORAGE_DRIVER=s3`), as checagens são as mesmas, mas o arquivo
 * não passa por aqui: a resposta é um redirecionamento para um link assinado
 * de poucos minutos. A plataforma não devolve mais que ~4,5 MB por resposta.
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
      extensao: true,
      tamanhoBytes: true,
      excluidoEm: true,
    },
  });
  if (!documento || documento.excluidoEm) {
    return new Response("Documento não encontrado.", { status: 404 });
  }

  // O registro existe mas o arquivo sumiu — backup restaurado pela metade,
  // pasta ou bucket mexido à mão. Dizer isso é mais útil que um 404 seco.
  const sumiu = new Response(
    "O arquivo não está no armazenamento do servidor. Verifique a pasta de documentos.",
    { status: 410 },
  );
  const inline = abreInline(documento.extensao);

  const link = linkDeDownload(documento.caminhoRelativo, {
    nomeArquivo: documento.nomeOriginal,
    tipoConteudo: tipoDeConteudo(documento.extensao),
    inline,
  });
  if (link) {
    // Conferir antes de redirecionar: o link assinado de um arquivo que não
    // existe abre uma página de erro do bucket, em XML.
    if (!(await infoArquivo(documento.caminhoRelativo))) return sumiu;
    return new Response(null, {
      status: 302,
      headers: { Location: await link, "Cache-Control": "private, no-store" },
    });
  }

  const conteudo = await abrirArquivo(documento.caminhoRelativo);
  if (!conteudo) return sumiu;

  return new Response(conteudo, {
    headers: {
      // Derivado da extensão, nunca do `mimeType` gravado: aquele campo é o
      // que o navegador de quem subiu declarou, e um `text/html` num `.png`
      // viraria script rodando na nossa origem com a sessão de quem abriu.
      "Content-Type": tipoDeConteudo(documento.extensao),
      "Content-Length": String(documento.tamanhoBytes),
      // Sem isto o navegador fareja o conteúdo e ignora o tipo acima.
      "X-Content-Type-Options": "nosniff",
      // PDF e imagem abrem na aba; o resto baixa. O nome original volta aqui,
      // já que no disco o arquivo é um uuid.
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(documento.nomeOriginal)}`,
      // Documento de obra não entra em cache compartilhado: a resposta
      // depende de quem pediu.
      "Cache-Control": "private, no-store",
    },
  });
}
