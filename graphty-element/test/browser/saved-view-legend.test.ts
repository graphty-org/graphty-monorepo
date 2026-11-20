/**
 * A saved view that includes `"legend"` keeps the element's legend switch, and `views.open` turns
 * it back (issue #816); the element reads and writes it, so the page writes no glue.
 */
import "../../src/graphty-element";

import { afterEach, assert, test } from "vitest";

import type { Graphty } from "../../index.js";

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const el of mounted.splice(0)) {
        el.remove();
    }
});

test("opening a view brings the legend switch back", async () => {
    const host = document.createElement("graphty-element");
    host.setAttribute("style", "width: 400px; height: 300px;");
    document.body.appendChild(host);
    mounted.push(host);
    await host.updateComplete;
    await host.addNodes([{ id: "a" }, { id: "b" }]);

    host.legend = true;
    await host.session.views.save([{ name: "with key", include: ["legend"] }]);
    assert.isTrue(host.session.views.get("with key")?.legend);

    host.legend = false;
    await host.session.views.open("with key");
    assert.isTrue(host.legend);

    // A view saved without the part leaves the switch alone.
    await host.session.views.save([{ name: "plain" }]);
    host.legend = false;
    await host.session.views.open("plain");
    assert.isFalse(host.legend);
});
