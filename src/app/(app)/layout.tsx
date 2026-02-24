import AuthSessionProvider from "@/components/session-provider";
import DashboardLayout from "@/components/dashboard-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthSessionProvider>
  );
}
