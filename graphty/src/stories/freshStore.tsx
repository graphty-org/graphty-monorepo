import type { StoryContext } from "@storybook/react";

import { createWorkspaceStore, type WorkspaceState, type WorkspaceStore } from "../workspace/state/store";
import { Workspace } from "../workspace/Workspace";

/**
 * A workspace story whose store is made anew for every render (a loader), not once when the story
 * file loads. A story that keeps one store for the file starts its next render where its play left
 * the last one -- a dialog open, a tab already chosen, a project already named -- so it draws a
 * different picture the second time it is rendered in the same page, as its screenshot test does
 * for each mode. Its play reads the store with {@link storeOf}.
 * @param initial - the chrome state to start from.
 * @returns the story's loaders and render.
 */
export function freshStore(initial: Partial<WorkspaceState> = {}): {
    loaders: (() => { store: WorkspaceStore })[];
    render: (args: unknown, context: { loaded: Record<string, unknown> }) => React.JSX.Element;
} {
    return {
        loaders: [() => ({ store: createWorkspaceStore(initial) })],
        render: (_args, context) => <Workspace store={storeOf(context)} />,
    };
}

/**
 * The store {@link freshStore} made for this render.
 * @param context - the story's context, or its play's.
 * @returns the store.
 */
export function storeOf(context: Pick<StoryContext, "loaded">): WorkspaceStore {
    return context.loaded.store as WorkspaceStore;
}
