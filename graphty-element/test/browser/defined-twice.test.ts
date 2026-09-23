/**
 * Loading the element module a second time must not break the page.
 *
 * A page can evaluate this module twice: two bundles that each carry a copy of the element, or a
 * page that registered its own element under the tag first. `customElements.define` throws on a
 * name that is taken, and an uncaught throw at module evaluation takes down every script that
 * imported it -- Storybook's story indexer, for one, fails the whole build. The element must keep
 * the definition that is already there and say so on the console when it is a different class.
 */
import { afterEach, assert, test, vi } from "vitest";

import { Graphty } from "../../src/graphty-element";

afterEach(() => {
    vi.restoreAllMocks();
});

test("a second copy of the module loads without throwing and keeps the first definition", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // The query string makes the bundler treat this as a separate module, so its class is a
    // second, different Graphty -- the same situation as two bundled copies of the package. The
    // specifier is a variable because TypeScript cannot resolve a path that carries a query.
    const secondCopy = "../../src/graphty-element.ts?second-copy";
    const second = (await import(/* @vite-ignore */ secondCopy)) as { Graphty: typeof Graphty };

    assert.notStrictEqual(second.Graphty, Graphty);
    assert.strictEqual(customElements.get("graphty-element"), Graphty);
    assert.isTrue(
        warn.mock.calls.some((args) => String(args[0]).includes("graphty-element")),
        "a clash with a different class is reported on the console",
    );
});
