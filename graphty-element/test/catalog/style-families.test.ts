import { assert, describe, it } from "vitest";

import { CHANNELS, LABEL_LOOKS, LABEL_STYLE_FIELDS, STYLE_FAMILIES, styleFamily } from "../../catalog";

describe("STYLE_FAMILIES", () => {
    it("names only real channels on node and edge families, and no channel twice", () => {
        const known = new Set<string>(CHANNELS);
        for (const family of STYLE_FAMILIES.filter((each) => each.target === "node" || each.target === "edge")) {
            if (family.id === "node.groupOutline") {
                continue;
            }
            const named = [...family.shared, ...family.members.flatMap((member) => member.owns)];
            for (const channel of named) {
                assert.isTrue(known.has(channel), `${family.id}: ${channel} is a channel`);
                assert.isTrue(channel.startsWith(`${family.target}.`), `${family.id}: ${channel} is its target's`);
            }
            assert.equal(new Set(named).size, named.length, `${family.id} names each channel once`);
        }
    });

    it("keeps only what another member owns", () => {
        for (const family of STYLE_FAMILIES) {
            for (const member of family.members) {
                for (const kept of member.keeps ?? []) {
                    const owner = family.members.find((other) => other !== member && other.owns.includes(kept));
                    assert.isDefined(owner, `${family.id}.${member.id} keeps ${kept}`);
                }
            }
        }
    });

    it("tells each member apart one way", () => {
        for (const family of STYLE_FAMILIES) {
            for (const member of family.members) {
                const ways = [
                    member.place !== undefined,
                    member.shader !== undefined,
                    member.value !== undefined,
                    member.place === undefined &&
                        member.shader === undefined &&
                        member.value === undefined &&
                        member.owns.length > 0,
                ].filter(Boolean);
                assert.lengthOf(ways, 1, `${family.id}.${member.id}`);
            }
        }
    });

    it("has a member for every label look, and every other label field is shared", () => {
        const look = styleFamily("label.look");
        assert.isDefined(look);
        assert.deepEqual(
            look?.members.map((member) => member.value),
            LABEL_LOOKS.map((each) => each.id),
        );
        assert.lengthOf(look?.shared ?? [], LABEL_STYLE_FIELDS.length - 1);
        assert.notInclude(look?.shared ?? [], "look");
    });

    it("keeps a node's size through every shape switch", () => {
        const shape = styleFamily("node.shape");
        assert.include(shape?.shared ?? [], "node.size");
        assert.deepEqual(
            shape?.members.map((member) => member.id),
            ["basic", "model", "replace"],
        );
    });
});
