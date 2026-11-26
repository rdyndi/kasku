import { requirePageSession } from "@/lib/require-page-session";
import { AppShell } from "@/components/AppShell";
import { PembelianPerVendorClient } from "@/components/PembelianPerVendorClient";

export const instant = false;

export default async function PembelianPerVendorPage() {
  const { session, company } = await requirePageSession();

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <PembelianPerVendorClient />
    </AppShell>
  );
}
