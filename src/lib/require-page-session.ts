import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requirePageSession() {
  const session = await getSession();
  if (!session) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
  });
  if (!company) redirect("/login");

  return { session, company };
}
