/**
 * The drawing is framed in the canvas alone, on the REAL graphty-element. The owner's rule
 * (2026-10-24, #3372): "the keycard / legend is an overlay, not part of the dimension of the
 * screen. the dimension of the screen is strictly defined as the canvas size (presuming the canvas
 * is between the two menus and doesn't go under them)". So the canvas sits between the left panel
 * and the inspector, and a layout change lands on the same picture whether the key card came up
 * before the fit, while it was pending or after it landed, the picture of the bare canvas.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type GraphtyTag = HTMLElementTagNameMap["graphty-element"];

/**
 * Renders the workspace on Les Miserables.
 * @returns the element and its session.
 */
async function open(): Promise<{ element: GraphtyTag; session: GraphSession }> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, inspected: null })} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    const session = element?.session;
    if (element === null || session === undefined) {
        throw new Error("the element never came up");
    }
    // A static layout to start from: the test reads only the picture Circle lands on, and waiting
    // for the default force layout to converge on Les Miserables, frame by frame, was most of the
    // test's time (issue #3538).
    await session.layout.set("spiral");
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await element.waitForStableFrame();
    return { element, session };
}

/**
 * Brings the key card up: a layer that colors one node.
 * @param session - the session.
 */
async function bringKeyUp(session: GraphSession): Promise<void> {
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: [session.data.nodes()[0]?.id ?? ""] },
        set: { "node.color": "#ff00ff" },
    });
    await screen.findByRole("region", { name: "Legend" });
}

/**
 * Picks Circle in the toolbar's Layout popover and applies it, as a reader does.
 * @param session - the session.
 */
async function applyCircle(session: GraphSession): Promise<void> {
    const tool = screen.getByRole("button", { name: "Layout" });
    await waitFor(() => {
        assert.isFalse(tool.hasAttribute("aria-disabled"));
    });
    await userEvent.click(tool);
    const popover = await screen.findByRole("dialog", { name: "Layout" });
    await userEvent.click(within(popover).getByRole("option", { name: /^Circle(?!s)/ }));
    await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
    await waitFor(() => {
        assert.strictEqual(session.layout.id, "circular");
    });
    await userEvent.keyboard("{Escape}");
}

/**
 * Where every node is drawn, in the element's CSS pixels.
 * @param element - the element.
 * @param session - the session.
 * @returns x and y of each node in turn.
 */
function drawn(element: GraphtyTag, session: GraphSession): number[] {
    return session.data.nodes().flatMap((node) => {
        const at = element.nodeScreenPosition(node.id);
        return at === undefined ? [] : [at.x, at.y];
    });
}

/**
 * Applies Circle with the key card coming up at one moment, and reads the picture it ends on.
 * @param key - when the key card comes up: never, before the layout change, right after it while
 *   its fit is pending, or after the fit landed.
 * @returns the drawn positions, and every size the element had from the first fit on (its first
 *   entry is the size it had then): a picture that moved with no change of size was framed
 *   differently, one whose size changed after its fit was framed for another canvas (#3754).
 */
async function circleWithKey(key: "none" | "before" | "pending" | "after"): Promise<Picture> {
    const { element, session } = await open();
    const sizes: string[] = [];
    const watch = new ResizeObserver(() => {
        const box = element.getBoundingClientRect();
        sizes.push(`${box.width}x${box.height}`);
    });
    watch.observe(element);
    if (key === "before") {
        await bringKeyUp(session);
        await element.waitForStableFrame();
    }
    await applyCircle(session);
    if (key === "pending") {
        await bringKeyUp(session);
    }
    await element.waitForStableFrame();
    if (key === "after") {
        await bringKeyUp(session);
        await element.waitForStableFrame();
    }
    assert.deepEqual(element.viewInsets, { top: 0, right: 0, bottom: 0, left: 0 }, "no overlay is a view inset");
    const at = drawn(element, session);
    watch.disconnect();
    cleanup();
    return { at, sizes };
}

/** What {@link circleWithKey} reads. */
interface Picture {
    at: number[];
    sizes: string[];
}

/**
 * How one picture differs from another, on one line: the largest move, the mean shift, the ratio
 * of the drawings' widths, and the element's sizes in each -- the first line is what the results
 * service keeps of a failure, so it has to say which mechanism moved the nodes.
 * @param bare - the picture with no key card.
 * @param now - the picture to compare.
 * @returns the description.
 */
function difference(bare: Picture, now: Picture): string {
    let worst = 0;
    let dx = 0;
    let dy = 0;
    const xs = (p: Picture): number[] => p.at.filter((_, i) => i % 2 === 0);
    now.at.forEach((value, i) => {
        const d = value - (bare.at[i] ?? Number.NaN);
        worst = Math.max(worst, Math.abs(d));
        if (i % 2 === 0) {
            dx += d;
        } else {
            dy += d;
        }
    });
    const n = now.at.length / 2;
    const width = (p: Picture): number => Math.max(...xs(p)) - Math.min(...xs(p));
    return (
        `moved up to ${worst.toFixed(2)} px, mean shift (${(dx / n).toFixed(2)}, ${(dy / n).toFixed(2)}), ` +
        `width ratio ${(width(now) / width(bare)).toFixed(4)}, sizes bare [${bare.sizes.join(" ")}] now [${now.sizes.join(" ")}]`
    );
}

describe("the drawing is framed in the canvas alone", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("the canvas sits between the left panel and the inspector, under the header", async () => {
        const { element } = await open();
        const rect = (selector: string): DOMRect => {
            const found = document.querySelector(selector);
            assert.isNotNull(found, selector);
            return (found as HTMLElement).getBoundingClientRect();
        };
        const canvas = element.getBoundingClientRect();
        const left = rect(".ws-left");
        const right = rect(".ws-right");
        const header = rect(".ws-header");
        console.info(
            `canvas ${JSON.stringify(canvas)} left panel ${JSON.stringify(left)} inspector ${JSON.stringify(right)} header ${JSON.stringify(header)}`,
        );
        assert.isAtLeast(canvas.left, left.right, "the canvas starts where the left panel ends");
        assert.isAtMost(canvas.right, right.left, "the canvas ends where the inspector starts");
        assert.isAtLeast(canvas.top, header.bottom, "the canvas starts under the header");
    });

    it("lands a layout change on the bare canvas's fit, whenever the key card comes up", async () => {
        const bare = await circleWithKey("none");
        assert.isNotEmpty(bare.at);
        for (const key of ["before", "pending", "after"] as const) {
            const now = await circleWithKey(key);
            assert.strictEqual(now.at.length, bare.at.length, key);
            // `!(<= 1)` and not `> 1`, so a NaN fails too
            const moved = now.at.some((value, i) => !(Math.abs(value - (bare.at[i] ?? Number.NaN)) <= 1));
            assert.isFalse(moved, `key card ${key}: the nodes moved: ${difference(bare, now)}`);
        }
    });
});
