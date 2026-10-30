// The shape of config/slas.json: every SLA member of design/ci/health-dashboard.md section 4, the sources of
// section 9, and the limits the writers read. Labels are catalog data; the page writes every sentence.

import slas from "../../config/slas.json" with { type: "json" };

export type Op = "<" | "<=" | ">" | ">=" | "=";
export type Threshold = [Op, number];

/**
 * 1h: judged on the last hour. 1h+6h: red only when the 6 h value is past red too. now: a state. slow: weeks,
 * never sets a state. info: shown, not judged until it has fired on real data.
 */
export type MemberWindow = "1h" | "1h+6h" | "now" | "slow" | "info";

export type EngineMeasure = "sources_not_ok" | "sources_thin" | "collector_age" | "write_budget";

export type Measure =
    | { type: "rate"; metric: string; scale?: number } // sum / n
    | { type: "median" | "p90"; metric: string; scale?: number } // from the merged histogram
    | { type: "sum"; metric: string; scale?: number }
    | { type: "share"; metric: string; complement?: boolean } // sum / the window's ms
    | { type: "last"; metric: string; scale?: number } // a stock's newest value
    // Dimensions whose median (from the events) passes `over`, or without it each dimension's own budget (sum / n).
    | { type: "dims_median_over"; metric: string; over?: number; minPerDim: number }
    | { type: "month"; metric: string; dim?: string; projected: boolean } // month to date, or projected to month end
    | { type: "engine"; name: EngineMeasure };

export interface MemberConfig {
    id: string;
    category: string;
    label: string;
    window: MemberWindow;
    measure: Measure;
    /** The target: the value is OK while this holds. */
    ok?: Threshold;
    /** Red: FAILING while this holds. */
    fail?: Threshold;
    /** More red conditions, each on the newest value of another stock ("or 2 builds"). */
    also?: { metric: string; fail: Threshold }[];
    /** Fewest events the window must hold before the member is judged. */
    minN?: number;
    slowWindow?: "7d" | "28d";
    sources: string[];
    headline?: boolean;
    /** Pages the owner's phone (section 13). A member without it never pages. */
    alert?: AlertConfig;
}

/**
 * When and how a member pages. Only critical outages and what only the owner can do page; agents handle the rest.
 * Texts take {value}, {limit} (red threshold), {target}, {for} (how long), {peak}, {source}, {error}, {since} (how
 * long the cause has lasted) and {ms:<fact>} (a fact as a duration), all in human units.
 */
export interface AlertConfig {
    /** Pages once its condition has held this long without a break. */
    afterMs: number;
    /** Pushover priority: 1 for a critical outage (bypasses quiet hours), 0 for an owner action. */
    priority: 0 | 1;
    /** At most one page per this span, even across episodes (6 h when absent). */
    floorMs?: number;
    /** The condition is the value past this, instead of the member being FAILING (the member must still be bad). */
    value?: Threshold;
    /** And each of these facts (MemberStatus.facts) past its threshold; the episode ends once one is not. */
    facts?: Record<string, Threshold>;
    /** A month-end projection: not before this day of the month unless month-to-date spend is already past red. */
    fromDay?: number;
    /** Not while any of these members is FAILING (one cause, one page). */
    notWhileFailing?: string[];
    /** Members of one group due together go out as one message. */
    group?: string;
    title: string;
    text: string;
    /** The owner's action, sent as "What to do: ...". */
    action: string;
    /** Sends a quiet "resolved" once the member has been OK for clearAfterMs; absent, nothing is sent. */
    resolved?: { title: string; text: string; clearAfterMs: number };
}

export interface SourceConfig {
    label: string;
    /** Past this age the source is stale (NO DATA for its members); red at twice it. */
    yellowAfterMs?: number;
    /** No writer yet by design, or waiting on the owner: its members are out of the status until it first writes. */
    notSetUp?: string;
    /** Its activity stopped by design: its members are idle unless it writes again. */
    idle?: string;
    /** A metric whose n counts the source's activity: no activity in the age window is not staleness. */
    activity?: string;
    /** Rows per unit of activity (a rate metric) against its 7 d value. */
    thin?: { metric: string; minActivity: number };
}

export interface SlaConfig {
    categories: { id: string; label: string }[];
    sources: Record<string, SourceConfig>;
    runnerLimits: Record<string, number>;
    prBudgetsMin: Record<string, number>;
    dailyRowLimit: number;
    members: MemberConfig[];
}

export const SLAS = slas as unknown as SlaConfig;
