import { z } from "zod";

/**
 * Validação das variáveis de ambiente na inicialização — falha cedo e com
 * mensagem clara, em vez de quebrar no meio de uma requisição.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET precisa de pelo menos 32 caracteres"),
  STORAGE_DIR: z.string().min(1).default("./storage"),
  /**
   * Onde os bytes dos documentos ficam.
   *
   * `disco` é a instalação real: pasta no servidor do cliente, navegável para
   * backup. `db` grava em `ArquivoBlob` no Postgres e existe só para o deploy
   * de demonstração em plataforma serverless, onde o disco é efêmero e o
   * arquivo enviado some entre uma requisição e outra.
   */
  STORAGE_DRIVER: z.enum(["disco", "db"]).default("disco"),
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
