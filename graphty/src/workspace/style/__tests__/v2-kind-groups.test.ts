/**
 * Style panel v2's kind groups (kindGroups.ts) name only graphty-element's own channels: every owned channel
 * exists and is owned by one kind (the looks of one text together), every slot is in its kind's channels, and a
 * kind's main channel is its own.
 */

import { channelDescriptor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { KIND_GROUPS, ownsOf } from "../v2/kindGroups";

describe("Style panel v2's kind groups", () => {
    for (const group of KIND_GROUPS) {
        it(`${group.id}: each channel is graphty-element's and owned once; slots and heads are their kind's`, () => {
            const seen = new Map<string, string>();
            for (const member of group.members) {
                const owns = ownsOf(group, member);
                assert.isNotEmpty(owns, member.id);
                assert.include(owns, member.head, `${member.id}'s main channel is its own`);
                // The looks of one text share its channels, told apart by its style's look (E196).
                const owner = member.look === undefined ? member.id : `look of ${member.look.style}`;
                for (const channel of owns) {
                    assert.isDefined(channelDescriptor(channel), `${channel} is graphty-element's`);
                    const held = seen.get(channel);
                    assert.isTrue(held === undefined || held === owner, `${channel} is owned by ${owner} only`);
                    seen.set(channel, owner);
                }
                for (const refs of Object.values(member.slots)) {
                    for (const ref of refs ?? []) {
                        assert.include(owns, typeof ref === "string" ? ref : ref.style, `${member.id}'s slot`);
                    }
                }
            }
        });
    }
});
