import type React from "react";

import { openFiles } from "../start/open";
import { useWorkspace } from "../state/WorkspaceContext";
import { holdsModel, putModelOnNodes, readDrop } from "./models";

/**
 * The canvas as a drop target: a model goes on the selected nodes, or on every node, as one
 * undoable layer; any other files open as File... opens them (a second data file, on the join screen).
 * @returns the canvas's drag handlers.
 */
export function useCanvasDrop(): {
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
} {
    const workspace = useWorkspace();
    return {
        onDragOver: (event) => {
            if (event.dataTransfer.types.includes("Files")) {
                event.preventDefault();
            }
        },
        onDrop: (event) => {
            const { session, store } = workspace;
            if (session === null || !event.dataTransfer.types.includes("Files")) {
                return;
            }
            event.preventDefault();
            void readDrop(event.dataTransfer).then(async (dropped) => {
                if (await holdsModel(dropped.files)) {
                    await putModelOnNodes(session, store, dropped.source);
                } else {
                    openFiles(workspace, dropped.files);
                }
            });
        },
    };
}
