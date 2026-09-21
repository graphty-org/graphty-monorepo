/**
 * @file The two settings that came back as properties when the style template was removed.
 *
 * WHY THIS FILE EXISTS. The 1.x style template used to be the only way to set the graph's
 * background and its starting camera distance. Removing the template without replacing those
 * would have taken them away silently -- nothing would have failed, and a page that set a
 * background would simply have stopped having one. They are properties now, and this pins that
 * they actually work, because the failure mode when they do not is invisible.
 *
 * IT PINS THE ATTRIBUTE FORM SPECIFICALLY. A property assignment is hard to get wrong; an
 * attribute is not. Lit hands a setter the raw attribute TEXT unless the property says
 * otherwise, so a JSON-valued attribute arrives as a string and a number arrives as a string.
 * Both did, when these properties first landed: the background threw a schema error out of
 * `attributeChangedCallback`, where it escaped as an unhandled rejection rather than reaching
 * anybody, and the camera distance wrote the string "60" into a number field. Neither failed a
 * test, because no test set an attribute.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

/** How long to leave the element to come up before reading what it made of an attribute. */
const READY_MS = 400;

describe("the background and starting camera distance attributes", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    /**
     * Stand an element up with the given attributes and let it finish coming up.
     * @param attributes - The attributes to set before it is connected.
     * @returns The element.
     */
    async function mount(attributes: Readonly<Record<string, string>>): Promise<Graphty> {
        const element = document.createElement("graphty-element") as Graphty;

        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, value);
        }

        container.appendChild(element);
        await new Promise((resolve) => setTimeout(resolve, READY_MS));

        return element;
    }

    it("reads a JSON background attribute as an object and applies it", async () => {
        const element = await mount({ background: '{"backgroundType":"color","color":"black"}' });

        assert.isObject(element.background, "the attribute arrives as an object, not as its own text");

        const applied = element.graph.getStyles().config.graph.background;

        assert.strictEqual(applied.backgroundType, "color");
        // Normalised by the schema on the way in, which is how a CSS colour name becomes a hex
        // string: proof the value reached the parser rather than being stored raw.
        assert.strictEqual(applied.backgroundType === "color" ? applied.color : null, "#000000");
    });

    it("reads a starting camera distance attribute as a number", async () => {
        const element = await mount({ "starting-camera-distance": "60" });

        assert.strictEqual(element.graph.getStyles().config.graph.startingCameraDistance, 60);
        assert.strictEqual(typeof element.graph.getStyles().config.graph.startingCameraDistance, "number");
    });

    /**
     * A wrong value in markup must not take the graph down. HTML has never behaved that way about
     * an attribute, and an embedded component must not be the first thing that does -- so a
     * refusal is reported and the previous value stands, the same rule `acceleration` follows.
     */
    it("keeps the graph alive when the background attribute is not JSON at all", async () => {
        const element = await mount({ background: "not-json" });

        assert.isDefined(element.graph, "the element still came up");
        assert.strictEqual(
            element.graph.getStyles().config.graph.background.backgroundType,
            "color",
            "and kept the background it already had",
        );
    });

    it("keeps the graph alive when the background attribute is JSON the schema refuses", async () => {
        const element = await mount({ background: '{"backgroundType":"gradient"}' });

        assert.isDefined(element.graph);
        assert.strictEqual(element.graph.getStyles().config.graph.background.backgroundType, "color");
    });
});
