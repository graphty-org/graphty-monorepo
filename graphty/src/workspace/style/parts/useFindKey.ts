import type React from "react";

import { isTypingTarget } from "../../keys/keys";
import { useWorkspace } from "../../state/WorkspaceContext";

/**
 * "/" in the panel, outside a text field, is Find a setting's: the graph's Find keeps it elsewhere.
 * @param box - Find a setting's box.
 * @returns the panel's key handler, moving focus to the box.
 */
export function useFindKey(box: React.RefObject<HTMLInputElement | null>): (event: React.KeyboardEvent) => void {
    const { store } = useWorkspace();
    return (event) => {
        const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
        if (event.key !== "/" || !plain || isTypingTarget(event.target) || !store.get().singleKeyShortcuts) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        box.current?.focus();
    };
}
