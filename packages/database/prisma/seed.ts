import "dotenv/config";
import { hash, type Options } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const passwordOptions = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } satisfies Options;

async function createUserIfMissing(input: { email: string; name: string; password: string; role: "USER" | "ADMIN" }) {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return { id: existing.id, created: false };
  const user = await db.user.create({
    data: { email: input.email, name: input.name, passwordHash: await hash(input.password, passwordOptions), role: input.role },
    select: { id: true },
  });
  await db.auditLog.create({ data: { userId: user.id, action: "development.seeded", resource: "user", resourceId: user.id } });
  return { id: user.id, created: true };
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@klivexa.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Phase1";
  const admin = await createUserIfMissing({ email: adminEmail, name: "KLIVEXA Admin", password: adminPassword, role: "ADMIN" });
  const creator = await createUserIfMissing({ email: "creator@klivexa.local", name: "Alya Kreator", password: "Creator!Phase1", role: "USER" });

  if (creator.created) {
    await db.project.createMany({
      data: [
        { userId: creator.id, title: "10 Kebiasaan Kecil", description: "Podcast produktivitas untuk kandidat klip vertikal." },
        { userId: creator.id, title: "Storytelling untuk Brand", description: "Sumber video berizin untuk kampanye UMKM.", archivedAt: new Date() },
      ],
    });
  }

  console.log(`Seed ready: ${adminEmail} (${admin.created ? "created" : "preserved"}), creator@klivexa.local (${creator.created ? "created" : "preserved"}).`);
}

main().finally(async () => db.$disconnect());
