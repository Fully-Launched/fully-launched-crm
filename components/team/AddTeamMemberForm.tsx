"use client";

import { useState } from "react";
import { ROLES, type Role } from "@/lib/theme";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-accent";

export default function AddTeamMemberForm({
  onAdd,
}: {
  // resolves true on success so the form knows whether to clear
  onAdd: (member: { name: string; email: string; role: Role }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // no default role — every new member must be given one explicitly
  const [role, setRole] = useState<Role | "">("");
  const [saving, setSaving] = useState(false);

  const ready = name.trim() !== "" && email.trim() !== "" && role !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    const ok = await onAdd({ name: name.trim(), email, role: role as Role });
    setSaving(false);
    if (ok) {
      setName("");
      setEmail("");
      setRole("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-200 p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">
        + Add Team Member
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Name
          </span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="firstname@fullylaunched.com"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Role
          </span>
          <select
            required
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={INPUT_CLASS}
          >
            <option value="" disabled>
              Select role…
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!ready || saving}
          className="rounded-md bg-header px-3 py-1.5 text-sm font-medium text-header-foreground disabled:opacity-40"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        This adds them to the roster. Their login is created separately in
        Supabase → Authentication → Add User.
      </p>
    </form>
  );
}
