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

export const prisma = globalForPrisma.prisma ?? criarClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
