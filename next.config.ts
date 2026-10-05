import type { NextConfig } from "next";

/**
 * Sem `serverActions.bodySizeLimit`: o padrão do Next (1MB) basta.
 *
 * Já foi 320MB, quando o upload de documento passava o arquivo inteiro por
 * uma Server Action. Desde a etapa 15 o arquivo vai direto ao armazenamento
 * (`documentos/envio-direto.ts`) e nenhuma action recebe mais que um
 * formulário — e um limite alto, valendo para toda action, só servia de
 * porta para abuso num sistema exposto na internet.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
