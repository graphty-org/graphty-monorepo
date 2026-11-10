import type { ShaderDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";

import { findTreeRow } from "../graph-place/rows";
import type { Notice, WorkspaceStore } from "../state/store";
import { panelsInView } from "../time/timeActions";
import { topmostRow } from "./row";
import { EDITOR_WORDS } from "./words";

/**
 * The layer row Show in Style opens: the inspected one if it still exists, else the topmost, by
 * stack order alone. It never makes a row.
 * @param store - the chrome store.
 * @param session - the element's session.
 * @returns the row's id, undefined with no row in the stack.
 */
function rowToShow(store: WorkspaceStore, session: GraphSession): string | undefined {
    const { inspected } = store.get();
    if (
        inspected?.kind === "layer-row" &&
        inspected.id !== undefined &&
        findTreeRow(session.styles.tree(), inspected.id) !== undefined
    ) {
        return inspected.id;
    }
    const top = topmostRow(session);
    return top === undefined ? undefined : (top.row ?? top.id);
}

/**
 * What Show in Style does for a shader: opens the row's Style tab on the shader's side, or the
 * graph's Style tab for a background, and has that section's "+" take focus.
 * @param store - the chrome store.
 * @param session - the element's session.
 * @param target - what the shader draws on.
 * @returns the action, undefined when there is nowhere to show it.
 */
function showInStyle(
    store: WorkspaceStore,
    session: GraphSession,
    target: ShaderDescriptor["target"],
): (() => void) | undefined {
    const shown = { page: "panels", place: "graph" } as const;
    if (target === "background") {
        return () => {
            store.set({
                ...shown,
                ...panelsInView(),
                inspected: { kind: "graph" },
                tabs: { ...store.get().tabs, graph: "style" },
                shaderNext: "background",
            });
        };
    }
    if (rowToShow(store, session) === undefined) {
        return undefined;
    }
    return () => {
        const id = rowToShow(store, session);
        if (id === undefined) {
            return;
        }
        const side = target === "edge" ? "edge" : "node";
        store.set({
            ...shown,
            ...panelsInView(),
            inspected: { kind: "layer-row", id, tab: "style" },
            tabs: { ...store.get().tabs, "layer-row": "style" },
            styleSide: side,
            shaderNext: side,
        });
    };
}

/**
 * The notice after a shader joins the project with no list to write to: it says what happened,
 * and Show in Style leads on.
 * @param store - the chrome store.
 * @param session - the element's session.
 * @param descriptor - the shader `add` returned.
 * @returns the notice.
 */
export function shaderAddedNotice(store: WorkspaceStore, session: GraphSession, descriptor: ShaderDescriptor): Notice {
    const name = descriptor.plainName;
    // Anything but a pasted shader means nothing was written: the text was an unchanged known shader.
    const message =
        descriptor.origin === "pasted" ? EDITOR_WORDS.addedToProject(name) : EDITOR_WORDS.alreadyInGallery(name);
    const run = showInStyle(store, session, descriptor.target);
    return { message, ...(run === undefined ? {} : { action: { label: EDITOR_WORDS.showInStyle, run } }) };
}
