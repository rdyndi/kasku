import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ContactsClient } from "@/components/ContactsClient";


export default async function ContactsPage() {
  const { session, company } = await requirePageSession();
  const contacts = await prisma.contact.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <ContactsClient initialContacts={contacts} />
    </AppShell>
  );
}
