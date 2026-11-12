/**
 * @file Kinds of node on the rendered element: an auth log loaded with a user kind and a host
 * kind keeps the user "admin" and the host "admin" apart, and a style layer paints by kind.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

const AUTH_LOG = "time,user,host\n1,alice,web1\n2,admin,web1\n3,alice,admin\n";

let mounted: Graphty | null = null;

/**
 * Mount an empty element and wait for it to settle.
 * @returns the element
 */
async function mount(): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.innerHTML = `<graphty-element style="width:100%;height:100%;display:block"></graphty-element>`;
    document.body.appendChild(container);
    const element = container.querySelector("graphty-element") as Graphty;
    mounted = element;
    await element.updateComplete;
    await element.waitForSettled();
    return element;
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("kinds of node on the element", () => {
    test("scoped ids keep two admins apart, and a layer paints the hosts", async () => {
        const { session } = await mount();
        const draft = await session.data.prepare({ config: { file: new File([AUTH_LOG], "auth-log.csv") } });
        await draft.load({
            mapping: { rowsAre: "edges", source: "user", target: "host", sourceKind: "user", targetKind: "host" },
            kindIds: "scoped",
        });
        assert.deepStrictEqual(session.data.lastImport()?.kinds, { sharedIds: 1, byKind: { user: 2, host: 2 } });

        const layer = await session.styles.add({
            name: "Hosts",
            target: "node",
            selector: { match: "expression", where: "data.kind == 'host'" },
            set: { "node.color": "#ff0000" },
        });
        const painted = session.data
            .nodes()
            .map((node) => String(node.id))
            .filter((id) =>
                session.styles.explain({ node: id }).contributions.some((each) => each.layerId === layer.id),
            )
            .sort();
        assert.deepStrictEqual(painted, ["host:admin", "web1"]);
    });
});
