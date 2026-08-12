import type { Metadata } from "next";
import { AddAppForm } from "@/components/add-app-form";

export const metadata: Metadata = {
  title: "Add app — App Store Ranking",
};

export default function AddAppPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Add app</h1>
        <p className="text-muted-foreground">
          Dán link App Store hoặc App ID để track thứ hạng.
        </p>
      </div>
      <AddAppForm />
    </div>
  );
}
