/**
 * @file The draft handle `session.data.draft()` returns (design
 * design/data/multiple-data-sources-design.md, section 5.6), behind the `source-steps` experiment.
 *
 * Each act is the edit a committed door would dispatch, applied to the draft's own copy of the
 * sources and steps (`sources/steps/draft.ts`) and built once; nothing is dispatched until
 * `commit()`, which sends the whole value as one `data.steps-set` step. Free of Babylon.js, Lit and
 * the DOM.
 */

import type { EdgeId, SourceKey } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import type { ColumnRef } from "./shared";
import type { SavedSourceDraft } from "./sourceDraftHooks";
import type { StepsAct } from "./sources/steps/acts";
import { copyKey, isStaged } from "./sources/steps/build";
import {
    built,
    draftAdd,
    draftAnswer,
    draftApply,
    type DraftMarks,
    draftMarks,
    type DraftState,
    mappingApply,
    openQuestions,
    stepEdit,
} from "./sources/steps/draft";
import {
    type DrawnIds,
    idsOfRefs,
    madeCounts,
    markCounts,
    type StepBuckets,
    stepRefs,
    untouchedNodes,
} from "./sources/steps/drawnIds";
import { clearPicksEdit, drillCells, drillElements, drillRows, exceptOf, pickAllEdit } from "./sources/steps/drill";
import {
    bestFirst,
    matchCounts,
    matchValues,
    type RankedSuggestion,
    suggestMatches,
    upTo,
} from "./sources/steps/match";
import { joinOutcomes } from "./sources/steps/outcomes";
import { contextIssues, type PreviewContext, previewOf } from "./sources/steps/preview";
import { spaceColumns, spaceProfile, tableHandle } from "./sources/steps/profile";
import {
    buildOf,
    type Copies,
    editRows,
    mintEditId,
    rowSources,
    spaceRows,
    stepRows,
    type StepsEdit,
    type StepsSource,
} from "./sources/steps/project";
import { joinableOf, joinRows, sideFields } from "./sources/steps/sides";
import type { TableName } from "./sources/steps/types";
import type {
    DataSourceInput,
    ImportOptions,
    ReaderEditRow,
    SourceCellValue,
    SourceClearPicksOptions,
    SourceColumnProfile,
    SourceConnectOptions,
    SourceDraft,
    SourceDraftChange,
    SourceDraftColumn,
    SourceDraftMadeCounts,
    SourceDraftOptions,
    SourceDraftPreview,
    SourceDraftRow,
    SourceDraftSpaceRow,
    SourceElementRef,
    SourceExtractOptions,
    SourceJoinAct,
    SourceJoinOutcomes,
    SourceJoinOutcomesOptions,
    SourceJoinRows,
    SourceJoinRowsOptions,
    SourceJoinSide,
    SourceLinkOptions,
    SourceMappingPatch,
    SourceMatchCounts,
    SourceMatchOptions,
    SourceMatchPair,
    SourceMatchSuggestion,
    SourceMatchValues,
    SourceMatchValuesOptions,
    SourceMergeOptions,
    SourceMoveColumnsOptions,
    SourcePickAllOptions,
    SourceRowCell,
    SourceSideField,
    SourceStepPatch,
    SourceStepRow,
    SourceTable,
    SourceTypeEntry,
    StageOptions,
} from "./types";

type DrillQueryArg = Parameters<typeof drillRows>[2];
type CellQueryArg = Parameters<typeof drillCells>[1];

/** What a draft reaches in the session that opened it. */
export interface SourceDraftHost {
    /**
     * Read a source as a staged source, dispatching nothing.
     * @param source - What `import` takes.
     * @param options - Its key, type, space and edge ends.
     * @returns The source and its rows as read, or null when the read held no rows.
     */
    read(source: DataSourceInput, options: StageOptions): Promise<{ source: StepsSource; copies: Copies } | null>;
    /**
     * Dispatch the commit: one `data.steps-set`, with the filters of the sources it removes taken
     * out in the same step, as `removeSource` takes them out (design 7.12).
     * @param edit - The whole value.
     * @param copies - The rows as read of the sources the draft staged.
     * @param removed - The committed sources the draft removes.
     * @returns Settles once it is recorded and drawn.
     */
    send(edit: StepsEdit, copies: Copies, removed: readonly string[]): Promise<unknown>;
    /** The rows as read the committed project holds, by copy id. */
    committedCopies(): Copies;
    /** The references and filters the session holds, which a preview checks against the draft. */
    previewContext(): PreviewContext;
    /** The draft stops holding the data: called once it is committed or discarded. */
    release(): void;
    /** Settles once the graph draws what the draft shows now. */
    drawn(): Promise<void>;
    /** Draw what the draft shows again: a commit that failed reopens it. */
    redraw(): void;
    /**
     * The session id of each built edge drawn on one side.
     * @param side - Before or After.
     * @returns The ids by built edge id.
     */
    edgeIds(side: "before" | "after"): Readonly<Record<string, EdgeId>>;
    /**
     * Publish `data:draft-changed`.
     * @param change - The change.
     */
    emit(change: SourceDraftChange): void;
}

/** The draft handle. */
export class SourceDraftHandle implements SourceDraft {
    readonly id = `draft_${mintEditId().slice("edit_".length)}`;
    private state: DraftState;
    private readonly base: DraftState;
    private readonly history: DraftState[] = [];
    // The states undo stepped back from, the last one first to come back; a new act drops them.
    private readonly undone: DraftState[] = [];
    private closed = false;
    // The state a batch started from while one runs, so it records one undo entry.
    private batchFrom: DraftState | null = null;
    // Whether the draft is drawn, and which side of its commit.
    private shown: { readonly on: boolean; readonly side: "before" | "after" } = { on: false, side: "after" };
    private hold = false;
    private keepCamera = false;
    // The marks of the current state, kept until an act or an undo changes it.
    private marked: { readonly state: DraftState; readonly marks: DraftMarks } | null = null;
    // the preview of the current state, kept until an act, an undo or the session's references and
    // filters (the outcomes `context` spells) change it
    private previewed: {
        readonly state: DraftState;
        readonly context: string;
        readonly preview: SourceDraftPreview;
    } | null = null;

    /**
     * Open a draft over the committed sources and steps.
     * @param host - The session.
     * @param base - The committed value and copies.
     * @param options - Whether its adds ask the key-overlap question.
     */
    constructor(
        private readonly host: SourceDraftHost,
        base: Omit<DraftState, "owned">,
        private readonly options: SourceDraftOptions = {},
    ) {
        this.base = { ...base, owned: new Set() };
        this.state = this.base;
    }

    /**
     * Whether the draft is still open.
     * @returns False once committed or discarded.
     */
    get open(): boolean {
        return !this.closed;
    }

    /** @inheritdoc */
    get displayed(): boolean {
        return this.shown.on;
    }

    /**
     * Whether the draft, while it is drawn, holds the committed graph's nodes where they are.
     * @returns True under `display(true, { hold: true })`.
     */
    get holds(): boolean {
        return this.hold && this.shown.on;
    }

    /**
     * Whether the draft, while it is drawn, leaves the camera where it is.
     * @returns True under `display(true, { keepCamera: true })`.
     */
    get keepsCamera(): boolean {
        return this.keepCamera && this.shown.on;
    }

    /** @inheritdoc */
    get side(): "before" | "after" {
        return this.shown.side;
    }

    /** @inheritdoc */
    display(on: boolean, options: { readonly hold?: boolean; readonly keepCamera?: boolean } = {}): Promise<void> {
        this.live("display");
        const hold = options.hold === true;
        this.keepCamera = options.keepCamera === true;
        if (this.shown.on !== on || this.hold !== hold) {
            this.shown = { ...this.shown, on };
            this.hold = hold;
            this.host.emit({ draft: this.id, reason: "displayed" });
        }
        return this.host.drawn();
    }

    /** @inheritdoc */
    show(side: "before" | "after"): Promise<void> {
        this.live("show");
        if (side !== "before" && side !== "after") {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A draft shows "before" or "after", not ${JSON.stringify(side)}.`,
                source: "data",
                details: { reason: "side", side },
            });
        }
        if (this.shown.side !== side) {
            this.shown = { ...this.shown, side };
            this.host.emit({ draft: this.id, reason: "displayed" });
        }
        return this.host.drawn();
    }

    /**
     * The sources and steps a displayed draft's After draws, while it draws them.
     * @returns The draft's value and copies, or null while it is closed, not drawn or showing Before.
     */
    drawnValue(): Pick<DraftState, "value" | "copies"> | null {
        return this.closed || !this.shown.on || this.shown.side !== "after" ? null : this.state;
    }

    /**
     * What committing the draft does to each element, while the draft is open and displayed.
     * @returns The marks, or null.
     */
    marks(): DraftMarks | null {
        if (this.closed || !this.shown.on) {
            return null;
        }
        if (this.marked?.state !== this.state) {
            this.marked = { state: this.state, marks: draftMarks(this.base, this.state) };
        }
        return this.marked.marks;
    }

    /**
     * Refuse an act on a closed draft.
     * @param verb - The act.
     * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `draft-closed`.
     */
    private live(verb: string): void {
        if (this.closed) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The draft is closed: ${verb} is refused.`,
                source: "data",
                details: { reason: "draft-closed", draft: this.id, verb },
            });
        }
    }

    /**
     * Apply one act: the next state, built once, and an undo entry. A refused act changes nothing.
     * @param verb - The act, for a refusal.
     * @param next - Works out the next state from the current one.
     */
    private act(verb: string, next: (state: DraftState) => DraftState): void {
        this.live(verb);
        const after = built(next(this.state));
        if (this.batchFrom === null) {
            this.history.push(this.state);
            this.undone.length = 0;
        }
        this.state = after;
        this.host.emit({ draft: this.id, reason: "changed" });
    }

    /**
     * Apply one edit as one act.
     * @param verb - The act.
     * @param edit - The edit, as the committed door would dispatch it.
     */
    private edit(verb: string, edit: StepsEdit): void {
        this.act(verb, (state) => draftApply(state, edit));
    }

    /**
     * Apply one act on the sources and steps.
     * @param verb - The act.
     * @param act - The act.
     */
    private stepsAct(verb: string, act: StepsAct): void {
        this.edit(verb, { kind: "act", act });
    }

    /**
     * The part of a source's newest `join.edges` step: minted above every other, so the highest.
     * @param source - The source.
     * @returns The part, or 0 when the source has no such step.
     */
    private partOf(source: string): number {
        const parts = this.state.value.steps.flatMap((s) =>
            s.op === "join.edges" && s.source === source ? [s.part] : [],
        );
        return Math.max(0, ...parts);
    }

    /** @inheritdoc */
    async stage(source: DataSourceInput, options: StageOptions = {}): Promise<string> {
        this.live("stage");
        const read = await this.host.read(source, options);
        if (read === null) {
            return "";
        }
        this.act("stage", (state) =>
            draftApply(state, { kind: "add", source: read.source, staged: true }, read.copies),
        );
        return read.source.id;
    }

    /** @inheritdoc */
    async import(
        source: DataSourceInput,
        options: ImportOptions & { readonly overlap?: "separate" | "merge" } = {},
    ): Promise<string> {
        this.live("import");
        const { overlap, ...choices } = options;
        const read = await this.host.read(source, choices);
        if (read === null) {
            return "";
        }
        const { id } = read.source;
        this.act("import", (state) =>
            draftAdd(
                draftApply(state, { kind: "add", source: read.source, staged: true }, read.copies),
                id,
                overlap,
                this.options.askOverlap === true,
            ),
        );
        return id;
    }

    /** @inheritdoc */
    add(source: SourceKey, options: { readonly overlap?: "separate" | "merge" } = {}): void {
        this.act("add", (state) => draftAdd(state, source, options.overlap, this.options.askOverlap === true));
    }

    /** @inheritdoc */
    answerOverlap(source: SourceKey, answer: "merge" | "separate"): void {
        this.act("answerOverlap", (state) => draftAnswer(state, source, answer));
    }

    /** @inheritdoc */
    merge(options: SourceMergeOptions): void {
        this.stepsAct("merge", { act: "merge", options });
    }

    /** @inheritdoc */
    connect(options: SourceConnectOptions): number {
        this.stepsAct("connect", { act: "connect", options });
        return this.partOf(options.from.source);
    }

    /** @inheritdoc */
    extract(source: SourceKey, options: SourceExtractOptions): number {
        this.stepsAct("extract", { act: "extract", source, options });
        return this.partOf(source);
    }

    /** @inheritdoc */
    link(options: SourceLinkOptions): number {
        this.stepsAct("link", { act: "link", options });
        return this.partOf(options.source);
    }

    /** @inheritdoc */
    moveColumns(source: SourceKey, options: SourceMoveColumnsOptions): void {
        this.stepsAct("moveColumns", { act: "move-columns", source, options });
    }

    /** @inheritdoc */
    renameColumn(column: ColumnRef, name: string, options: { readonly source: SourceKey }): void {
        const table = column.kind === "node" ? ("nodes" as const) : ("edges" as const);
        this.stepsAct("renameColumn", {
            act: "rename",
            rename: { source: options.source, table, from: column.name, to: name },
        });
    }

    /** @inheritdoc */
    declareType(entry: SourceTypeEntry): void {
        this.edit("declareType", { kind: "declare-type", entry });
    }

    /** @inheritdoc */
    pick(ref: SourceElementRef, column: string, source: SourceKey): void {
        this.stepsAct("pick", { act: "pick", id: mintEditId(), ref, column, source });
    }

    /** @inheritdoc */
    use(ref: SourceElementRef, column: string, source: SourceKey): void {
        this.stepsAct("use", { act: "pick", id: mintEditId(), ref, column, source });
    }

    /**
     * Apply an edit worked out from the current state, as one act, unless it changes nothing.
     * @param verb - The act.
     * @param work - The edit and how many things it changes; a null edit records nothing.
     * @returns How many things it changes.
     */
    private counted(verb: string, work: (state: DraftState) => { edit: StepsEdit | null; count: number }): number {
        this.live(verb);
        const { edit, count } = work(this.state);
        if (edit !== null) {
            this.edit(verb, edit);
        }
        return count;
    }

    /** @inheritdoc */
    pickAll(options: SourcePickAllOptions): number {
        return this.counted("pickAll", (state) => pickAllEdit(state.value, state.copies, options));
    }

    /** @inheritdoc */
    clearPicks(options: SourceClearPicksOptions): number {
        return this.counted("clearPicks", (state) => clearPicksEdit(state.value, options));
    }

    /**
     * Change a step's excluded list.
     * @param verb - The act.
     * @param step - The step's place.
     * @param keys - The keys, rows or pairs.
     * @param column - The column they are in, for an exclusion.
     */
    private except(
        verb: "exclude" | "include",
        step: number,
        keys: Parameters<typeof exceptOf>[2],
        column?: string,
    ): void {
        this.act(verb, (state) => {
            const except = exceptOf(state.value, step, keys, verb, column);
            return draftApply(state, stepEdit(state.value, state.copies, step, { except }));
        });
    }

    /** @inheritdoc */
    exclude(
        step: number,
        keys: readonly (SourceCellValue | SourceDraftRow)[],
        options: { readonly column?: string } = {},
    ): void {
        this.except("exclude", step, keys, options.column);
    }

    /** @inheritdoc */
    include(step: number, keys: readonly (SourceCellValue | SourceRowCell)[]): void {
        this.except("include", step, keys);
    }

    /** @inheritdoc */
    editStep(index: number, patch: SourceStepPatch): void {
        this.act("editStep", (state) => draftApply(state, stepEdit(state.value, state.copies, index, patch)));
    }

    /** @inheritdoc */
    renameJoin(id: string, name: string | null): void {
        this.act("renameJoin", (state) => {
            const { steps } = state.value;
            if (!steps.some((step) => step.join?.id === id)) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `No step carries the join ${JSON.stringify(id)}.`,
                    source: "data",
                    details: { reason: "no-join", id },
                });
            }
            const named = steps.map((step) => {
                if (step.join?.id !== id) {
                    return step;
                }
                const { name: _old, ...rest } = step.join;
                return { ...step, join: name === null || name.trim() === "" ? rest : { ...rest, name } };
            });
            return draftApply(state, { kind: "set", value: { ...state.value, steps: named } });
        });
    }

    /** @inheritdoc */
    removeStep(index: number, options: { readonly adds?: "keep" | "remove" } = {}): void {
        this.stepsAct("removeStep", { act: "remove-step", index, ...options });
    }

    /** @inheritdoc */
    moveStep(index: number, to: number): void {
        this.stepsAct("moveStep", { act: "move-step", index, to });
    }

    /** @inheritdoc */
    replaceStep(index: number, act: SourceJoinAct): void {
        this.stepsAct("replaceStep", { act: "replace-step", index, with: act });
    }

    /** @inheritdoc */
    removeSource(source: SourceKey, options: { readonly adds?: "keep" | "remove" } = {}): void {
        this.live("removeSource");
        if (this.state.value.sources[source] === undefined) {
            // A source a file saved without the experiment brought in: the steps do not build it,
            // so only data.removeSource takes it out.
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The steps do not read ${JSON.stringify(source)}: data.removeSource takes it out.`,
                source: "data",
                details: { reason: "not-in-steps", source },
            });
        }
        this.edit("removeSource", { kind: "remove-source", id: source, ...options });
    }

    /** @inheritdoc */
    removeEdit(id: string): void {
        this.edit("removeEdit", { kind: "remove-edit", id });
    }

    /** @inheritdoc */
    setMapping(source: SourceKey, patch: SourceMappingPatch): void {
        this.live("setMapping");
        if (!this.state.owned.has(source) && !isStaged(this.state.value, source)) {
            // Only a source the draft brings in, or one still staged (nothing builds it), is the
            // draft's to change; every other one is the committed project's, refused as every data
            // write is while a draft is open.
            throw draftOpenError(this.id);
        }
        this.act("setMapping", (state) => mappingApply(state, source, patch));
    }

    /** @inheritdoc */
    batch<T>(acts: () => T): T {
        this.live("batch");
        if (this.batchFrom !== null) {
            return acts();
        }
        const from = this.state;
        this.batchFrom = from;
        try {
            const out = acts();
            if (this.state !== from) {
                this.history.push(from);
                this.undone.length = 0;
            }
            return out;
        } catch (error) {
            if (this.state !== from) {
                this.state = from;
                this.host.emit({ draft: this.id, reason: "changed" });
            }
            throw error;
        } finally {
            this.batchFrom = null;
        }
    }

    /**
     * The session ids of draft elements on the side drawn now, while the draft is open and drawn.
     * @param query - Element references, some counts of one step, or the untouched nodes.
     * @returns The ids, or null.
     */
    drawnIds(
        query: { readonly refs: readonly SourceElementRef[] } | StepBuckets | { readonly untouched: true },
    ): DrawnIds | null {
        if (this.closed || !this.shown.on) {
            return null;
        }
        if ("untouched" in query) {
            const marks = this.marks();
            if (marks === null || this.shown.side !== "after") {
                return { nodes: [], edges: [] };
            }
            return { nodes: [...untouchedNodes(this.state, marks)], edges: [] };
        }
        return this.idsOf("refs" in query ? query.refs : stepRefs(this.state, query));
    }

    /**
     * The session ids of element references on the side drawn now.
     * @param refs - The references.
     * @returns The ids.
     */
    private idsOf(refs: readonly SourceElementRef[]): DrawnIds {
        const { side } = this.shown;
        return idsOfRefs(side === "after" ? this.state : this.base, refs, this.host.edgeIds(side));
    }

    /** @inheritdoc */
    undo(): boolean {
        this.live("undo");
        return this.step(this.history, this.undone);
    }

    /** @inheritdoc */
    redo(): boolean {
        this.live("redo");
        return this.step(this.undone, this.history);
    }

    /** @inheritdoc */
    get canUndo(): boolean {
        return !this.closed && this.history.length > 0;
    }

    /** @inheritdoc */
    get canRedo(): boolean {
        return !this.closed && this.undone.length > 0;
    }

    /**
     * Step to the last state of one stack, keeping the current one on the other.
     * @param from - The stack stepped to.
     * @param to - The stack the current state goes on.
     * @returns False when there is nothing to step to.
     */
    private step(from: DraftState[], to: DraftState[]): boolean {
        const next = from.pop();
        if (next === undefined) {
            return false;
        }
        to.push(this.state);
        this.state = next;
        this.host.emit({ draft: this.id, reason: "changed" });
        return true;
    }

    /** @inheritdoc */
    steps(): readonly SourceStepRow[] {
        const { value, copies } = this.state;
        return stepRows(value, buildOf(value, copies), copies);
    }

    /** @inheritdoc */
    spaces(): readonly SourceDraftSpaceRow[] {
        this.live("spaces");
        const { value, copies } = this.state;
        const before = new Set(this.base.value.steps.map((step) => step.source));
        const added = rowSources(value, false);
        const rows = rowSources(value, true);
        return Object.freeze(
            spaceRows(buildOf(value, copies)).map((row) =>
                Object.freeze({
                    ...row,
                    staged: added.get(row.space)?.find((source) => !before.has(source)) ?? null,
                    rowsOf: Object.freeze([...(rows.get(row.space) ?? [])]),
                }),
            ),
        );
    }

    /** @inheritdoc */
    columns(space: string, options: { readonly before?: number } = {}): readonly SourceDraftColumn[] {
        this.live("columns");
        return spaceColumns(upTo(this.state.value, options.before), this.state.copies, space);
    }

    /** @inheritdoc */
    types(): readonly SourceTypeEntry[] {
        return this.state.value.types;
    }

    /** @inheritdoc */
    edits(): readonly ReaderEditRow[] {
        return editRows(this.state.value, this.state.copies);
    }

    /** @inheritdoc */
    sourceTable(source: SourceKey): SourceTable {
        this.live("sourceTable");
        return tableHandle(() => this.state, source);
    }

    /** @inheritdoc */
    profile(options: { readonly space: string; readonly field?: string }): SourceColumnProfile {
        this.live("profile");
        return spaceProfile(this.state.value, this.state.copies, options.space, options.field);
    }

    /** @inheritdoc */
    matchCounts(pair: SourceMatchPair, options: SourceMatchOptions = {}): SourceMatchCounts {
        this.live("matchCounts");
        return matchCounts(this.state.value, this.state.copies, pair, options);
    }

    /** @inheritdoc */
    matchValues(pair: SourceMatchPair, options: SourceMatchValuesOptions = {}): SourceMatchValues {
        this.live("matchValues");
        return matchValues(this.state.value, this.state.copies, pair, options);
    }

    /** @inheritdoc */
    suggestMatches(
        source: SourceKey,
        options: { readonly with?: SourceJoinSide } = {},
    ): readonly SourceMatchSuggestion[] {
        this.live("suggestMatches");
        const { with: side } = options;
        if (side === undefined) {
            return Object.freeze(this.suggested(source).map((each) => each.suggestion));
        }
        const found = [
            ...this.suggested(source, side),
            ...(side.source === undefined ? [] : this.suggested(side.source, { source })),
        ];
        return Object.freeze(bestFirst(found).map((each) => each.suggestion));
    }

    /**
     * The joins a source's rows most likely make, best first.
     * @param source - The source.
     * @param side - What they name nodes of; absent, every space but its own and every other staged source.
     * @returns The suggestions.
     */
    private suggested(source: SourceKey, side?: SourceJoinSide): RankedSuggestion[] {
        const facts = this.sourceTable(source).summary();
        const table = facts.mapping.rows === "edges" ? "edges" : "nodes";
        const read = facts.tables.find((each) => each.table === table);
        if (read === undefined) {
            return [];
        }
        const { value, copies } = this.state;
        const spaces =
            side === undefined
                ? this.joinable(source, table, facts.mapping.space)
                : joinableOf(value, copies, side, source);
        return suggestMatches(value, copies, source, read.columns, spaces, facts.mapping.key);
    }

    /**
     * What a source's rows can name nodes of, with no side picked.
     * @param source - The source.
     * @param table - The table its rows are read from.
     * @param named - The space named for its nodes, if one was.
     * @returns The spaces and the other staged sources.
     */
    private joinable(
        source: SourceKey,
        table: TableName,
        named: string | undefined,
    ): Parameters<typeof suggestMatches>[4] {
        const { value, copies } = this.state;
        const rows = spaceRows(buildOf(value, copies));
        // A space only this source's edges name holds its own keys: nothing to join onto.
        const all = rows
            .filter((row) => row.nodes > 0 && (table === "nodes" || row.sources.some((each) => each !== source)))
            .map((row) => row.space);
        const own = named ?? rows.find((row) => row.ownedBy === source)?.space;
        const staged = Object.values(value.sources).flatMap((src) =>
            src.id !== source && src.mapping.nodes !== undefined && isStaged(value, src.id) ? [src.id] : [],
        );
        return { all, own, staged };
    }

    /** @inheritdoc */
    sideFields(side: SourceJoinSide, options: { readonly before?: number } = {}): readonly SourceSideField[] {
        this.live("sideFields");
        return sideFields(this.state.value, this.state.copies, side, options.before);
    }

    /** @inheritdoc */
    joinRows(options: SourceJoinRowsOptions): SourceJoinRows {
        this.live("joinRows");
        return joinRows(this.state.value, this.state.copies, options);
    }

    /** @inheritdoc */
    joinOutcomes(options: SourceJoinOutcomesOptions): SourceJoinOutcomes {
        this.live("joinOutcomes");
        return joinOutcomes(this.state.value, this.state.copies, options);
    }

    /** @inheritdoc */
    preview(): SourceDraftPreview {
        this.live("preview");
        const context = this.host.previewContext();
        const read = JSON.stringify(contextIssues(this.base, this.state, context));
        if (this.previewed?.state !== this.state || this.previewed.context !== read) {
            const data = previewOf(this.base, this.state, context);
            // The internal counts are the public ones; the public types name their spellings.
            const { base, state } = this;
            const drawn = draftMarks(base, state);
            // The drill-down reads the state the preview describes; kept off the enumerable data.
            // A screen asks each card's counts on every draw: each set of steps is counted once per preview.
            const made = new Map<string, SourceDraftMadeCounts>();
            const madeOf = (steps: readonly number[]): SourceDraftMadeCounts => {
                const at = steps.join(",");
                let out = made.get(at);
                if (out === undefined) {
                    out = madeCounts(state, drawn, steps);
                    made.set(at, out);
                }
                return out;
            };
            const questions = openQuestions(state).map(({ space, count, of, source, sources }) => ({
                code: "W_SPACE_OVERLAP" as const,
                params: { space, count, of, source, sources },
            }));
            const preview = Object.defineProperties(
                { draft: this.id, ...data, questions },
                {
                    rows: { value: (q: DrillQueryArg) => drillRows(base, state, q) },
                    elements: { value: (q: DrillQueryArg) => drillElements(state, q) },
                    cells: { value: (q: CellQueryArg) => drillCells(state, q) },
                    marks: { value: Object.freeze(markCounts(state, drawn)), enumerable: true },
                    made: { value: madeOf },
                    ids: {
                        value: (q: DrillQueryArg | { readonly refs: readonly SourceElementRef[] }) =>
                            this.idsOf("refs" in q ? q.refs : drillElements(state, q)),
                    },
                },
            ) as unknown as SourceDraftPreview;
            this.previewed = { state: this.state, context: read, preview };
        }
        return this.previewed.preview;
    }

    /** @inheritdoc */
    async commit(): Promise<void> {
        this.live("commit");
        const [open] = openQuestions(this.state);
        if (open !== undefined) {
            throw new GraphtyError({
                code: "E_OVERLAP_UNANSWERED",
                message: `Source ${open.source} meets keys in ${open.space}: answer the overlap question first.`,
                source: "data",
                details: { space: open.space, source: open.source },
            });
        }
        const { value, copies } = this.state;
        // The draft keeps holding the data until its set lands, so a write waiting ahead of it in
        // line is refused rather than landing first and being replaced by the draft's copy.
        this.closed = true;
        if (value !== this.base.value) {
            const held = this.host.committedCopies();
            // A new copy, or a held one the draft reads otherwise (a staged source's Rows are changed).
            const staged = Object.fromEntries(Object.entries(copies).filter(([id, tables]) => held[id] !== tables));
            const removed = Object.keys(this.base.value.sources).filter((id) => value.sources[id] === undefined);
            try {
                await this.host.send(
                    { kind: "set", value, draftBase: { value: this.base.value, draft: this.id } },
                    staged,
                    removed,
                );
            } catch (error) {
                // Nothing was applied: the draft stays open with everything it did, drawn as it was.
                this.closed = false;
                this.host.redraw();
                throw error;
            }
        }
        this.host.release();
        this.host.emit({ draft: this.id, reason: "committed" });
    }

    /** @inheritdoc */
    dispose(): void {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.host.release();
        this.host.emit({ draft: this.id, reason: "discarded" });
    }

    /**
     * The draft as autosave keeps it: every state it went through, so Undo still steps back after a
     * restore, and the rows of the sources it staged (the committed ones come back with the work),
     * each state saying which tables it reads a source's rows as where it changed that.
     * @returns It, as plain JSON.
     */
    saved(): SavedSourceDraft {
        const held = this.host.committedCopies();
        const copies: Record<string, Copies[string]> = {};
        const states = [...this.history, this.state].map((state) => {
            const rows: Record<string, readonly TableName[]> = {};
            for (const [id, copy] of Object.entries(state.copies)) {
                if (!(id in held) && !(id in copies)) {
                    copies[id] = copy;
                }
                const base = id in held ? held[id] : copies[id];
                if (!sameTables(base, copy)) {
                    rows[id] = tablesOf(copy);
                }
            }
            return {
                value: state.value,
                copies: Object.keys(state.copies),
                ...(Object.keys(rows).length === 0 ? {} : { rows }),
                owned: [...state.owned],
                ...(state.origins === undefined ? {} : { origins: state.origins }),
                ...(state.questions === undefined ? {} : { questions: state.questions }),
                ...(state.asking === undefined ? {} : { asking: [...state.asking] }),
                ...(state.given === undefined ? {} : { given: state.given }),
            };
        });
        return { askOverlap: this.options.askOverlap === true, shown: this.shown, states, copies };
    }

    /**
     * Put back the states a kept draft went through, over the committed sources and steps.
     * @param saved - The draft as {@link saved} kept it.
     * @returns False when a copy a state reads is gone, which leaves the draft as it opened.
     */
    restore(saved: SavedSourceDraft): boolean {
        const rows: Record<string, Copies[string]> = {
            ...(saved.copies as Copies),
            ...this.host.committedCopies(),
        };
        const committed = this.base.value.sources;
        const renamed = renamedCopies(saved.states as readonly SavedState[], committed);
        const states: DraftState[] = [];
        for (const each of saved.states as readonly SavedState[]) {
            const ids = each.copies.map((id) => renamed.get(id) ?? id);
            if (ids.some((id) => !(id in rows))) {
                return false;
            }
            const sources = Object.fromEntries(
                Object.entries(each.value.sources).map(([id, src]) => [
                    id,
                    committed[id] === undefined ? src : { ...src, origin: committed[id].origin },
                ]),
            );
            states.push({
                value: { ...each.value, sources },
                copies: Object.fromEntries(
                    each.copies.map((was, i) => [ids[i], readAs(rows[ids[i]], each.rows?.[was])]),
                ),
                owned: new Set(each.owned),
                ...(each.origins === undefined ? {} : { origins: each.origins }),
                ...(each.questions === undefined ? {} : { questions: each.questions }),
                ...(each.asking === undefined ? {} : { asking: new Set(each.asking) }),
                ...(each.given === undefined ? {} : { given: each.given }),
            });
        }
        const current = states.pop();
        if (current === undefined) {
            return false;
        }
        this.history.push(...states);
        this.state = built(current);
        this.host.emit({ draft: this.id, reason: "changed" });
        return true;
    }
}

/** One state of a draft as {@link SourceDraftHandle.saved} keeps it. */
interface SavedState {
    readonly value: DraftState["value"];
    readonly copies: readonly string[];
    /** The tables each copy's rows are read as, for a copy the draft reads otherwise than it was first read. */
    readonly rows?: Readonly<Record<string, readonly TableName[]>>;
    readonly owned: readonly string[];
    readonly origins?: DraftState["origins"];
    readonly questions?: DraftState["questions"];
    readonly asking?: readonly string[];
    readonly given?: DraftState["given"];
}

/**
 * The tables a copy holds.
 * @param copy - The copy.
 * @returns Their names.
 */
function tablesOf(copy: Copies[string]): readonly TableName[] {
    return (["nodes", "edges"] as const).filter((table) => copy[table] !== undefined);
}

/**
 * Whether two copies of one source's rows hold them as the same tables. A draft changes what a
 * source's rows are, never the rows.
 * @param a - One copy.
 * @param b - The other.
 * @returns True when they do.
 */
function sameTables(a: Copies[string], b: Copies[string]): boolean {
    return a === b || tablesOf(a).join() === tablesOf(b).join();
}

/**
 * A copy with its one table's rows held as other tables, as `setMapping` holds them.
 * @param copy - The copy as first read.
 * @param tables - The tables; absent, as they are.
 * @returns The copy.
 */
function readAs(copy: Copies[string], tables: readonly TableName[] | undefined): Copies[string] {
    const rows = copy.nodes ?? copy.edges ?? [];
    return tables === undefined ? copy : Object.fromEntries(tables.map((table) => [table, rows]));
}

/**
 * The copy ids the committed sources' rows are held under now, by the ids a kept draft read them
 * by: once the work is opened again a committed source's rows may be held under another copy id.
 * @param states - The kept states.
 * @param committed - The committed sources now.
 * @returns The new copy id by the kept one.
 */
function renamedCopies(
    states: readonly SavedState[],
    committed: DraftState["value"]["sources"],
): ReadonlyMap<string, string> {
    const renamed = new Map<string, string>();
    for (const each of states) {
        for (const [id, src] of Object.entries(each.value.sources)) {
            const now = committed[id];
            if (now !== undefined) {
                renamed.set(copyKey(src), copyKey(now));
            }
        }
    }
    return renamed;
}

/**
 * The refusal of a write made while a draft is open.
 * @param draft - The draft's id.
 * @param side - `"after"` when the write is refused because the draft's After is drawn, which
 *     showing Before lifts.
 * @returns `E_DRAFT_OPEN { draft }`, or `E_DRAFT_OPEN { draft, side: "after" }`.
 */
export function draftOpenError(draft: string, side?: "after"): GraphtyError {
    return new GraphtyError({
        code: "E_DRAFT_OPEN",
        message:
            side === undefined
                ? "A draft of the sources and steps is open: commit or discard it first."
                : "A draft's After is drawn, which is not the project's graph: show Before first.",
        source: "data",
        details: side === undefined ? { draft } : { draft, side },
    });
}
