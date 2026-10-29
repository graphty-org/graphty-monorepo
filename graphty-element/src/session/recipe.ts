/**
 * @file The recipe: what was done to the data and how it is drawn, as a document that names
 * columns by name and role and never names a node or an edge, so it can be read against another
 * dataset with the same columns.
 *
 * It is read from the session's state, not from the journal: an undone step is not in it. What a
 * recipe cannot carry without naming elements -- a filter leaf that names seed nodes, a style layer
 * painting a list of ids -- is left out and counted in `leftOut`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type {
    AttributeRole,
    AttributeType,
    FilterCondition,
    FilterStep,
    FormatId,
    LayerSpec,
    Measurement,
    RuleTree,
    Scope,
    Selector,
    SourceKey,
} from "../catalog/types";
import type { IssueCode } from "./issues";
import type { CodedFact, ColumnRef } from "./shared";
import type { StyleFileDocument } from "./styles/StylesApi";
import type { GraphSession, JoinChoices, JoinShape, LoadedSourceKind } from "./types";

/** One loaded source, as a recipe lists it. */
export interface RecipeSource {
    /** Its key, as `data.sources()` lists it. */
    readonly key: SourceKey;
    readonly kind: LoadedSourceKind;
    /** The format that read it. */
    readonly format?: FormatId;
    /** What the reader calls the data. */
    readonly name?: string;
    /** The tables it read, by name. */
    readonly tables: readonly string[];
    /** What each table held. */
    readonly tableRows?: readonly ("nodes" | "edges")[];
    /** For a joined table: the load it was joined onto. */
    readonly joinedOnto?: SourceKey;
}

/** One column, as a recipe lists it: its name, roles, type and what was said about it. */
export interface RecipeColumn {
    readonly kind: "node" | "edge";
    readonly name: string;
    readonly type: AttributeType;
    readonly roles?: readonly AttributeRole[];
    /** What it measures, when someone declared it. */
    readonly measurement?: Measurement;
    readonly hidden?: true;
}

/** One join, as a recipe lists it: its keys and choices, not its rows. */
export interface RecipeJoin {
    readonly source: SourceKey;
    readonly onto: SourceKey | null;
    readonly shape: JoinShape;
    readonly choices: JoinChoices;
}

/** An ignored data issue, by what it is about. */
export interface RecipeIgnoredIssue {
    readonly code: IssueCode;
    readonly column?: ColumnRef;
    readonly source?: SourceKey;
}

/**
 * Why a part of the session is not in a recipe: it names nodes or edges. `part` is `"filter"`,
 * `"filter-step"`, `"filter-condition"` (since 3.32.0; an exclude condition that loses a leaf is
 * left out whole) or `"style"`, and `count` how many leaves or layers were left out.
 */
export type RecipeLeftOutCode = "names-elements";

/** The recipe: `session.recipe()`. Plain, frozen data; `JSON.stringify` writes it whole. */
export interface RecipeDocument {
    readonly kind: "graphty-recipe";
    readonly version: 1;
    /** What was loaded, oldest first. */
    readonly sources: readonly RecipeSource[];
    /** The data columns (not results), node columns first. */
    readonly columns: readonly RecipeColumn[];
    /** The joins, as `data.joins()` lists them, without their rows. */
    readonly joins: readonly RecipeJoin[];
    /** The data issues ignored. */
    readonly ignoredIssues: readonly RecipeIgnoredIssue[];
    /**
     * The visibility filter, its steps, and the filter conditions (`conditions`, since 3.32.0; the
     * steps are their keep and exclude half).
     */
    readonly filter: {
        readonly rule: RuleTree | null;
        readonly steps: readonly FilterStep[];
        readonly conditions?: readonly FilterCondition[];
    };
    /** The style layers, as `styles.toFile()` writes them. */
    readonly styles: StyleFileDocument;
    /** What was left out because it names nodes or edges. */
    readonly leftOut: readonly CodedFact<RecipeLeftOutCode>[];
}

/**
 * Whether a scope names elements one by one.
 * @param scope - The scope.
 * @returns True for a node list or an inline fixed or path set.
 */
function namesElements(scope: Scope): boolean {
    return typeof scope === "object" && ("nodes" in scope || ("define" in scope && scope.define.kind !== "rule"));
}

/**
 * A rule tree without the leaves that name elements.
 * @param rule - The rule.
 * @param dropped - Counts the leaves left out.
 * @param dropped.count - The count so far.
 * @returns The rule, or null when nothing is left.
 */
function scrubRule(rule: RuleTree, dropped: { count: number }): RuleTree | null {
    switch (rule.kind) {
        case "neighborhood":
            dropped.count++;
            return null;
        case "member":
            if (namesElements(rule.of)) {
                dropped.count++;
                return null;
            }

            return rule;
        case "all":
        case "any": {
            const of = rule.of.flatMap((each) => scrubRule(each, dropped) ?? []);
            return of.length === 0 && rule.of.length > 0 ? null : { kind: rule.kind, of };
        }
        case "not": {
            const of = scrubRule(rule.of, dropped);
            return of === null ? null : { kind: "not", of };
        }
        default:
            return rule;
    }
}

/**
 * Whether a layer's selector names elements.
 * @param selector - The selector.
 * @returns True for an id list or a member of a scope that names elements.
 */
function selectsByIds(selector: Selector): boolean {
    return selector.match === "ids" || (selector.match === "member" && namesElements(selector.of));
}

/**
 * A layer as a recipe keeps it: a run's layer loses its `source`, whose parameters can name nodes.
 * @param layer - The layer.
 * @returns The layer.
 */
function recipeLayer(layer: LayerSpec): LayerSpec {
    if (layer.source?.by !== "run") {
        return layer;
    }

    const { source: _source, ...rest } = layer;
    return rest;
}

/**
 * The session's recipe.
 * @param session - The session.
 * @returns The recipe.
 */
export function recipeOf(session: GraphSession): RecipeDocument {
    const leftOut: CodedFact<RecipeLeftOutCode>[] = [];
    const note = (part: string, count: number): void => {
        if (count > 0) {
            leftOut.push({ code: "names-elements", params: { part, count } });
        }
    };

    const sources = session.data.sources().map((source): RecipeSource => ({
        key: source.key,
        kind: source.kind,
        ...(source.type === undefined ? {} : { format: source.type }),
        ...(source.name === undefined ? {} : { name: source.name }),
        tables: source.tables,
        ...(source.tableRows === undefined ? {} : { tableRows: source.tableRows }),
        ...(source.joinedOnto === undefined ? {} : { joinedOnto: source.joinedOnto }),
    }));

    // Sample values and counts describe this dataset's elements, not what was done to it.
    const columns = session.data
        .attributes()
        .filter((column) => column.origin === "imported" || column.origin === "joined")
        .map((column): RecipeColumn => ({
            kind: column.kind,
            name: column.name,
            type: column.type,
            ...(column.roles === undefined || column.roles.length === 0 ? {} : { roles: column.roles }),
            ...(column.measurement === undefined || column.measurementSource !== "declared"
                ? {}
                : { measurement: column.measurement }),
            ...("hidden" in column && column.hidden === true ? { hidden: true as const } : {}),
        }));

    const joins = session.data.joins().map((join): RecipeJoin => ({
        source: join.source,
        onto: join.onto,
        shape: join.shape,
        choices: join.choices,
    }));

    const ignoredIssues = session.data
        .issues({ includeIgnored: true })
        .filter((issue) => issue.ignored)
        .map((issue): RecipeIgnoredIssue => ({
            code: issue.code,
            ...(issue.column === undefined ? {} : { column: issue.column }),
            ...(issue.source === undefined ? {} : { source: issue.source }),
        }));

    const ruleDropped = { count: 0 };
    const rule = session.visibility.filter === null ? null : scrubRule(session.visibility.filter, ruleDropped);
    note("filter", ruleDropped.count);
    const stepDropped = { count: 0 };
    const steps = session.visibility.steps.flatMap((step) => {
        const scrubbed = scrubRule(step.rule, stepDropped);
        return scrubbed === null ? [] : [{ ...step, rule: scrubbed }];
    });
    note("filter-step", stepDropped.count);
    // A part dropped from an exclude condition would widen what it hides, so the whole condition
    // goes; keep and select conditions lose only the part.
    const conditionDropped = { count: 0 };
    const conditions = session.visibility.conditions.flatMap((condition) => {
        const dropped = { count: 0 };
        const scrubbed = scrubRule(condition.rule, dropped);
        conditionDropped.count += dropped.count;
        return scrubbed === null || (condition.effect === "exclude" && dropped.count > 0)
            ? []
            : [{ ...condition, rule: scrubbed }];
    });
    note("filter-condition", conditionDropped.count);

    const file = session.styles.toFile();
    const layers = file.layers.filter((layer) => !selectsByIds(layer.selector)).map(recipeLayer);
    note("style", file.layers.length - layers.length);

    return deepFreeze({
        kind: "graphty-recipe",
        version: 1,
        sources,
        columns,
        joins,
        ignoredIssues,
        filter: { rule, steps, ...(conditions.length === 0 ? {} : { conditions }) },
        styles: { ...file, layers },
        leftOut,
    });
}

/**
 * Freeze a plain value and everything in it.
 * @param value - The value.
 * @returns The same value, frozen.
 */
function deepFreeze<T>(value: T): T {
    if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const each of Object.values(value)) {
            deepFreeze(each);
        }
    }

    return value;
}
