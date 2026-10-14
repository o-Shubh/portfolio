import { redirect } from "next/navigation";
import { getCurrentProfile, ROLE_HOME } from "@/lib/auth";

/** /dashboard sends each person to the right home for their role. */
export default async function DashboardRedirect() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.full_name) redirect("/onboarding");
  redirect(ROLE_HOME[profile.role]);
}
