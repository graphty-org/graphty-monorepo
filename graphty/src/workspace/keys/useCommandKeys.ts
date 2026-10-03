import { useEffect } from "react";

import type { WorkspaceValue } from "../state/WorkspaceContext";
import { firesWhileTyping, isSingleKey, isTypingTarget, matchesKey } from "./keys";

/**
 * An open menu, popover list or dialog keeps its own keys (Esc closes the innermost first). Only
 * a shown one counts: Mantine keeps a closed Select's options and a closed popover mounted with
 * `display: none`, and counting those would switch every single-key shortcut off while any
 * Select is on the page.
 */
const OVERLAY = '[role="menu"], [role="dialog"], [role="listbox"]';

/**
 * Whether a menu, popover list or dialog is showing.
 * @returns true when one is.
 */
function overlayShown(): boolean {
    return [...document.querySelectorAll(OVERLAY)].some((overlay) => overlay.checkVisibility());
}

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
            const overlayOpen = overlayShown();
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
