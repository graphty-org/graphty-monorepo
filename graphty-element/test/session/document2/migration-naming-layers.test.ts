/**
 * @file Which version 1 style layers name elements (spec 4.2 rule 5, 5 rule 1): a layer whose
 * selector lists nodes, follows a set that does, or holds a rule leaf that does moves to the view
 * with its node ids written as element references; every other layer stays in the style. Sets are
 * followed through rule sets, nested sets and a set that names itself.
 */

import { assert, describe, it } from "vitest";

import { migrateDocument1 } from "../../../src/session/document2/migration";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";
import { baseSession } from "../../helpers/project-session";

/** The selectors under test, by layer name, and whether each names elements. */
const LAYERS: [name: string, selector: JsonObject, names: boolean][] = [
    ["everything", { match: "everything" }, false],
    ["expression", { match: "expression", where: "data.dept == `1`" }, false],
    ["inline nodes", { match: "member", of: { nodes: ["a"] } }, true],
    ["inline fixed set", { match: "member", of: { define: { kind: "fixed", nodes: ["b"] } } }, true],
    [
        "inline rule set, no names",
        { match: "member", of: { define: { kind: "rule", where: { kind: "range", attribute: "data.dept", min: 1 } } } },
        false,
    ],
    ["fixed set", { match: "member", of: { set: "set_core" } }, true],
    ["rule set naming nodes", { match: "member", of: { set: "set_around" } }, true],
    ["rule set naming none", { match: "member", of: { set: "set_dept" } }, false],
    ["set naming itself", { match: "member", of: { set: "set_loop" } }, false],
    ["unknown set", { match: "member", of: { set: "set_missing" } }, false],
    ["scope not an object", { match: "member", of: "set_core" }, false],
    [
        "neighborhood in any",
        {
            match: "rule",
            where: {
                kind: "any",
                of: [
                    { kind: "range", attribute: "data.dept", min: 2 },
                    { kind: "neighborhood", seeds: ["c"], depth: 1 },
                ],
            },
        },
        true,
    ],
    ["member under not", { match: "rule", where: { kind: "not", of: { kind: "member", of: { nodes: ["b"] } } } }, true],
    ["rule naming none", { match: "rule", where: { kind: "all", of: [{ kind: "isolated" }] } }, false],
    ["rule not an object", { match: "rule", where: "data.dept" }, false],
];

/**
 * A version 1 file of a three-node session, its sets and style layers replaced by the given ones,
 * migrated.
 * @returns The migrated sections and the problems reported.
 */
async function migrated(): Promise<{ style: JsonObject; view: JsonObject; problems: DocumentProblem[] }> {
    const session = await baseSession();
    const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as { members: JsonObject[] };
    session.dispose();
    const member = (kind: string): JsonObject => {
        const found = v1.members.find((each) => each.kind === kind);
        assert.isDefined(found, kind);
        return found;
    };
    member("graphty-session").sets = [
        { id: "set_core", name: "Core", definition: { kind: "fixed", nodes: ["a", "b"], reading: "induced" } },
        {
            id: "set_around",
            name: "Around",
            definition: {
                kind: "rule",
                reading: "induced",
                where: { kind: "member", of: { set: "set_core" } },
            },
        },
        {
            id: "set_dept",
            name: "Dept",
            definition: { kind: "rule", reading: "induced", where: "data.dept == `1`" },
        },
        {
            id: "set_loop",
            name: "Loop",
            definition: { kind: "rule", reading: "induced", where: { kind: "member", of: { set: "set_loop" } } },
        },
    ];
    member("graphty-style").layers = LAYERS.map(([name, selector]) => ({
        name,
        target: "node",
        kind: "custom",
        selector,
        source: { by: "user" },
        enabled: true,
        set: { "node.size": 2 },
    }));

    const problems: DocumentProblem[] = [];
    const v2 = migrateDocument1(v1, problems);
    assert.isDefined(v2);
    const sections = v2.sections as Record<string, JsonObject>;
    return { style: sections.style, view: sections.view, problems };
}

/**
 * A layer by name.
 * @param layers - The layers.
 * @param name - Its name.
 * @returns The layer.
 */
function layer(layers: unknown, name: string): JsonObject {
    const found = (layers as JsonObject[]).find((each) => each.name === name);
    assert.isDefined(found, name);
    return found;
}

describe("a version 1 layer that names elements", () => {
    it("moves to the view, and one that names none stays in the style, in the file's order", async () => {
        const { style, view } = await migrated();
        const names = (layers: unknown): unknown[] => (layers as JsonObject[]).map((each) => each.name);
        assert.deepStrictEqual(
            names(style.layers),
            LAYERS.filter(([, , named]) => !named).map(([name]) => name),
        );
        assert.deepStrictEqual(
            names(view.layers),
            LAYERS.filter(([, , named]) => named).map(([name]) => name),
        );
        assert.lengthOf(view.order as unknown[], LAYERS.length);
    });

    it("writes the node ids a moved layer lists as element references", async () => {
        const { view } = await migrated();
        const ref = (key: string): JsonObject => {
            const [first] = (layer(view.layers, "inline nodes").selector as { of: { nodes: JsonObject[] } }).of.nodes;
            return { space: first.space, key };
        };
        assert.deepStrictEqual(layer(view.layers, "inline nodes").selector, {
            match: "member",
            of: { nodes: [ref("a")] },
        });
        assert.deepStrictEqual(layer(view.layers, "inline fixed set").selector, {
            match: "member",
            of: { nodes: [ref("b")] },
        });
        const any = layer(view.layers, "neighborhood in any").selector as { where: { of: JsonObject[] } };
        assert.deepStrictEqual(any.where.of[1], { kind: "neighborhood", seeds: [ref("c")], depth: 1 });
        assert.deepStrictEqual(layer(view.layers, "member under not").selector, {
            match: "rule",
            where: { kind: "not", of: { kind: "member", of: { nodes: [ref("b")] } } },
        });
    });

    it("renames a followed set to its version 2 id, the same one the view's sets carry", async () => {
        const { view } = await migrated();
        const setIds = new Map((view.sets as JsonObject[]).map((set) => [set.name, set.id]));
        const scope = (name: string): unknown => (layer(view.layers, name).selector as { of: unknown }).of;
        assert.deepStrictEqual(scope("fixed set"), { set: setIds.get("Core") });
        assert.deepStrictEqual(scope("rule set naming nodes"), { set: setIds.get("Around") });
        assert.match(String(setIds.get("Core")), /^set_[0-9A-HJKMNP-TV-Z]{26}$/);
    });
});
