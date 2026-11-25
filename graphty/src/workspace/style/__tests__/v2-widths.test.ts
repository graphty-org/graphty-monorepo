/**
 * Style panel v2's rubric (style/v2/rubric.ts, design/ui/style-panel-v2/design.md section 6): every
 * segment line's options are the element's values, and its segments fit the width where it sits;
 * no sub-group passes 8 lines and no "+" menu 12 sub-groups; no name says "Scene" or "World". Node
 * and edge things alike. The
 * label rubric (style/v2/labelRubric.ts, design 7.3) is held to the same.
 */

import { channelDescriptor, LABEL_STYLE_FIELDS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { DATA_OF } from "../v2/dataEntries";
import {
    LABEL_COVERED,
    LABEL_OPTION_NAMES,
    LABEL_RUBRIC,
    type LabelField,
    labelFieldDescriptor,
    labelLineFields,
    type LabelLineSpec,
} from "../v2/labelRubric";
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

/** The things whose row is a data picker, by "node:thing". */
const DATA_ROWS = Object.fromEntries(Object.keys(DATA_OF).map((thing) => [`node:${thing}`, true]));

/** Every line of every rubric, with where it sits. */
const LINES = RUBRICS.flatMap(([thing, rubric]) => [
    // A node's Pie, Chart or Record row holds its data picker (DataRow.tsx): its row line is its pop-over's first.
    ...(rubric.row === undefined
        ? []
        : [{ thing, line: rubric.row, place: thing in DATA_ROWS ? ("popover" as const) : ("panel" as const) }]),
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
            for (const channel of [line.channel, line.pair, ...(line.units ?? [])]) {
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
            // An option named "" is the one drawn while nothing is set (design "Input rules").
            const unsetNamed = OPTION_NAMES[line.channel]?.[""] === undefined ? [] : [""];
            const values = [
                ...(descriptor?.accepts === "boolean" ? ["true", "false"] : (descriptor?.values ?? [])),
                ...unsetNamed,
            ];
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

    it('no group passes 6 lines or holds one, and no "..." menu passes 16 groups (owner, 2026-11-24)', () => {
        for (const [thing, rubric] of RUBRICS) {
            assert.isAtMost(rubric.main.length, 8, `${thing} main lines`);
            assert.isAtMost(rubric.common?.length ?? 0, 2, `${thing} common lines`);
            assert.isAtMost(rubric.groups?.length ?? 0, 16, `${thing} "..." menu`);
            for (const group of rubric.groups ?? []) {
                assert.isAtMost(group.lines.length, 6, `${thing} ${group.name}`);
                assert.isAbove(group.lines.length, 1, `${thing} ${group.name}: a one-line group joins the main lines`);
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

    it("names options only for fields a line draws (no stale name, such as the removed Look's 'Plain')", () => {
        const drawn = new Set(lines.flatMap(({ line }) => labelLineFields(line)));
        for (const field of Object.keys(LABEL_OPTION_NAMES)) {
            assert.isTrue(drawn.has(field as LabelField), field);
        }
    });

    it("pictures every option of a segment line or none, never icons mixed with words (E674, E418)", () => {
        for (const [field, options] of Object.entries(LABEL_OPTION_NAMES)) {
            const pictured = Object.values(options ?? {}).map((option) => option.glyph !== undefined);
            assert.isTrue(pictured.every(Boolean) || !pictured.some(Boolean), field);
        }
    });

    it("every line edits a label style field graphty-element describes", () => {
        for (const { line } of lines) {
            for (const field of labelLineFields(line)) {
                assert.include(LABEL_STYLE_FIELDS, field, `${line.field}: ${field}`);
            }
        }
    });

    it("every segment line names the element's values and fits where it sits", () => {
        const segments = lines.filter(
            ({ line }) => line.unit !== undefined || line.rule === "R8" || line.rule === "R8f",
        );
        assert.isAbove(segments.length, 8);
        for (const { line, place } of segments) {
            // "": the option drawn while nothing is set (an "Off" that unsets), named where the field has no default.
            const unset = LABEL_OPTION_NAMES[line.field]?.[""] === undefined ? [] : [""];
            const values =
                line.unit === undefined ? [...(labelFieldDescriptor(line.field)?.values ?? []), ...unset] : [];
            if (line.unit === undefined) {
                assert.sameMembers(Object.keys(LABEL_OPTION_NAMES[line.field] ?? {}), [...values], line.field);
            }
            const options =
                line.unit === undefined
                    ? segmentOptions({ channel: line.field }, values, LABEL_OPTION_NAMES)
                    : line.unit.map((unit) => ({ name: unit.name }));
            assert.isDefined(options, `${line.field} has a name for every option`);
            const width = segmentsWidth(options ?? []);
            const full = line.rule === "R8f";
            const room =
                place === "panel"
                    ? LINE_WIDTHS[full ? "panelFull" : "panelNamed"]
                    : LINE_WIDTHS[full ? "popoverFull" : "popoverNamed"];
            assert.isAtMost(width, room, `${line.field} (${String(width)} px)`);
        }
    });

    it("holds the label's sixteen groups under four headings, each at most six lines, every field placed once", () => {
        const fields = (lines: readonly LabelLineSpec[]): readonly LabelField[] => [
            ...new Set(lines.flatMap((line) => labelLineFields(line))),
        ];
        assert.sameMembers([...fields(LABEL_RUBRIC.common)], ["size", "sizePx", "letterSize", "color"], "the row");
        assert.sameMembers(
            [...fields(LABEL_RUBRIC.main)],
            ["enabled", "font", "weight", "italic", "underline", "strikethrough", "location"],
            "the pop-over's main lines",
        );
        // Owner, 2026-11-24: at most 16 entries, under headings of at most 6 each; every group at most 6 rows.
        assert.lengthOf(LABEL_RUBRIC.groups, 16);
        const headings = [...new Set(LABEL_RUBRIC.groups.map((group) => group.heading))];
        assert.deepEqual(headings, ["Placement", "Letters", "Box", "Extras"]);
        for (const heading of headings) {
            assert.isAtMost(LABEL_RUBRIC.groups.filter((group) => group.heading === heading).length, 6, heading);
        }
        for (const group of LABEL_RUBRIC.groups) {
            // The Background group's tab strip is a row of its own.
            const rows = group.lines.length + (group.name === "Background" ? 1 : 0);
            assert.isAtMost(group.name === "Background" ? 5 : rows, 6, group.name);
            assert.isAbove(group.lines.length, 1, `${group.name}: a group of one line joins the main lines`);
        }
        // Every one of graphty-element's label fields has its one place.
        assert.sameMembers([...LABEL_COVERED], [...LABEL_STYLE_FIELDS]);
        // A line's whole name: a short one under its look's switch ("Color" under Text shadow) is called by it.
        const names = (group: string): readonly (string | undefined)[] =>
            LABEL_RUBRIC.groups.find((each) => each.name === group)?.lines.map((line) => line.fullName ?? line.name) ??
            [];
        assert.includeMembers(
            [...names("Letter outline")],
            ["Letter outline", "Letter outline width", "Letter outline opacity"],
        );
        assert.includeMembers([...names("Text shadow")], ["Text shadow", "Text shadow color"]);
        assert.includeMembers([...names("Box shadow")], ["Box shadow", "Box shadow color"]);
        assert.includeMembers([...names("Icon and image")], ["Icon beside text", "Icon side"]);
    });

    it("a location (R2) draws its Outside / Inside / Auto segments on a full line, its name above them", () => {
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

    it("the main lines are at most 4 and nothing says Scene or World", () => {
        assert.isAtMost(LABEL_RUBRIC.common.length, 2);
        // With the Text and Glyph tabs and the Look line, the pop-over stays six rows (owner's input rules).
        assert.isAtMost(LABEL_RUBRIC.main.length, 4);
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
