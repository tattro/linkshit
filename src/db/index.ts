import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

// Connect lazily so builds work without DATABASE_URL; reuse across hot reloads in dev.
const globalForDb = globalThis as unknown as { db?: DB };

function getDb(): DB {
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle(postgres(url, { max: 10 }), { schema });
  globalForDb.db = db;
  return db;
}

export const db = new Proxy({} as DB, {
  get: (_, prop) => Reflect.get(getDb(), prop),
});
export * from "./schema";
