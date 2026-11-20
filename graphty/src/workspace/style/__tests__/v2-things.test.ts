/**
 * Style panel v2's section table (style/v2/things.ts) against parts.ts: every section is a part,
 * every item of a part (shaders apart) belongs to exactly one thing (its own section's, or one that takes it whole), and no "+" menu passes 12.
 */

import { assert, describe, it } from "vitest";

import { itemChannels, PARTS } from "../parts/parts";
import { SECTIONS } from "../v2/things";

describe("Style panel v2's sections", () => {
    for (const side of ["node", "edge"] as const) {
        it(`${side}: every part is a section and every item is in one thing`, () => {
            // The owner removed Order and groups (E420, E422): its part is no section.
            assert.sameMembers(
                SECTIONS[side].map((section) => section.part),
                PARTS[side].map((part) => part.id).filter((id) => id !== "order"),
            );
            for (const section of SECTIONS[side]) {
                const part = PARTS[side].find((each) => each.id === section.part);
                assert.isDefined(part, section.part);
                const things = section.groups.flat();
                assert.isAtMost(things.length, 12, `${section.part}: at most 12 in its menu`);
                if (section.part === "shaders") {
                    continue;
                }
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
