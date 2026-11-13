import { redirect } from "next/navigation";
import AuthSessionProvider from "@/components/session-provider";
import DashboardLayout from "@/components/dashboard-layout";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentClients, usesDefaultPassword } from "@/lib/payments-sheet";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Clients still on their default password (phone number / 0000000000)
  // must pick a new one before using the app.
  const session = await auth();
  if (session?.user?.id && session.user.role === "CLIENT") {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, hashedPassword: true },
    });
    if (user && (await usesDefaultPassword(user, await getPaymentClients()))) {
      redirect("/change-password");
    }
  }

  return (
    <AuthSessionProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthSessionProvider>
  );
}
