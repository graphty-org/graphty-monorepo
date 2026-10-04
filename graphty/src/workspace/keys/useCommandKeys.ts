import { useEffect } from "react";

import type { WorkspaceValue } from "../state/WorkspaceContext";
import { firesWhileTyping, isSingleKey, isTypingTarget, matchesKey } from "./keys";

/** An open menu, popover list or dialog keeps its own keys (Esc closes the innermost first). */
const OPEN_OVERLAY = '[role="menu"], [role="dialog"], [role="listbox"]';

/**
 * Runs a built command when one of its keys is pressed anywhere in the window.
 * @param workspace - the workspace context value.
 */
export function useCommandKeys(workspace: WorkspaceValue): void {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || event.isComposing) {
                return;
            }
            const typing = isTypingTarget(event.target);
            const overlayOpen = document.querySelector(OPEN_OVERLAY) !== null;
            const { singleKeyShortcuts } = workspace.store.get();
            for (const command of workspace.registry.live) {
                const key = command.keys?.find((combo) => matchesKey(event, combo));
                if (key === undefined) {
                    continue;
                }
                const blocked =
                    (typing && !firesWhileTyping(key)) ||
                    (overlayOpen && !firesWhileTyping(key)) ||
                    (!singleKeyShortcuts && isSingleKey(key));
                if (blocked) {
                    return;
                }
                event.preventDefault();
                workspace.run(command.id);
                return;
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [workspace]);
}
