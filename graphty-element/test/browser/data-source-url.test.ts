/**
 * @file `data-source="url"`: the element finds the format from the URL's name, else its content,
 * and a format it cannot find is reported on the data-loading channel.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * An element whose pair names a URL holding the given text.
 * @param text - What the URL serves; its address says nothing about the format.
 * @returns The element.
 */
function elementOn(text: string): Graphty {
    const made = document.createElement("graphty-element");
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
});
