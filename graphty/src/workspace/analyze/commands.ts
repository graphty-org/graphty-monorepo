import type { AlgorithmDescriptor } from "@graphty/graphty-element/catalog";

import { type CommandContext, defineRegistration, type PaletteRow } from "../commands/registry";
import { openers, togglePopover } from "../toolbar/popover";
import { nothingDrawn } from "../toolbar/useSessionVersion";
import { runsAsPicked, startAlgorithm, unavailable } from "./run";
import { HEADINGS, wordsFor } from "./words";

/** The element's removal-impact algorithm, which Simulate removing runs on the selection. */
const REMOVAL_IMPACT = "removal-impact";

/**
 * The removal-impact algorithm, when the element offers it.
 * @param session - the element's session.
 * @returns its descriptor, or undefined.
 */
function removalImpact(session: CommandContext["session"]): AlgorithmDescriptor | undefined {
    return session?.catalog.algorithms().find((descriptor) => descriptor.key === REMOVAL_IMPACT);
}

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
 * Path between... opens it on Shortest path, from P or a node's menu (tier2-design.md section 2);
 * Simulate removing runs removal impact on the selected nodes and edges and opens its result (#180).
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
            id: "analyze.simulate-removing",
            label: "Simulate removing",
            group: "Analyze",
            keywords: ["removal impact", "what breaks", "what if"],
            disabled: ({ session }) => {
                const descriptor = removalImpact(session);
                return (
                    nothingDrawn(session) ??
                    (descriptor === undefined || session === null ? "Not available" : unavailable(session, descriptor))
                );
            },
            run: ({ session, workspace }) => {
                const descriptor = removalImpact(session);
                if (session === null || descriptor === undefined) {
                    return;
                }
                // The element works the removal out on the side; the graph stays as it is.
                const run = startAlgorithm(session, descriptor, {});
                workspace.set({
                    inspected: { kind: "run-row", id: run.id },
                    announcement: `${wordsFor(descriptor).name} added, running`,
                });
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
