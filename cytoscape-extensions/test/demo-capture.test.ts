// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost/iframe.html?chromatic=true"}
import type { Core, CytoscapeOptions } from "cytoscape";
import { describe, expect, it, vi } from "vitest";

import { markDone, newCore } from "../stories/demo.js";

// happy-dom draws no canvas, so the demo's cores run headless here, keeping the container they were given
vi.mock("cytoscape", async (importOriginal) => {
    const real = (await importOriginal<{ default: typeof import("cytoscape") }>()).default;
    const make = (opts: CytoscapeOptions): Core => {
        const cy = real({ ...opts, container: undefined, headless: true, styleEnabled: true });
        Object.assign(cy, { container: () => opts.container, png: () => "data:image/png;base64," });
        return cy;
    };
    return { default: Object.assign(make, { use: real.use }) };
});

// A visual-review capture waits on whenDone(), then takes a full-page screenshot, which resizes the window. A core
// still alive under its frozen picture redrew every element on that resize; on the datasets gallery (37,000 edges of
// openflights among 16 cores) that held the main thread for seconds, and on a busy CI runner the screenshot waited
// out its 30 s (issue #2311).
describe("the demo in a capture", () => {
    it("leaves only the pictures once whenDone() resolves: every core is destroyed", async () => {
        vi.spyOn(HTMLImageElement.prototype, "decode").mockResolvedValue(undefined);
        const boxes = [document.createElement("div"), document.createElement("div")];
        const cores = boxes.map((box) => newCore(box, [{ group: "nodes", data: { id: "a" } }]));
        const root = document.createElement("div");
        root.append(...boxes);
        document.body.replaceChildren(root);
        markDone(root, () => Promise.resolve());

        await (root as unknown as { whenDone(): Promise<void> }).whenDone();

        expect(cores.map((cy) => cy.destroyed())).toEqual([true, true]);
        expect(boxes.map((box) => box.querySelectorAll("canvas").length)).toEqual([1, 1]);
    });

    // A story whose wait timed out finishes after the next story rendered. Its freeze must leave that story's cores
    // alone: destroying them ended its runs, and picturing a detached container failed decode() (#4071, #4072).
    it("a story that finishes after the next one rendered touches none of the next story's cores", async () => {
        vi.spyOn(HTMLImageElement.prototype, "decode").mockResolvedValue(undefined);
        const late = document.createElement("div");
        markDone(late, () => Promise.resolve());
        const box = document.createElement("div");
        const next = document.createElement("div");
        next.append(box);
        document.body.replaceChildren(next);
        const cy = newCore(box, [{ group: "nodes", data: { id: "a" } }]);

        await (late as unknown as { whenDone(): Promise<void> }).whenDone();

        expect(cy.destroyed()).toBe(false);
        expect(box.querySelectorAll("canvas").length).toBe(0);
    });
});
