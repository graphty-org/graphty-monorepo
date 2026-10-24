/**
 * Replace with a newer copy (data prototype spec section 3.7): the Sources row's Replace with
 * file..., and what a dropped copy of a loaded source routes to. graphty-element replaces, keeps
 * the styles, filters and joins, and counts; this file hands it the copy and shows the receipt.
 */

import type {
    CodedFact,
    GraphSession,
    ReplaceReport,
    ReplaceUnboundCode,
    SourceKey,
} from "@graphty/graphty-element/session";
import React from "react";

import { type CommandContext, defineRegistration } from "../commands/registry";
import { sourceName } from "../data-place/words";
import { type Incoming, incomingFiles, pickFiles } from "../start/open";
import type { WorkspaceStore } from "../state/store";
import { ReplaceReceipt } from "./ReplaceReceipt";
import { countWords, unboundWords } from "./words";

/**
 * Opens what an unbound fact names: the style layer, the Filters section, or the join screen.
 * @param workspace - the workspace store.
 * @param fact - the first thing that came unbound.
 */
export function showUnbound(workspace: WorkspaceStore, fact: CodedFact<ReplaceUnboundCode>): void {
    const { layer, join } = fact.params as { layer?: unknown; join?: unknown };
    if (fact.code === "style-layer" && typeof layer === "string") {
        workspace.set({ place: "graph", inspected: { kind: "layer-row", id: layer }, notice: null });
    } else if (fact.code === "join" && typeof join === "string") {
        workspace.set({ editingJoin: join, joining: null, notice: null });
    } else {
        workspace.set({ place: "data", notice: null });
    }
}

/**
 * The receipt as plain words, for the notice's text: the names, then every chip and unbound count.
 * @param before - the replaced source's name.
 * @param after - the copy's name.
 * @param report - what the element counted.
 * @returns the words, such as "Replaced a.csv with b.csv: edges +12 -3 40 changed".
 */
export function replacedWords(before: string, after: string, report: ReplaceReport): string {
    const parts = (["nodes", "edges"] as const).flatMap((kind) => {
        const words = countWords(report[kind]);
        return words.length === 0 ? [] : [`${kind} ${words.join(" ")}`];
    });
    const all = [...parts, ...unboundWords(report)];
    const head = `Replaced ${before} with ${after}`;
    return all.length === 0 ? head : `${head}: ${all.join(", ")}`;
}

/**
 * Replaces a loaded source with a newer copy at once, keeping styles, filters, runs and joins, and
 * shows the receipt with Show and Undo. One undo step in the element.
 * @param workspace - the workspace store.
 * @param session - the project's session.
 * @param key - the source the copy replaces.
 * @param incoming - the copy.
 */
export async function replaceWith(
    workspace: WorkspaceStore,
    session: GraphSession,
    key: SourceKey,
    incoming: Incoming,
): Promise<void> {
    const replaced = session.data.sources().find((each) => each.key === key);
    const before = replaced === undefined ? key : sourceName(replaced);
    const report = await session.data.replaceSource(key, incoming.source);
    const [first] = report.unbound;
    workspace.set({
        notice: {
            message: replacedWords(before, incoming.name, report),
            content: React.createElement(ReplaceReceipt, {
                before,
                after: incoming.name,
                report,
                ...(first === undefined
                    ? {}
                    : {
                          onShow: () => {
                              showUnbound(workspace, first);
                          },
                      }),
            }),
            action: {
                label: "Undo",
                run: () => {
                    void session.undo();
                },
            },
        },
    });
}

/**
 * Where a source the reader brought goes when graphty-element says it is a copy of a loaded one
 * (`data.matchesSource`): it replaces that source.
 * @param workspace - the workspace store.
 * @param session - the project's session.
 * @param incoming - the source.
 * @returns true when it replaced a source, false when it matches none.
 */
export async function routeToReplace(
    workspace: WorkspaceStore,
    session: GraphSession,
    incoming: Incoming,
): Promise<boolean> {
    const key = await session.data.matchesSource(incoming.source);
    if (key === null) {
        return false;
    }
    await replaceWith(workspace, session, key, incoming);
    return true;
}

/**
 * Replace with file...: the browser's file picker, then the chosen file replaces the row's source.
 * @param ctx - the command context.
 * @param key - the row's source.
 */
async function chooseReplacement(ctx: CommandContext, key: SourceKey): Promise<void> {
    const { session, workspace } = ctx;
    const [file] = await pickFiles();
    if (session === null || file === undefined) {
        return;
    }
    try {
        await replaceWith(workspace, session, key, incomingFiles([file]));
    } catch {
        workspace.set({ notice: { message: "Not replaced" } });
    }
}

/** The replace package's commands: Replace with file... on a file, sample or joined source's row. */
export const registration = defineRegistration({
    owner: "replace",
    commands: [],
    sourceRow: [
        {
            id: "source.replace",
            label: "Replace with file...",
            order: 5,
            // A server load is read again with Refresh, not replaced by a file.
            shown: (_ctx, source) => source.kind !== "server",
            run: (ctx, source) => chooseReplacement(ctx, source.key),
        },
    ],
});
