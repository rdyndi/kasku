import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { SettingsClient } from "@/components/SettingsClient";


export default async function SettingsPage() {
  const { session, company } = await requirePageSession();

  const [fullCompany, currentUser] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      include: {
        numberSequences: true,
        taxes: true,
        paymentTerms: true,
        accountMappings: { include: { account: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    }),
  ]);

  return (
    <AppShell
      companyName={company.name}
      userName={currentUser?.name || session.name}
      isDemo={company.isDemo}
    >
      <SettingsClient
        user={{
          name: currentUser?.name || session.name,
          email: currentUser?.email || session.email,
        }}
        company={{
          name: fullCompany.name,
          npwp: fullCompany.npwp,
          phone: fullCompany.phone,
          email: fullCompany.email,
          address: fullCompany.address,
          lockDate: fullCompany.lockDate ? fullCompany.lockDate.toISOString() : null,
          numberSequences: fullCompany.numberSequences.map((s) => ({
            docType: s.docType,
            prefix: s.prefix,
            nextNumber: s.nextNumber,
          })),
          taxes: fullCompany.taxes.map((t) => ({
            id: t.id,
            name: t.name,
            rate: Number(t.rate),
            type: t.type,
          })),
          paymentTerms: fullCompany.paymentTerms.map((p) => ({
            id: p.id,
            name: p.name,
            days: p.days,
          })),
          accountMappings: fullCompany.accountMappings.map((m) => ({
            mappingKey: m.mappingKey,
            account: { code: m.account.code, name: m.account.name },
          })),
        }}
      />
    </AppShell>
  );
}
