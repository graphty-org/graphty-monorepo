/**
 * @file `data-source="url"`: with the timeline on, the element finds the format from the URL's
 * name, else its content, and a format it cannot find is reported on the data-loading channel.
 * With the timeline off, the type is an unknown format and nothing is read.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { ProgressChange } from "../../session.js";

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * An element whose pair names a URL holding the given text.
 * @param text - What the URL serves; its address says nothing about the format.
 * @param features - The experiments to switch on.
 * @returns The element.
 */
function elementOn(text: string, features: string[] = ["timeline"]): Graphty {
    const made = document.createElement("graphty-element");
    made.features = features;
    made.dataSource = "url";
    made.dataSourceConfig = { url: URL.createObjectURL(new Blob([text])) };
    document.body.appendChild(made);
    mounted = made;
    return made;
}

describe('data-source="url"', () => {
    it("reads a format only the content names", async () => {
        const made = elementOn("source,target\na,b\nb,c\n");
        await new Promise((resolve) => {
            made.addEventListener("data-loaded", resolve, { once: true });
        });
        assert.strictEqual(made.session.visibility.summary.totalEdges, 2);
    });

    it("reports a format nothing recognizes, once", async () => {
        const made = elementOn("\u0000\u0001 neither a table nor a graph");
        const errors: unknown[] = [];
        made.addEventListener("data-loading-error", (event) => {
            errors.push(event);
        });
        await vi.waitFor(() => {
            assert.strictEqual(errors.length, 1);
        });
        await made.waitForSettled();
        assert.strictEqual(errors.length, 1);
    });

    it("takes features declared after the pair", async () => {
        document.body.innerHTML = `<graphty-element data-source="url"
            data-source-config='{"url": "${URL.createObjectURL(new Blob(["source,target\na,b\n"]))}"}'
            features="timeline"></graphty-element>`;
        const made = document.querySelector("graphty-element");
        assert.isNotNull(made);
        mounted = made;
        await new Promise((resolve) => {
            made.addEventListener("data-loaded", resolve, { once: true });
        });
        assert.strictEqual(made.session.visibility.summary.totalEdges, 1);
    });

    it("loads a pair assigned after the first update", async () => {
        const made = document.createElement("graphty-element");
        made.features = ["timeline"];
        document.body.appendChild(made);
        mounted = made;
        await made.updateComplete;
        const loaded = new Promise((resolve) => {
            made.addEventListener("data-loaded", resolve, { once: true });
        });
        made.dataSource = "url";
        made.dataSourceConfig = { url: URL.createObjectURL(new Blob(["source,target\na,b\n"])) };
        await loaded;
        assert.strictEqual(made.session.visibility.summary.totalEdges, 1);
    });

    it("is an unknown format with the timeline off: the load fails, nothing is read or loaded", async () => {
        const read = vi.spyOn(globalThis, "fetch");
        const made = elementOn("source,target\na,b\n", []);
        let loaded = 0;
        made.addEventListener("data-loaded", () => {
            loaded++;
        });
        const end = await new Promise<ProgressChange>((resolve) => {
            made.session.on("progress:changed", (change) => {
                if (change.task === "load" && change.phase === "end" && change.source?.url !== undefined) {
                    resolve(change);
                }
            });
        });
        await made.waitForSettled();
        assert.strictEqual(end.outcome, "failed");
        assert.strictEqual(end.error?.code, "E_UNKNOWN_FORMAT");
        assert.strictEqual(loaded, 0);
        assert.strictEqual(read.mock.calls.length, 0);
        assert.strictEqual(made.session.visibility.summary.totalEdges, 0);
        read.mockRestore();
    });
});
