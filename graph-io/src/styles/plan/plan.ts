/**
 * The planner: turns a file's per-element style values into a few readable rules that reproduce them exactly. It
 * groups properties into families, explains each family by a discrete or continuous mapping on one feature, a
 * passthrough on an existing column, style classes or a copy, orders the rules, caps them at 15 per target and
 * replays them: every element whose resolved value differs from the file's goes into one sparse exceptions column
 * per property on top. One counted budget bounds the work; when it runs out the rest is copied.
 */

import { StyleBudget } from "../budget.js";
import { STYLE_ISSUE } from "../codes.js";
import { toolDefaults, type ToolDerivedDefault } from "../defaults.js";
import { StyleNotes } from "../notes.js";
import type {
    ExtractedStyles,
    GraphStyle,
    Mapping,
    ReaderOutput,
    StyleColumn,
    StyleDialect,
    StyleFeature,
    StyleFeatures,
    StyleFingerprint,
    StyleRule,
    StyleRuleFacts,
    StyleTarget,
    StyleTool,
    StyleValue,
    StyleWorkBudget,
} from "../types.js";
import { isStyleValue, STYLE_PROPERTIES } from "../vocabulary.js";
import { CLASS_COLUMN, styleClasses } from "./classes.js";
import { type ContinuousCandidate, continuousCandidate } from "./continuous.js";
import { type DiscreteCandidate, discreteCandidate } from "./discrete.js";
import { familiesOf, type Family } from "./families.js";
import { describeFeature, type FeatureInfo } from "./features.js";
import {
    canonicalFor,
    evalContinuous,
    isShortPredicate,
    matches,
    numberOf,
    refSource,
    resolveRules,
    within,
} from "./resolve.js";

/**
 * The most rules per target: the planner keeps at most 15 plus the exceptions rule.
 * @category Styles
 */
export const MAX_STYLE_RULES = 16;
/** The most candidate features tested per target, fewest distinct values first. */
const MAX_FEATURES = 64;
/** Lengths a tool states in its own unit; they are left out when the file's unit differs. */
const LENGTHS: ReadonlySet<string> = new Set([
    "width",
    "height",
    "borderWidth",
    "labelSize",
    "labelWrapWidth",
    "labelPaddingX",
    "labelPaddingY",
    "labelOffsetX",
    "labelOffsetY",
    "fanSpacing",
    "nodeGap",
]);

/**
 * What the planner is given: the canonical per-element values a style reader produced, the rules the file declares,
 * and the graph they belong to.
 * @category Styles
 */
export interface StyleValues {
    /** The graph-io format id. */
    readonly format: string;
    /** How the file spelled its values. */
    readonly dialect?: StyleDialect | null;
    /** The program that wrote the file, whose defaults fill in what the file leaves unset; null when unknown. */
    readonly tool?: StyleTool | null;
    /** The unit of every length; defaults to pixels. */
    readonly units?: "px" | "relative";
    /** The graph's own style. */
    readonly graph?: GraphStyle;
    /** Node values, declared rules, reader columns and extra features. */
    readonly node?: ReaderOutput;
    /** Edge values, declared rules, reader columns and extra features. */
    readonly edge?: ReaderOutput;
    /** The graph the values belong to; its counts give the number of elements. */
    readonly fingerprint: StyleFingerprint;
}

/**
 * Options of `planStyles()`.
 * @category Styles
 */
export interface PlanOptions {
    /** Whether to add the writing tool's defaults as a rule at the bottom; defaults to true. */
    readonly toolDefaults?: boolean;
    /** The counted work budget; defaults to a fresh `StyleBudget`. */
    readonly budget?: StyleWorkBudget;
    /**
     * Where notes are collected; the reader's notes, when it used the same collector, are kept.
     * @internal
     */
    readonly notes?: StyleNotes;
    /** Data columns the reader read the values from: they are never offered as explanations of themselves. */
    readonly rawColumns?: {
        /** Node columns. */
        readonly node?: readonly string[];
        /** Edge columns. */
        readonly edge?: readonly string[];
    };
    /** Cancels the planning. */
    readonly signal?: AbortSignal;
}

/** A rule being built. */
interface Draft {
    id: string;
    readonly target: StyleTarget;
    readonly role: string;
    readonly origin: string;
    where: StyleRule["where"];
    set?: Record<string, StyleValue>;
    map?: Record<string, Mapping>;
    facts?: StyleRuleFacts;
    readonly ext?: Readonly<Record<string, unknown>>;
}

/** The planning state of one target. */
interface TargetPlan {
    readonly target: StyleTarget;
    readonly n: number;
    readonly notes: StyleNotes;
    readonly budget: StyleWorkBudget;
    readonly spend: (ops: number) => void;
    readonly columns: Map<string, StyleColumn>;
    readonly ids: Set<string>;
}

/**
 * Plans a file's styles: the rules that reproduce its per-element values, with the columns they read.
 * @param values - the canonical values, the declared rules and the graph they belong to
 * @param features - the candidate explaining columns per target (`featuresOf()` of the snapshot)
 * @param options - tool defaults, the budget, the notes collector, the raw columns and a cancel signal
 * @returns the styles, exact for every element
 * @category Styles
 */
export function planStyles(values: StyleValues, features: StyleFeatures, options: PlanOptions = {}): ExtractedStyles {
    const notes = options.notes ?? new StyleNotes();
    const budget = options.budget ?? new StyleBudget();
    const defaults =
        options.toolDefaults !== false && values.tool !== undefined && values.tool !== null
            ? toolDefaults(values.tool)
            : null;
    const units = values.units ?? "px";
    const rules: StyleRule[] = [];
    const columns = { node: new Map<string, StyleColumn>(), edge: new Map<string, StyleColumn>() };
    const allFeatures = { node: [] as StyleFeature[], edge: [] as StyleFeature[] };
    for (const target of ["node", "edge"] as const) {
        const given = values[target];
        // a reader's own tool-default rules (Gephi's arrows on directed edges) go with the tool's constants
        const out =
            options.toolDefaults === false && given?.rules !== undefined
                ? { ...given, rules: given.rules.filter((r) => r.origin !== "tool") }
                : given;
        allFeatures[target] = [...features[target], ...(out?.features ?? [])];
        const toolSet = defaults === null ? null : toolSetOf(defaults, target, units);
        const plan: TargetPlan = {
            target,
            n: target === "node" ? values.fingerprint.nodes : values.fingerprint.edges,
            notes,
            budget,
            spend: (ops) => {
                budget.spend(target, ops);
            },
            columns: columns[target],
            ids: new Set(),
        };
        rules.push(
            ...planTarget(
                plan,
                out,
                allFeatures[target],
                new Set(options.rawColumns?.[target] ?? []),
                { set: toolSet, derived: defaults?.derived ?? [] },
                options.signal,
            ),
        );
    }
    const graph = graphStyles(defaults, values.graph ?? {});
    return {
        styles: {
            version: 1,
            source: {
                format: values.format,
                dialect: values.dialect ?? null,
                tool: defaults === null ? null : defaults.tool,
            },
            units: { length: units },
            graph: graph,
            rules,
            notes: notes.list(),
        },
        columns,
        features: allFeatures,
        fingerprint: values.fingerprint,
    };
}

/**
 * The tool's default values of a target, as one defaults rule sets them; a length in other units than the file's is
 * left out.
 * @param defaults - the tool's defaults
 * @param target - nodes or edges
 * @param units - the file's length units
 * @returns the values, or null when none applies
 */
function toolSetOf(
    defaults: NonNullable<ReturnType<typeof toolDefaults>>,
    target: StyleTarget,
    units: string,
): Record<string, StyleValue> | null {
    const toolSet: Record<string, StyleValue> = {};
    for (const [p, d] of Object.entries(defaults[target]) as [string, { value: unknown } | undefined][]) {
        const fits = d !== undefined && isStyleValue(target, p, d.value);
        if (fits && !(LENGTHS.has(p) && defaults.units !== units)) {
            toolSet[p] = d.value as StyleValue;
        }
    }
    return Object.keys(toolSet).length === 0 ? null : toolSet;
}

/**
 * The graph's styles: the tool's defaults, then the file's own values over them.
 * @param defaults - the tool's defaults, or null
 * @param given - the file's graph values
 * @returns the values
 */
function graphStyles(
    defaults: ReturnType<typeof toolDefaults> | null,
    given: Readonly<Record<string, unknown>>,
): Record<string, StyleValue> {
    const graph: Record<string, StyleValue> = {};
    const own = Object.entries(defaults?.graph ?? {}) as [string, { value: unknown } | undefined][];
    for (const [p, d] of own) {
        if (d !== undefined && isStyleValue("graph", p, d.value)) {
            graph[p] = d.value as StyleValue;
        }
    }
    for (const [p, v] of Object.entries(given)) {
        if (isStyleValue("graph", p, v)) {
            graph[p] = v as StyleValue;
        }
    }
    return graph;
}

/**
 * A rule id not used yet in this target.
 * @param plan - the target's state
 * @param base - the wanted id
 * @returns the id, suffixed when taken
 */
function uniqueId(plan: TargetPlan, base: string): string {
    let id = base;
    let k = 2;
    while (plan.ids.has(id)) {
        id = `${base}#${String(k)}`;
        k++;
    }
    plan.ids.add(id);
    return id;
}

/**
 * Sets one property's mapping of a rule, making the rule's mappings on first use.
 * @param rule - the rule, changed in place
 * @param property - the property
 * @param mapping - the mapping
 */
function setMapping(rule: Draft, property: string, mapping: Mapping): void {
    rule.map ??= {};
    rule.map[property] = mapping;
}

/**
 * The type-checked per-element values of a target: a value of the wrong kind is noted and dropped.
 * @param plan - the target's state
 * @param out - the reader's output
 * @returns the values per property that have at least one value
 */
function checkedTruth(plan: TargetPlan, out: ReaderOutput | undefined): Map<string, (StyleValue | null)[]> {
    const truth = new Map<string, (StyleValue | null)[]>();
    for (const [p, arr] of Object.entries<StyleColumn | undefined>(out?.values ?? {})) {
        if (arr === undefined) {
            continue;
        }
        if (!STYLE_PROPERTIES[plan.target].has(p) && !p.startsWith("graphty:")) {
            plan.notes.add(STYLE_ISSUE.NOT_CARRIED, plan.target, p, { sample: p });
            continue;
        }
        const vals = checkedValues(plan, p, arr);
        plan.spend(plan.n);
        if (vals.some((v) => v !== null)) {
            truth.set(p, vals);
        }
    }
    return truth;
}

/**
 * One property's values, a value of the wrong kind noted and dropped.
 * @param plan - the target's state
 * @param p - the property
 * @param arr - the reader's values
 * @returns the values, one per element
 */
function checkedValues(plan: TargetPlan, p: string, arr: StyleColumn): (StyleValue | null)[] {
    const vals = new Array<StyleValue | null>(plan.n).fill(null);
    for (let i = 0; i < plan.n && i < arr.length; i++) {
        const v = arr[i] ?? null;
        if (v !== null && isStyleValue(plan.target, p, v)) {
            vals[i] = v;
        } else if (v !== null) {
            plan.notes.add(STYLE_ISSUE.BAD_VALUE, plan.target, p, { sample: v, element: i });
        }
    }
    return vals;
}

/**
 * A copy of a property record without its undefined entries.
 * @param o - the record
 * @returns the copy, or undefined
 */
function defined<T>(o: Readonly<Record<string, T | undefined>> | undefined): Record<string, T> | undefined {
    if (o === undefined) {
        return undefined;
    }
    const out: Record<string, T> = {};
    for (const [k, v] of Object.entries(o)) {
        if (v !== undefined) {
            out[k] = v;
        }
    }
    return out;
}

/**
 * The properties a rule writes.
 * @param r - the rule
 * @returns the property names
 */
function writes(r: Draft | StyleRule): string[] {
    return [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})];
}

/**
 * The declared rules, with every predicate longer than a short one evaluated into a membership style column and
 * runs of rules that set values on every element merged into one defaults rule.
 * @param plan - the target's state
 * @param declared - the reader's rules
 * @param features - the features, for evaluating predicates over data columns
 * @returns the rules to keep
 */
function prepareDeclared(plan: TargetPlan, declared: readonly StyleRule[], features: readonly StyleFeature[]): Draft[] {
    const src = refSource(plan.target, plan.n, plan.columns, features);
    const drafts: Draft[] = [];
    for (const r of declared.filter((x) => x.target === plan.target)) {
        const d: Draft = { ...r, set: defined(r.set), map: defined(r.map) };
        if (d.set === undefined) {
            delete d.set;
        }
        if (d.map === undefined) {
            delete d.map;
        }
        if (!isShortPredicate(r.where)) {
            asMembership(plan, d, r, src);
        }
        drafts.push(d);
    }
    const merged = mergedDefaults(plan.target, drafts);
    for (const d of merged) {
        d.id = uniqueId(plan, d.id);
    }
    return merged;
}

/**
 * Evaluates a long predicate into a membership style column the rule selects instead.
 * @param plan - the target's state
 * @param d - the rule's draft, changed in place
 * @param r - the declared rule
 * @param src - the reference source
 */
function asMembership(plan: TargetPlan, d: Draft, r: StyleRule, src: ReturnType<typeof refSource>): void {
    let member = 1;
    while (plan.columns.has(`member.${String(member)}`)) {
        member++;
    }
    const key = `member.${String(member)}`;
    const col = new Array<StyleValue | null>(plan.n).fill(null);
    let count = 0;
    for (let i = 0; i < plan.n; i++) {
        if (matches(r.where, src, i)) {
            col[i] = true;
            count++;
        }
    }
    plan.spend(plan.n * 8);
    plan.columns.set(key, col);
    d.where = { has: { style: key } };
    d.facts = { ...r.facts, elements: count, reason: r.facts?.reason ?? "SELECTOR" };
    plan.notes.add(STYLE_ISSUE.SELECTOR_AS_COLUMN, plan.target, r.id, { count });
}

/**
 * Consecutive declared rules that select everything and only set values, as one defaults rule (later wins).
 * @param target - nodes or edges
 * @param drafts - the declared rules
 * @returns the rules, runs merged
 */
function mergedDefaults(target: StyleTarget, drafts: readonly Draft[]): Draft[] {
    const merged: Draft[] = [];
    const plain = (x: Draft): boolean => "all" in x.where && x.set !== undefined && x.map === undefined;
    let i = 0;
    while (i < drafts.length) {
        let j = i + 1;
        while (plain(drafts[i]) && j < drafts.length && plain(drafts[j])) {
            j++;
        }
        if (j - i >= 2) {
            merged.push({
                id: drafts[i].id,
                target,
                role: "defaults",
                origin: "declared",
                where: { all: true },
                set: Object.assign({}, ...drafts.slice(i, j).map((x) => x.set)) as Record<string, StyleValue>,
            });
        } else {
            merged.push(drafts[i]);
        }
        i = j;
    }
    return merged;
}

/** A passthrough on existing columns that explains a family. */
interface PassCandidate {
    readonly type: "passdata";
    readonly cols: ReadonlyMap<string, FeatureInfo>;
    readonly raw: boolean;
    readonly cost: number;
}

/** The floor: classes or a copy. */
interface OpaqueCandidate {
    readonly type: "opaque";
    readonly cost: number;
}

type Candidate = DiscreteCandidate | ContinuousCandidate | PassCandidate | OpaqueCandidate;
const ORDER = ["passdata", "discrete", "continuous", "opaque"];

/**
 * Tests a passthrough on existing data columns: one column per property whose canonical value equals the style on
 * every element.
 * @param plan - the target's state
 * @param fam - the family
 * @param truth - the values per property
 * @param infos - the features
 * @returns the candidate, or null
 */
function passCandidate(
    plan: TargetPlan,
    fam: Family,
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
    infos: readonly FeatureInfo[],
): PassCandidate | null {
    const cols = new Map<string, FeatureInfo>();
    for (const p of fam.props) {
        const canon = canonicalFor(plan.target, p);
        const isColor = STYLE_PROPERTIES[plan.target].get(p) === "color";
        const t = truth.get(p) ?? [];
        const hit = infos.find((f) => {
            if (!("data" in f.feature.ref)) {
                return false;
            }
            plan.spend(plan.n);
            for (let i = 0; i < plan.n; i++) {
                const raw = f.feature.values[i];
                // a color column is reused only when it already holds "#rrggbb": other spellings read differently
                if (isColor && raw !== null && !(typeof raw === "string" && /^#[0-9a-fA-F]{6}$/.test(raw))) {
                    return false;
                }
                if ((raw === null ? null : canon(raw)) !== t[i]) {
                    return false;
                }
            }
            return true;
        });
        if (hit === undefined) {
            return null;
        }
        cols.set(p, hit);
    }
    const raw = Array.from(cols.values()).some((f) => f.raw);
    // a passthrough on the raw style column itself recovers nothing: nearly as opaque as a copy
    return { type: "passdata", cols, raw, cost: raw ? 240 : 50 };
}

/**
 * Plans one target.
 * @param plan - the target's state
 * @param out - the reader's output
 * @param features - the candidate features
 * @param rawNames - the data columns the values were read from
 * @param tool - the tool's default values (or null) and its defaults that are rules
 * @param tool.set - the tool's default values, or null
 * @param tool.derived - the tool's defaults that are rules
 * @param signal - cancels the planning
 * @returns the target's rules, bottom to top
 */
function planTarget(
    plan: TargetPlan,
    out: ReaderOutput | undefined,
    features: readonly StyleFeature[],
    rawNames: ReadonlySet<string>,
    tool: { readonly set: Record<string, StyleValue> | null; readonly derived: readonly ToolDerivedDefault[] },
    signal: AbortSignal | undefined,
): StyleRule[] {
    const { target, n } = plan;
    const toolSet = tool.set;
    for (const [k, v] of out?.columns ?? []) {
        plan.columns.set(k, v);
    }
    const truth = checkedTruth(plan, out);
    const toolRule: Draft[] =
        toolSet === null
            ? []
            : [
                  {
                      id: uniqueId(plan, `${target}.tool`),
                      target,
                      role: "defaults",
                      origin: "tool",
                      where: { all: true },
                      set: toolSet,
                  },
              ];
    toolRule.push(...derivedRules(plan, tool.derived, features, out?.rules ?? [], truth));
    const declared = prepareDeclared(plan, out?.rules ?? [], features);
    const declaredProps = new Set(declared.flatMap(writes));

    const { defaults, rest } = splitDefaults(n, truth, declaredProps);
    plan.spend(n * truth.size);
    const inferred: Draft[] = [];
    if (Object.keys(defaults).length > 0) {
        inferred.push({
            id: uniqueId(plan, `${target}.defaults`),
            target,
            role: "defaults",
            origin: "inferred",
            where: { all: true },
            set: defaults,
        });
    }

    const families = familiesOf(rest);
    plan.spend(n * rest.length);
    const infos = features
        .map((f) => describeFeature(f, "data" in f.ref && rawNames.has(f.ref.data)))
        .sort((a, b) => a.distinct - b.distinct);
    plan.spend(n * features.length);
    const testable = infos.filter((f) => f.categorical || f.numeric).slice(0, MAX_FEATURES);

    const groups: Draft[] = [];
    const mappings = new Map<string, Draft>();
    const passData: Draft = {
        id: `${target}.passthrough`,
        target,
        role: "passthrough",
        origin: "inferred",
        where: { all: true },
        map: {},
    };
    const passRaw: Draft = {
        id: `${target}.passthrough.raw`,
        target,
        role: "passthrough",
        origin: "inferred",
        where: { all: true },
        map: {},
        facts: { reason: "NO_EXPLANATION" },
    };
    const copy: Draft = {
        id: `${target}.copy`,
        target,
        role: "passthrough",
        origin: "inferred",
        where: { all: true },
        map: {},
        facts: { reason: "NO_EXPLANATION" },
    };
    const opaque: { fam: Family; raw: ReadonlyMap<string, FeatureInfo> | null }[] = [];
    const tolerated = new Map<string, Set<number>>();
    let budgetHit = 0;

    const st: Inference = { groups, mappings, passData, passRaw, copy, opaque, tolerated };
    for (const fam of families) {
        signal?.throwIfAborted();
        if (plan.budget.exhausted(target)) {
            budgetHit++;
            opaque.push({ fam, raw: null });
            continue;
        }
        applyChoice(plan, st, fam, chooseCandidate(plan, fam, testable, infos, truth), truth);
    }
    if (budgetHit > 0) {
        plan.notes.add(STYLE_ISSUE.BUDGET, target, null, { count: budgetHit });
    }
    poolOpaque(plan, st, budgetHit, truth);

    const nonEmpty = (r: Draft): boolean => Object.keys(r.map ?? {}).length > 0;
    const sortedMappings = Array.from(mappings.values()).sort((a, b) => compareText(a.id, b.id));
    const drafts: Draft[] = [
        ...toolRule,
        ...declared,
        ...inferred,
        ...groups,
        ...sortedMappings,
        ...[passData, passRaw, copy].filter(nonEmpty),
    ];
    for (const d of drafts.slice(toolRule.length + declared.length + inferred.length)) {
        d.id = uniqueId(plan, d.id);
    }

    const src = refSource(target, n, plan.columns, features);
    enforceCap(plan, drafts, truth, src);
    const exceptions = replay(plan, drafts, truth, toolSet, tolerated, src);
    if (exceptions !== null) {
        drafts.push(exceptions);
    }
    return drafts.map(finish);
}

/**
 * The tool's defaults that are rules, for those the planner can state over the graph's own columns: a label from a
 * column (Cytoscape's `name`, sigma's and vis-network's `label`) on every node that has a value there, when the reader
 * gives no node a label. A default a reader already states with a tool rule of its own (Graphviz's `\N`, Gephi's
 * source color), or a property the reader gives values for, is the reader's.
 * @param plan - the target's state
 * @param derived - the tool's defaults that are rules
 * @param features - the candidate features, which hold the data columns' values
 * @param given - the reader's rules
 * @param truth - the reader's values per property
 * @returns the rules, bottom to top
 */
function derivedRules(
    plan: TargetPlan,
    derived: readonly ToolDerivedDefault[],
    features: readonly StyleFeature[],
    given: readonly StyleRule[],
    truth: ReadonlyMap<string, unknown>,
): Draft[] {
    const stated = new Set([...given.filter((r) => r.origin === "tool").flatMap(writes), ...truth.keys()]);
    const out: Draft[] = [];
    for (const d of derived) {
        if (plan.target !== "node" || d.kind !== "labelFromColumn" || stated.has("label")) {
            continue;
        }
        const { column } = d;
        const feature = features.find((f) => "data" in f.ref && f.ref.data === column);
        if (feature?.values.some((v) => v !== null && v !== "") !== true) {
            continue;
        }
        stated.add("label");
        out.push({
            id: uniqueId(plan, "node.tool.label"),
            target: "node",
            role: "passthrough",
            origin: "tool",
            where: { has: { data: column } },
            map: { label: { kind: "passthrough", by: { data: column } } },
            facts: { reason: "NODE_NAME" },
        });
    }
    return out;
}

/**
 * The inferred defaults: each property non-null and equal on every element; the others are left to explain. A
 * property a declared rule writes is the declared rule's.
 * @param n - the element count
 * @param truth - the values per property
 * @param declaredProps - the properties the declared rules write
 * @returns the defaults, and the properties left
 */
function splitDefaults(
    n: number,
    truth: ReadonlyMap<string, (StyleValue | null)[]>,
    declaredProps: ReadonlySet<string>,
): { defaults: Record<string, StyleValue>; rest: [string, (StyleValue | null)[]][] } {
    const defaults: Record<string, StyleValue> = {};
    const rest: [string, (StyleValue | null)[]][] = [];
    for (const [p, a] of truth) {
        const first = a[0];
        if (declaredProps.has(p)) {
            continue;
        }
        if (n > 0 && first !== null && a.every((v) => v === first)) {
            defaults[p] = first;
        } else {
            rest.push([p, a]);
        }
    }
    return { defaults, rest };
}

/** What the inference of one target collects. */
interface Inference {
    readonly groups: Draft[];
    readonly mappings: Map<string, Draft>;
    readonly passData: Draft;
    readonly passRaw: Draft;
    readonly copy: Draft;
    readonly opaque: { fam: Family; raw: ReadonlyMap<string, FeatureInfo> | null }[];
    readonly tolerated: Map<string, Set<number>>;
}

/**
 * The cheapest explanation of one family: a discrete or continuous mapping over a feature, a passthrough over existing
 * columns, or the opaque floor.
 * @param plan - the target's state
 * @param fam - the family
 * @param testable - the features worth testing
 * @param infos - every feature
 * @param truth - the values per property
 * @returns the chosen candidate
 */
function chooseCandidate(
    plan: TargetPlan,
    fam: Family,
    testable: readonly FeatureInfo[],
    infos: readonly FeatureInfo[],
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
): Candidate {
    const { target, n } = plan;
    const cands: Candidate[] = [];
    // text is per element by nature: a label is never explained by another column's table
    const textual = fam.props.some((p) => STYLE_PROPERTIES[target].get(p) === "text");
    if (!textual) {
        for (const f of testable) {
            const d = discreteCandidate(fam, f, n, plan.spend);
            if (d !== null) {
                cands.push(d);
            }
            const c = continuousCandidate(fam, f, truth, plan.spend);
            if (c !== null) {
                cands.push(c);
            }
            if (plan.budget.exhausted(target)) {
                break;
            }
        }
    }
    const pass = passCandidate(plan, fam, truth, infos);
    if (pass !== null) {
        cands.push(pass);
    }
    cands.push({ type: "opaque", cost: 250 });
    cands.sort((a, b) => a.cost - b.cost || ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
    return cands[0];
}

/**
 * Records a family's chosen explanation in the target's inference.
 * @param plan - the target's state
 * @param st - the inference so far; changed in place
 * @param fam - the family
 * @param c - the chosen candidate
 * @param truth - the values per property
 */
function applyChoice(
    plan: TargetPlan,
    st: Inference,
    fam: Family,
    c: Candidate,
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
): void {
    if (c.type === "discrete") {
        applyDiscrete(plan, st, fam, c, truth);
    } else if (c.type === "continuous") {
        applyContinuous(plan, st, fam, c, truth);
    } else if (c.type === "passdata" && !c.raw) {
        for (const p of fam.props) {
            setMapping(st.passData, p, { kind: "passthrough", by: (c.cols.get(p) as FeatureInfo).feature.ref });
        }
    } else {
        // the raw style column recovers nothing: the family joins the opaque pool, where it may become part
        // of a style class, and otherwise reads the raw column
        st.opaque.push({ fam, raw: c.type === "passdata" ? c.cols : null });
    }
}

/**
 * The mapping rule of a feature, made on first use; one rule holds every family the feature explains.
 * @param plan - the target's state
 * @param st - the inference so far; changed in place
 * @param key - the rule's key among the mappings
 * @param id - its id
 * @returns the rule
 */
function mappingRule(plan: TargetPlan, st: Inference, key: string, id: string): Draft {
    let r = st.mappings.get(key);
    if (r === undefined) {
        r = { id, target: plan.target, role: "mapping", origin: "inferred", where: { all: true }, map: {} };
        st.mappings.set(key, r);
    }
    return r;
}

/**
 * Makes a feature computed for the inference (a style column) a column of the styles.
 * @param plan - the target's state
 * @param info - the feature
 */
function materialize(plan: TargetPlan, info: FeatureInfo): void {
    if ("style" in info.feature.ref) {
        plan.columns.set(info.feature.ref.style, info.feature.values);
    }
}

/**
 * Records a discrete mapping: one table per property, and a group for the elements the feature gives no value.
 * @param plan - the target's state
 * @param st - the inference so far; changed in place
 * @param fam - the family
 * @param c - the candidate
 * @param truth - the values per property
 */
function applyDiscrete(
    plan: TargetPlan,
    st: Inference,
    fam: Family,
    c: DiscreteCandidate,
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
): void {
    const { target } = plan;
    materialize(plan, c.info);
    const rule = mappingRule(plan, st, `discrete|${c.info.name}`, `${target}.by.${c.info.name}`);
    // the first element of each block stands for the block
    const rep = new Map<number, number>();
    for (const i of fam.styled) {
        if (!rep.has(fam.blocks[i])) {
            rep.set(fam.blocks[i], i);
        }
    }
    for (const p of fam.props) {
        const t = truth.get(p) ?? [];
        const table = Array.from(c.table.values(), ({ raw, block }): [string | number | boolean, StyleValue] => [
            raw,
            t[rep.get(block) ?? -1] as StyleValue,
        ]);
        setMapping(rule, p, { kind: "discrete", by: c.info.feature.ref, table });
    }
    if (c.bucket === null) {
        return;
    }
    const set: Record<string, StyleValue> = {};
    for (const p of fam.props) {
        set[p] = (truth.get(p) ?? [])[rep.get(c.bucket) ?? -1] as StyleValue;
    }
    st.groups.push({
        id: `${target}.missing.${c.info.name}`,
        target,
        role: "group",
        origin: "inferred",
        where: { not: { has: c.info.feature.ref } },
        set,
    });
}

/**
 * Records a continuous mapping: one ramp per property; a ramp that matches only within the tool's rounding tolerates
 * those elements, noted.
 * @param plan - the target's state
 * @param st - the inference so far; changed in place
 * @param fam - the family
 * @param c - the candidate
 * @param truth - the values per property
 */
function applyContinuous(
    plan: TargetPlan,
    st: Inference,
    fam: Family,
    c: ContinuousCandidate,
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
): void {
    const { target } = plan;
    materialize(plan, c.info);
    const rule = mappingRule(plan, st, `continuous|${c.info.name}`, `${target}.ramp.${c.info.name}`);
    for (const p of fam.props) {
        const points = c.points.get(p) ?? [];
        setMapping(rule, p, { kind: "continuous", by: c.info.feature.ref, points });
        if (!c.tolerant) {
            continue;
        }
        const t = truth.get(p) ?? [];
        const set = new Set<number>();
        for (const i of fam.styled) {
            if (evalContinuous(points, numberOf(c.info.feature.values[i])) !== t[i]) {
                set.add(i);
                plan.notes.add(STYLE_ISSUE.RAMP_ROUNDED, target, p, { element: i, sample: t[i] });
            }
        }
        st.tolerated.set(p, set);
    }
}

/**
 * The opaque pool: style classes when the file uses few combinations, else one copy per property.
 * @param plan - the target's state
 * @param st - the inference so far; changed in place
 * @param budgetHit - how many families the budget sent to the pool
 * @param truth - the values per property
 */
function poolOpaque(
    plan: TargetPlan,
    st: Inference,
    budgetHit: number,
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
): void {
    const { target, n } = plan;
    if (st.opaque.length === 0) {
        return;
    }
    const props = st.opaque.flatMap((o) => o.fam.props);
    const classes = budgetHit > 0 ? null : styleClasses(target, props, truth, n, plan.spend);
    const classed = new Set(classes?.classed ?? []);
    if (classes !== null) {
        addClassRules(plan, st, classes);
    }
    let distinct = 0;
    for (const { fam, raw } of st.opaque) {
        for (const p of fam.props.filter((x) => !classed.has(x))) {
            const viaRaw = raw?.get(p);
            if (viaRaw === undefined) {
                distinct = Math.max(distinct, copyProperty(plan, st.copy, p, truth.get(p) ?? []));
            } else {
                setMapping(st.passRaw, p, { kind: "passthrough", by: viaRaw.feature.ref });
            }
        }
    }
    st.copy.facts = { reason: budgetHit > 0 ? "BUDGET" : "NO_EXPLANATION", distinctValues: distinct };
}

/**
 * Adds the style classes' column and rules.
 * @param plan - the target's state
 * @param st - the inference so far; changed in place
 * @param classes - the style classes
 */
function addClassRules(plan: TargetPlan, st: Inference, classes: NonNullable<ReturnType<typeof styleClasses>>): void {
    plan.columns.set(CLASS_COLUMN, classes.column);
    for (const r of classes.rules) {
        if (r.role === "group") {
            st.groups.push({ ...r, id: r.id, set: { ...r.set } } as Draft);
        } else {
            st.mappings.set(r.id, { ...r, map: { ...r.map } } as Draft);
        }
    }
}

/**
 * Copies a property's values into a style column the copy rule passes through.
 * @param plan - the target's state
 * @param copy - the copy rule, changed in place
 * @param p - the property
 * @param t - its values
 * @returns how many distinct values it holds
 */
function copyProperty(plan: TargetPlan, copy: Draft, p: string, t: readonly (StyleValue | null)[]): number {
    plan.columns.set(`copy.${p}`, t.slice());
    setMapping(copy, p, { kind: "passthrough", by: { style: `copy.${p}` } });
    plan.spend(plan.n);
    return new Set(t.filter((v) => v !== null)).size;
}

/**
 * The rule as a plain JSON-stable object.
 * @param d - the draft
 * @returns the rule
 */
function finish(d: Draft): StyleRule {
    const r: Record<string, unknown> = { id: d.id, target: d.target, role: d.role, origin: d.origin, where: d.where };
    if (d.set !== undefined && Object.keys(d.set).length > 0) {
        r.set = d.set;
    }
    if (d.map !== undefined && Object.keys(d.map).length > 0) {
        r.map = d.map;
    }
    if (d.facts !== undefined) {
        r.facts = Object.fromEntries(Object.entries(d.facts).filter(([, v]) => v !== undefined));
    }
    if (d.ext !== undefined) {
        r.ext = d.ext;
    }
    return r as unknown as StyleRule;
}

/**
 * Compares two texts by code unit, the same everywhere.
 * @param a - one text
 * @param b - the other
 * @returns negative, zero or positive
 */
function compareText(a: string, b: string): number {
    if (a === b) {
        return 0;
    }
    return a < b ? -1 : 1;
}

/**
 * The entries a person would edit in a rule.
 * @param r - the rule
 * @returns its size
 */
function ruleSize(r: Draft): number {
    let size = Object.keys(r.set ?? {}).length;
    for (const m of Object.values(r.map ?? {})) {
        if (m.kind === "discrete") {
            size += m.table.length;
        } else if (m.kind === "continuous") {
            size += m.points.length;
        } else {
            size += 1;
        }
    }
    return size;
}

/** The order in which rules are folded into the copy: inferred first, the tool's defaults last. */
const FOLD_ORDER: Readonly<Record<string, number>> = { inferred: 0, declared: 1, tool: 2 };

/**
 * Keeps at most 15 rules (the exceptions rule makes 16) by moving the least readable rules into the copy, with each
 * property's values as they resolved: exact, never a silent delete.
 * @param plan - the target's state
 * @param drafts - the rules, bottom to top; changed in place
 * @param truth - the file's values per property
 * @param src - the reference source
 */
function enforceCap(
    plan: TargetPlan,
    drafts: Draft[],
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
    src: ReturnType<typeof refSource>,
): void {
    const cap = MAX_STYLE_RULES - 1;
    const copyId = `${plan.target}.copy`;
    let folded = 0;
    while (drafts.length > cap) {
        const cands = drafts.filter((r) => r.id !== copyId);
        if (cands.length === 0) {
            break;
        }
        // the tool's defaults (its rule over every element) go last of the tool's rules: the copy holds only the
        // file's own values, so folding them would leave every element the file does not style with no value at all
        const everyone = (r: Draft): number => (r.origin === "tool" && "all" in r.where ? 1 : 0);
        cands.sort((a, b) => {
            const pa = a.role === "passthrough" ? 1 : 0;
            const pb = b.role === "passthrough" ? 1 : 0;
            return (
                pa - pb ||
                (FOLD_ORDER[a.origin] ?? 1) - (FOLD_ORDER[b.origin] ?? 1) ||
                everyone(a) - everyone(b) ||
                ruleSize(b) - ruleSize(a) ||
                drafts.indexOf(b) - drafts.indexOf(a)
            );
        });
        const victim = cands[0];
        const before = drafts.map(finish);
        drafts.splice(drafts.indexOf(victim), 1);
        let copy = drafts.find((r) => r.id === copyId);
        if (copy === undefined) {
            copy = {
                id: copyId,
                target: plan.target,
                role: "passthrough",
                origin: "inferred",
                where: { all: true },
                map: {},
            };
            plan.ids.add(copyId);
        } else {
            drafts.splice(drafts.indexOf(copy), 1);
        }
        for (const p of new Set(writes(victim))) {
            // the property's values as the whole stack resolved them, supplied on top for every element
            const t = truth.get(p);
            const vals = t === undefined ? resolveRules(before, plan.target, p, src, plan.budget) : t.slice();
            plan.columns.set(`copy.${p}`, vals);
            setMapping(copy, p, { kind: "passthrough", by: { style: `copy.${p}` } });
        }
        copy.facts = { ...copy.facts, reason: "LAYER_CAP" };
        drafts.push(copy);
        folded++;
    }
    if (folded > 0) {
        plan.notes.add(STYLE_ISSUE.LAYER_CAP, plan.target, null, { count: folded });
    }
}

/**
 * The elements whose resolved value is not the one wanted, with the wanted value; none where nothing is wanted, and
 * none where a ramp is tolerated within the tool's rounding.
 * @param n - the element count
 * @param got - the resolved values
 * @param want - the value wanted for an element, or null for none
 * @param tolerated - the elements a ramp matches only within the tool's rounding
 * @returns the wanted values where they differ, or null when none does
 */
function differences(
    n: number,
    got: readonly (StyleValue | null)[],
    want: (i: number) => StyleValue | null,
    tolerated: ReadonlySet<number> | undefined,
): (StyleValue | null)[] | null {
    let col: (StyleValue | null)[] | null = null;
    for (let i = 0; i < n; i++) {
        const w = want(i);
        const differs = w !== null && got[i] !== w && !(tolerated?.has(i) === true && within(got[i], w));
        if (differs) {
            col ??= new Array<StyleValue | null>(n).fill(null);
            col[i] = w;
        }
    }
    return col;
}

/**
 * The replay: resolves every property the file gives and compares it with the file's value, or the tool's default
 * where the file gives none. Each difference goes into one sparse exceptions column per property.
 * @param plan - the target's state
 * @param drafts - the rules, bottom to top
 * @param truth - the file's values per property
 * @param toolSet - the tool's default values, or null
 * @param tolerated - per property, the elements a ramp matches only within the tool's rounding
 * @param src - the reference source
 * @returns the exceptions rule, or null when nothing differs
 */
function replay(
    plan: TargetPlan,
    drafts: readonly Draft[],
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
    toolSet: Record<string, StyleValue> | null,
    tolerated: ReadonlyMap<string, ReadonlySet<number>>,
    src: ReturnType<typeof refSource>,
): Draft | null {
    const rules = drafts.map(finish);
    // where the file gives no value, the tool draws its default: its constants, and where a reader adds tool rules
    // of its own (Graphviz's target arrow on directed edges), what those rules give over the constants
    const toolRules = rules.filter((r) => r.origin === "tool");
    const ownToolRules = toolRules.length > (toolSet === null ? 0 : 1);
    const map: Record<string, Mapping> = {};
    for (const [p, t] of truth) {
        const got = resolveRules(rules, plan.target, p, src, plan.budget);
        const perElement = ownToolRules ? resolveRules(toolRules, plan.target, p, src, plan.budget) : null;
        const constant = toolSet?.[p] ?? null;
        const want = (i: number): StyleValue | null => t[i] ?? (perElement === null ? constant : perElement[i]);
        const col = differences(plan.n, got, want, tolerated.get(p));
        if (col !== null) {
            plan.columns.set(`exceptions.${p}`, col);
            map[p] = { kind: "passthrough", by: { style: `exceptions.${p}` } };
        }
    }
    if (Object.keys(map).length === 0) {
        return null;
    }
    return {
        id: uniqueId(plan, `${plan.target}.exceptions`),
        target: plan.target,
        role: "exceptions",
        origin: "inferred",
        where: { all: true },
        map,
    };
}
