import { type CommandContext, defineRegistration, type PaletteRow } from "../commands/registry";
import { nothingDrawn } from "../toolbar/disabledReasons";
import { openers, togglePopover } from "../toolbar/popover";
import { runsAsPicked, startAlgorithm, unavailable } from "./run";
import { HEADINGS, wordsFor } from "./words";

/**
 * One Quick actions row per algorithm in graphty-element's catalog (issue #174), under the
 * heading Analyze lists it under, so an algorithm registered later is listed with no app change.
 * It matches on the app's name, line and aliases and on the catalog's plain and technical names
 * and keywords. Choosing one with nothing to set runs it; any other opens Analyze on it, with its
 * settings (or its Path form).
 * @param ctx - what the rows read.
 * @returns the rows, or none before a graph is drawn.
 */
function algorithmRows(ctx: CommandContext): PaletteRow[] {
    const { session } = ctx;
    if (session === null || nothingDrawn(session) !== null) {
        return [];
    }
    return HEADINGS.flatMap((heading) =>
        session.catalog
            .algorithms()
            .filter((descriptor) => heading.shapes.includes(descriptor.shape))
            .map((descriptor): PaletteRow => {
                const words = wordsFor(descriptor);
                return {
                    id: `analyze.run.${descriptor.key}`,
                    label: words.name,
                    group: heading.title,
                    keywords: [
                        words.answers,
                        ...words.aliases,
                        descriptor.plainName,
                        descriptor.technicalName,
                        ...(descriptor.keywords ?? []),
                    ].filter((word) => word !== ""),
                    disabled: () => unavailable(session, descriptor),
                    run: ({ workspace }) => {
                        if (runsAsPicked(descriptor)) {
                            startAlgorithm(session, descriptor, {});
                            workspace.set({ announcement: `${words.name} added, running` });
                            return;
                        }
                        workspace.set({ dialog: "analyze", analyzeOn: descriptor.key });
                    },
                };
            }),
    );
}

/**
 * The Analyze package's commands: Analyze opens the Analyze popover (tier1-design.md 5.T7);
 * Path between... opens it on Shortest path, from P or a node's menu (tier2-design.md section 2).
 */
export const registration = defineRegistration({
    owner: "analyze",
    paletteRows: algorithmRows,
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
