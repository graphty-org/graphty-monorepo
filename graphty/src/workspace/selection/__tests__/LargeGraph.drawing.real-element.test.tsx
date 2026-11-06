/**
 * What the selection workspace draws around a slow repaint on a generated graph, on the REAL
 * graphty-element, driven by real clicks and keys: "Drawing" in the frame of the input, and a reader
 * who moves on while Done waits for the paint.
 */

import type { Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { firstFrameAfter, oneStep, openGenerated, openLayer, REPAINTED_NODES } from "./large-graph";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

describe("the selection editor on 50,000 nodes", () => {
    it("an edit says Drawing in the frame of its input, before the work starts (opening, a tick, Done)", async () => {
        const session = await openGenerated(REPAINTED_NODES);
        await openLayer(
            session,
            "Busy",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        const row = document.querySelector<HTMLElement>('.sel-rest [data-row="com"] .sel-value');
        if (row === null) {
            throw new Error("the step's row is drawn");
        }
        const opened = await firstFrameAfter(session, () => userEvent.click(row));
        assert.isTrue(opened.drawing, `opening: Drawing in the first frame (${String(opened.after)} ms)`);
        assert.isFalse(opened.showing, "opening: the preview is drawn after that frame");
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        const values = await screen.findByRole("group", { name: "community values" });
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        const before = document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null;
        const box = within(values).getAllByRole("checkbox")[0];
        // The rule is handed to graphty-element (which reads it with `scope.watchSteps`, the work
        // that blocks the page on a large graph) only once the box has finished filling: a
        // transition still running then stays frozen at its start, an empty box, until the work ends.
        const filling: boolean[] = [];
        const watch = session.scope.watchSteps.bind(session.scope);
        session.scope.watchSteps = (...args) => {
            filling.push(box.parentElement?.getAnimations({ subtree: true }).length !== 0);
            return watch(...args);
        };
        const ticked = await firstFrameAfter(session, () => userEvent.click(box));
        assert.isTrue(ticked.drawing, `a tick: Drawing in the first frame (${String(ticked.after)} ms)`);
        assert.strictEqual(ticked.count, before, "a tick: the count is read after that frame");
        await waitFor(() => {
            assert.notStrictEqual(document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null, before);
            assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        assert.isNotEmpty(filling, "a tick: the rule was handed on");
        assert.notInclude(filling, true, "a tick: the box had finished filling when the work started");
        const ws = document.querySelector<HTMLElement>(".sel-ws");
        if (ws === null) {
            throw new Error("the workspace is open");
        }
        const done = await firstFrameAfter(session, () =>
            userEvent.click(within(ws).getByRole("button", { name: "Done" })),
        );
        assert.isTrue(done.drawing, `Done: Drawing in the first frame (${String(done.after)} ms)`);
        assert.isTrue(done.showing, "Done: the preview ends after that frame");
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            assert.isFalse(session.styles.showingBranches);
        });
    });

    it("a control the reader moves to while Done waits for the paint keeps focus and every key typed there", async () => {
        const session = await openGenerated(REPAINTED_NODES);
        const layer = await openLayer(
            session,
            "Moved on",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
            { "node.size": 2 },
        );
        const row = document.querySelector<HTMLElement>('.sel-rest [data-row="com"] .sel-value');
        if (row === null) {
            throw new Error("the step's row is drawn");
        }
        await userEvent.click(row);
        const values = await screen.findByRole("group", { name: "community values" });
        await userEvent.click(within(values).getAllByRole("checkbox")[0]);
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        // The close waits on graphty-element's paint; it is held until the reader has moved on, so
        // the move always lands while the workspace still says "Drawing".
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("the element is drawn");
        }
        let release = (): void => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        const painted = element.waitForPainted.bind(element);
        element.waitForPainted = async () => {
            await held;
            return painted();
        };
        const ws = document.querySelector<HTMLElement>(".sel-ws");
        if (ws === null) {
            throw new Error("the workspace is open");
        }
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        await userEvent.click(screen.getByRole("button", { name: "Add to node fill" }));
        const line = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(
                '[data-testid="style-tab"] .ws-row[data-line="node.color"]',
            );
            assert.isNotNull(found);
            assert.isTrue(found?.contains(document.activeElement), "focus is in the new Color line");
            return found;
        });
        release();
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });
        assert.isTrue(line?.contains(document.activeElement), "the closed workspace left focus in the Color line");
        await userEvent.keyboard("E4572E{Enter}");
        await waitFor(() => {
            const now = session.styles.list().find((one: Layer) => one.id === layer.id);
            const color = now?.set?.["node.color"];
            assert.strictEqual(typeof color === "string" ? color.toUpperCase() : color, "#E4572E");
        });
        assert.isNull(document.querySelector(".sel-ws"), "no key reopened the workspace");
    });

    it("opening Which nodes right after adding a layer walks no style agreement before its first frame", async () => {
        const session = await openGenerated();
        // Every answer graphty-element gives; one it has not given before is a walk over 50,000 nodes.
        const given = new Set<unknown>();
        let walks = 0;
        const read = session.styles.agreement.bind(session.styles);
        session.styles.agreement = (...args) => {
            const answer = read(...args);
            if (!given.has(answer)) {
                given.add(answer);
                walks++;
            }
            return answer;
        };
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await screen.findByRole("textbox", { name: "Layer name" });
        const tab = await screen.findByTestId("style-tab");
        const edit = await within(tab).findByRole("button", { name: /^Edit Which nodes/ });
        await session.styles.settled();
        // The walks done from the press to the first frame drawn after it.
        let pressed = -1;
        let framed = -1;
        const press = (): void => {
            pressed = walks;
            requestAnimationFrame(() => {
                framed = walks;
            });
        };
        window.addEventListener("pointerdown", press, { capture: true, once: true });
        const opened = await firstFrameAfter(session, () => userEvent.click(edit));
        assert.isTrue(opened.drawing, `Drawing in the first frame (${String(opened.after)} ms)`);
        assert.isAtLeast(pressed, 0, "the press was seen");
        assert.strictEqual(framed - pressed, 0, "the press re-read the stack's agreement it already had");
    });
});
