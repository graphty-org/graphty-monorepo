import type React from "react";

import { openFile } from "../start/open";
import { useWorkspace } from "../state/WorkspaceContext";
import { holdsModel, putModelOnNodes, readDrop } from "./models";

/**
 * The canvas as a drop target: a model goes on the selected nodes, or on every node, as one
 * undoable layer; any other file is added to the project as graph data.
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
                } else if (dropped.files[0] !== undefined) {
                    openFile(workspace, dropped.files[0]);
                }
            });
        },
    };
}
