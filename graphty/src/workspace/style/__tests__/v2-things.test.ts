/**
 * Style panel v2's section table (style/v2/things.ts) against parts.ts: every section is a part,
 * every item of a part (shaders apart) belongs to exactly one thing (its own section's, or one that takes it whole), and no "+" menu passes 12.
 */

import { assert, describe, it } from "vitest";

import { itemChannels, PARTS } from "../parts/parts";
import { byKind, SECTIONS, type ThingSpec } from "../v2/things";

describe("Style panel v2's sections", () => {
    for (const side of ["node", "edge"] as const) {
        it(`${side}: every part is a section and every item is in one thing`, () => {
            // The owner removed Order and groups (E420, E422): its part is no section. Shaders are Effects'
            // Shader item (E668): their part is no section either.
            assert.sameMembers(
                SECTIONS[side].map((section) => section.part),
                PARTS[side].map((part) => part.id).filter((id) => id !== "order" && id !== "shaders"),
            );
            for (const section of SECTIONS[side]) {
                const part = PARTS[side].find((each) => each.id === section.part);
                assert.isDefined(part, section.part);
                const things = section.groups.flat();
                assert.isAtMost(things.length, 12, `${section.part}: at most 12 in its menu`);
                // An item another section's thing takes whole as its own (the ring, in Effects) is that thing's.
                const takenWhole = (channels: readonly string[]): number =>
                    SECTIONS[side]
                        .flatMap((each) => each.groups.flat())
                        .filter((thing) => channels.every((channel) => thing.own?.includes(channel as never) === true))
                        .length;
                for (const item of part?.items ?? []) {
                    const owners = things.filter((thing) => thing.items.includes(item.id));
                    assert.equal(
                        owners.length + takenWhole(itemChannels(item)),
                        1,
                        `${side} ${section.part} ${item.id}`,
                    );
                }
                for (const thing of things) {
                    for (const item of thing.items) {
                        assert.isTrue(
                            part?.items.some((each) => each.id === item),
                            `${thing.id}: ${item}`,
                        );
                    }
                }
            }
        });
    }
});

describe("the sections' order (ia-design.md section 2, E675)", () => {
    const order = (side: "node" | "edge"): string[] =>
        SECTIONS[side].map((section) => `${section.breakBefore === true ? "| " : ""}${section.title ?? section.part}`);

    it("node: Fill, Text, Shape, Border | Visibility, Effects", () => {
        assert.deepEqual(order("node"), ["fill", "text", "shape", "border", "| visibility", "effects"]);
    });

    it("edge: Line, Arrows, Route, Text | Visibility, Effects", () => {
        assert.deepEqual(order("edge"), ["line", "Arrows", "route", "text", "| visibility", "effects"]);
    });

    it("each tab's Effects holds its one Shader item (E668)", () => {
        for (const side of ["node", "edge"] as const) {
            const shaders = SECTIONS[side].flatMap((section) =>
                section.groups
                    .flat()
                    .filter((thing) => thing.shader === true)
                    .map(() => section.part),
            );
            assert.deepEqual(shaders, ["effects"], side);
        }
    });
});

describe("a long section", () => {
    const thing = (name: string): ThingSpec => ({ id: name.toLowerCase(), name, items: [], main: [] });
    const rows = (names: readonly string[]): { thing: ThingSpec }[] => names.map((name) => ({ thing: thing(name) }));

    it("draws up to 8 rows as they are, with no legend", () => {
        const runs = byKind(rows(["Label", "Label", "Tooltip", "Record", "Label", "Tooltip", "Record", "Label"]));
        assert.deepEqual(
            runs.map((run) => run.legend),
            [undefined],
        );
    });

    it("separates 9 rows by kind under one always-open legend each, in the section's order", () => {
        const runs = byKind(
            rows([
                "Label",
                "Label",
                "Label",
                "Label",
                "External label",
                "External label",
                "Tooltip",
                "Tooltip",
                "Tooltip",
            ]),
        );
        assert.deepEqual(
            runs.map((run) => [run.legend, run.rows.length]),
            [
                ["Label", 4],
                ["External label", 2],
                ["Tooltip", 3],
            ],
        );
    });
});
