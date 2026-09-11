import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 exige um driver adapter. Instância única reaproveitada entre
 * hot-reloads do Next em desenvolvimento para não estourar o pool do Postgres.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function criarClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function client(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = criarClient();
  }
  return globalForPrisma.prisma;
}

/**
 * O client só nasce no primeiro uso, e não quando o módulo é importado.
 *
 * Não é detalhe de estilo: o `next build` carrega cada rota para coletar a
 * configuração dela, e criar o client ali exigiria `DATABASE_URL` **na máquina
 * que compila**. O build roda no GitHub Actions, que não tem banco nenhum — e
 * a alternativa (passar uma URL de mentira para o build) arriscaria assar essa
 * URL no pacote que vai para o cliente. Com a criação adiada, quem precisa da
 * variável é só o servidor em execução, que é onde ela existe de verdade.
 *
 * O Proxy mantém `prisma` com o mesmo tipo e o mesmo uso de antes; o `bind`
 * preserva o `this` dos métodos do client.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_alvo, propriedade) {
    const real = client();
    const valor = Reflect.get(real, propriedade);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});
