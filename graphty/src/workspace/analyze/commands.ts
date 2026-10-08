import { defineRegistration } from "../commands/registry";
import { togglePopover } from "../toolbar/popover";
import { nothingDrawn } from "../toolbar/useSessionVersion";

/** The Analyze package's command: Analyze opens the Analyze popover (tier1-design.md 5.T7). */
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
    ],
});
