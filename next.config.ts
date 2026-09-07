import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
