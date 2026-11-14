/**
 * @file A background image announces itself on the element (issue #7144).
 *
 * The `background` property documents `graphty-skybox-loaded`, but the element only forwarded the
 * graph's internal `skybox-loaded` under its bare name, so a page waiting on the documented name
 * waited forever. The element now fires `graphty-skybox-loaded` (`detail.url`) once per image it
 * loads, and `graphty-skybox-failed` (`E_IMAGE_LOAD`, `params.url`) for one it cannot.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { SKYBOX_PNG } from "../session/history/fixtures";

const containers: HTMLElement[] = [];

afterEach(() => {
    for (const container of containers.splice(0)) {
        container.remove();
    }
});

/**
 * A settled element in the page.
 * @returns The element.
 */
async function mount(): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    containers.push(container);
    const element = document.createElement("graphty-element");
    container.appendChild(element);
    await element.updateComplete;
    await element.waitForSettled();
    return element;
}

describe("graphty-skybox-loaded", () => {
    it("fires on the element, with the image's URL, once the background image has loaded", async () => {
        const element = await mount();
        const loaded = new Promise<CustomEvent<{ url: string }>>((resolve) => {
            element.addEventListener("graphty-skybox-loaded", resolve, { once: true });
        });

        element.background = { backgroundType: "skybox", data: SKYBOX_PNG };

        const event = await loaded;
        assert.strictEqual(event.detail.url, SKYBOX_PNG);
        assert.isTrue(event.bubbles && event.composed, "a listener on the document hears it too");
    });

    it("fires graphty-skybox-failed with E_IMAGE_LOAD for an image that cannot be loaded", async () => {
        const element = await mount();
        const url = "data:image/png;base64,bm90IGEgcGljdHVyZQ==";
        const failed = new Promise<HTMLElementEventMap["graphty-skybox-failed"]>((resolve) => {
            element.addEventListener("graphty-skybox-failed", resolve, { once: true });
        });

        element.background = { backgroundType: "skybox", data: url };

        assert.deepEqual((await failed).detail, { code: "E_IMAGE_LOAD", params: { url } });
    });
});
