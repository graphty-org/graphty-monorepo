/**
 * Style panel v2's home table (design/ui/style-panel-v2/design.md, section 10.3), built from
 * graphty-element's catalog and the panel's tables: no channel is a line of two things, every
 * channel the element offers has a place to be seen, and every member of a style family reaches
 * every setting the family keeps through a switch.
 */

import { type Channel, channelsFor, labelFieldOf, STYLE_FAMILIES } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { itemChannels, PARTS } from "../parts/parts";
import { EDGE_RUBRIC, NODE_RUBRIC, rubricChannels, SHAPE_REPLACE_RUBRIC, type ThingRubric } from "../v2/rubric";
import { SECTIONS } from "../v2/things";

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
        picture: NODE_RUBRIC["fill:node.texture"],
    },
    "edge.line": { solid: EDGE_RUBRIC.line, gradient: EDGE_RUBRIC["line:edge.gradientColors"] },
};

/**
 * Where a solid fill's or line's own color field already carries a setting: its opacity (R1).
 * @param family - the family.
 * @param member - the member.
 * @returns the channels its main color carries.
 */
function carried(family: string, member: string): readonly Channel[] {
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

        it(`${side}: every channel the element offers has a place in the panel`, () => {
            const placed = new Set<Channel>([
                ...Object.values(RUBRICS[side]).flatMap((rubric) => rubricChannels(rubric)),
                ...SECTIONS[side].flatMap((section) => section.groups.flat().flatMap((thing) => thing.main)),
                ...PARTS[side].flatMap((part) => part.items.flatMap((item) => itemChannels(item))),
            ]);
            // A channel the element does not draw (`renderable: false`) is offered nowhere.
            const unplaced = channelsFor(side)
                .filter(({ renderable }) => renderable)
                .map(({ channel }) => channel)
                .filter((channel) => !placed.has(channel) && labelFieldOf(channel) === undefined);
            assert.deepEqual(unplaced, []);
        });
    }

    for (const family of STYLE_FAMILIES.filter((each) => each.id in MEMBER_RUBRICS)) {
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
