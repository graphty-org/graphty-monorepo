/**
 * The oracle scorecard's floors, with nothing tied to a browser: a pass-rate floor per sample and property that only
 * ratchets up, the elements known to fail each property (one more is enough to fail the sample), the floors kept apart
 * for oracles that stand in for the file's own program, and the waivers that may hold a floor down for a while, each
 * with its issue and its expiry. `run-oracle.ts` reads and writes the files; this module decides.
 */
import { ORACLE_PROPERTIES, type OracleProperty, type OracleReport } from "./compare-oracle";

/** One comparison's report and its scores. */
export interface OracleScored {
    report: OracleReport;
    /** Pass rate per judged property, rounded to 4 places; the raster regions' similarity as `raster.<region>`. */
    scores: Record<string, number>;
}

/**
 * A floor a sample may stay under for a while: why, the issue that tracks the fix, when the waiver lapses, and the
 * least the rate may fall to meanwhile.
 */
export interface AllowedDrop {
    reason: string;
    /** A GitHub issue (`#123`) or an `ISSUES.md` row (`ISSUES.md I12`). */
    issue: string;
    /** `YYYY-MM-DD`: from the next day on, the drop fails the run again. */
    expires: string;
    atLeast: number;
}

/**
 * Where a floors key's floors are kept: with the real programs, with the stand-ins, or with the specification's
 * expectations (a sheet judged per setting, judges.ts), each apart from the others.
 */
export type FloorSection = "floors" | "standInFloors" | "specificationFloors";

/** The floors files. */
export interface OracleFloors {
    about: string;
    floors: Record<string, Record<string, number>>;
    /** The floors of samples whose oracle stands in for the file's own program, kept apart. */
    standInFloors: Record<string, Record<string, number>>;
    /** The floors of the settings a sheet judged per setting judges against its specification, kept apart. */
    specificationFloors: Record<string, Record<string, number>>;
    allowedDrops: Record<string, AllowedDrop>;
    /** Floors lowered on purpose, with the rate before and after and why: the work the fixes owe. */
    lowered: Record<string, { from: number; to: number; reason: string; date: string }>;
    /** Per sample key, per property: the elements known to fail it. */
    known: Record<string, Record<string, string[]>>;
}

const EPSILON = 1e-9;

/**
 * Why an allowed drop no longer excuses its floor, or null while it does.
 * @param drop - the entry
 * @param rate - the measured rate
 * @param today - `YYYY-MM-DD`
 * @returns the reason, or null
 */
export function dropLapsed(drop: unknown, rate: number | undefined, today: string): string | null {
    const d = drop as Partial<AllowedDrop> | null;
    if (
        d === null ||
        typeof d !== "object" ||
        typeof d.reason !== "string" ||
        typeof d.issue !== "string" ||
        !/^(#\d+|ISSUES\.md \S+)$/.test(d.issue) ||
        typeof d.expires !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d.expires) ||
        typeof d.atLeast !== "number"
    ) {
        return "an allowed drop needs { reason, issue: '#N' or 'ISSUES.md <row>', expires: 'YYYY-MM-DD', atLeast }";
    }
    if (d.expires < today) {
        return `the allowed drop expired on ${d.expires} (${d.issue}): fix it, or renew it with a reason`;
    }
    if (rate === undefined || rate < d.atLeast - EPSILON) {
        return `the allowed drop holds the rate at least at ${String(d.atLeast)} (${d.issue})`;
    }
    return null;
}

/** What fell below its floor, what is judged with no floor yet, and which elements newly fail. */
export interface FloorCheck {
    dropped: string[];
    unfloored: string[];
    /** Elements that fail a property and are not known to: one is enough to fail the sample. */
    newlyFailing: string[];
}

/**
 * Checks one scored comparison against its floors and known failures.
 * @param key - the floors key
 * @param scored - its measurement
 * @param section - where its floors are kept
 * @param stored - the floors
 * @param today - `YYYY-MM-DD`
 * @returns what failed
 */
export function checkScored(
    key: string,
    scored: OracleScored,
    section: FloorSection,
    stored: OracleFloors,
    today: string,
): FloorCheck {
    const floors = stored[section][key] ?? {};
    const dropped = Object.entries(floors).flatMap(([p, floor]) => {
        const rate = scored.scores[p];
        if (rate !== undefined && rate >= floor - EPSILON) {
            return [];
        }
        // a property no longer judged at a floor of 0 asked for nothing; and a stray property with no stray left to
        // judge is at its best (a sheet whose every oracle shape and text is now associated)
        if (rate === undefined && (floor <= 0 || p.startsWith("stray."))) {
            return [];
        }
        const drop = stored.allowedDrops[`${key}/${p}`];
        const lapsed = drop === undefined ? null : dropLapsed(drop, rate, today);
        if (drop !== undefined && lapsed === null) {
            return [];
        }
        const worst = (scored.report.properties[p as OracleProperty]?.worst ?? [])
            .slice(0, 3)
            .map((w) => `${w.id} (oracle ${JSON.stringify(w.oracle)}, graphty ${JSON.stringify(w.graphty)})`);
        return [
            `${key} ${p}: ${rate === undefined ? "no longer judged" : rate.toFixed(4)} < floor ${floor.toFixed(4)}${lapsed === null ? "" : `; ${lapsed}`}; worst: ${worst.join("; ")}`,
        ];
    });
    const known = stored.known[key];
    const unfloored = Object.keys(scored.scores)
        .filter((p) => !(p in floors) || (!p.startsWith("raster.") && known?.[p] === undefined))
        .map((p) => `${key} ${p}`);
    const newlyFailing = Object.entries(scored.report.failures).flatMap(([p, ids]) => {
        const was = new Set(known?.[p] ?? []);
        const fresh = (ids ?? []).filter((x) => !was.has(x));
        return known?.[p] === undefined || fresh.length === 0
            ? []
            : [
                  `${key} ${p}: ${String(fresh.length)} newly failing: ${fresh.slice(0, 12).join(", ")}${fresh.length > 12 ? ", ..." : ""}`,
              ];
    });
    return { dropped, unfloored, newlyFailing };
}

/** What a run records: each key's scores, the elements failing each judged property, and where its floors are kept. */
export type OracleRecord = Record<
    string,
    { scores: Record<string, number>; failures: OracleReport["failures"]; section: FloorSection }
>;

const byProperty = (a: string, b: string): number => {
    const k = (p: string): number => {
        const i = ORACLE_PROPERTIES.indexOf(p as OracleProperty);
        return i < 0 ? ORACLE_PROPERTIES.length : i;
    };
    return k(a) - k(b) || (a < b ? -1 : Number(a > b));
};
const sortedKeys = <T>(o: Record<string, T>): Record<string, T> =>
    Object.fromEntries(
        Object.keys(o)
            .sort()
            .map((k) => [k, o[k]]),
    );

/**
 * The floors and known failures after a run is recorded: the higher of the stored and the measured rate (a floor never
 * drops), and of the elements known to fail a property only those that still fail (a fixed element is never let fail
 * again); a property with no record yet records what fails now. A key's floors go with the real programs, the
 * stand-ins or the specification by what judged it.
 * @param fresh - the floors as they stand
 * @param recorded - the measurements by floors key
 * @returns the new floors and known failures
 */
export function mergeRecords(fresh: OracleFloors, recorded: OracleRecord): Pick<OracleFloors, FloorSection | "known"> {
    const sections: Record<FloorSection, Map<string, Record<string, number>>> = {
        floors: new Map(Object.entries(fresh.floors)),
        standInFloors: new Map(Object.entries(fresh.standInFloors)),
        specificationFloors: new Map(Object.entries(fresh.specificationFloors)),
    };
    const known = { ...fresh.known };
    for (const [key, { scores, failures, section }] of Object.entries(recorded)) {
        const old = fresh.floors[key] ?? fresh.standInFloors[key] ?? fresh.specificationFloors[key] ?? {};
        const merged: Record<string, number> = { ...old };
        for (const [p, rate] of Object.entries(scores)) {
            merged[p] = Math.max(rate, old[p] ?? 0);
        }
        for (const m of Object.values(sections)) {
            m.delete(key);
        }
        sections[section].set(
            key,
            Object.fromEntries(
                Object.keys(merged)
                    .sort(byProperty)
                    .map((p) => [p, merged[p]]),
            ),
        );
        const was = fresh.known[key] ?? {};
        const now: Record<string, string[]> = { ...was };
        for (const p of Object.keys(scores).filter((q) => !q.startsWith("raster."))) {
            const failing = failures[p as OracleProperty] ?? [];
            const before = was[p];
            now[p] = before === undefined ? [...failing] : failing.filter((x) => before.includes(x));
        }
        known[key] = Object.fromEntries(
            Object.keys(now)
                .sort(byProperty)
                .map((p) => [p, now[p]]),
        );
    }
    return {
        floors: sortedKeys(Object.fromEntries(sections.floors)),
        standInFloors: sortedKeys(Object.fromEntries(sections.standInFloors)),
        specificationFloors: sortedKeys(Object.fromEntries(sections.specificationFloors)),
        known: sortedKeys(known),
    };
}
