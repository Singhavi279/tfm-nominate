import { ClientRoleGuard } from "@/components/auth/role-guard";

export default function NominateLayout({ children }: { children: React.ReactNode }) {
  return <ClientRoleGuard>{children}</ClientRoleGuard>;
}
