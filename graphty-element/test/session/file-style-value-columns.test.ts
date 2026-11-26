/**
 * @file The data columns a load writes to hold a file's per-element style values (each node's own fill) are hidden
 * when the load asks (`styleOptions.valueColumns: "hidden"`), and left like any other column by default. A column the
 * file carries as data is never hidden.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession } from "../../session";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

const DOT = `digraph {
  a [team="red", fillcolor="#ff0000", style=filled, shape=box];
  b [team="blue", fillcolor="#0000ff", style=filled, shape=ellipse];
  c [team="red", fillcolor="#00ff00", style=filled, shape=octagon];
  a -> b [color="#123456"]; b -> c [color="#654321"];
}`;

/**
 * The node columns after loading the file, split into hidden and shown.
 * @param valueColumns - The option, or undefined for the default.
 * @returns The hidden and shown column names, and whether the fills still draw.
 */
async function columns(
    valueColumns?: "shown" | "hidden",
): Promise<{ hidden: string[]; shown: string[]; fill: unknown }> {
    const session = createGraphSession();
    await session.data.import(
        { type: "dot", config: { data: DOT } },
        { styles: "file", layout: "recommended", styleOptions: valueColumns === undefined ? {} : { valueColumns } },
    );
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    const attributes = session.data.attributes();
    const out = {
        hidden: attributes.filter((a) => a.hidden === true).map((a) => `${a.kind}:${a.name}`),
        shown: attributes.filter((a) => a.hidden !== true).map((a) => `${a.kind}:${a.name}`),
        fill: JSON.stringify((session.styles.explain({ node: "c" }).merged as Record<string, unknown>)["node.color"]),
    };
    session.dispose();
    return out;
}

describe("the columns holding a file's style values", () => {
    it("are hidden when the load asks, and the file's own data columns are not", async () => {
        const { hidden, shown, fill } = await columns("hidden");
        assert.isNotEmpty(hidden, "the per-node fills and shapes are kept in columns of their own");
        assert.include(shown, "node:team");
        assert.include(shown, "node:fillcolor", "the file's own attribute stays data");
        assert.notInclude(hidden, "node:team");
        assert.equal(fill, (await columns()).fill, "hiding a column changes nothing drawn");
    });

    it("are left like any other column by default", async () => {
        const { hidden } = await columns();
        assert.deepEqual(hidden, []);
    });
});
