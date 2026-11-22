/**
 * Style panel v2 on the REAL graphty-element, driven by real typing (E495, "lines that vanish after a sibling is
 * set"): the first value a pop-over's sub-group writes can make the same line appear in the sidebar row, and focus,
 * between the field a Tab left and the next, was handed to that sidebar copy; the pop-over's next field was then out
 * of reach. Each case types the group's first field, tabs past it, and finds focus on the next field, still in the
 * pop-over, which still takes typing.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, switchView, written } from "./v2Harness";

interface Case {
    readonly name: string;
    readonly view: "2D" | "3D";
    /** What the edge layer holds before the pop-over opens. */
    readonly set: Readonly<Record<string, unknown>>;
    readonly settings: string;
    readonly group: string;
    readonly first: string;
    readonly next: string;
    /** The channel the first field writes, and the one the next field writes. */
    readonly writes: readonly [string, string];
}

const CASES: readonly Case[] = [
    {
        name: "Long-line fade end",
        view: "2D",
        set: {},
        settings: "Edge line settings",
        group: "Fade",
        first: "Edge fade start",
        next: "Edge fade end",
        writes: ["edge.fadeStart", "edge.fadeEnd"],
    },
    {
        name: "source port y",
        view: "2D",
        // A curve gives the Route section a line, and so its settings.
        set: { "edge.curvature": true },
        settings: "Edge route settings",
        group: "Ports",
        first: "Edge source port x",
        next: "Edge source port y",
        writes: ["edge.sourcePort", "edge.sourcePort"],
    },
    {
        name: "force curves springs in 3D",
        view: "3D",
        set: { "edge.curvature": true, "edge.supportModel": "barnesHut" },
        settings: "Edge force curves settings",
        group: "Springs",
        first: "Edge support spring length",
        next: "Edge support spring constant",
        writes: ["edge.supportSpringLength", "edge.supportSpringConstant"],
    },
];

/**
 * The open pop-over.
 * @returns it.
 */
async function popover(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found, "the pop-over is open");
        return found;
    });
}

describe("Style panel v2: a pop-over field tabbed past keeps focus in the pop-over", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const each of CASES) {
        it(`${each.name}: the next field takes focus and typing`, async () => {
            const { session, edges } = await openGraph();
            await session.styles.update(edges, { set: { "edge.color": "#E8590C", ...each.set } });
            await session.styles.settled();
            await switchView(each.view);
            await openStyle("Links");
            await showKind("edge");
            const tab = await screen.findByTestId("style-tab");
            await userEvent.click(await within(tab).findByRole("button", { name: new RegExp(`^${each.settings}`) }));
            const pop = await popover();
            await userEvent.click(
                within(pop).getByRole("button", { name: `Add to ${each.settings.replace(/^E/, "e")}` }),
            );
            await userEvent.click(await screen.findByRole("menuitem", { name: each.group }));
            await userEvent.click(await within(pop).findByLabelText(each.first, { selector: "input" }));
            await userEvent.keyboard("{Control>}a{/Control}0.4{Tab}");
            await waitFor(() => {
                assert.isDefined(written(session, edges, each.writes[0]), `${each.first} writes`);
            });
            await session.styles.settled();
            await waitFor(() => {
                const next = document.querySelector(`[data-thing-popover] input[aria-label="${each.next}"]`);
                assert.isNotNull(next, `${each.next} is still in the pop-over`);
                const active = document.activeElement;
                assert.strictEqual(
                    active,
                    next,
                    `focus is on ${active?.getAttribute("aria-label") ?? active?.tagName ?? "nothing"}`,
                );
            });
            const before = written(session, edges, each.writes[1]);
            await userEvent.keyboard("{Control>}a{/Control}0.6{Tab}");
            await waitFor(() => {
                assert.notDeepEqual(written(session, edges, each.writes[1]), before, `${each.next} writes`);
            });
            await userEvent.keyboard("{Escape}");
        });
    }
});
