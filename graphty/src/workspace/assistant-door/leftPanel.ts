import { useSyncExternalStore } from "react";

import { PANEL_MAX, PANEL_MIN } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/** The Assistant's width in a window of 1200 px or more. */
const ASSISTANT_DEFAULT = 280;
/** Below this window width, the Assistant's default is the left panel's current width. */
const ROOMY_WINDOW = 1200;
/** Below this window width, the Assistant fills the area right of the rail (WCAG 1.4.10). */
const FILLS_BELOW = 640;
/** The rail: 56 wide plus its 1 px border. */
const RAIL = 57;
/** What the Assistant leaves the canvas at the very least. */
const CANVAS_MIN = 320;

/**
 * Listens for window resizes.
 * @param changed - called on each.
 * @returns a function that stops listening.
 */
function onResize(changed: () => void): () => void {
    globalThis.addEventListener("resize", changed);
    return () => {
        globalThis.removeEventListener("resize", changed);
    };
}

/** The left panel's size and what its resize handle does. */
interface LeftPanel {
    readonly width: number;
    readonly defaultWidth: number;
    readonly max: number;
    /** Whether it fills the area right of the rail, with the canvas and inspector hidden. */
    readonly fills: boolean;
    readonly setWidth: (width: number) => void;
}

/**
 * The left panel's size. The Assistant keeps a width of its own, so the Graph panel keeps its grid.
 * @returns the size.
 */
export function useLeftPanel(): LeftPanel {
    const { store } = useWorkspace();
    const windowWidth = useSyncExternalStore(onResize, () => globalThis.innerWidth);
    const onAssistant = useWorkspaceState((state) => state.page === "panels" && state.place === "assistant");
    const leftWidth = useWorkspaceState((state) => state.leftWidth);
    const rightWidth = useWorkspaceState((state) => state.rightWidth);
    const assistantWidth = useWorkspaceState((state) => state.assistantWidth);
    if (!onAssistant) {
        return {
            width: leftWidth,
            defaultWidth: PANEL_MIN,
            max: PANEL_MAX,
            fills: false,
            setWidth: (width) => {
                store.set({ leftWidth: width });
            },
        };
    }
    const max = Math.max(PANEL_MIN, Math.min(PANEL_MAX, windowWidth - RAIL - rightWidth - CANVAS_MIN));
    const defaultWidth = Math.min(max, windowWidth < ROOMY_WINDOW ? leftWidth : ASSISTANT_DEFAULT);
    return {
        width: Math.min(max, assistantWidth ?? defaultWidth),
        defaultWidth,
        max,
        fills: windowWidth < FILLS_BELOW,
        setWidth: (width) => {
            store.set({ assistantWidth: width });
        },
    };
}
