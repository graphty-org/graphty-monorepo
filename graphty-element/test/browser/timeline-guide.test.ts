/**
 * @file The first example of the timeline guide (`docs/guide/timeline.md`) on a real element: the
 * guide's markup and script, a CSV loaded through `data-source="url"`, and a real click on Play.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { TimeStepEvent } from "../../session.js";

const EMAILS = new URL("../helpers/timeline-emails.csv", import.meta.url).href;

afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
});

describe("the timeline guide's first example", () => {
    it("loads the CSV, and Play moves the window through the data", async () => {
        document.body.innerHTML = `
            <graphty-element features="timeline" data-source="url" data-source-config='{"url": "${EMAILS}"}'
                edge-time-path="data.sent"></graphty-element>
            <button id="play">Play</button>`;
        const steps: TimeStepEvent[] = [];

        // --- the guide's script ---
        const g = document.querySelector("graphty-element")!;
        await new Promise((r) => {
            g.addEventListener("data-loaded", r, { once: true });
        });
        const { time } = g.session;
        await time.ready; // the time field is indexed
        document.querySelector<HTMLButtonElement>("#play")!.onclick = () =>
            time.playing ? time.pause() : time.play({ step: "day" });
        g.session.on("time:step", (s) => {
            steps.push(s);
        });
        // --- end of the guide's script ---

        assert.strictEqual(time.extent()?.edges.timed, 6);
        const visible = new Set<number>();
        g.session.on("time:step", () => {
            visible.add(g.session.visibility.summary.visibleEdges);
        });
        const ended = new Promise((r) => {
            g.session.on("time:end", r);
        });
        await userEvent.click(document.querySelector("#play")!);
        assert.isTrue(time.playing);
        await ended;
        assert.isTrue(steps.some((step) => step.entered.edges > 0));
        assert.isAbove(visible.size, 1, "the visible edge count moved");
        assert.isFalse(time.playing);
    });
});
