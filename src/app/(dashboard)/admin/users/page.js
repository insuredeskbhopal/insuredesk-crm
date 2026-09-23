import UserManagement from "@/app/components/users/UserManagement";
import { getCurrentSessionFromCookies } from "@/lib/records/scoped-data";
import { redirect } from "next/navigation";
import { canOpenUserManagement } from "@/lib/auth/user-permissions";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  const session = await getCurrentSessionFromCookies();
  if (!session || !canOpenUserManagement(session.role)) {
    redirect("/dashboard");
  }
  return <UserManagement />;
}
