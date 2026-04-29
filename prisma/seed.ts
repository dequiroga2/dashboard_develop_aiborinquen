import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo-router.local" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@demo-router.local",
      passwordHash: adminHash,
      role: "ADMIN",
      active: true,
    },
  });
  console.log("✅ Admin:", admin.email);

  // Developer user
  const devHash = await bcrypt.hash("dev123", 12);
  const dev = await prisma.user.upsert({
    where: { email: "dev@demo-router.local" },
    update: {},
    create: {
      name: "Developer",
      email: "dev@demo-router.local",
      passwordHash: devHash,
      role: "DEVELOPER",
      active: true,
    },
  });
  console.log("✅ Developer:", dev.email);

  console.log("\n✨ Seed completado!");
  console.log("\n📋 Credenciales:");
  console.log("   Admin:     admin@demo-router.local / admin123");
  console.log("   Developer: dev@demo-router.local   / dev123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
