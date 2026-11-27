/**
 * @file `session.on(event, handler, { afterFrame: true })` hears a repaint only once a frame has
 * drawn it. A listener that re-reads the picture on `style:batch-changed` or `project:derived` used
 * to run in the task the repaint resolved in, before the frame that applies the paint, and its
 * work held that frame back: at 10k nodes a legend read there kept a new color off the screen for
 * 50-190 ms.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import { mountElement, unmountElements } from "../helpers/mount-element";

afterEach(unmountElements);

const EVENTS = ["style:batch-changed", "project:derived"] as const;

describe("a listener asking to hear events after the frame", () => {
    test("runs only after a frame has drawn the repaint it announces, once per event", async () => {
        const element = await mountElement();
        const s = element.session;
        await s.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await element.waitForSettled();

        const scene = element.graph.getScene();
        const painter = element.graph.getStylePainter();
        let frames = 0;
        const counting = scene.onAfterRenderObservable.add(() => {
            frames++;
        });
        // Counted work: an after-frame call made before any frame since the event, or while paint
        // was still waiting to be applied.
        const early: string[] = [];
        const unpainted: string[] = [];
        const told: string[] = [];
        const heard: string[] = [];
        for (const event of EVENTS) {
            let framesAtEvent = -1;
            s.on(event, () => {
                framesAtEvent = frames;
                told.push(event);
            });
            s.on(
                event,
                () => {
                    heard.push(event);
                    if (frames <= framesAtEvent) {
                        early.push(event);
                    }

                    if (painter.hasPending) {
                        unpainted.push(event);
                    }
                },
                { afterFrame: true },
            );
        }

        await s.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await vi.waitFor(() => {
            assert.sameMembers(heard, told, "every event told is heard after the frame");
            assert.includeMembers(told, [...EVENTS]);
        });
        scene.onAfterRenderObservable.remove(counting);

        assert.deepEqual(early, [], "no after-frame listener ran before a frame was drawn");
        assert.deepEqual(unpainted, [], "no after-frame listener ran before the paint was applied");
    });

    test("an unsubscribe drops a detail still held", async () => {
        const element = await mountElement();
        const s = element.session;
        await s.data.addNodes([{ id: "a" }]);
        await element.waitForSettled();

        const heard: string[] = [];
        const told: string[] = [];
        s.on("style:batch-changed", () => {
            told.push("told");
        });
        const stop = s.on(
            "style:batch-changed",
            () => {
                heard.push("heard");
            },
            { afterFrame: true },
        );
        const stopOnTold = s.on("style:batch-changed", () => {
            stop();
        });

        // Subscribed after the stopped one, so once it has heard, the stopped one would have too.
        const witness: string[] = [];
        s.on(
            "style:batch-changed",
            () => {
                witness.push("heard");
            },
            { afterFrame: true },
        );

        await s.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await vi.waitFor(() => {
            assert.deepEqual(witness, ["heard"]);
        });
        stopOnTold();

        assert.deepEqual(told, ["told"]);
        assert.deepEqual(heard, [], "a listener stopped before the frame is not called");
    });
});
