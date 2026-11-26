import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { provisionCompanyDefaults } from "../src/lib/seed-company";

async function main() {
  const email = "demo@kasku.id";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log("Demo user sudah tersedia:", email);
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.create({
    data: {
      name: "Pemilik UMKM Demo",
      email,
      passwordHash,
    },
  });

  const company = await prisma.company.create({
    data: {
      name: "CV Kasku Nusantara (Demo)",
      email: "admin@kaskunusantara.id",
      phone: "021-555-0199",
      address: "Jl. Kemang Raya No. 88, Jakarta Selatan",
      isDemo: true,
    },
  });

  const ownerRole = await provisionCompanyDefaults(company.id, true);

  await prisma.companyUser.create({
    data: {
      companyId: company.id,
      userId: user.id,
      roleId: ownerRole.id,
    },
  });

  console.log("Seed selesai! Login demo: demo@kasku.id / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
