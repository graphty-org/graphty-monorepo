import { useCallback, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import type { PasteInit } from "./ShaderEditorDialog";

/**
 * Whether a shader list (`background`, or a style row's side and layer ids) has the shader editor
 * open, and what it opened with, kept in the workspace's shaderEditorOn: a reload reopens the editor
 * from the same list, on the draft the kept shaderDrafts hold.
 * @param list - the list.
 * @returns what the open editor started from (null while closed), and the setter that opens or closes it.
 */
export function useShaderEditorOn(list: string): [PasteInit | null, (init: PasteInit | null) => void] {
    const { store } = useWorkspace();
    // on reload: fresh: derived: read from the kept shaderEditorOn as the list mounts; the text is the kept draft's
    const [init, setInit] = useState<PasteInit | null>(() => {
        const on = store.get().shaderEditorOn;
        if (on?.list !== list) {
            return null;
        }
        return on.duplicateOf === undefined ? {} : { duplicateOf: on.duplicateOf };
    });
    const open = useCallback(
        (next: PasteInit | null) => {
            setInit(next);
            const duplicateOf = next?.duplicateOf;
            store.set({
                shaderEditorOn: next === null ? null : { list, ...(duplicateOf === undefined ? {} : { duplicateOf }) },
            });
        },
        [store, list],
    );
    return [init, open];
}
