import { defineRegistration } from "../commands/registry";
import { layoutChanged } from "../privacy/useUsageEvents";
import { nothingDrawn } from "../toolbar/disabledReasons";
import { togglePopover } from "../toolbar/popover";
import { randomSeed, takesSeed } from "./methods";

/** The Layout package's commands (tier1-design.md 5.T11). */
export const registration = defineRegistration({
    owner: "layout",
    commands: [
        {
            id: "layout.open",
            label: "Layout",
            group: "Layout",
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                togglePopover(workspace, "layout");
            },
        },
        {
            id: "layout.rerun",
            label: "Re-run layout",
            group: "Layout",
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ session }) => {
                await session?.layout.rerun();
            },
        },
        {
            id: "layout.reshuffle",
            label: "Reshuffle layout seed",
            group: "Layout",
            disabled: ({ session }) =>
                nothingDrawn(session) ??
                (session !== null && takesSeed(session, session.layout.id) ? null : "This layout has no seed"),
            run: async ({ session }) => {
                if (session !== null) {
                    const { id, engine, options } = session.layout;
                    try {
                        await session.layout.set(id, { engine, options: { ...options, seed: randomSeed() } });
                    } catch (error) {
                        layoutChanged(session, id, "failed");
                        throw error;
                    }
                    layoutChanged(session, id, "applied");
                }
            },
        },
    ],
});
