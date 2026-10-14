import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Author dashboard" };

export default async function AuthorHome() {
  const profile = await requireRole(["author", "admin"]);
  return (
    <>
      <PageHeader title={`Welcome, ${profile.full_name?.split(" ")[0]}`} intro="Your author workspace." />
      <div className="grid gap-4 md:grid-cols-2">
        <ComingSoon
          milestone={3}
          items={["Add a new book", "Upload manuscript and cover", "Choose print options", "Live earnings calculator"]}
        />
        <ComingSoon milestone={6} items={["Earnings", "Copies sold by month", "Sales by city", "Order tracking"]} />
      </div>
    </>
  );
}
