import { ClientRoleGuard } from "@/components/auth/role-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ClientRoleGuard>{children}</ClientRoleGuard>;
}
