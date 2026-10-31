/**
 * The style fidelity scorecards' pass/fail rule, with nothing tied to a browser, shared by the oracle scorecard (each
 * sample against the program's own drawing) and the drawn-scene scorecard (`test/fidelity/fidelity.test.ts`).
 *
 * A sample fails on elements, never on decimals: it fails when an element (a node, edge, group, label or stray) fails a
 * property that the known failures do not list for it, whether it passed before or is new. Everything else is a
 * report, written per run:
 *
 * - pass rates beside the recorded ones (the floors, informational: the best each property has measured), each change
 *   said to come from the drawing or from the comparator when the run judged a baseline drawing too;
 * - a whole-picture (raster) region that measures more than `RASTER_REPORT_DROP` under its recorded value;
 * - a known failure that passes now (the ratchet takes it off the list), and one that is not measurable any more (no
 *   element on the other side to compare it with), which is never a failure.
 *
 * With a baseline (an earlier run's drawings, re-judged by this run's comparator) every newly failing element is said
 * to come from the drawing (the baseline drawing passes it under this comparator), from the comparator (the baseline
 * drawing fails it too under this comparator, though its own run passed it), or to have failed on the baseline already.
 *
 * `scripts/fidelity-ratchet.ts` applies a run's report to the committed files (`ratchetKnown`, `raiseFloors`).
 */

/** One judged property's elements and rates, as a run measured them. */
export interface Judgement {
    /** The elements failing each property. */
    failures: Partial<Record<string, string[]>>;
    /**
     * The elements judged for each property, passing or failing, where the comparison names them; a property judged
     * with no list here (a score and no list) counts every known failure of it as measured.
     */
    judged?: Partial<Record<string, string[]>>;
    /** Pass rate per judged property (and the raster regions' similarity as `raster.<region>`). */
    scores: Record<string, number>;
}

/** The same sample drawn in an earlier run: as that run judged it, and re-judged by this run's comparator. */
export interface Baseline {
    recorded: Judgement;
    rejudged: Judgement;
}

/**
 * Where a newly failing element comes from: the drawing (the baseline drawing passes it under this comparator), the
 * comparator (the baseline drawing fails it too under this comparator, though its own run passed it), the baseline (it
 * failed on the baseline already, with the comparator of either run), or unclassified (no baseline was judged).
 */
export type ChangeSource = "drawing" | "comparator" | "baseline" | "unclassified";

/** One element failing a property that the known failures do not list. */
export interface NewFailure {
    property: string;
    id: string;
    source: ChangeSource;
}

/** One property's pass rate beside its recorded value, and the baseline's when one was judged. */
export interface ScoreChange {
    property: string;
    /** The recorded value (the floor); undefined for a property never recorded. */
    recorded?: number;
    /** This run's; undefined when the property is not measurable any more. */
    now?: number;
    /** The baseline as its own run scored it, and as this run's comparator scores it. */
    baseline?: { recorded?: number; rejudged?: number };
    /** `drop` and `rise` against the recorded value; `not measurable` when nothing on the other side is left to judge. */
    kind: "drop" | "rise" | "new" | "not measurable";
    /** With a baseline: how much of the change the comparator made (`rejudged - recorded`) and the drawing (`now - rejudged`). */
    comparator?: number;
    drawing?: number;
}

/**
 * Where a key's recorded pass rates are kept: with the real programs, with the stand-ins, or with the specification's
 * expectations (a sheet judged per setting, `judges.ts`), each apart from the others.
 */
export type FloorSection = "floors" | "standInFloors" | "specificationFloors";

/** Every floors section, in the order the floors file keeps them. */
export const FLOOR_SECTIONS: readonly FloorSection[] = ["floors", "standInFloors", "specificationFloors"];

/** One sample's (or one sample@matched's, or one reference's of a sheet judged per setting) verdict and report. */
export interface KeyGate {
    key: string;
    /** Where its recorded pass rates are kept. */
    section: FloorSection;
    /** The gate: elements failing a property the known failures do not list. Any one fails the sample. */
    newlyFailing: NewFailure[];
    /** Known failures that pass now, by property: the ratchet takes them off. */
    nowPassing: Record<string, string[]>;
    /** Known failures not judged at all now, by property: not measurable, never a failure; the list keeps them. */
    notMeasurable: Record<string, string[]>;
    /** Pass rates that moved from their recorded value, or are not measurable any more. */
    changes: ScoreChange[];
    /** Every element failing each property now, so the ratchet can list the new ones with a reason. */
    failures: Partial<Record<string, string[]>>;
    /** The scores the ratchet may record as floors. */
    scores: Record<string, number>;
}

/** Per key, per property: the elements known to fail. */
export type KnownFailures = Record<string, Record<string, string[]>>;

/** Why elements were added to the known failures, as the ratchet recorded it. */
export interface KnownReason {
    date: string;
    reason: string;
    /** Per key, per property: the elements added. */
    added: Record<string, Record<string, string[]>>;
    /** How many of them each source accounts for. */
    sources: Partial<Record<ChangeSource, number>>;
}

/** A known-failures list and the reasons its entries were added. */
export interface KnownRecords {
    about: string;
    known: KnownFailures;
    reasons: KnownReason[];
}

/** Per key, per property: the recorded pass rates (informational floors, raised by the ratchet, never lowered). */
export type Floors = Record<string, Record<string, number>>;

/**
 * How far a whole-picture (raster) region may measure under its recorded value before the drop is reported: two units
 * of its last place (regions are floored to 2 places). A raster drop never fails a sample; an element does.
 */
export const RASTER_REPORT_DROP = 0.02;

const EPSILON = 1e-9;

/**
 * The sha256 an oracle's metadata records for the sample file the program drew, which the gate checks against the
 * file graphty loads: `sha256` from the desktop programs' tools, `fileSha256` from the web oracles (Cytoscape.js,
 * sigma.js and vis-network), whose record the gate read as none (74 oracles checked against nothing).
 * @param meta - the oracle's metadata
 * @returns the recorded sha256, or null when it records none
 */
export function oracleFileSha256(meta: Record<string, unknown>): string | null {
    const sha = meta.sha256 ?? meta.fileSha256;
    return typeof sha === "string" ? sha : null;
}

/**
 * The scores a run on a GPU path may record: all of them on SwiftShader, and none of the raster regions elsewhere, since
 * the raster floors are SwiftShader's (another GPU path antialiases thin lines and glyph edges differently: a region up
 * to 0.046 apart over every oracle on one code state).
 * @param scores - a run's scores
 * @param gpu - `GRAPHTY_BROWSER_GPU`, "none" when unset
 * @returns the scores to record
 */
export function recordableScores(scores: Record<string, number>, gpu: string): Record<string, number> {
    return gpu === "none"
        ? scores
        : Object.fromEntries(Object.entries(scores).filter(([p]) => !p.startsWith("raster.")));
}

const has = (list: readonly string[] | undefined, id: string): boolean => list?.includes(id) === true;

/**
 * Where a newly failing element comes from, by the baseline drawing.
 * @param property - the property
 * @param id - the element
 * @param baseline - the baseline, when one was judged
 * @returns the source
 */
export function sourceOf(property: string, id: string, baseline: Baseline | undefined): ChangeSource {
    if (baseline === undefined) {
        return "unclassified";
    }
    if (!has(baseline.rejudged.failures[property], id)) {
        return "drawing";
    }
    return has(baseline.recorded.failures[property], id) ? "baseline" : "comparator";
}

/**
 * Whether a property is measured in a judgement, and which of a list of elements it judged.
 * @param run - the judgement
 * @param property - the property
 * @param ids - the elements asked about
 * @returns the elements it judged
 */
function measured(run: Judgement, property: string, ids: readonly string[]): string[] {
    const judged = run.judged?.[property];
    if (judged !== undefined) {
        const set = new Set(judged);
        return ids.filter((x) => set.has(x));
    }
    return run.scores[property] === undefined ? [] : [...ids];
}

/**
 * One key's verdict and report: the elements failing that the known failures do not list (the gate), the known
 * failures that pass now or are not measurable, and the pass rates beside their recorded values.
 * @param key - the sample (or `<sample>@matched`)
 * @param run - what this run measured
 * @param known - the elements known to fail each property of this key
 * @param recorded - the recorded pass rates of this key
 * @param options - the rest
 * @param options.baseline - the baseline drawing's judgements, when the run judged one
 * @param options.section - where the key's recorded pass rates are kept (default: with the real programs)
 * @param options.gpu - the GPU path it was drawn on (`GRAPHTY_BROWSER_GPU`, "none" when unset)
 * @returns the verdict and the report
 */
export function judgeKey(
    key: string,
    run: Judgement,
    known: Readonly<Record<string, readonly string[]>> | undefined,
    recorded: Readonly<Record<string, number>> | undefined,
    options: { baseline?: Baseline; section?: FloorSection; gpu?: string } = {},
): KeyGate {
    const { baseline } = options;
    const newlyFailing = Object.entries(run.failures).flatMap(([p, ids]) => {
        const listed = new Set(known?.[p] ?? []);
        return (ids ?? [])
            .filter((x) => !listed.has(x))
            .map((id): NewFailure => ({ property: p, id, source: sourceOf(p, id, baseline) }));
    });
    const nowPassing: Record<string, string[]> = {};
    const notMeasurable: Record<string, string[]> = {};
    for (const [p, ids] of Object.entries(known ?? {})) {
        const failing = new Set(run.failures[p] ?? []);
        const judged = new Set(measured(run, p, ids));
        const passing = ids.filter((x) => judged.has(x) && !failing.has(x));
        const gone = ids.filter((x) => !judged.has(x) && !failing.has(x));
        if (passing.length > 0) {
            nowPassing[p] = passing;
        }
        if (gone.length > 0) {
            notMeasurable[p] = gone;
        }
    }
    const changes: ScoreChange[] = [];
    for (const p of new Set([...Object.keys(recorded ?? {}), ...Object.keys(run.scores)])) {
        const was = recorded?.[p];
        const now = run.scores[p];
        const base =
            baseline === undefined
                ? undefined
                : { recorded: baseline.recorded.scores[p], rejudged: baseline.rejudged.scores[p] };
        const split =
            base === undefined
                ? {}
                : {
                      ...(base.recorded !== undefined && base.rejudged !== undefined
                          ? { comparator: base.rejudged - base.recorded }
                          : {}),
                      ...(now !== undefined && base.rejudged !== undefined ? { drawing: now - base.rejudged } : {}),
                  };
        const entry = { property: p, recorded: was, now, ...(base === undefined ? {} : { baseline: base }), ...split };
        if (now === undefined) {
            changes.push({ ...entry, kind: "not measurable" });
        } else if (was === undefined) {
            changes.push({ ...entry, kind: "new" });
        } else if (now < was - (p.startsWith("raster.") ? RASTER_REPORT_DROP : 0) - EPSILON) {
            changes.push({ ...entry, kind: "drop" });
        } else if (now > was + EPSILON) {
            changes.push({ ...entry, kind: "rise" });
        }
    }
    return {
        key,
        section: options.section ?? "floors",
        newlyFailing,
        nowPassing,
        notMeasurable,
        changes,
        failures: run.failures,
        scores: recordableScores(run.scores, options.gpu ?? "none"),
    };
}

/**
 * The gate's messages for one key: one line per property with elements failing that the known failures do not list,
 * each element with where it comes from.
 * @param gate - the key's verdict
 * @returns the lines; empty when the key passes
 */
export function gateMessages(gate: KeyGate): string[] {
    const byProperty = new Map<string, NewFailure[]>();
    for (const f of gate.newlyFailing) {
        byProperty.set(f.property, [...(byProperty.get(f.property) ?? []), f]);
    }
    return [...byProperty].map(([p, list]) => {
        const shown = list.slice(0, 12).map((f) => `${f.id} (${f.source})`);
        return `${gate.key} ${p}: ${String(list.length)} newly failing: ${shown.join(", ")}${list.length > 12 ? ", ..." : ""}`;
    });
}

/**
 * The known failures after a run: every listed element that passes now is taken off (an element that is not measurable
 * any more stays), and, with a reason, every element failing that the list does not name is added and the reason
 * recorded with it. Never adds without a reason.
 * @param records - the known failures as committed
 * @param gates - the run's verdicts by key
 * @param add - the reason and date to add the unlisted failures with; omitted to add nothing
 * @param add.reason - why they are added
 * @param add.date - `YYYY-MM-DD`
 * @param add.keys - only these keys (all when omitted)
 * @returns the new known failures and what changed
 */
export function ratchetKnown(
    records: KnownRecords,
    gates: readonly KeyGate[],
    add?: { reason: string; date: string; keys?: readonly string[] },
): { records: KnownRecords; removed: number; added: number; unlisted: number } {
    if (add !== undefined && add.reason.trim().length < 10) {
        throw new Error("adding to the known failures needs a reason of 10 or more characters");
    }
    const known: KnownFailures = structuredClone(records.known);
    let removed = 0;
    let added = 0;
    let unlisted = 0;
    const record: KnownReason = { date: add?.date ?? "", reason: add?.reason ?? "", added: {}, sources: {} };
    for (const gate of gates) {
        const now = known[gate.key] ?? {};
        for (const [p, ids] of Object.entries(gate.nowPassing)) {
            const off = new Set(ids);
            const before = now[p] ?? [];
            now[p] = before.filter((x) => !off.has(x));
            removed += before.length - now[p].length;
        }
        const adding = add !== undefined && (add.keys === undefined || add.keys.includes(gate.key));
        for (const f of gate.newlyFailing) {
            if (!adding) {
                unlisted += 1;
                continue;
            }
            const list = (now[f.property] ??= []);
            if (!list.includes(f.id)) {
                list.push(f.id);
                list.sort();
                added += 1;
                const into = (record.added[gate.key] ??= {});
                (into[f.property] ??= []).push(f.id);
                record.sources[f.source] = (record.sources[f.source] ?? 0) + 1;
            }
        }
        if (Object.keys(now).length > 0) {
            known[gate.key] = now;
        }
    }
    const reasons = added > 0 ? [...records.reasons, record] : records.reasons;
    return { records: { about: records.about, known: sortedKeys(known), reasons }, removed, added, unlisted };
}

/**
 * Raises a key's recorded pass rates to this run's where it measured higher, and records a property never recorded;
 * never lowers one.
 * @param table - the floors, changed in place
 * @param key - the key
 * @param scores - this run's recordable scores
 * @returns how many floors rose or were added
 */
export function raiseFloors(table: Floors, key: string, scores: Readonly<Record<string, number>>): number {
    const row = (table[key] ??= {});
    let raised = 0;
    for (const [p, rate] of Object.entries(scores)) {
        if (row[p] === undefined || rate > row[p] + EPSILON) {
            row[p] = rate;
            raised += 1;
        }
    }
    return raised;
}

const sortedKeys = <T>(o: Record<string, T>): Record<string, T> =>
    Object.fromEntries(
        Object.keys(o)
            .sort()
            .map((k) => [k, o[k]]),
    );

/**
 * The known failures as text: one line per key and property, and one per reason, so a diff shows which elements a fix
 * took off the list and why any were added. Prettier leaves the files alone (`.prettierignore`): it would spread the
 * lists over a line per element id.
 * @param records - the known failures
 * @param floors - recorded pass rates to keep in the same file, before the known failures (the drawn-scene scorecard's)
 * @returns the file's text
 */
export function knownText(records: KnownRecords, floors?: Floors): string {
    const lines = Object.entries(records.known).map(
        ([key, props]) =>
            `        ${JSON.stringify(key)}: {\n${Object.entries(props)
                .map(([p, ids]) => `            ${JSON.stringify(p)}: ${JSON.stringify(ids)}`)
                .join(",\n")}\n        }`,
    );
    const reasons = records.reasons.map((r) => `        ${JSON.stringify(r)}`);
    const floorsText =
        floors === undefined ? "" : `    "floors": ${JSON.stringify(floors, null, 4).replaceAll("\n", "\n    ")},\n`;
    return `{\n    "about": ${JSON.stringify(records.about)},\n${floorsText}    "known": {${lines.length === 0 ? "" : `\n${lines.join(",\n")}\n    `}},\n    "reasons": [${reasons.length === 0 ? "" : `\n${reasons.join(",\n")}\n    `}]\n}\n`;
}

const num = (x: number | undefined): string => (x === undefined ? "-" : String(Math.round(x * 10000) / 10000));
const signed = (x: number): string => `${x >= 0 ? "+" : ""}${num(x)}`;

/**
 * One score change as a line: the recorded value and this run's, and with a baseline how much the comparator and the
 * drawing each moved it.
 * @param key - the key
 * @param c - the change
 * @returns the line
 */
function changeLine(key: string, c: ScoreChange): string {
    const split =
        c.baseline === undefined
            ? ""
            : `; baseline ${num(c.baseline.recorded)}, re-judged ${num(c.baseline.rejudged)}${
                  c.comparator === undefined ? "" : `, comparator ${signed(c.comparator)}`
              }${c.drawing === undefined ? "" : `, drawing ${signed(c.drawing)}`}`;
    return `  ${key} ${c.property}: recorded ${num(c.recorded)}, now ${num(c.now)}${split}`;
}

/**
 * A run's report as text: the gate's failures with where each comes from, the known failures that pass now or are not
 * measurable, and the pass rates that moved (drops, the raster regions only past `RASTER_REPORT_DROP`; rises; newly
 * judged; not measurable any more).
 * @param gates - every key's verdict
 * @param gpu - the GPU path of the run
 * @param baseline - the baseline directory judged again, or null
 * @returns the text
 */
export function gateReportText(gates: readonly KeyGate[], gpu: string, baseline: string | null): string {
    const failing = gates.filter((g) => g.newlyFailing.length > 0);
    const count = (pick: (g: KeyGate) => Record<string, string[]>): number =>
        gates.reduce((n, g) => n + Object.values(pick(g)).reduce((m, ids) => m + ids.length, 0), 0);
    const sources = new Map<ChangeSource, number>();
    for (const f of gates.flatMap((g) => g.newlyFailing)) {
        sources.set(f.source, (sources.get(f.source) ?? 0) + 1);
    }
    const section = (title: string, lines: string[]): string[] =>
        lines.length === 0 ? [] : ["", `${title} (${String(lines.length)})`, ...lines];
    const listed = (pick: (g: KeyGate) => Record<string, string[]>): string[] =>
        gates.flatMap((g) => Object.entries(pick(g)).map(([p, ids]) => `  ${g.key} ${p}: ${ids.join(", ")}`));
    const changes = (kind: ScoreChange["kind"]): string[] =>
        gates.flatMap((g) => g.changes.filter((c) => c.kind === kind).map((c) => changeLine(g.key, c)));
    return [
        `Style fidelity gate: ${String(gates.length)} keys, GPU path ${gpu}, baseline ${baseline ?? "none"}.`,
        `A key fails when an element fails a property the known failures do not list; scores are reported, never gated.`,
        `Failing keys: ${String(failing.length)}; elements newly failing: ${String(
            failing.reduce((n, g) => n + g.newlyFailing.length, 0),
        )} (${[...sources].map(([s, n]) => `${s} ${String(n)}`).join(", ") || "none"}).`,
        `Known failures passing now (the ratchet takes them off): ${String(count((g) => g.nowPassing))}; not measurable: ${String(count((g) => g.notMeasurable))}.`,
        ...section(
            "Newly failing, by key and property (source in brackets)",
            failing.flatMap((g) => gateMessages(g).map((m) => `  ${m}`)),
        ),
        ...section(
            "Known failures passing now",
            listed((g) => g.nowPassing),
        ),
        ...section(
            "Known failures not measurable now (kept on the list)",
            listed((g) => g.notMeasurable),
        ),
        ...section("Scores below their recorded value (raster regions past 0.02 only)", changes("drop")),
        ...section("Scores above their recorded value", changes("rise")),
        ...section("Scores judged with no recorded value", changes("new")),
        ...section("Scores not measurable any more", changes("not measurable")),
        "",
    ].join("\n");
}

/**
 * The samples one slice of the full oracle run judges, so CI's full run can spread the run over several jobs
 * (`GRAPHTY_ORACLE_SLICE=<n>/<count>`, `tools/ci-test-matrix.mjs`): every `count`-th sample from the `n`-th, which mixes
 * the formats (and so the slow samples) over the slices. The slices of one count are disjoint and cover every sample.
 * @param ids - every sample, in a fixed order
 * @param spec - `<n>/<count>` with 1 <= n <= count, or empty for every sample
 * @returns the slice's samples
 */
export function oracleSlice(ids: readonly string[], spec: string | undefined): readonly string[] {
    if (spec === undefined || spec === "") {
        return ids;
    }
    const m = /^(\d+)\/(\d+)$/.exec(spec);
    const n = Number(m?.[1]);
    const count = Number(m?.[2]);
    // a typo must not judge nothing and pass
    if (m === null || n < 1 || n > count) {
        throw new Error(`GRAPHTY_ORACLE_SLICE="${spec}" is not <n>/<count> with 1 <= n <= count`);
    }
    return ids.filter((_, i) => i % count === n - 1);
}
