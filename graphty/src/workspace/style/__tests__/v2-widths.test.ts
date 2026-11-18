/**
 * Style panel v2's rubric (style/v2/rubric.ts, design/ui/style-panel-v2/design.md section 6): every
 * segment line's options are the element's values, and its segments fit the width where it sits;
 * no sub-group passes 8 lines and no "+" menu 12 sub-groups; no name says "Scene" or "World".
 */

import { channelDescriptor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { LINE_WIDTHS, type LineSpec, NODE_RUBRIC, OPTION_NAMES, segmentOptions, segmentsWidth } from "../v2/rubric";

/** Every line of every rubric, with where it sits. */
const LINES = Object.entries(NODE_RUBRIC).flatMap(([thing, rubric]) => [
    ...(rubric.row === undefined ? [] : [{ thing, line: rubric.row, place: "panel" as const }]),
    ...(rubric.common ?? []).map((line) => ({ thing, line, place: "panel" as const })),
    ...[...rubric.main, ...(rubric.groups ?? []).flatMap((group) => group.lines)].map((line) => ({
        thing,
        line,
        place: "popover" as const,
    })),
]);

/**
 * The width a line's control has where it sits.
 * @param line - the line.
 * @param place - the panel or a pop-over.
 * @returns the width.
 */
function widthAt(line: LineSpec, place: "panel" | "popover"): number {
    const full = line.name === null || line.rule === "R8f";
    if (place === "panel") {
        return full ? LINE_WIDTHS.panelFull : LINE_WIDTHS.panelNamed;
    }
    return full ? LINE_WIDTHS.popoverFull : LINE_WIDTHS.popoverNamed;
}

describe("Style panel v2's control rubric", () => {
    it("every line's channel is one graphty-element offers", () => {
        for (const { thing, line } of LINES) {
            for (const channel of [line.channel, line.pair, line.toggle, ...(line.units ?? [])]) {
                if (channel !== undefined) {
                    assert.isDefined(channelDescriptor(channel), `${thing}: ${channel}`);
                }
            }
        }
    });

    it("every segment line names the element's values and fits where it sits", () => {
        const segments = LINES.filter(
            ({ line }) => line.unit !== undefined || line.rule === "R8" || line.rule === "R8f",
        );
        assert.isAbove(segments.length, 10);
        for (const { thing, line, place } of segments) {
            const descriptor = channelDescriptor(line.channel);
            const values = descriptor?.accepts === "boolean" ? ["true", "false"] : (descriptor?.values ?? []);
            if (line.unit === undefined) {
                assert.sameMembers(
                    Object.keys(OPTION_NAMES[line.channel] ?? {}),
                    [...values],
                    `${thing}: ${line.channel}`,
                );
            }
            const options = segmentOptions(line, values);
            assert.isDefined(options, `${thing}: ${line.channel} has a name for every option`);
            const width = segmentsWidth(options ?? []);
            assert.isAtMost(width, widthAt(line, place), `${thing}: ${line.channel} (${String(width)} px)`);
            if (line.rule === "R8f") {
                assert.equal(place, "popover", `${thing}: ${line.channel} R8f sits only in a pop-over`);
            }
        }
    });

    it("no sub-group passes 8 lines and no '+' menu 12 sub-groups", () => {
        for (const [thing, rubric] of Object.entries(NODE_RUBRIC)) {
            assert.isAtMost(rubric.main.length, 8, `${thing} Main`);
            assert.isAtMost(rubric.common?.length ?? 0, 2, `${thing} common lines`);
            assert.isAtMost(rubric.groups?.length ?? 0, 12, `${thing} "+"`);
            for (const group of rubric.groups ?? []) {
                assert.isAtMost(group.lines.length, 8, `${thing} ${group.name}`);
            }
        }
    });

    it("no option, line or sub-group is named Scene or World", () => {
        const names = [
            ...Object.values(OPTION_NAMES).flatMap((options) => Object.values(options ?? {}).map((o) => o.name)),
            ...LINES.flatMap(({ line }) => [line.name ?? "", ...(line.unit ?? []).map(([name]) => name)]),
            ...Object.values(NODE_RUBRIC).flatMap((rubric) => (rubric.groups ?? []).map((group) => group.name)),
        ];
        for (const name of names) {
            assert.notMatch(name, /\b(scene|world)\b/i, name);
        }
    });
});
