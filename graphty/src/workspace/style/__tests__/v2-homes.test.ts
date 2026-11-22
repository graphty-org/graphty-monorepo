/**
 * Style panel v2's home table (design/ui/style-panel-v2/design.md, section 10.3), built from
 * graphty-element's catalog and the panel's tables: no channel is a line of two things, and every member of
 * a style family reaches every setting the family keeps through a switch. That every channel has a place
 * is v2-inventory.real-element.test.tsx's check 1.
 */

import { type Channel, STYLE_FAMILIES } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { familyOf } from "../v2/families";
import { EDGE_RUBRIC, NODE_RUBRIC, rubricChannels, SHAPE_REPLACE_RUBRIC, type ThingRubric } from "../v2/rubric";

/** Each kind's rubric table. */
const RUBRICS = { node: NODE_RUBRIC, edge: EDGE_RUBRIC } as const;

/** Each family member's rubric, by family and member. */
const MEMBER_RUBRICS: Readonly<Record<string, Readonly<Record<string, ThingRubric | undefined>>>> = {
    "node.shape": {
        basic: NODE_RUBRIC.shape,
        model: NODE_RUBRIC["shape:node.model"],
        replace: SHAPE_REPLACE_RUBRIC,
    },
    "node.fill": {
        solid: NODE_RUBRIC.fill,
        gradient: NODE_RUBRIC["fill:node.gradientColors"],
    },
    "edge.line": {
        solid: EDGE_RUBRIC.line,
        gradient: EDGE_RUBRIC["line:edge.gradientColors"],
        strands: EDGE_RUBRIC["line:edge.strandColors"],
    },
};

/**
 * Where a setting kept through a switch is reached besides the member's pop-over: a solid fill's or line's own
 * color field carries its opacity (R1), a node's Size row its size and an edge's Pattern row its pattern.
 * @param family - the family.
 * @param member - the member.
 * @returns the channels its main color carries.
 */
function carried(family: string, member: string): readonly Channel[] {
    // A node's size settings are the Size row's and its shading Fill's Finish row's, beside every Shape member's row
    // (ia-design 2, E189).
    if (family === "node.shape") {
        return ["node.size", ...rubricChannels(NODE_RUBRIC.size), ...rubricChannels(NODE_RUBRIC.finish)];
    }
    // An edge's pattern is its Pattern row's, beside every Line member's row.
    if (family === "edge.line") {
        return [...rubricChannels(EDGE_RUBRIC.pattern), ...(member === "solid" ? ["edge.opacity" as Channel] : [])];
    }
    if (member !== "solid") {
        return [];
    }
    return family === "node.fill" ? ["node.opacity"] : ["edge.opacity"];
}

describe("Style panel v2's home table", () => {
    for (const side of ["node", "edge"] as const) {
        it(`${side}: no channel is a line of two things`, () => {
            const homes = new Map<Channel, Set<string>>();
            for (const [key, rubric] of Object.entries(RUBRICS[side])) {
                const thing = key.split(":")[0];
                for (const channel of rubricChannels(rubric)) {
                    homes.set(channel, new Set([...(homes.get(channel) ?? []), thing]));
                }
            }
            const twice = [...homes]
                .filter(([, things]) => things.size > 1)
                .map(([c, t]) => `${c}: ${[...t].join(", ")}`);
            assert.deepEqual(twice, []);
        });
    }

    // The members each row's Switch to lists (a fill's picture is Image's Wrap around shape, ia-design 2).
    const listed = STYLE_FAMILIES.filter((each) => each.id in MEMBER_RUBRICS).map((each) => {
        const things: Readonly<Record<string, string>> = {
            "node.shape": "shape",
            "node.fill": "fill",
            "edge.line": "line",
        };
        const thing = things[each.id] ?? "";
        return familyOf(each.target === "edge" ? "edge" : "node", thing) ?? each;
    });
    for (const family of listed) {
        it(`${family.id}: every member's pop-over reaches every setting kept through a switch`, () => {
            for (const member of family.members) {
                const rubric = MEMBER_RUBRICS[family.id][member.id];
                assert.isDefined(rubric, `${family.id}.${member.id} has a rubric`);
                const reached = new Set<string>([
                    ...rubricChannels(rubric ?? { main: [] }),
                    ...carried(family.id, member.id),
                ]);
                const missing = family.shared.filter((channel) => !reached.has(channel));
                assert.deepEqual(missing, [], `${family.id}.${member.id}`);
            }
        });
    }
});
