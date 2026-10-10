import { describe, expect, it } from "vitest";

import {
    coneMembers,
    hintStrings,
    HOME_ROW,
    nextLetters,
    VOICE_SAFE,
} from "../../src/techniques/dense-picking/hint-strings";

const prefixFree = (tags: string[]): boolean => tags.every((a, i) => tags.every((b, j) => i === j || !b.startsWith(a)));

describe("hint tags", () => {
    it("the voice-safe alphabet leaves out letters whose names sound alike", () => {
        for (const ch of "bdeptv") {
            expect(VOICE_SAFE).not.toContain(ch);
        }
        expect(new Set(VOICE_SAFE).size).toBe(20);
    });

    it.each([1, 5, 19, 20, 21, 57, 400])("%i tags: two letters, unique, prefix-free", (count) => {
        const tags = hintStrings(count, VOICE_SAFE);
        expect(tags).toHaveLength(count);
        expect(new Set(tags).size).toBe(count);
        expect(tags.every((t) => t.length === 2 && Array.from(t).every((c) => VOICE_SAFE.includes(c)))).toBe(true);
        expect(prefixFree(tags)).toBe(true);
    });

    it("up to one alphabet of tags, the first letter alone tells them apart", () => {
        const tags = hintStrings(VOICE_SAFE.length, VOICE_SAFE);
        expect(new Set(tags.map((t) => t[0])).size).toBe(VOICE_SAFE.length);
    });

    it("past the alphabet squared, tags grow a letter and stay prefix-free", () => {
        const tags = hintStrings(450, HOME_ROW);
        expect(prefixFree(tags)).toBe(true);
        expect(Math.max(...tags.map((t) => t.length))).toBe(3);
    });

    it("nextLetters offers only letters that lead to a tag", () => {
        expect(nextLetters(["ac", "af", "ca"], "")).toEqual(["a", "c"]);
        expect(nextLetters(["ac", "af", "ca"], "a")).toEqual(["c", "f"]);
        expect(nextLetters(["ac", "af", "ca"], "ac")).toEqual([]);
    });
});

describe("cone", () => {
    // Nodes along +z at 1 m, offset sideways by 0, 1, 3 and 10 cm, and one behind the origin.
    const world = Float32Array.from([0, 0, 1, 0.01, 0, 1, 0.03, 0, 1, 0.1, 0, 1, 0, 0, -1]);
    const ray = { origin: [0, 0, 0], dir: [0, 0, 1] };

    it("keeps exactly the nodes inside the half angle, nearest the axis first", () => {
        // 2 degrees at 1 m is 3.5 cm sideways.
        expect(coneMembers(world, ray, (2 * Math.PI) / 180)).toEqual([0, 1, 2]);
        expect(coneMembers(world, ray, (1 * Math.PI) / 180)).toEqual([0, 1]);
    });

    it("skips nodes behind the ray and nodes not included", () => {
        expect(coneMembers(world, ray, Math.PI / 2 - 0.01)).toEqual([0, 1, 2, 3]);
        expect(coneMembers(world, ray, (2 * Math.PI) / 180, (i) => i !== 1)).toEqual([0, 2]);
    });
});
