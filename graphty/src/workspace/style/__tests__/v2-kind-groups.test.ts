/**
 * Style panel v2's kind groups (kindGroups.ts) name only graphty-element's own channels: every owned channel
 * exists and is owned by one kind, every slot is in its kind's channels, and a kind's main channel is its own.
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
                for (const channel of owns) {
                    assert.isDefined(channelDescriptor(channel), `${channel} is graphty-element's`);
                    assert.isUndefined(seen.get(channel), `${channel} is owned by ${member.id} only`);
                    seen.set(channel, member.id);
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
