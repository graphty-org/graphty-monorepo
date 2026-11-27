/**
 * One path to any control (design/ui/style-panel-v2/design.md, "Input rules"): within one thing's row and pop-overs,
 * no two lines write the same channel, and within a label's no two lines write the same label style field (the label
 * Letters group's Weight line duplicated the Style line's Bold, issue #10380). That no channel is a line of two things
 * is v2-homes.test.ts's check. A Unit line only moves the value its number line edits to another unit's field, so it
 * is not a second path to that value.
 */

import { assert, describe, it } from "vitest";

import { LABEL_RUBRIC, type LabelLineSpec } from "../v2/labelRubric";
import { EDGE_RUBRIC, type LineSpec, NODE_RUBRIC, type ThingRubric } from "../v2/rubric";

/**
 * What a line writes, its Unit lines left out.
 * @param line - the line.
 * @returns the channels or fields.
 */
function writes(line: LineSpec | LabelLineSpec): readonly string[] {
    if (line.unit !== undefined) {
        return [];
    }
    const own = "channel" in line ? line.channel : line.field;
    const choices = "choices" in line ? (line.choices ?? []).flatMap((choice) => Object.keys(choice.writes)) : [];
    const more = "field" in line ? [...(line.toggles ?? []), ...(line.sides ?? [])] : [];
    return [...new Set([own, ...(line.pair === undefined ? [] : [line.pair]), ...choices, ...more])];
}

/**
 * The names written by more than one line.
 * @param lines - each line's name and what it writes.
 * @returns "channel: line, line" for each one written twice.
 */
function twice(lines: readonly (readonly [string, readonly string[]])[]): readonly string[] {
    const by = new Map<string, string[]>();
    for (const [name, written] of lines) {
        for (const each of written) {
            by.set(each, [...(by.get(each) ?? []), name]);
        }
    }
    return [...by].filter(([, names]) => names.length > 1).map(([each, names]) => `${each}: ${names.join(", ")}`);
}

/**
 * Every line of a thing's rubric, named by where it sits.
 * @param rubric - the rubric.
 * @returns each line's place and what it writes.
 */
function thingLines(rubric: ThingRubric): readonly (readonly [string, readonly string[]])[] {
    return [
        ...(rubric.rowOwns ?? []).map((channel) => ["row", [channel]] as const),
        ...(rubric.row === undefined ? [] : [["row", writes(rubric.row)] as const]),
        ...(rubric.strip === undefined ? [] : [["strip", writes(rubric.strip)] as const]),
        ...(rubric.common ?? []).map((line) => [`common ${line.name ?? line.channel}`, writes(line)] as const),
        ...rubric.main.map((line) => [`main ${line.name ?? line.channel}`, writes(line)] as const),
        ...(rubric.groups ?? []).flatMap((group) =>
            group.lines.map((line) => [`${group.name} ${line.name ?? line.channel}`, writes(line)] as const),
        ),
    ];
}

describe("one path to any control", () => {
    for (const [side, rubrics] of [
        ["node", NODE_RUBRIC],
        ["edge", EDGE_RUBRIC],
    ] as const) {
        it(`${side}: no two lines of one thing write the same channel`, () => {
            const found = Object.entries(rubrics).flatMap(([key, rubric]) =>
                twice(thingLines(rubric)).map((each) => `${key} ${each}`),
            );
            assert.deepEqual(found, []);
        });
    }

    it("a label: no two lines write the same field", () => {
        const lines = [
            ...LABEL_RUBRIC.common.map((line) => [`common ${line.name ?? line.field}`, writes(line)] as const),
            ...LABEL_RUBRIC.main.map((line) => [`main ${line.name ?? line.field}`, writes(line)] as const),
            ...LABEL_RUBRIC.groups.flatMap((group) =>
                group.lines.map((line) => [`${group.name} ${line.name ?? line.field}`, writes(line)] as const),
            ),
        ];
        assert.deepEqual(twice(lines), []);
    });
});
