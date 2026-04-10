import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In Prisma 7, without adapter/accelerateUrl it needs url passed directly via prisma.config.ts 
// or empty instantiation works if url is inside prisma/schema.prisma datasource
// But since schema.prisma cannot have env("DATABASE_URL") in Prisma 7, we rely on prisma.config.ts.
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
