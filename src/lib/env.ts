import { z } from "zod";

/**
 * Validação das variáveis de ambiente na inicialização — falha cedo e com
 * mensagem clara, em vez de quebrar no meio de uma requisição.
 */
const schema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET precisa de pelo menos 32 caracteres"),
    STORAGE_DIR: z.string().min(1).default("./storage"),
    /**
     * Onde os bytes dos documentos ficam.
     *
     * `s3` é a produção na nuvem: bucket S3-compatível (Cloudflare R2), com o
     * navegador enviando e baixando direto do bucket — a plataforma serverless
     * corta qualquer requisição acima de ~4,5 MB, e os documentos chegam a
     * 300 MB. `disco` é pasta local, usada no desenvolvimento. `db` grava em
     * `ArquivoBlob` no Postgres e serviu ao deploy de demonstração antes do
     * bucket; fica até os arquivos antigos serem migrados.
     */
    STORAGE_DRIVER: z.enum(["disco", "db", "s3"]).default("disco"),
    /**
     * Bucket do driver `s3`. Para o R2: `S3_ENDPOINT` é
     * `https://<id-da-conta>.r2.cloudflarestorage.com` e a região é `auto`.
     * Obrigatórios só com `STORAGE_DRIVER=s3` (ver o `superRefine` abaixo).
     */
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).default("auto"),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    /**
     * Segredo que o Vercel Cron manda nas rotas de `/api/cron/`. Sem ele, essas
     * rotas recusam toda chamada.
     */
    CRON_SECRET: z.string().min(16).optional(),
    /**
     * Cookie de sessão com a flag `Secure`. Fica em `false` por padrão porque a
     * instalação é em rede local, provavelmente sobre HTTP puro — com `Secure`
     * ligado nesse cenário o navegador descarta o cookie e ninguém consegue
     * entrar. Ligar assim que houver HTTPS no servidor.
     */
    COOKIE_SEGURO: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .superRefine((v, ctx) => {
    if (v.STORAGE_DRIVER !== "s3") return;
    for (const chave of [
      "S3_ENDPOINT",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
    ] as const) {
      if (!v[chave]) {
        ctx.addIssue({
          code: "custom",
          path: [chave],
          message: `${chave} é obrigatória com STORAGE_DRIVER=s3`,
        });
      }
    }
  });

export type Env = z.infer<typeof schema>;

let cache: Env | null = null;

export function env(): Env {
  if (cache) return cache;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${detalhes}`);
  }
  cache = parsed.data;
  return cache;
}
