/**
 * @file The draft handle `session.data.draft()` returns (design
 * design/data/multiple-data-sources-design.md, section 5.6), behind the `source-steps` experiment.
 *
 * Each act is the edit a committed door would dispatch, applied to the draft's own copy of the
 * sources and steps (`sources/steps/draft.ts`) and built once; nothing is dispatched until
 * `commit()`, which sends the whole value as one `data.steps-set` step. Free of Babylon.js, Lit and
 * the DOM.
 */

import type { SourceKey } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import type { ColumnRef } from "./shared";
import type { StepsAct } from "./sources/steps/acts";
import { built, draftApply, type DraftState, mappingEdit, stepEdit } from "./sources/steps/draft";
import { matchCounts, matchValues } from "./sources/steps/match";
import { contextIssues, type PreviewContext, previewOf } from "./sources/steps/preview";
import {
    buildOf,
    type Copies,
    editRows,
    mintEditId,
    stepRows,
    type StepsEdit,
    type StepsSource,
} from "./sources/steps/project";
import type {
    DataSourceInput,
    ImportOptions,
    ReaderEditRow,
    SourceConnectOptions,
    SourceDraft,
    SourceDraftChange,
    SourceDraftPreview,
    SourceElementRef,
    SourceExtractOptions,
    SourceMappingPatch,
    SourceMatchCounts,
    SourceMatchOptions,
    SourceMatchPair,
    SourceMatchValues,
    SourceMatchValuesOptions,
    SourceMergeOptions,
    SourceMoveColumnsOptions,
    SourceStepPatch,
    SourceStepRow,
    SourceTypeEntry,
} from "./types";

/** What a draft reaches in the session that opened it. */
export interface SourceDraftHost {
    /**
     * Read a source as a staged source, dispatching nothing.
     * @param source - What `import` takes.
     * @param options - Its key, type, space and edge ends.
     * @returns The source and its rows as read, or null when the read held no rows.
     */
    read(source: DataSourceInput, options: ImportOptions): Promise<{ source: StepsSource; copies: Copies } | null>;
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
    private closed = false;
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
     */
    constructor(
        private readonly host: SourceDraftHost,
        base: Omit<DraftState, "owned">,
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
        this.history.push(this.state);
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
     * The part a source's newest `join.edges` step was minted with.
     * @param source - The source.
     * @returns The part.
     */
    private partOf(source: string): number {
        return this.state.value.parts?.[source] ?? 0;
    }

    /** @inheritdoc */
    async stage(source: DataSourceInput, options: ImportOptions = {}): Promise<string> {
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
            draftApply(draftApply(state, { kind: "add", source: read.source, staged: true }, read.copies), {
                kind: "act",
                act: { act: "add-staged", source: id, ...(overlap === undefined ? {} : { overlap }) },
            }),
        );
        return id;
    }

    /** @inheritdoc */
    add(source: SourceKey, options: { readonly overlap?: "separate" | "merge" } = {}): void {
        this.stepsAct("add", { act: "add-staged", source, ...options });
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

    /** @inheritdoc */
    editStep(index: number, patch: SourceStepPatch): void {
        this.act("editStep", (state) => draftApply(state, stepEdit(state.value, state.copies, index, patch)));
    }

    /** @inheritdoc */
    removeStep(index: number): void {
        this.stepsAct("removeStep", { act: "remove-step", index });
    }

    /** @inheritdoc */
    removeSource(source: SourceKey): void {
        this.edit("removeSource", { kind: "remove-source", id: source });
    }

    /** @inheritdoc */
    removeEdit(id: string): void {
        this.edit("removeEdit", { kind: "remove-edit", id });
    }

    /** @inheritdoc */
    setMapping(source: SourceKey, patch: SourceMappingPatch): void {
        this.live("setMapping");
        if (!this.state.owned.has(source)) {
            // Only the source the draft brings in is the draft's to change; every other one is
            // the committed project's, refused as every data write is while a draft is open.
            throw draftOpenError(this.id);
        }
        this.act("setMapping", (state) => draftApply(state, mappingEdit(state.value, source, patch)));
    }

    /** @inheritdoc */
    undo(): boolean {
        this.live("undo");
        const prior = this.history.pop();
        if (prior === undefined) {
            return false;
        }
        this.state = prior;
        this.host.emit({ draft: this.id, reason: "changed" });
        return true;
    }

    /** @inheritdoc */
    steps(): readonly SourceStepRow[] {
        const { value, copies } = this.state;
        return stepRows(value, buildOf(value, copies), copies);
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
    preview(): SourceDraftPreview {
        this.live("preview");
        const context = this.host.previewContext();
        const read = JSON.stringify(contextIssues(this.base, this.state, context));
        if (this.previewed?.state !== this.state || this.previewed.context !== read) {
            const data = previewOf(this.base, this.state, context);
            // The internal counts are the public ones; the public types name their spellings.
            const preview = { draft: this.id, ...data } as unknown as SourceDraftPreview;
            this.previewed = { state: this.state, context: read, preview };
        }
        return this.previewed.preview;
    }

    /** @inheritdoc */
    async commit(): Promise<void> {
        this.live("commit");
        const { value, copies } = this.state;
        // The draft keeps holding the data until its set lands, so a write waiting ahead of it in
        // line is refused rather than landing first and being replaced by the draft's copy.
        this.closed = true;
        if (value !== this.base.value) {
            const held = this.host.committedCopies();
            const staged = Object.fromEntries(Object.entries(copies).filter(([id]) => !(id in held)));
            const removed = Object.keys(this.base.value.sources).filter((id) => value.sources[id] === undefined);
            try {
                await this.host.send(
                    { kind: "set", value, draftBase: { value: this.base.value, draft: this.id } },
                    staged,
                    removed,
                );
            } catch (error) {
                // Nothing was applied: the draft stays open with everything it did.
                this.closed = false;
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
}

/**
 * The refusal of a write made while a draft is open.
 * @param draft - The draft's id.
 * @returns `E_DRAFT_OPEN { draft }`.
 */
export function draftOpenError(draft: string): GraphtyError {
    return new GraphtyError({
        code: "E_DRAFT_OPEN",
        message: "A draft of the sources and steps is open: commit or discard it first.",
        source: "data",
        details: { draft },
    });
}
