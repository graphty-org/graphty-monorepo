import { defineRegistration } from "../commands/registry";
import { openers, togglePopover } from "../toolbar/popover";
import { nothingDrawn } from "../toolbar/useSessionVersion";

/**
 * The Analyze package's commands: Analyze opens the Analyze popover (tier1-design.md 5.T7);
 * Path between... opens it on Shortest path, from P or a node's menu (tier2-design.md section 2).
 */
export const registration = defineRegistration({
    owner: "analyze",
    commands: [
        {
            id: "analyze.open",
            label: "Analyze",
            group: "Analyze",
            keys: ["Shift+A"],
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                togglePopover(workspace, "analyze");
            },
        },
        {
            id: "analyze.path",
            label: "Path between...",
            group: "Analyze",
            keys: ["P"],
            keywords: ["shortest path"],
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace, element }) => {
                // Esc goes back to what opened it: the focused control, or the drawing when a
                // menu (whose row goes away) or nothing held focus.
                const active = document.activeElement;
                const opener =
                    active instanceof HTMLElement &&
                    active !== document.body &&
                    active.closest('[role="menu"]') === null
                        ? active
                        : element;
                if (opener === null) {
                    delete openers.path;
                } else {
                    openers.path = opener;
                }
                workspace.set({ dialog: "path" });
            },
        },
    ],
});
