import { defineRegistration } from "../commands/registry";
import { togglePopover } from "../toolbar/popover";
import { nothingDrawn } from "../toolbar/useSessionVersion";
import { takesSeed } from "./methods";

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
                if (session !== null) {
                    const { id, engine, options } = session.layout;
                    await session.layout.set(id, { engine, options });
                }
            },
        },
        {
            id: "layout.reshuffle",
            label: "Reshuffle layout seed",
            group: "Layout",
            disabled: ({ session }) =>
                nothingDrawn(session) ?? (session !== null && takesSeed(session, session.layout.id) ? null : "This layout has no seed"),
            run: async ({ session }) => {
                if (session !== null) {
                    const { id, engine, options } = session.layout;
                    const seed = Math.floor(Math.random() * 2 ** 31); // NOSONAR(S2245): a layout seed, not a security value
                    await session.layout.set(id, { engine, options: { ...options, seed } });
                }
            },
        },
    ],
});
