/**
 * @file The `features` attribute reaches the element's session, and the element says what it
 * honored. This build declares no experiment, so every id is reported as unknown.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { EnabledFeatures } from "../../index.js";

describe("the features attribute", () => {
    const made: HTMLElement[] = [];

    afterEach(() => {
        made.splice(0).forEach((element) => {
            element.remove();
        });
    });

    it("reports the ids it read in enabledFeatures and the graphty-features event", async () => {
        const element = document.createElement("graphty-element");
        element.setAttribute("features", "  later-idea   other ");
        const heard = new Promise<EnabledFeatures>((resolve) => {
            element.addEventListener("graphty-features", (event) => {
                resolve(event.detail);
            });
        });
        made.push(element);
        document.body.appendChild(element);

        const detail = await heard;
        assert.deepEqual(element.features, ["later-idea", "other"]);
        assert.deepEqual(detail, { enabled: [], unknown: ["later-idea", "other"] });
        assert.strictEqual(element.enabledFeatures, detail);
    });

    it("keeps the ids it was given when the caller changes its array afterwards", () => {
        const element = document.createElement("graphty-element");
        const ids = ["timeline"];
        element.features = ids;
        ids.push("location-map");
        assert.deepEqual(element.features, ["timeline"]);
    });
});
