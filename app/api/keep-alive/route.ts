import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    console.error("Keep-alive query failed:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, timestamp: new Date().toISOString() });
}
