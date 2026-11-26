import { AppShell } from "@/components/AppShell";
import { CompaniesClient } from "@/components/CompaniesClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";

export default async function CompaniesPage() {
  const { session, company } = await requirePageSession();

  const memberships = await prisma.companyUser.findMany({
    where: { userId: session.userId, isActive: true },
    include: {
      company: { select: { id: true, name: true, isDemo: true, createdAt: true } },
      role: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <CompaniesClient
        initialCompanies={memberships.map((m) => ({
          id: m.company.id,
          name: m.company.name,
          isDemo: m.company.isDemo,
          createdAt: m.company.createdAt.toISOString(),
          roleName: m.role?.name || "Administrator",
        }))}
        initialActiveId={company.id}
      />
    </AppShell>
  );
}
