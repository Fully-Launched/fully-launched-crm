import type { Branch } from "@/lib/theme";
import type { Contact } from "@/lib/types";

// A contacts row plus its project's branch (null once the project is
// deleted — contacts don't store branch).
export type ContactRow = Contact & { branch: Branch | null };

// contact_merges row (migration 011): contact_id is shown as part of
// primary_contact_id's group.
export type ContactMerge = { contact_id: string; primary_contact_id: string };

export type ContactEngagement = {
  contactId: string;
  company: string | null;
  branch: Branch | null;
  projectDeleted: boolean;
};

// One displayed row on the Contacts page: every contact row judged to be the
// same person.
export type ContactGroup = {
  // Stable within a render; the primary row's id.
  key: string;
  // All contact ids in the group (sent to merge_contacts when merging).
  ids: string[];
  primaryId: string;
  name: string | null;
  // Other names in the group, when merged rows disagree (e.g. "Dave").
  otherNames: string[];
  companies: { company: string; allDeleted: boolean }[];
  branches: Branch[];
  emails: string[];
  phones: string[];
  engagements: ContactEngagement[];
  latestCreatedAt: string;
  // Live projects behind this contact. Editing fans out to all of them;
  // with none (every project deleted) the contact is read-only.
  liveProjectIds: string[];
  // Company per live project, for the "this will update N projects" confirm.
  liveCompanies: string[];
  // Some rows are frozen snapshots of deleted projects.
  hasFrozen: boolean;
  // Newest live row (the chosen primary if it's live) — used as the merge
  // primary when an edit has to pin a mixed live/frozen group together.
  livePrimaryId: string | null;
  // Some of this group comes from contact_merges (a manual merge, or an
  // edit that pinned the group). Unmerge deletes those rows.
  hasManualMerge: boolean;
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

// Same person, automatically: same name + same email when there's an email,
// otherwise same name + same company. Rows with no name never auto-group.
function autoKey(c: ContactRow): string | null {
  const name = norm(c.name);
  if (!name) return null;
  const email = norm(c.email);
  return email ? `n:${name}|e:${email}` : `n:${name}|c:${norm(c.company)}`;
}

function distinct<T>(values: (T | null | undefined)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v != null && v !== "")));
}

// Display-time grouping: auto rules above, plus manual merges from
// contact_merges. Nothing here writes to the database.
export function groupContacts(
  rows: ContactRow[],
  merges: ContactMerge[]
): ContactGroup[] {
  const byId = new Map(rows.map((r) => [r.id, r]));

  // Union-find over contact ids.
  const parent = new Map<string, string>(rows.map((r) => [r.id, r.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    if (!byId.has(a) || !byId.has(b)) return;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const firstByKey = new Map<string, string>();
  for (const r of rows) {
    const key = autoKey(r);
    if (!key) continue;
    const first = firstByKey.get(key);
    if (first) union(r.id, first);
    else firstByKey.set(key, r.id);
  }
  for (const m of merges) union(m.contact_id, m.primary_contact_id);

  const members = new Map<string, ContactRow[]>();
  for (const r of rows) {
    const root = find(r.id);
    members.set(root, [...(members.get(root) ?? []), r]);
  }

  const inMerge = new Set(
    merges.flatMap((m) => [m.contact_id, m.primary_contact_id])
  );

  // Ids chosen as primary in a manual merge (and not merged away themselves).
  const mergedAway = new Set(merges.map((m) => m.contact_id));
  const chosenPrimaries = new Set(
    merges.map((m) => m.primary_contact_id).filter((id) => !mergedAway.has(id))
  );

  const groups: ContactGroup[] = [];
  for (const list of Array.from(members.values())) {
    const newestFirst = [...list].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
    // Name comes from the manually chosen primary, else the newest row.
    const primary =
      newestFirst.find((r) => chosenPrimaries.has(r.id)) ?? newestFirst[0];

    const companies = distinct(newestFirst.map((r) => r.company?.trim())).map(
      (company) => ({
        company,
        allDeleted: newestFirst
          .filter((r) => r.company?.trim() === company)
          .every((r) => !r.project_id),
      })
    );

    groups.push({
      key: primary.id,
      ids: newestFirst.map((r) => r.id),
      primaryId: primary.id,
      name: primary.name,
      otherNames: distinct(
        newestFirst
          .map((r) => r.name?.trim())
          .filter((n) => norm(n) !== norm(primary.name))
      ),
      companies,
      branches: distinct(newestFirst.map((r) => r.branch)),
      emails: distinct(newestFirst.map((r) => r.email?.trim())),
      phones: distinct(newestFirst.map((r) => r.phone?.trim())),
      engagements: newestFirst.map((r) => ({
        contactId: r.id,
        company: r.company,
        branch: r.branch,
        projectDeleted: !r.project_id,
      })),
      latestCreatedAt: newestFirst[0].created_at,
      liveProjectIds: distinct(newestFirst.map((r) => r.project_id)),
      liveCompanies: newestFirst
        .filter((r) => r.project_id)
        .map((r) => r.company?.trim() || "No company"),
      hasFrozen: newestFirst.some((r) => !r.project_id),
      livePrimaryId: primary.project_id
        ? primary.id
        : newestFirst.find((r) => r.project_id)?.id ?? null,
      hasManualMerge: newestFirst.some((r) => inMerge.has(r.id)),
    });
  }

  return groups.sort((a, b) =>
    b.latestCreatedAt.localeCompare(a.latestCreatedAt)
  );
}

export function groupMatches(group: ContactGroup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    group.name,
    ...group.otherNames,
    ...group.companies.map((c) => c.company),
    ...group.emails,
    ...group.phones,
    ...group.branches,
  ].some((field) => field?.toLowerCase().includes(q));
}
