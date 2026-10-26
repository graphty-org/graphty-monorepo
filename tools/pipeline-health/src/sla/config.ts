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
    | { type: "dims_median_over"; metric: string; over: number; minPerDim: number } // dimensions whose median > over
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
