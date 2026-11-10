// Én felles databasekobling for hele appen.
// (I utviklingsmodus lages koden på nytt ved hver endring, så vi gjenbruker koblingen.)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
