import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: ['error'],
  })
}

// Check if the cached client has all models
function isValidClient(client: PrismaClient): boolean {
  return typeof (client as unknown as Record<string, unknown>).factory !== 'undefined'
    && typeof (client as unknown as Record<string, unknown>).userFactory !== 'undefined'
}

export const db =
  (globalForPrisma.prisma && isValidClient(globalForPrisma.prisma))
    ? globalForPrisma.prisma
    : createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
