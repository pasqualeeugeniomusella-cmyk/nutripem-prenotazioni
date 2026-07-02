import { PrismaClient } from "@prisma/client";

// Singleton: evita di aprire troppe connessioni al database durante lo sviluppo
// (Next.js ricarica i moduli ad ogni salvataggio).
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
