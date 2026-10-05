import type { GraphSession } from "@graphty/graphty-element/session";

import { defineRegistration } from "../commands/registry";
import { togglePopover } from "../toolbar/popover";
import { nothingDrawn } from "../toolbar/useSessionVersion";

/**
 * Whether the chosen layout takes a seed, from its catalog entry.
 * @param session - the element's session.
 * @returns true when its options include `seed`.
 */
function hasSeed(session: GraphSession): boolean {
    const descriptor = session.catalog.layouts().find((layout) => layout.id === session.layout.id);
    return descriptor?.options.some((option) => option.name === "seed") ?? false;
}

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
                nothingDrawn(session) ?? (session !== null && hasSeed(session) ? null : "This layout has no seed"),
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
