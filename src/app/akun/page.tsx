import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { AppShell } from "@/components/AppShell";
import { AccountsClient } from "@/components/AccountsClient";


export default async function AccountsPage() {
  const { session, company } = await requirePageSession();
  const { rows } = await getTrialBalance(company.id);

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <AccountsClient initialAccounts={rows} />
    </AppShell>
  );
}
