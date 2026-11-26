import { requirePageSession } from "@/lib/require-page-session";
import { AppShell } from "@/components/AppShell";
import { PenjualanPerPelangganClient } from "@/components/PenjualanPerPelangganClient";

export const instant = false;

export default async function PenjualanPerPelangganPage() {
  const { session, company } = await requirePageSession();

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <PenjualanPerPelangganClient />
    </AppShell>
  );
}
