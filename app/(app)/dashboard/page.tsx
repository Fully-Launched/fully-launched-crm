import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-2 text-neutral-600">Signed in as {user?.email}</p>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="rounded-md bg-header px-4 py-2 text-sm font-medium text-header-foreground"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
