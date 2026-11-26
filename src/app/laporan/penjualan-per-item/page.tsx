import { requirePageSession } from "@/lib/require-page-session";
import { AppShell } from "@/components/AppShell";
import { PenjualanPerItemClient } from "@/components/PenjualanPerItemClient";


export default async function PenjualanPerItemPage() {
  const { session, company } = await requirePageSession();

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <PenjualanPerItemClient />
    </AppShell>
  );
}
