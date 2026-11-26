import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/prisma/client";
import { getLocalPrismaClient } from "./prisma-local";

const d1ClientCache = new WeakMap<object, PrismaClient>();

function createMockPrisma(): PrismaClient {
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    findUniqueOrThrow: async () => {
      throw new Error("Database unavailable");
    },
    count: async () => 0,
    create: async (d: { data?: unknown }) => d?.data ?? {},
    update: async (d: { data?: unknown }) => d?.data ?? {},
    upsert: async (d: { create?: unknown }) => d?.create ?? {},
    delete: async () => ({}),
    deleteMany: async () => ({ count: 0 }),
  };
  return new Proxy(
    {
      $transaction: async () => [],
      $disconnect: async () => {},
    },
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string | symbol, unknown>)[prop];
        return noOp;
      },
    }
  ) as unknown as PrismaClient;
}

export function getPrismaClient(): PrismaClient {
  try {
    const ctx = getCloudflareContext();
    const env = ctx?.env as { DB?: unknown } | undefined;
    if (env?.DB) {
      let client = d1ClientCache.get(env.DB as object);
      if (!client) {
        const adapter = new PrismaD1(env.DB as ConstructorParameters<typeof PrismaD1>[0]);
        client = new PrismaClient({ adapter });
        d1ClientCache.set(env.DB as object, client);
      }
      return client;
    }
  } catch {
    // Not inside Cloudflare Workers request context; fall back to local Node.js SQLite
  }

  try {
    return getLocalPrismaClient();
  } catch (err) {
    console.warn("[KASKU] Database fallback active:", err);
    return createMockPrisma();
  }
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
