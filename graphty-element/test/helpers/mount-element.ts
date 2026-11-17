/**
 * One way for browser tests to put a `<graphty-element>` on the page and take it off again, so every
 * test agrees on when the element counts as ready.
 */

import "../../src/graphty-element";

import { assert, vi } from "vitest";

import type { Graphty } from "../../index.js";

const mounted: Graphty[] = [];

/**
 * Mount an empty element and wait until it is ready: its first update done, its graph initialised
 * and nothing queued ahead. Register {@link unmountElements} in `afterEach` to take it off.
 * @param options - The element's size in CSS pixels.
 * @param options.width - Its width, 400 by default.
 * @param options.height - Its height, 300 by default.
 * @returns The element.
 */
export async function mountElement(options: { width?: number; height?: number } = {}): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${options.width ?? 400}px`;
    element.style.height = `${options.height ?? 300}px`;
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    await element.waitForSettled();
    return element;
}

/** Remove every element {@link mountElement} mounted. */
export function unmountElements(): void {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
}
