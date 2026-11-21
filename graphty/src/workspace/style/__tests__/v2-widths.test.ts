/**
 * Style panel v2's rubric (style/v2/rubric.ts, design/ui/style-panel-v2/design.md section 6): every
 * segment line's options are the element's values, and its segments fit the width where it sits;
 * no sub-group passes 8 lines and no "+" menu 12 sub-groups; no name says "Scene" or "World". Node
 * and edge things alike. The
 * label rubric (style/v2/labelRubric.ts, design 7.3) is held to the same.
 */

import { channelDescriptor, LABEL_STYLE_FIELDS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { LABEL_OPTION_NAMES, LABEL_RUBRIC, labelFieldDescriptor, labelLineFields } from "../v2/labelRubric";
import {
    EDGE_RUBRIC,
    LINE_WIDTHS,
    type LineSpec,
    NODE_RUBRIC,
    OPTION_NAMES,
    segmentOptions,
    segmentsWidth,
} from "../v2/rubric";

/** Every node and edge thing's rubric, by "node:thing" or "edge:thing". */
const RUBRICS = [
    ...Object.entries(NODE_RUBRIC).map(([thing, rubric]) => [`node:${thing}`, rubric] as const),
    ...Object.entries(EDGE_RUBRIC).map(([thing, rubric]) => [`edge:${thing}`, rubric] as const),
];

/** Every line of every rubric, with where it sits. */
const LINES = RUBRICS.flatMap(([thing, rubric]) => [
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
        for (const [thing, rubric] of RUBRICS) {
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
            ...RUBRICS.flatMap(([, rubric]) => (rubric.groups ?? []).map((group) => group.name)),
        ];
        for (const name of names) {
            assert.notMatch(name, /\b(scene|world)\b/i, name);
        }
    });
});

describe("Style panel v2's label rubric", () => {
    const lines = [
        ...LABEL_RUBRIC.common.map((line) => ({ line, place: "panel" as const })),
        ...[...LABEL_RUBRIC.main, ...LABEL_RUBRIC.groups.flatMap((group) => group.lines)].map((line) => ({
            line,
            place: "popover" as const,
        })),
    ];

    it("every line edits a label style field graphty-element describes", () => {
        for (const { line } of lines) {
            for (const field of labelLineFields(line)) {
                assert.include(LABEL_STYLE_FIELDS, field, `${line.field}: ${field}`);
            }
        }
        for (const group of LABEL_RUBRIC.groups) {
            if (group.on !== undefined) {
                assert.equal(labelFieldDescriptor(group.on)?.accepts, "boolean", `${group.name} switches on`);
            }
        }
    });

    it("every segment line names the element's values and fits where it sits", () => {
        const segments = lines.filter(
            ({ line }) => line.unit !== undefined || line.rule === "R8" || line.rule === "R8f",
        );
        assert.isAbove(segments.length, 8);
        for (const { line, place } of segments) {
            const values = line.unit === undefined ? (labelFieldDescriptor(line.field)?.values ?? []) : [];
            if (line.unit === undefined) {
                assert.sameMembers(Object.keys(LABEL_OPTION_NAMES[line.field] ?? {}), [...values], line.field);
            }
            const options =
                line.unit === undefined
                    ? segmentOptions({ channel: line.field }, values, LABEL_OPTION_NAMES)
                    : line.unit.map((unit) => ({ name: unit.name }));
            assert.isDefined(options, `${line.field} has a name for every option`);
            const width = segmentsWidth(options ?? []);
            const full = line.name === null || line.rule === "R8f";
            const room =
                place === "panel"
                    ? LINE_WIDTHS[full ? "panelFull" : "panelNamed"]
                    : LINE_WIDTHS[full ? "popoverFull" : "popoverNamed"];
            assert.isAtMost(width, room, `${line.field} (${String(width)} px)`);
        }
    });

    it("a location (R2) draws its Outside / Inside / Auto segments on a full unnamed line", () => {
        const locations = lines.filter(({ line }) => line.rule === "R2");
        assert.isAbove(locations.length, 0);
        const width = segmentsWidth(["Outside", "Inside", "Auto"].map((name) => ({ name })));
        for (const { place } of locations) {
            assert.equal(place, "popover");
            // R2 is R8f (design 6): a full popover line whatever the line's name.
            assert.isAbove(width, LINE_WIDTHS.popoverNamed, "the words need more than a named slot");
            assert.isAtMost(width, LINE_WIDTHS.popoverFull, `location (${String(width)} px)`);
        }
    });

    it("Main and every sub-group hold at most 8 lines, '+' holds 12, and nothing says Scene or World", () => {
        assert.isAtMost(LABEL_RUBRIC.common.length, 2);
        assert.isAtMost(LABEL_RUBRIC.main.length, 8);
        // Design 7.3's twelve, with Gradient and Margin, whose label fields had no line (round 5, task 5.6).
        assert.equal(LABEL_RUBRIC.groups.length, 14, "design 7.3's twelve sub-groups, Gradient and Margin");
        for (const group of LABEL_RUBRIC.groups) {
            assert.isAtMost(group.lines.length, 8, group.name);
        }
        const names = [
            ...Object.values(LABEL_OPTION_NAMES).flatMap((options) => Object.values(options ?? {}).map((o) => o.name)),
            ...lines.flatMap(({ line }) => [line.name ?? "", ...(line.unit ?? []).map((unit) => unit.name)]),
            ...LABEL_RUBRIC.groups.map((group) => group.name),
        ];
        for (const name of names) {
            assert.notMatch(name, /\b(scene|world)\b/i, name);
        }
    });
});
