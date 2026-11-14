// Test groups in full runs (#7855): a group's members run one after another in one test step, which
// tools/results/run-group.mjs stops at TEST_STEP_LIMIT_MS. Each member's own time can be well inside its shard
// budget while the group's total nears the deadline, so the members' times are summed per full run here.
// config/ci-groups.json is a copy of tools/ci-test-matrix.mjs GROUPS and GROUP_MEMBER_SECONDS and of
// TEST_STEP_LIMIT_MS; tools/ci-groups-snapshot.test.mjs keeps it equal to them.

import ciGroups from "../../config/ci-groups.json" with { type: "json" };
import type { Agg, ShardRunItem } from "./items.js";

export const CI_GROUPS = ciGroups as {
    testStepLimitMs: number;
    groups: Record<string, string[]>;
    memberSeconds: Record<string, number>;
};

/**
 * Between two members: the results wrapper posting and nx starting the next one, which no shard run's time holds.
 * The same allowance as tools/ci-workflows.test.mjs's gapSeconds; also the slack a member's measured time (its
 * command, vitest's Duration plus its start) has over its GROUP_MEMBER_SECONDS entry (vitest's Duration) before it
 * is flagged.
 */
export const MEMBER_GAP_MS = 10_000;
/** A group past this share of its test step's deadline is not OK (the member's target, config/slas.json). */
export const GROUP_WARN_SHARE = 0.8;

const GROUP_OF = new Map(Object.entries(CI_GROUPS.groups).flatMap(([g, ms]) => ms.map((m) => [m, g] as const)));

/**
 * One group member's try in a full run, as the ci.full_group_member_time dimension `[group, run, member]`, or
 * undefined for a shard run that is not a group member's. The run is `<run id>.<run attempt>` of the invocation id
 * `<run>.<attempt>.<job>.<shard>.<try>` (tools/results/run-group.mjs baseId()); every try of a member counts, since
 * a retry runs inside the same step.
 * @param s a shard run
 * @returns the dimension key, or undefined
 */
export function groupMemberDim(s: ShardRunItem): string | undefined {
    const member = s.variant.split("|")[0];
    const group = GROUP_OF.get(member);
    const parts = s.id.split(".");
    if (!group || s.variant.endsWith("|shots") || parts.length < 4 || parts[3] !== member) {
        return undefined;
    }
    return JSON.stringify([group, `${parts[0]}.${parts[1]}`, member]);
}

export interface GroupRun {
    /** GitHub run id */
    runId: number;
    attempt: number;
    /** The members' summed times plus MEMBER_GAP_MS for each, ms. */
    totalMs: number;
    /** totalMs over the test step's deadline. */
    share: number;
}

export interface GroupMember {
    member: string;
    /** Its slowest full run in the range, ms (its tries summed). */
    maxMs: number;
    /** Its GROUP_MEMBER_SECONDS entry, ms; undefined when the table has none. */
    tableMs?: number;
    /** Slower than its entry by more than MEMBER_GAP_MS: the table needs remeasuring. */
    stale: boolean;
}

export interface GroupTimes {
    group: string;
    limitMs: number;
    newest: GroupRun;
    worst: GroupRun;
    runs: number;
    members: GroupMember[];
}

const runOf = (key: string, members: Map<string, number>, limitMs: number): GroupRun => {
    const [runId, attempt] = key.split(".").map(Number);
    const totalMs = [...members.values()].reduce((t, ms) => t + ms + MEMBER_GAP_MS, 0);
    return { runId, attempt, totalMs, share: totalMs / limitMs };
};

/**
 * Each group's newest and slowest full run, and each member's slowest time against its table entry.
 * @param dims ci.full_group_member_time's dimensions merged over the range
 * @param cfg the groups, their deadline and the members' entries
 * @returns one row per group with any run, slowest newest run first
 */
export function groupTimes(dims: Map<string, Agg>, cfg = CI_GROUPS): GroupTimes[] {
    const groups = new Map<string, Map<string, Map<string, number>>>();
    for (const [key, a] of dims) {
        const [group, run, member] = JSON.parse(key) as [string, string, string];
        const runs = groups.get(group) ?? new Map<string, Map<string, number>>();
        groups.set(group, runs);
        const members = runs.get(run) ?? new Map<string, number>();
        runs.set(run, members);
        members.set(member, (members.get(member) ?? 0) + a.sum);
    }
    const limitMs = cfg.testStepLimitMs;
    const out: GroupTimes[] = [];
    for (const [group, runs] of groups) {
        const all = [...runs].map(([key, members]) => runOf(key, members, limitMs));
        all.sort((x, y) => y.runId - x.runId || y.attempt - x.attempt);
        const maxOf = new Map<string, number>();
        for (const members of runs.values()) {
            for (const [m, ms] of members) {
                maxOf.set(m, Math.max(maxOf.get(m) ?? 0, ms));
            }
        }
        const members = [...maxOf].map(([member, maxMs]): GroupMember => {
            const s = cfg.memberSeconds[member];
            const tableMs = s === undefined ? undefined : s * 1000;
            return { member, maxMs, tableMs, stale: tableMs === undefined || maxMs > tableMs + MEMBER_GAP_MS };
        });
        members.sort((x, y) => y.maxMs - x.maxMs);
        const worst = all.reduce((w, r) => (r.totalMs > w.totalMs ? r : w), all[0]);
        out.push({ group, limitMs, newest: all[0], worst, runs: all.length, members });
    }
    return out.sort((x, y) => y.newest.share - x.newest.share);
}
