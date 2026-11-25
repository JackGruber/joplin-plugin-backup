import {
  BackupSetInfo,
  parseRetentionPolicy,
  selectBackupsToKeep,
} from "../src/retention";

// Local time, like the retention logic
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

const set = (date: number): BackupSetInfo => {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    name: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(
      d.getHours()
    )}${pad(d.getMinutes())}`,
    date,
  };
};

const keptNames = (backups: BackupSetInfo[], policy) =>
  [...selectBackupsToKeep(backups, policy)].sort();

describe("parseRetentionPolicy", function () {
  it.each([
    ["", null],
    ["   ", null],
    [null, null],
    ["daily=7", { daily: 7 }],
    ["daily=7 weekly=4 monthly=12", { daily: 7, weekly: 4, monthly: 12 }],
    ["daily=7,weekly=4, monthly=12", { daily: 7, weekly: 4, monthly: 12 }],
    ["  Daily=7   YEARLY=2 ", { daily: 7, yearly: 2 }],
    ["last=3 hourly=24", { last: 3, hourly: 24 }],
    ["daily=0 weekly=1", { daily: 0, weekly: 1 }],
  ])("parses %p", (input, expected) => {
    expect(parseRetentionPolicy(input)).toEqual(expected);
  });

  it.each([
    ["daily"],
    ["daily="],
    ["daily=-1"],
    ["daily=1.5"],
    ["daily = 7"],
    ["fortnightly=2"],
    ["daily=7 daily=3"],
    ["daily=0"],
  ])("rejects %p", (input) => {
    expect(() => parseRetentionPolicy(input)).toThrow();
  });
});

describe("selectBackupsToKeep", function () {
  it("keeps everything when there are fewer backups than the policy", () => {
    const backups = [set(at(2026, 1, 1)), set(at(2026, 1, 2))];
    expect(keptNames(backups, { daily: 7 })).toEqual(
      backups.map((b) => b.name).sort()
    );
  });

  it("last keeps the N most recent backups", () => {
    const backups = [
      set(at(2026, 1, 1, 10)),
      set(at(2026, 1, 1, 11)),
      set(at(2026, 1, 1, 12)),
      set(at(2026, 1, 1, 13)),
    ];
    expect(keptNames(backups, { last: 2 })).toEqual([
      "202601011200",
      "202601011300",
    ]);
  });

  it("daily keeps the newest backup of each day", () => {
    const backups = [
      set(at(2026, 1, 1, 9)),
      set(at(2026, 1, 1, 18)),
      set(at(2026, 1, 2, 9)),
      set(at(2026, 1, 2, 18)),
      set(at(2026, 1, 3, 9)),
      set(at(2026, 1, 3, 18)),
    ];
    expect(keptNames(backups, { daily: 2 })).toEqual([
      "202601021800",
      "202601031800",
    ]);
  });

  it("hourly keeps the newest backup of each hour", () => {
    const backups = [
      set(at(2026, 1, 1, 10, 0)),
      set(at(2026, 1, 1, 10, 30)),
      set(at(2026, 1, 1, 11, 0)),
      set(at(2026, 1, 1, 11, 30)),
    ];
    expect(keptNames(backups, { hourly: 5 })).toEqual([
      "202601011030",
      "202601011130",
    ]);
  });

  it("weekly keeps the newest backup of each week, weeks starting on Monday", () => {
    // 2026-01-04 is a Sunday, 2026-01-05 a Monday
    const backups = [
      set(at(2025, 12, 29)), // Monday
      set(at(2026, 1, 4)), // Sunday, same week
      set(at(2026, 1, 5)), // Monday, next week
      set(at(2026, 1, 7)), // Wednesday, same week
    ];
    expect(keptNames(backups, { weekly: 10 })).toEqual([
      "202601041200",
      "202601071200",
    ]);
  });

  it("monthly and yearly", () => {
    const backups = [
      set(at(2024, 6, 1)),
      set(at(2024, 12, 31)),
      set(at(2025, 3, 1)),
      set(at(2025, 3, 15)),
      set(at(2025, 4, 1)),
    ];
    expect(keptNames(backups, { monthly: 2 })).toEqual([
      "202503151200",
      "202504011200",
    ]);
    expect(keptNames(backups, { yearly: 5 })).toEqual([
      "202412311200",
      "202504011200",
    ]);
  });

  it("only counts periods that have a backup", () => {
    // Gaps between backups, e.g. with "Only on change"
    const backups = [
      set(at(2026, 1, 1)),
      set(at(2026, 1, 10)),
      set(at(2026, 2, 1)),
    ];
    expect(keptNames(backups, { daily: 3 })).toEqual(
      backups.map((b) => b.name).sort()
    );
  });

  it("combines rules (GFS)", () => {
    // One backup per day from 2025-11-01 to 2026-01-31
    const backups: BackupSetInfo[] = [];
    for (
      let d = new Date(2025, 10, 1, 12);
      d <= new Date(2026, 0, 31, 12);
      d.setDate(d.getDate() + 1)
    ) {
      backups.push(set(d.getTime()));
    }

    const kept = keptNames(backups, { daily: 7, weekly: 4, monthly: 3 });

    expect(kept).toEqual(
      [
        // monthly: last day of Nov and Dec (Jan is already kept)
        "202511301200",
        "202512311200",
        // weekly: Sundays of the 3 weeks before the current one (Mon 26 Jan)
        "202601111200",
        "202601181200",
        "202601251200",
        // daily: last 7 days
        "202601251200",
        "202601261200",
        "202601271200",
        "202601281200",
        "202601291200",
        "202601301200",
        "202601311200",
      ]
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
    );
  });

  it("does not depend on input order", () => {
    const backups = [
      set(at(2026, 1, 3)),
      set(at(2026, 1, 1)),
      set(at(2026, 1, 2)),
    ];
    expect(keptNames(backups, { last: 1 })).toEqual(["202601031200"]);
  });

  it("keeps everything with last=Infinity", () => {
    const backups = [set(at(2026, 1, 1)), set(at(2026, 1, 2))];
    expect(keptNames(backups, { last: Infinity })).toHaveLength(2);
  });
});
