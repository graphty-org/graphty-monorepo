/**
 * @file The `recipe` section codec, version 2: the replayable analysis steps (spec 4.3).
 * Experimental (`save-files-v2`).
 *
 * A recipe opened from a file is kept and written back as read (spec 8.1 rule 5); it is applied to
 * the data only when the caller asks (spec 8.2 rule 4), by replaying the commands in order through
 * the open's transaction. Otherwise, or when the saver asks, it is written from the session's
 * state: the exact filter steps as `graph.filter`, the rule sets that name no element as
 * `set.define`, each finished run a recipe can hold as `algo.run`, and the layout as `layout.set`.
 * What names an element stays out, reported, for the view to hold.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { AlgorithmDescriptor, RunId, Scope, ScopeInput, SetDefinitionInput } from "../../../catalog/types";
import { isGraphtyError } from "../../../errors";
import type { Run, RunStyle } from "../../runs/types";
import type { ElementSet } from "../../sets/types";
import type { GraphSession } from "../../types";
import { projectMemory } from "../memory";
import type {
    DocumentProblem,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    SectionHeaderInput,
    SectionWrite,
    WriteContext,
} from "../types";
import { loadedLooksAsColumns } from "./dataRefs";
import {
    asName,
    columnSchema,
    columnsRead,
    COMMAND_MEMBERS,
    filterCommands,
    filterRule,
    isNamespace,
    isObject,
    isRunName,
    namespaceFromId,
    renameRuns,
    ruleNamesElements,
    runsRead,
    scopeNamesElements,
    sourcesRead,
    splitRunId,
    STYLE_PARTS,
    unknownMember,
    unknownScopeMember,
} from "./recipeCommands";
import { markRecipeRun, restoredPositions } from "./results";
import { fileIdsOf, fileSetId } from "./viewParts";

/** The header members of an opened recipe that the session has no home for, kept for its re-save. */
const IDENTITY = ["id", "name", "description", "authors", "license", "keywords", "language", "origin"];

/** The recipe section a session last opened, as read: written back unless the saver asks otherwise. */
const opened = projectMemory<{ readonly header: SectionHeaderInput; readonly body: JsonObject }>();

/** The option types whose values name elements (recipe.md, "Commands" rule 4). */
const ELEMENT_OPTIONS = new Set(["node-id", "node-set", "ordering"]);

/**
 * Report something that names an element and so stays out of the recipe.
 * @param problems - The save's report.
 * @param params - What stayed out.
 */
function leftOut(problems: DocumentProblem[], params: Readonly<Record<string, string>>): void {
    problems.push({
        code: "W_ELEMENT_NAMING_LEFT_OUT",
        params: { section: "recipe", pointer: "/commands", ...params },
    });
}

/**
 * Whether a kept set's definition names an element.
 * @param set - The set, or undefined for one the session does not hold.
 * @param sets - Every set, for a rule naming another.
 * @returns True for a fixed or path set, or a rule set whose rule names one.
 */
function setNamesElements(set: ElementSet | undefined, sets: ReadonlyMap<string, ElementSet>): boolean {
    if (set === undefined) {
        return true;
    }

    const { definition } = set;
    return (
        definition.kind !== "rule" ||
        ruleNamesElements(definition.where, (id) => id === set.id || setNamesElements(sets.get(id), sets))
    );
}

/** What the writer gathers before it orders the commands. */
interface Gathered {
    readonly filters: JsonObject[];
    /** Whether the visible graph is narrowed by anything a recipe does not hold. */
    readonly narrowed: boolean;
}

/**
 * The exact filter steps as `graph.filter` commands, and whether anything else narrows.
 * @param session - The session.
 * @param problems - The save's report.
 * @param namesSet - Whether a kept set names elements.
 * @returns The commands and the rest.
 */
function gatherFilters(
    session: GraphSession,
    problems: DocumentProblem[],
    namesSet: (id: string) => boolean,
): Gathered {
    const { visibility } = session;
    // The steps are the keep and exclude conditions; an exclude one reads as a `not`, never exact.
    let narrowed = visibility.filter !== null || visibility.window !== null || session.hidden.ids.size > 0;
    const filters: JsonObject[] = [];
    for (const step of visibility.steps) {
        if (!step.on) {
            continue;
        }

        const exact = filterCommands(step.rule);
        if (exact === undefined) {
            narrowed = true;
            if (ruleNamesElements(step.rule, namesSet)) {
                leftOut(problems, { step: step.id });
            }
        } else {
            filters.push(...exact);
        }
    }

    return { filters, narrowed };
}

/**
 * The recipe scope of a run, or null when a recipe cannot hold it.
 * @param scope - The scope the run ran over.
 * @param filtered - Whether the recipe holds filters.
 * @param narrowed - Whether anything else narrows the visible graph.
 * @param inRecipe - Whether a kept set is a `set.define` of this recipe.
 * @returns The scope (undefined for the recipe's default), or null.
 */
function recipeScope(
    scope: Scope,
    filtered: boolean,
    narrowed: boolean,
    inRecipe: (id: string) => boolean,
): string | JsonObject | undefined | null {
    if (scope === "visible") {
        return narrowed ? null : undefined;
    }

    // The element's own graph, component, predicate and set scopes ignore the filters, which a
    // recipe's scopes do not: under recipe filters they cannot be written exactly.
    if (filtered) {
        return null;
    }

    if (scope === "graph") {
        return undefined;
    }

    if (scope === "largest-component") {
        return scope;
    }

    if (typeof scope === "object" && "where" in scope) {
        return { where: scope.where };
    }

    if (typeof scope === "object" && "set" in scope && inRecipe(scope.set)) {
        return { set: scope.set };
    }

    return null;
}

/** What writing the runs reads of the session. */
interface RunWriting {
    readonly session: GraphSession;
    readonly problems: DocumentProblem[];
    readonly algorithms: ReadonlyMap<string, AlgorithmDescriptor>;
    readonly namesSet: (id: string) => boolean;
    readonly inRecipe: (id: string) => boolean;
    readonly filtered: boolean;
    readonly narrowed: boolean;
    readonly namespace: string | undefined;
    /** Each written run's `as`, by run id. */
    readonly asOf: Map<string, string>;
    /** The columns the runs' attribute options name. */
    readonly attributes: string[];
}

/**
 * The `set.define` commands: every rule set that names no element, those reading a run's result
 * after the runs.
 * @param sets - The session's sets, by id.
 * @param namesSet - Whether a set names elements.
 * @param problems - Where a rule set left out is reported.
 * @returns The commands before and after the runs.
 */
function setDefines(
    sets: ReadonlyMap<string, ElementSet>,
    namesSet: (id: string) => boolean,
    problems: DocumentProblem[],
): { before: JsonObject[]; after: JsonObject[] } {
    const before: JsonObject[] = [];
    const after: JsonObject[] = [];
    for (const set of sets.values()) {
        if (set.definition.kind !== "rule" || namesSet(set.id)) {
            if (set.definition.kind === "rule") {
                leftOut(problems, { set: set.id });
            }

            continue;
        }

        const { where, reading } = set.definition;
        const command = { op: "set.define", id: set.id, name: set.name, where, reading };
        // The id is rewritten to the set's bare file id with every other set reference (writeRecipe).
        // A set reading a run's result is defined after the runs.
        (runsRead(where).length > 0 ? after : before).push(command);
    }

    return { before, after };
}

/**
 * Whether a run names elements: by its scope, a set that names elements, or an option.
 * @param run - The run.
 * @param w - The writing.
 * @returns True when it does.
 */
function runNamesElements(run: Run, w: RunWriting): boolean {
    const { record } = run;
    const options = w.algorithms.get(record.algorithm)?.options ?? [];
    const { spec } = record.scope;
    return (
        scopeNamesElements(spec) ||
        (typeof spec === "object" && "set" in spec && w.namesSet(spec.set)) ||
        options.some(
            (option) =>
                option.name in record.params &&
                (ELEMENT_OPTIONS.has(option.type) ||
                    (option.type === "partition" && Array.isArray(record.params[option.name]))),
        )
    );
}

/**
 * A run's `as`: the part of its id after the recipe's namespace, else made from its name or id,
 * made unique among the runs written so far.
 * @param run - The run.
 * @param w - The writing.
 * @returns The name.
 */
function asOfRun(run: Run, w: RunWriting): string {
    const split = splitRunId(run.id);
    let as = split !== undefined && split.namespace === w.namespace ? split.as : asName(run.record.name ?? run.id); // NOSONAR(S6582): namespace may be undefined, so an optional chain would match a missing split
    const taken = new Set(w.asOf.values());
    let n = 2;
    while (taken.has(as)) {
        as = `${as.replace(/_\d+$/, "")}_${n}`;
        n++;
    }

    return as;
}

/**
 * One finished run as an `algo.run` command, or undefined when the recipe cannot hold it.
 * @param run - The run.
 * @param w - The writing.
 * @returns The command.
 */
function runCommand(run: Run, w: RunWriting): JsonObject | undefined {
    const { record } = run;
    const namesElements = runNamesElements(run, w);
    const scope = namesElements ? null : recipeScope(record.scope.spec, w.filtered, w.narrowed, w.inRecipe);
    if (scope === null) {
        if (namesElements) {
            leftOut(w.problems, { run: run.id });
        }

        return undefined;
    }

    const as = asOfRun(run, w);
    w.asOf.set(run.id, as);
    const options = w.algorithms.get(record.algorithm)?.options ?? [];
    // The seed is `seed`, never a parameter (recipe.md, "Commands" rule 7).
    const seedOptions = new Set(options.filter((option) => option.type === "seed").map((option) => option.name));
    const params = Object.fromEntries(Object.entries(record.params).filter(([name]) => !seedOptions.has(name)));
    for (const option of options) {
        if (option.type === "attribute" && typeof params[option.name] === "string") {
            w.attributes.push(params[option.name] as string);
        }
    }

    // A run some layer reads paints nothing on open, so the saved layer is not painted twice.
    const { runs } = w.session;
    const painted =
        runs.bindings(run.id).length === 0 &&
        !runs.readers(run.id).some((reader) => reader.kind === "layer") &&
        runs.painting(run.id)?.state !== "opted-out";
    return {
        op: "algo.run",
        algorithm: record.algorithm,
        as,
        ...(Object.keys(params).length === 0 ? {} : { params }),
        ...(scope === undefined ? {} : { scope }),
        ...(record.seed === null ? {} : { seed: record.seed }),
        style: painted,
    };
}

/**
 * Write the recipe from the session.
 * @param context - The save.
 * @returns The header and the body.
 */
function writeRecipe(context: WriteContext): SectionWrite {
    const { session, problems } = context;
    const sets = new Map(session.sets.list().map((set) => [set.id, set]));
    const namesSet = (id: string): boolean => setNamesElements(sets.get(id), sets);
    const { filters, narrowed } = gatherFilters(session, problems, namesSet);
    const defines = setDefines(sets, namesSet, problems);

    const kept = session.runs.list().filter((run) => run.record.status === "succeeded" && !run.record.partial);
    const namespace = kept.flatMap((run) => splitRunId(run.id)?.namespace ?? [])[0];
    const w: RunWriting = {
        session,
        problems,
        algorithms: new Map(session.catalog.algorithms().map((algorithm) => [algorithm.key, algorithm])),
        namesSet,
        inRecipe: (id) => sets.has(id) && !namesSet(id),
        filtered: filters.length > 0,
        narrowed,
        namespace,
        asOf: new Map(),
        attributes: [],
    };
    const runs = kept.flatMap((run): JsonObject[] => {
        const command = runCommand(run, w);
        return command === undefined ? [] : [command];
    });

    const { layout } = session;
    const layoutCommand: JsonObject = {
        op: "layout.set",
        id: layout.id,
        algorithm: layout.engine,
        dimension: layout.dimension === "2d" ? 2 : 3,
        ...(Object.keys(layout.options).length === 0 ? {} : { options: layout.options }),
    };

    // Run ids become the recipe's names; a run the recipe does not hold keeps its id.
    // Sets are named by their bare file id (spec 5 rule 1), whatever namespace applied them.
    const bare = (id: string): string => fileSetId(session, id).replace(/^set_[a-z][a-z0-9_]*\./, "set_");
    const named = renameSets(
        renameRuns([...filters, ...defines.before, ...runs, ...defines.after, layoutCommand], (name) =>
            w.asOf.get(name),
        ),
        (id) => (sets.has(id) ? bare(id) : id),
    );
    // Temporary, with loadedLooksAsColumns (issue 8259): filters and set rules read look values as
    // ordinary columns before the dependencies are gathered.
    const looks = loadedLooksAsColumns(session);
    const commands = looks.rewrite(named);
    const dependencies = dependenciesOf(session, commands, w.attributes, looks.schemas);
    const { dependencies: _was, ...header } = opened.get(session)?.header ?? {};
    return {
        header: { ...header, ...(dependencies === undefined ? {} : { dependencies }) },
        body: { ...(namespace === undefined ? {} : { namespace }), commands },
    };
}

/**
 * A value with every set id it names renamed: each `set` member holding a string, and each
 * `set.define` command's `id`.
 * @param value - The commands.
 * @param rename - The new id of a set.
 * @returns The value, copied.
 */
function renameSets<T>(value: T, rename: (id: string) => string): T {
    return JSON.parse(JSON.stringify(value), function (this: JsonObject, key, held: unknown) {
        const isSet = key === "set" || (key === "id" && this.op === "set.define");
        return isSet && typeof held === "string" ? rename(held) : held;
    }) as T;
}

/**
 * What the commands read (spec 3.6): columns, source roles and run results.
 * @param session - The session, for the columns' types.
 * @param commands - The commands.
 * @param attributes - The columns the runs' attribute options name.
 * @param looks - Temporary (issue 8259): each look column's schema, as `<node|edge>:<name>`.
 * @returns The dependencies, or undefined when they read nothing.
 */
function dependenciesOf(
    session: GraphSession,
    commands: readonly JsonObject[],
    attributes: readonly string[],
    looks: ReadonlyMap<string, JsonObject>,
): JsonObject | undefined {
    const known = session.data.attributes();
    // Each column with the table it is read from: a filter on edges reads edges; a scope, a set
    // rule and every other predicate read nodes; a run option reads the table that holds it.
    const refs = new Map<string, { kind: "node" | "edge"; name: string }>();
    const add = (kind: "node" | "edge", names: Iterable<string>): void => {
        for (const name of names) {
            refs.set(`${kind}:${name}`, { kind, name });
        }
    };
    const sources = new Set<string>();
    for (const command of commands) {
        const names = new Set<string>();
        columnsRead(command.op === "algo.run" ? command.scope : command.where, names);
        add(command.op === "graph.filter" && command.on === "edges" ? "edge" : "node", names);
        sourcesRead(command.where, sources);
    }

    for (const name of attributes) {
        const onNodes = known.some((each) => each.kind === "node" && each.name === name);
        add(onNodes || !known.some((each) => each.name === name) ? "node" : "edge", [name]);
    }

    const columns = [...refs.values()].map(({ kind, name }) => {
        const column = known.find((each) => each.kind === kind && each.name === name);
        const measurement = column?.measurementSource === "declared" ? column.measurement : undefined;
        // Temporary, with loadedLooksAsColumns (issue 8259): a look column is no session attribute yet.
        const schema =
            column === undefined ? (looks.get(`${kind}:${name}`) ?? {}) : columnSchema(column.type, measurement);
        return { kind, name, schema };
    });
    const declared = new Set(commands.flatMap((command) => (command.op === "algo.run" ? [command.as as string] : [])));
    const results = runsRead(commands).filter((name) => declared.has(name));
    const dependencies: JsonObject = {
        ...(columns.length === 0 ? {} : { columns }),
        ...(sources.size === 0 ? {} : { sources: [...sources] }),
        ...(results.length === 0 ? {} : { results }),
    };
    return Object.keys(dependencies).length === 0 ? undefined : dependencies;
}

/** The replay of one recipe section. */
class Replay {
    private readonly namespace: string;
    /** The names the recipe's `algo.run` commands declare. */
    private readonly declared: Set<string>;
    /** The `as` of every command skipped, whose readers are skipped with it. */
    private readonly skipped = new Set<string>();
    /** The `as` of every run started. */
    private readonly started = new Set<string>();
    /** The session's id of each set the recipe defines. */
    private readonly setIds = new Map<string, string>();
    /** Whether a `graph.filter` has narrowed what later commands see. */
    private filtered = false;

    constructor(
        private readonly section: ReadSection,
        private readonly context: ReadContext,
        private readonly commands: readonly unknown[],
    ) {
        const { body, header } = section;
        this.namespace = isNamespace(body.namespace) ? body.namespace : namespaceFromId(header.id);
        this.declared = new Set(
            commands.flatMap((command) =>
                isObject(command) && command.op === "algo.run" && isRunName(command.as) ? [command.as] : [],
            ),
        );
    }

    /**
     * A recipe run name as the session's run id.
     * @param as - The name.
     * @returns `<namespace>__<as>`.
     */
    private runId(as: string): RunId {
        return `${this.namespace}__${as}`;
    }

    /**
     * A value with every run the recipe declares named by its run id, and every set by its id here.
     * @param value - The value.
     * @returns The value rewritten.
     */
    private bind<T>(value: T): T {
        const renamed = renameRuns(value, (name) => (this.declared.has(name) ? this.runId(name) : undefined));
        return this.setIds.size === 0
            ? renamed
            : (JSON.parse(JSON.stringify(renamed), (key, held: unknown) =>
                  key === "set" && typeof held === "string" ? (this.setIds.get(held) ?? held) : held,
              ) as T);
    }

    private report(code: DocumentProblem["code"], at: string, extra: Readonly<Record<string, string>> = {}): void {
        this.context.problems.push({
            code,
            params: { section: "recipe", pointer: `${this.section.pointer}/commands/${at}`, ...extra },
        });
    }

    private notRun(as: string, extra: Readonly<Record<string, string>> = {}): void {
        this.context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: this.runId(as), ...extra } });
    }

    /**
     * Report every run from a command on as not run: the replay stopped at it.
     * @param from - The command the replay stopped at.
     */
    private stop(from: number): void {
        for (const command of this.commands.slice(from)) {
            if (isObject(command) && command.op === "algo.run" && isRunName(command.as)) {
                this.notRun(command.as);
            }
        }
    }

    /** Replay every command, in order, until one stops the replay. */
    async run(): Promise<void> {
        for (const [at, command] of this.commands.entries()) {
            if (!(await this.step(at, command))) {
                this.stop(at);
                return;
            }
        }
    }

    /**
     * Report a command whose op this release does not know (recipe.md, rule 7).
     * @param at - Its position.
     * @param command - The command.
     * @param as - Its `as`, if any.
     * @returns False when the replay stops here: unless its author says it narrows nothing.
     */
    private unknownCommand(at: number, command: Readonly<Record<string, unknown>>, as: string | undefined): boolean {
        this.report("E_UNKNOWN_COMMAND", `${at}/op`);
        if (command.narrows !== false) {
            return false;
        }

        // Its author says it changes nothing later commands see: only its readers go.
        if (as !== undefined) {
            this.skipped.add(as);
        }

        return true;
    }

    /**
     * Replay one command.
     * @param at - Its position.
     * @param command - The command.
     * @returns False when the replay stops here.
     */
    private async step(at: number, command: unknown): Promise<boolean> {
        if (!isObject(command) || typeof command.op !== "string") {
            this.report("E_BAD_DOCUMENT", `${at}`);
            return false;
        }

        const as = isRunName(command.as) ? command.as : undefined;
        const { op } = command;
        // The data codec compares the combine steps with the data's join history.
        if (op.startsWith("join.")) {
            return true;
        }

        const members = COMMAND_MEMBERS[op] as readonly string[] | undefined;
        if (members === undefined) {
            return this.unknownCommand(at, command, as);
        }

        const unknown = unknownMember(command, members);
        const scopeUnknown = isObject(command.scope) ? unknownScopeMember(command.scope) : undefined;
        const unknownAt = unknown ?? (scopeUnknown === undefined ? undefined : `scope/${scopeUnknown}`);
        if (unknownAt !== undefined) {
            this.report("E_UNKNOWN_OPTION", `${at}/${unknownAt}`);
            return false;
        }

        const reads = runsRead(command).filter((name) => name !== as);
        if (reads.some((name) => this.skipped.has(name))) {
            if (as !== undefined) {
                this.skipped.add(as);
                this.notRun(as);
            }

            return true;
        }

        switch (op) {
            case "graph.filter":
                return this.filter(at, command);
            case "set.define":
                this.define(at, command);
                return true;
            case "algo.run":
                await this.algorithm(at, command);
                return true;
            default:
                await this.layout(at, command);
                return true;
        }
    }

    private async filter(at: number, command: JsonObject): Promise<boolean> {
        const { where, on } = command;
        if (typeof where !== "string" || (on !== undefined && on !== "nodes" && on !== "edges")) {
            this.report("E_BAD_DOCUMENT", `${at}`);
            return false;
        }

        // ponytail: the element's `isolated` leaf reads the whole graph, not what a filter kept,
        // so `dropIsolated` has no exact form yet; the replay stops rather than widen the graph.
        if (command.dropIsolated === true) {
            this.report("E_BAD_DOCUMENT", `${at}/dropIsolated`);
            return false;
        }

        const { tx } = this.context;
        const ids = new Set(tx.visibility.steps.map((step) => step.id));
        let id = `${this.namespace}__filter_${at}`;
        let n = 2;
        while (ids.has(id)) {
            id = `${this.namespace}__filter_${at}_${n}`;
            n++;
        }

        try {
            const rule = filterRule(this.bind(where), on === "edges" ? "edges" : "nodes");
            await tx.visibility.setSteps([...tx.visibility.steps, { id, on: true, rule }]);
        } catch (error) {
            this.report("E_BAD_DOCUMENT", `${at}`, { reason: isGraphtyError(error) ? error.code : "E_INTERNAL" });
            return false;
        }

        this.filtered = true;
        this.context.restored.add("visibility");
        return true;
    }

    private define(at: number, command: JsonObject): void {
        const { id, name, where, reading } = command;
        if (
            typeof id !== "string" ||
            typeof name !== "string" ||
            typeof reading !== "string" ||
            (typeof where !== "string" && !isObject(where))
        ) {
            this.report("E_BAD_DOCUMENT", `${at}`);
            return;
        }

        try {
            const definition = { kind: "rule", where: this.bind(where), reading } as SetDefinitionInput;
            const created = this.context.tx.sets.create(definition, { name });
            this.setIds.set(id, created);
            // Applied under the namespace, the set's file id is `set_<namespace>.<ULID>` (spec 4.3 rule 6).
            if (/^set_[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) {
                fileIdsOf(this.context.session).sets.set(created, `set_${this.namespace}.${id.slice(4)}`);
            }

            this.context.restored.add("sets");
        } catch (error) {
            this.report("E_BAD_DOCUMENT", `${at}`, { reason: isGraphtyError(error) ? error.code : "E_INTERNAL" });
        }
    }

    /**
     * The scope an `algo.run` asks for, as the session takes it: a recipe's own scopes are within
     * what its filters keep, so the graph under a filter is the visible graph.
     * @param scope - The command's scope.
     * @returns The session scope, or undefined for a form the session cannot run.
     */
    private scope(scope: unknown): ScopeInput | undefined {
        if (scope === undefined || scope === "graph") {
            return this.filtered ? "visible" : "graph";
        }

        if (typeof scope === "string") {
            return scope as ScopeInput;
        }

        if (isObject(scope) && typeof scope.where === "string" && (scope.on ?? "nodes") === "nodes") {
            return { where: this.bind(scope.where) };
        }

        if (isObject(scope) && typeof scope.set === "string") {
            return { set: this.setIds.get(scope.set) ?? scope.set };
        }

        // An edge predicate and a type scope have no session form yet.
        return undefined;
    }

    /**
     * What a run paints: its `style`, an unknown part dropped; absent, nothing when another loaded
     * section's layer reads the run (spec 8.4).
     * @param at - The command's position.
     * @param style - The command's style.
     * @param as - The run's name.
     * @returns The style.
     */
    private style(at: number, style: unknown, as: string): RunStyle {
        if (typeof style === "boolean") {
            return style;
        }

        if (isObject(style)) {
            const kept: JsonObject = {};
            for (const [part, value] of Object.entries(style)) {
                if (STYLE_PARTS.includes(part)) {
                    kept[part] = value;
                } else {
                    this.report("W_UNKNOWN_MEMBER", `${at}/style/${part}`);
                }
            }

            return kept;
        }

        const read = runsRead([this.context.other("style")?.body, this.context.other("view")?.body]);
        return !read.includes(as) && !read.includes(this.runId(as));
    }

    private async algorithm(at: number, command: JsonObject): Promise<void> {
        const { algorithm, as, params } = command;
        const scope = this.scope(command.scope);
        if (
            typeof algorithm !== "string" ||
            !isRunName(as) ||
            this.started.has(as) ||
            (params !== undefined && !isObject(params)) ||
            scope === undefined
        ) {
            this.report("E_BAD_DOCUMENT", `${at}`);
            if (isRunName(as) && !this.started.has(as)) {
                this.skipped.add(as);
                this.notRun(as);
            }

            return;
        }

        this.started.add(as);
        const { context } = this;
        const id = this.runId(as);
        markRecipeRun(context.session, id);
        if (!context.rerun && !context.canned.has(id)) {
            this.notRun(as);
            return;
        }

        const { seed, sample, exact } = command;
        try {
            await context.tx.runs.start(algorithm, this.bind(params ?? {}), {
                as: id,
                scope,
                style: this.style(at, command.style, as),
                ...(typeof seed === "number" ? { seed } : {}),
                ...(typeof sample === "number" ? { sample } : {}),
                ...(typeof exact === "boolean" ? { exact } : {}),
            });
            context.restored.add("runs");
        } catch (error) {
            this.skipped.add(as);
            this.notRun(as, { reason: isGraphtyError(error) ? error.code : "E_INTERNAL" });
        }
    }

    private async layout(at: number, command: JsonObject): Promise<void> {
        const { id, algorithm, dimension, options } = command;
        if (
            typeof id !== "string" ||
            (dimension !== 2 && dimension !== 3) ||
            (algorithm !== undefined && typeof algorithm !== "string") ||
            (options !== undefined && !isObject(options))
        ) {
            this.report("E_BAD_DOCUMENT", `${at}`);
            return;
        }

        const { tx } = this.context;
        try {
            await tx.layout.setDimension(dimension === 2 ? "2d" : "3d");
            await tx.layout.set(id, {
                ...(algorithm === undefined ? {} : { engine: algorithm }),
                ...(options === undefined ? {} : { options: this.bind(options) }),
            });
            this.context.restored.add("layout");
            // With rerun off, the results section's positions are restored as they are (spec
            // 8.4): put back after the layout is chosen, as version 1 restores its arrangement.
            const placed = this.context.rerun ? undefined : restoredPositions(this.context.session);
            if (placed !== undefined) {
                await tx.positions.set(placed);
            }
        } catch (error) {
            this.report("E_BAD_DOCUMENT", `${at}`, { reason: isGraphtyError(error) ? error.code : "E_INTERNAL" });
        }
    }
}

/** The `graphty-recipe` section, version 2. */
export const recipeCodec: SectionCodec = {
    section: "recipe",
    version: 2,
    reads: [2],
    bound: false,
    members: ["namespace", "commands"],
    write(context) {
        const kept = opened.get(context.session);
        // An opened recipe is written back as read unless the saver asks for the session's.
        return Promise.resolve(kept !== undefined && context.rewriteRecipe !== true ? kept : writeRecipe(context));
    },
    async read(section, context) {
        const header = section.header as unknown as JsonObject;
        opened.set(context.session, {
            header: Object.fromEntries(
                [...IDENTITY, "dependencies"].flatMap((member) => (member in header ? [[member, header[member]]] : [])),
            ),
            body: Object.fromEntries(
                Object.entries(section.body).filter(([member]) => recipeCodec.members.includes(member)),
            ),
        });
        if (context.applyRecipe !== true) {
            // Opening never applies a recipe (spec 8.2 rule 4): it is kept, and the plan says so.
            context.problems.push({ code: "W_RECIPE_NOT_APPLIED", params: { section: "recipe" } });
            return;
        }

        const { commands } = section.body;
        if (!Array.isArray(commands)) {
            context.problems.push({
                code: "E_BAD_DOCUMENT",
                params: { section: "recipe", pointer: `${section.pointer}/commands` },
            });
            return;
        }

        await new Replay(section, context, commands).run();
    },
};
