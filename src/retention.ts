// Grandfather-father-son style retention, using the same semantics as restic
// and borg (--keep-last, --keep-daily, etc.). For each rule, backups are
// grouped into periods (day, week, ...) and the newest backup of each of the
// N most recent periods that contain a backup is kept. A backup is kept if
// any rule keeps it.

export const retentionRules = [
  "last",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type RetentionRule = typeof retentionRules[number];

export type RetentionPolicy = Partial<Record<RetentionRule, number>>;

export interface BackupSetInfo {
  name: string;
  date: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Periods are computed in local time. Weeks start on Monday and are identified
// by the date of that Monday.
const periodKey = (
  rule: RetentionRule,
  date: number,
  index: number
): string => {
  const d = new Date(date);
  switch (rule) {
    case "last":
      return String(index);
    case "hourly":
      return `${dayKey(d)} ${pad(d.getHours())}`;
    case "daily":
      return dayKey(d);
    case "weekly": {
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return dayKey(monday);
    }
    case "monthly":
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    case "yearly":
      return String(d.getFullYear());
  }
};

// Parses a policy such as "daily=7 weekly=4 monthly=12". Rules can be
// separated by spaces or commas. Returns null for an empty string and throws
// if the policy is invalid.
export function parseRetentionPolicy(input: string): RetentionPolicy | null {
  const tokens = (input || "")
    .trim()
    .split(/[\s,]+/)
    .filter((t) => t !== "");
  if (!tokens.length) return null;

  const policy: RetentionPolicy = {};
  for (const token of tokens) {
    const match = token.match(/^([a-z]+)=(\d+)$/i);
    if (!match) {
      throw new Error(`Invalid rule "${token}", expected format is name=count`);
    }
    const rule = match[1].toLowerCase() as RetentionRule;
    if (!retentionRules.includes(rule)) {
      throw new Error(
        `Unknown rule "${match[1]}", allowed rules are: ${retentionRules.join(
          ", "
        )}`
      );
    }
    if (rule in policy) {
      throw new Error(`Rule "${rule}" is specified more than once`);
    }
    policy[rule] = parseInt(match[2], 10);
  }

  if (!Object.values(policy).some((count) => count > 0)) {
    throw new Error("At least one rule must have a count greater than 0");
  }

  return policy;
}

// Returns the names of the backup sets that should be kept.
export function selectBackupsToKeep(
  backups: BackupSetInfo[],
  policy: RetentionPolicy
): Set<string> {
  const sorted = [...backups].sort((a, b) => b.date - a.date);
  const keep = new Set<string>();

  for (const rule of retentionRules) {
    let remaining = policy[rule] || 0;
    let lastKey: string = null;
    for (let i = 0; i < sorted.length && remaining > 0; i++) {
      const key = periodKey(rule, sorted[i].date, i);
      if (key === lastKey) continue;
      lastKey = key;
      keep.add(sorted[i].name);
      remaining--;
    }
  }

  return keep;
}
