import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Pacote autocontido para a instalação on-premise (etapa 14).
   *
   * `standalone` copia para `.next/standalone` só o que a aplicação usa,
   * incluindo os pedaços necessários de `node_modules`, e gera um `server.js`
   * mínimo. É o que permite entregar um `.zip` que roda sem `npm install` na
   * máquina do cliente — que não tem internet e nunca falará com o registry.
   *
   * Fica atrás de uma variável e não ligado sempre porque o mesmo repositório
   * também é publicado em plataforma serverless (homologação), onde o build é
   * da plataforma e `standalone` não tem função. Quem liga é o workflow de
   * release. Ver docs/instalacao-on-premise.md, seção 1.
   *
   * `server.js` NÃO copia `public/` nem `.next/static`: quem faz isso é
   * `scripts/empacotar.ps1`.
   */
  output: process.env.EMPACOTAR_STANDALONE === "1" ? "standalone" : undefined,

  /**
   * O que **não** pode entrar no pacote.
   *
   * `storage/` é o mais importante: o rastreador copia a pasta inteira para
   * `.next/standalone`, e ela é onde ficam os documentos — contratos, notas
   * fiscais. Um pacote montado numa máquina que já rodou o sistema sairia
   * levando arquivo de cliente dentro do `.zip`. No runner do Actions a pasta
   * está vazia, mas a exclusão não é sobre o runner: é para que ninguém
   * empacote de uma máquina com dados e descubra depois.
   *
   * `docs/` e `tests/` são só peso: 480KB que a aplicação nunca lê em runtime.
   */
  outputFileTracingExcludes: {
    "/*": ["storage/**/*", "docs/**/*", "tests/**/*"],
  },
  /*
   * `.env` NÃO sai por aqui — foi testado: o Next o copia para
   * `.next/standalone` de propósito (é ele que a aplicação lê em runtime), e a
   * exclusão de tracing não o alcança. Quem apaga é `scripts/empacotar.ps1`,
   * que também aborta se o arquivo continuar lá. Na instalação, o `.env` que
   * vale é o de `C:\aja-obras\.env`, ligado à release pelo script de
   * atualização — nunca o da máquina que empacotou.
   */

  experimental: {
    serverActions: {
      /**
       * O padrão do Next é 1MB, e os requisitos falam em arquivos de até
       * ~300MB (requisitos.md 1.6). Sem isto, o upload falha com erro de
       * corpo grande demais em qualquer PDF de projeto.
       *
       * O limite vale para toda Server Action, não só a de upload. É aceitável
       * porque a instalação é on-premise, em rede local e atrás de login —
       * não há requisição anônima vinda da internet para abusar disso.
       *
       * Custo conhecido: a Server Action carrega o corpo inteiro em memória.
       * Para arquivos realmente grandes o caminho é uma rota de upload com
       * streaming direto para o disco; enquanto os formatos liberados forem
       * PDF, planilha e imagem, o que chega são poucos MB.
       */
      bodySizeLimit: "320mb",
    },
  },
};

export default nextConfig;
