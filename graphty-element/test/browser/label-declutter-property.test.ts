/**
 * @file `labelDeclutter` switches the overlap rule for node labels from the element, as a
 * preference of the view: no undo step, no change of project state, and no `layoutBehavior`
 * assignment, which also carries the project's layout pacing.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { dispatcherOf } from "../../src/session/GraphSession";
import { stateDigest } from "../../src/session/project/digest";

describe("labelDeclutter", () => {
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
     * Stand an element up.
     * @param attributes - The attributes to set before it is connected.
     * @returns The element.
     */
    function mount(attributes: Readonly<Record<string, string>> = {}): Graphty {
        const element = document.createElement("graphty-element");
        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, value);
        }

        container.appendChild(element);
        return element;
    }

    it("is off by default", () => {
        const element = mount();

        assert.isFalse(element.labelDeclutter);
        assert.isFalse(element.graph.styles.config.behavior.labels.declutter);
    });

    it("switches on and off at runtime without a step or a change of project state", () => {
        const element = mount();
        const session = element.graph.getSession();
        const before = stateDigest(dispatcherOf(session).state);
        const steps = session.history.steps.length;

        element.labelDeclutter = true;
        assert.isTrue(element.labelDeclutter);
        assert.isTrue(element.graph.styles.config.behavior.labels.declutter);

        element.labelDeclutter = false;
        assert.isFalse(element.labelDeclutter);
        assert.isFalse(element.graph.styles.config.behavior.labels.declutter);

        assert.strictEqual(stateDigest(dispatcherOf(session).state), before);
        assert.lengthOf(session.history.steps, steps);
    });

    it("is switched on by the label-declutter attribute, and off by removing it", async () => {
        const element = mount({ "label-declutter": "" });
        await element.updateComplete;
        assert.isTrue(element.labelDeclutter);

        element.removeAttribute("label-declutter");
        await element.updateComplete;
        assert.isFalse(element.labelDeclutter);
    });

    it("leaves the project's layout pacing alone", () => {
        const element = mount();
        element.layoutBehavior = { layout: { preSteps: 9 } };

        element.labelDeclutter = true;

        assert.strictEqual(element.graph.styles.config.behavior.layout.preSteps, 9);
    });
});
