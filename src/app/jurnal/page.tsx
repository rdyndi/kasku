import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { JournalsClient } from "@/components/JournalsClient";

export const instant = false;

export default async function JournalsPage() {
  const { session, company } = await requirePageSession();

  const [journals, accounts, contacts] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { companyId: company.id },
      orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true } },
            contact: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.account.findMany({
      where: { companyId: company.id },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.contact.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  const serialized = journals.map((j) => ({
    id: j.id,
    entryNo: j.entryNo,
    transDate: j.transDate.toISOString(),
    memo: j.memo,
    sourceType: j.sourceType,
    lines: j.lines.map((l) => ({
      id: l.id,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.description,
      account: l.account,
      contact: l.contact,
    })),
  }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <JournalsClient initialJournals={serialized} accounts={accounts} contacts={contacts} />
    </AppShell>
  );
}
