import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/schema";
import { eq } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function run() {
  await db
    .update(schema.user)
    .set({ email: "abraham.okonkwo@devflow.app" })
    .where(eq(schema.user.id, "user-abraham-001"));
  console.log("Ghost user email updated.");
  await pool.end();
}

run().catch((err) => { console.error(err); process.exit(1); });
