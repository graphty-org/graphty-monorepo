/**
 * The join screen's package (data prototype spec section 3.6): Edit join on a joined source's row,
 * and what the screen's Join button does. graphty-element matches, counts and joins; this file only
 * hands the reader's choices to it.
 */

import type {
    DataSourceInput,
    JoinChoices,
    JoinKey,
    JoinRecord,
    JoinReport,
    JoinShape,
    LoadDraft,
    SourceKey,
} from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration } from "../commands/registry";
import { sourceName } from "../data-place/words";
import { replaceWith } from "../replace/commands";
import { openSeparate } from "../start/open";

/** What the Join button does: the dropdown's four choices. */
export type JoinHow = "join" | "rows" | "replace" | "separate";

/** The Join button's words for each choice. */
export const HOW_WORDS: Readonly<Record<JoinHow, string>> = {
    join: "Join",
    rows: "Add as rows",
    replace: "Replace data",
    separate: "Open as a separate graph",
};

/** A table the join screen joins: a file just read, or a table already joined (Edit join). */
export interface JoinSubject {
    /** The incoming table's name. */
    readonly name: string;
    /** Its columns, in file order. */
    readonly columns: readonly string[];
    /** Reads its rows. */
    readonly rows: () => Promise<readonly Readonly<Record<string, unknown>>[]>;
    /** The choices the screen opens with: the element's suggestion, or the join as it was made. */
    readonly initial: JoinChoices;
    /** The Join button's choice the screen opens with. */
    readonly how: JoinHow;
    /** The element's counts for a set of choices. */
    readonly report: (choices: JoinChoices) => JoinReport;
    /** The draft a file was read into; absent when editing. */
    readonly draft?: LoadDraft;
    /** What the file was read from; present when Replace data and Open as a separate graph can run. */
    readonly source?: DataSourceInput;
    /** The joined table's load, when editing its join. */
    readonly edit?: SourceKey;
}

/**
 * The keys a join of another shape starts with: an edge join takes a source and a target pair, a
 * values join one pair, matched to the id.
 * @param choices - the join now.
 * @param shape - the new shape.
 * @param columns - the incoming columns.
 * @returns the keys.
 */
export function keysFor(choices: JoinChoices, shape: JoinShape, columns: readonly string[]): JoinKey[] {
    const first = choices.keys[0]?.file ?? columns[0] ?? "";
    if (shape === "edges") {
        const second = choices.keys[1]?.file ?? columns.find((column) => column !== first) ?? first;
        return [
            { file: first, graph: "id" },
            { file: second, graph: "id" },
        ];
    }
    return [{ file: first, graph: "id" }];
}

/**
 * The choices a draft opens with: the element's suggestion; a table it reads as plain rows opens
 * on its first column matched to the node ids, so a reader who wants a join only changes the key.
 * @param draft - the draft, prepared onto the graph.
 * @returns the choices, and the Join button's pre-picked choice.
 */
function suggested(draft: LoadDraft): { choices: JoinChoices; how: JoinHow } {
    const suggestion = draft.suggestJoin();
    if (suggestion.shape === "rows" || suggestion.shape === "replace") {
        const first = draft.tables[0]?.columns[0]?.name ?? "";
        return {
            choices: { shape: "node-values", keys: [{ file: first, graph: "id" }] },
            how: suggestion.shape === "rows" ? "rows" : "replace",
        };
    }
    return { choices: { shape: suggestion.shape, keys: suggestion.keys }, how: "join" };
}

/**
 * A file read onto the graph, as the join screen joins it.
 * @param joining - the draft, its name and its source, from the workspace store.
 * @param joining.name - the file's name.
 * @param joining.draft - the draft.
 * @param joining.source - what it was read from.
 * @returns the subject.
 */
export function draftSubject(joining: {
    readonly name: string;
    readonly draft: LoadDraft;
    readonly source?: DataSourceInput;
}): JoinSubject {
    const { draft } = joining;
    const table = draft.tables[0];
    const { choices, how } = suggested(draft);
    return {
        name: joining.name,
        columns: table?.columns.map((column) => column.name) ?? [],
        rows: async () =>
            table === undefined
                ? []
                : (await draft.rows(table.id, { limit: Infinity })).records.map((row) => row.values),
        initial: choices,
        how,
        report: (next) => draft.joinReport(next),
        draft,
        ...(joining.source === undefined ? {} : { source: joining.source }),
    };
}

/**
 * A table already joined, as the join screen edits it.
 * @param ctx - the command context; its session is the element's.
 * @param record - the join, from `data.joins()`.
 * @returns the subject, or null without a session.
 */
export function editSubject(ctx: CommandContext, record: JoinRecord): JoinSubject | null {
    const { session } = ctx;
    if (session === null) {
        return null;
    }
    return {
        name: record.table.name,
        columns: record.table.columns,
        rows: () => Promise.resolve(record.table.rows),
        initial: record.choices,
        how: "join",
        report: (next) => session.data.editJoinReport(record.source, next),
        edit: record.source,
    };
}

/** A source Replace data can replace: its load and its name. */
export interface ReplaceTarget {
    readonly key: SourceKey;
    readonly name: string;
}

/**
 * The Join button's choices for a subject: Join always; Add as rows for a file; Replace data and
 * Open as a separate graph only when the file can be read again.
 * @param ctx - the command context.
 * @param subject - the table.
 * @returns the choices, in the dropdown's order.
 */
export function howChoices(ctx: CommandContext, subject: JoinSubject): JoinHow[] {
    if (subject.draft === undefined) {
        return ["join"];
    }
    const hows: JoinHow[] = ["join", "rows"];
    if (subject.source !== undefined && replaceTargets(ctx).length > 0) {
        hows.push("replace");
    }
    if (subject.source !== undefined) {
        hows.push("separate");
    }
    return hows;
}

/**
 * The sources Replace data can replace, for the reader to pick from: every load that is not a
 * joined table.
 * @param ctx - the command context.
 * @returns them, in the Sources list's order.
 */
export function replaceTargets(ctx: CommandContext): ReplaceTarget[] {
    return (ctx.session?.data.sources() ?? [])
        .filter((source) => source.kind !== "join")
        .map((source) => ({ key: source.key, name: sourceName(source) }));
}

/**
 * Closes the join screen. Cancelling a file keeps its draft and offers Undo, which opens the
 * screen on it again; the draft is let go once the notice goes without Undo.
 * @param ctx - the command context.
 * @param subject - the table, or undefined.
 */
export function closeJoin(ctx: CommandContext, subject?: JoinSubject): void {
    const { workspace } = ctx;
    const { joining } = workspace.get();
    workspace.set({ joining: null, editingJoin: null });
    const draft = subject?.draft;
    if (draft === undefined || joining === null) {
        return;
    }
    const notice = {
        message: "Join canceled",
        action: {
            label: "Undo",
            run: () => {
                workspace.set({ joining, editingJoin: null });
            },
        },
    };
    workspace.set({ notice });
    const stop = workspace.subscribe(() => {
        const now = workspace.get();
        if (now.notice === notice) {
            return;
        }
        stop();
        if (now.joining !== joining) {
            draft.dispose();
        }
    });
}

/**
 * Does what the Join button says, then closes the screen. Each is one undo step in the element.
 * @param ctx - the command context.
 * @param subject - the table.
 * @param choices - the join.
 * @param how - the Join button's choice.
 * @param target - the source Replace data replaces, as the reader picked it.
 * @returns settles once it is done.
 */
export async function finishJoin(
    ctx: CommandContext,
    subject: JoinSubject,
    choices: JoinChoices,
    how: JoinHow,
    target?: SourceKey,
): Promise<void> {
    const { session, workspace } = ctx;
    const { draft, source, edit } = subject;
    if (session === null) {
        return;
    }
    if (how === "join" && edit !== undefined) {
        await session.data.editJoin(edit, choices);
    } else if (how === "join") {
        await draft?.load({ join: choices });
    } else if (how === "rows") {
        await draft?.load({ mode: "merge" });
    } else if (how === "replace" && source !== undefined && target !== undefined) {
        draft?.dispose();
        await replaceWith(workspace, session, target, { name: subject.name, source });
    } else if (how === "separate" && source !== undefined) {
        draft?.dispose();
        openSeparate(workspace, { name: subject.name, source });
    }
    workspace.set({ joining: null, editingJoin: null });
}

/** The join package's commands: Edit join on a joined source's row. */
export const registration = defineRegistration({
    owner: "join",
    commands: [],
    sourceRow: [
        {
            id: "source.edit-join",
            label: "Edit join",
            order: 1,
            shown: (_ctx, source) => source.kind === "join",
            run: ({ workspace }, source) => {
                workspace.set({ editingJoin: source.key, joining: null });
            },
        },
    ],
});
