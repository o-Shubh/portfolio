import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { NewBookForm } from "./NewBookForm";

export const metadata: Metadata = { title: "New book" };

export default function NewBookPage() {
  return (
    <>
      <PageHeader title="New book" intro="Start with the title. You can change everything later." />
      <div className="max-w-xl">
        <NewBookForm />
      </div>
    </>
  );
}
