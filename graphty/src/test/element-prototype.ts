/**
 * @file The registered `<graphty-element>`'s prototype, for a test that spies on one of its methods,
 * and the common such spy: every `enableAiControl` reaches the test's own provider.
 */

import type { AiManagerConfig } from "@graphty/graphty-element/ai";
import { vi } from "vitest";

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * The prototype of the class registered as `graphty-element`, the one every element on the page
 * runs: an import of the class may be another copy when the tag was defined first.
 * @returns the prototype.
 */
export function elementPrototype(): Element {
    const tag = customElements.get("graphty-element") as unknown as { prototype: Element } | undefined;
    if (tag === undefined) {
        throw new Error("graphty-element is not registered: import @graphty/graphty-element first");
    }
    return tag.prototype;
}

/**
 * Sends every `enableAiControl` through `change` before the element's own, so a test points it at
 * its scripted provider (`providerInstance`) instead of the network.
 * @param change - the configuration the element is enabled with, from the one the app asked for; it
 * may throw, as the element's own enable would.
 */
export function scriptEnable(change: (config: AiManagerConfig) => AiManagerConfig): void {
    const prototype = elementPrototype();
    const real = prototype.enableAiControl;
    vi.spyOn(prototype, "enableAiControl").mockImplementation(async function enable(this: Element, config) {
        await real.call(this, change(config));
    });
}
