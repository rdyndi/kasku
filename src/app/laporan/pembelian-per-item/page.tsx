import { requirePageSession } from "@/lib/require-page-session";
import { AppShell } from "@/components/AppShell";
import { PembelianPerItemClient } from "@/components/PembelianPerItemClient";


export default async function PembelianPerItemPage() {
  const { session, company } = await requirePageSession();

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <PembelianPerItemClient />
    </AppShell>
  );
}
