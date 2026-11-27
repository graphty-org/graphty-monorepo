/**
 * Every one of graphty-element's 99 label style fields is reachable from a node Label's row and changes the
 * picture (owner, 2026-11-20: "it seems like we are missing 90 label styles"; E673), on the REAL graphty-element
 * and real input. For each field the layer holds what the field needs beside it to draw (its `drawnWhen` partners,
 * as graphty-element's own label-fields render test sets them), except the partners graphty-element names as its
 * `needs` (a look's switch): those the panel must write from the reader's one click, and the walk checks it did and
 * that the field draws more than its needs alone. Then a reader opens the row's settings, opens the
 * field's group from the "..." menu where it is in one, finds the field's line, sets it by clicking and typing, and
 * the canvas is compared before and after. The walk fails on a field no line reaches, a write that misses, and a
 * write that draws nothing. `pickable` changes no pixel: its effect is that a click on the label selects its node.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { LABEL_STYLE_FIELDS } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import {
    LABEL_OPTION_NAMES,
    LABEL_RUBRIC,
    type LabelField,
    labelFieldDescriptor,
    type LabelGroup,
    type LabelLineSpec,
} from "../v2/labelRubric";
import { choose } from "./modelHarness";
import { openGraph, openGroup, openStyle, pickKind, picture, pixelsApart, sectionOf, written } from "./v2Harness";

type Style = Partial<Record<LabelField, unknown>>;

/** One field's walk: what the reader sets, and what the layer holds beside it. */
interface WalkCase {
    /** The value the reader sets (a switch is clicked to the other side of its default). */
    readonly value?: unknown;
    /** What the label style holds beside it, in both pictures. */
    readonly base?: Style;
    /** Several setups, for a field whose effect shows only at some measure: the first that shows it is walked. */
    readonly bases?: readonly Style[];
    /** The words, where the field needs particular ones. */
    readonly text?: string;
}

/** Two lines, spaces to wrap at and a trailing space. */
const WORDS = "Alpha beta gamma delta \nepsilon 12345 ";
/** Short words, so a space counted or not moves a word across a line break. */
const SHORT_WORDS = "aa bb cc dd ee ff gg hh ii jj kk";
const WRAP_SWEEP = Array.from({ length: 96 }, (_, i) => 0.5 + i * 0.1);
const BACKGROUND = { background: "#ffee00" };
/** A small solid picture for the label image fields. */
const LABEL_PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#0000ff"/></svg>',
)}`;

/** Every field's case, after graphty-element's test/helpers/label-fields.ts, in this panel's terms. */
const CASES: Readonly<Record<LabelField, WalkCase>> = {
    look: { value: "dark" },
    enabled: {},
    font: { value: "monospace" },
    sizePx: {},
    sizeMode: { value: "screen" },
    size: { value: 2 },
    letterSize: {},
    weight: { value: "bold" },
    color: { value: "#ff0000" },
    italic: {},
    underline: {},
    strikethrough: {},
    wrapWidth: { value: 3 },
    wrapTrailingSpace: { text: SHORT_WORDS, bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth })) },
    wrapSkipEndSpace: {
        text: SHORT_WORDS,
        bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth, wrapTrailingSpace: true })),
    },
    wrapUnkerned: { text: SHORT_WORDS, bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth })) },
    wrapEllipsis: { base: { wrapWidth: 3, maxLines: 2 } },
    wrapAnywhere: { base: { wrapWidth: 2 } },
    wrapSpaceCount: { value: 4, text: SHORT_WORDS, bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth })) },
    maxLines: { value: 1 },
    maxLinesEllipsis: {
        text: SHORT_WORDS,
        bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth, maxLines: 1 })),
    },
    keepBlankLines: { text: "Alpha\n\nBeta" },
    runAlign: { value: "hanging", text: "<size='400'>Big</size> small words" },
    rotation: { value: 45 },
    lineHeight: { value: 2 },
    lineBox: { value: "glyphs", base: BACKGROUND },
    borderAlign: { value: "center", base: { borderWidth: 6 } },
    backgroundShape: { value: "circle", base: BACKGROUND },
    borderStyle: { value: "double", base: { borderWidth: 8 } },
    image: { value: LABEL_PICTURE },
    imageWidth: { value: 3, base: { image: LABEL_PICTURE } },
    imageHeight: { value: 3, base: { image: LABEL_PICTURE } },
    imageOffsetX: { value: 2, base: { image: LABEL_PICTURE } },
    imageOffsetY: { value: 2, base: { image: LABEL_PICTURE } },
    minScreenSize: { value: 200 },
    // labels wide enough to overlap their neighbors
    declutter: { value: "size", base: { size: 40 } },
    minNodeScreenSize: { value: 2000 },
    onTop: { base: { size: 4 } },
    textAlign: { value: "right" },
    opacity: { value: 0.3 },
    background: { value: "#ffee00" },
    backgroundOpacity: { value: 0.3, base: BACKGROUND },
    padding: { value: 8, base: BACKGROUND },
    boxPadding: { base: { padding: 8, ...BACKGROUND } },
    cornerRadius: { value: 40, base: { padding: 4, ...BACKGROUND } },
    borderWidth: { value: 6 },
    borderColor: { value: "#ff0000", base: { borderWidth: 6 } },
    borderOpacity: { value: 0.2, base: { borderWidth: 6 } },
    gradient: {},
    gradientType: { value: "radial" },
    gradientColors: { value: ["#00ff00", "#0000ff"], base: { gradientColors: ["#ff0000", "#0000ff"] } },
    gradientDirection: { value: "horizontal", base: { gradientType: "linear" } },
    location: { value: "inside-top" },
    attachOffset: { value: 3 },
    offsetX: { value: 2 },
    offsetY: { value: 2 },
    shiftX: { value: 1 },
    shiftY: { value: 1 },
    shiftOf: { value: "words", base: { shiftX: 0.3, marginLeft: 40, marginRight: 40 } },
    gapOf: { value: "words", base: { location: "top" } },
    box: {
        value: "target-width",
        text: "ab",
        bases: [
            { location: "inside-top", ...BACKGROUND },
            { size: 0.5, ...BACKGROUND },
        ],
    },
    keepInView: { base: { offsetX: 200 } },
    marginTop: { value: 30, base: BACKGROUND },
    marginBottom: { value: 30, base: BACKGROUND },
    marginLeft: { value: 30, base: BACKGROUND },
    marginRight: { value: 30, base: BACKGROUND },
    pointer: { base: BACKGROUND },
    pointerDirection: { value: "top", base: BACKGROUND },
    pointerWidth: { value: 90, base: { pointerHeight: 60, ...BACKGROUND } },
    pointerHeight: { value: 60, base: BACKGROUND },
    pointerOffset: { value: 60, base: { pointerWidth: 40, pointerHeight: 60, ...BACKGROUND } },
    pointerCurve: { base: { pointerWidth: 60, pointerHeight: 60, ...BACKGROUND } },
    outline: { value: "#ff0000" },
    outlineWidth: { value: 8 },
    outlineOpacity: { value: 0.2, base: { outlineWidth: 6 } },
    shadow: {},
    shadowColor: { value: "#ff0000" },
    shadowBlur: { value: 20 },
    shadowOffsetX: { value: 10 },
    shadowOffsetY: { value: 10 },
    panelShadow: { base: BACKGROUND },
    panelShadowColor: { value: "#ff0000", base: BACKGROUND },
    panelShadowBlur: { value: 20, base: BACKGROUND },
    panelShadowOffsetX: { value: 10, base: BACKGROUND },
    panelShadowOffsetY: { value: 10, base: BACKGROUND },
    animation: { value: "shake" },
    animationSpeed: { value: 5, base: { animation: "shake" } },
    depthFade: {},
    // the camera stands beyond the default far distance: a near or far past it brings the labels back
    depthFadeNear: { value: 1000 },
    depthFadeFar: { value: 1000 },
    pickable: { base: { size: 2 } },
    badge: { value: "notification" },
    icon: { value: "A" },
    iconPosition: { value: "right", base: { icon: "A" } },
    progress: { value: 0.8, base: { badge: "progress", animation: "none" } },
    smartOverflow: { text: "1500" },
    maxNumber: { value: 9, text: "1500", base: { smartOverflow: true } },
    overflowSuffix: { value: "WWW", text: "1500", base: { smartOverflow: true, maxNumber: 9 } },
    closeButton: {},
};

/** Where a field's control is: the group holding its line (none for Main), the line, and how the line holds it. */
interface Place {
    /** On the row itself: its Size and Color lines (ia-design 2). */
    readonly row?: true;
    readonly group?: LabelGroup;
    readonly line: LabelLineSpec;
    readonly how: "field" | "pair" | "side" | "unit" | "toggle";
}

/**
 * Where the rubric puts a field: the row's own lines, then the pop-over's Main, then its groups.
 * @param field - the field.
 * @returns its place, or undefined where no line holds it.
 */
function placeOf(field: LabelField): Place | undefined {
    const shelves: readonly (readonly [LabelGroup | undefined, readonly LabelLineSpec[]])[] = [
        [undefined, LABEL_RUBRIC.main],
        ...LABEL_RUBRIC.groups.map((group): readonly [LabelGroup, readonly LabelLineSpec[]] => [group, group.lines]),
    ];
    const onRow = LABEL_RUBRIC.common.find((line) => line.field === field);
    if (onRow !== undefined) {
        return { row: true, line: onRow, how: "field" };
    }
    for (const [group, lines] of shelves) {
        for (const line of lines) {
            if (line.unit !== undefined) {
                if (line.unit.some((unit) => unit.field === field || Object.keys(unit.also ?? {}).includes(field))) {
                    if (field !== line.field) {
                        return { group, line, how: "unit" };
                    }
                }
                continue;
            }
            if (line.field === field) {
                return { group, line, how: "field" };
            }
            if (line.pair === field) {
                return { group, line, how: "pair" };
            }
            if (line.toggles?.includes(field) === true) {
                return { group, line, how: "toggle" };
            }
            if (line.sides?.includes(field) === true) {
                return { group, line, how: "side" };
            }
        }
    }
    return undefined;
}

/**
 * The layer's label style.
 * @param session - the session.
 * @param id - the layer.
 * @returns the style.
 */
function labelStyle(session: GraphSession, id: string): Record<string, unknown> {
    const value = written(session, id, "node.labelStyle");
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Types into a field and commits it with Enter.
 * @param input - the field.
 * @param text - what to type.
 */
async function typeIn(input: HTMLInputElement, text: string): Promise<void> {
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
}

/**
 * Clicks a segment of a segmented line by its option's name.
 * @param line - the line.
 * @param name - the option's name.
 */
async function pickSegment(line: HTMLElement, name: string): Promise<void> {
    const radio = within(line).getByRole("radio", { name });
    const segment = line.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
    assert.isNotNull(segment, name);
    await userEvent.click(segment);
}

/**
 * Picks an option of a list (a select or a combo box) on a line.
 * @param line - the line.
 * @param name - the option's name.
 */
async function pickOption(line: HTMLElement, name: string): Promise<void> {
    const input = line.querySelector<HTMLInputElement>("input");
    assert.isNotNull(input);
    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name }));
}

/**
 * An enum value's name in the panel: its option name, else its words spelled out.
 * @param field - the field.
 * @param value - the value.
 * @returns the name.
 */
function optionName(field: LabelField, value: string): string {
    const named = LABEL_OPTION_NAMES[field]?.[value]?.name;
    if (named !== undefined) {
        return named;
    }
    const spaced = value.replaceAll("-", " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Whether a written value is the one the reader set.
 * @param got - the written value.
 * @param want - the value set.
 * @returns true when they match.
 */
function same(got: unknown, want: unknown): boolean {
    const norm = (value: unknown): unknown => {
        if (Array.isArray(value)) {
            return value.map(norm);
        }
        return typeof value === "string" ? value.toLowerCase() : value;
    };
    return JSON.stringify(norm(got)) === JSON.stringify(norm(want));
}

describe("every label field is reachable from the Label row and draws (E673)", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("walks all 99 label fields by real clicks, each changing the picture", async () => {
        const { session, element, nodes } = await openGraph();
        let tab = await openStyle("Key people");
        // The drawing itself, where a reader clicks.
        const canvasOf = (): HTMLCanvasElement => {
            const canvas = element.shadowRoot?.querySelector("canvas");
            assert.isDefined(canvas ?? undefined, "the element draws on a canvas");
            return canvas as HTMLCanvasElement;
        };
        /**
         * Graph settings' "Hide overlaps", which a label's Declutter order needs to do anything, by real clicks.
         * @param on - checked or not.
         */
        const hideOverlaps = async (on: boolean): Promise<void> => {
            const place = screen.getByRole("region", { name: "Graph place" });
            await userEvent.click(within(place).getAllByRole("button", { name: /^Graph/ })[0]);
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            const style = await within(inspector).findByRole("tab", { name: "Style" });
            if (style.getAttribute("aria-selected") !== "true") {
                await userEvent.click(style);
            }
            const hide = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Hide overlaps" });
            if (hide.checked !== on) {
                await userEvent.click(hide);
            }
            await waitFor(() => {
                assert.strictEqual(element.layoutBehavior?.labels?.declutter, on);
            });
            tab = await openStyle("Key people");
        };
        const rowOf = async (): Promise<HTMLElement> =>
            waitFor(() => {
                const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-thing="label"]');
                assert.isNotNull(found);
                return found;
            });
        const hold = async (words: string, style: Style): Promise<void> => {
            await session.styles.update(nodes, {
                set: { "node.color": "#E8590C", "node.label": words, "node.labelStyle": style as LabelStyle },
            });
            await session.styles.settled();
        };
        const openSettings = async (): Promise<HTMLElement> => {
            await userEvent.click(within(await rowOf()).getByRole("button", { name: /^Node label settings/ }));
            return waitFor(() => {
                const found = document.querySelector<HTMLElement>("[data-thing-popover]");
                assert.isNotNull(found);
                return found;
            });
        };
        const closeSettings = async (): Promise<void> => {
            // Escape closes the group pop-over first, then the pop-over.
            if (document.querySelector("[data-group-pop]") !== null) {
                await userEvent.keyboard("{Escape}");
                await waitFor(() => {
                    assert.isNull(document.querySelector("[data-group-pop]"));
                });
            }
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(document.querySelector("[data-thing-popover]"));
            });
        };
        const lineIn = async (root: HTMLElement, line: string): Promise<HTMLElement> =>
            waitFor(() => {
                const found = root.querySelector<HTMLElement>(`.ws-row[data-line="${line}"]`);
                assert.isNotNull(found, line);
                return found;
            });

        /**
         * A point on node a's drawn label, in the element's pixels: the middle of what see-through labels take away in
         * the column above the node, where its label sits.
         * @param words - the words.
         * @param style - the label style.
         * @param shown - the picture with the labels.
         * @returns the point.
         */
        const labelPoint = async (words: string, style: Style, shown: ImageData): Promise<{ x: number; y: number }> => {
            // See-through, the label keeps its box, so the camera frames the graph as it does with the label shown.
            await hold(words, { ...style, opacity: 0 });
            const hidden = await picture(element);
            await hold(words, style);
            assert.equal(pixelsApart(shown, await picture(element)), 0, "the same picture once the label is back");
            const node = element.nodeScreenPosition("a");
            assert.isDefined(node, "node a is drawn");
            const scale = shown.width / element.getBoundingClientRect().width;
            const x = Math.round(node.x * scale);
            const rows: number[] = [];
            for (let y = 0; y < Math.round(node.y * scale); y++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const i = (y * shown.width + x + dx) * 4;
                    if ([0, 1, 2].some((c) => Math.abs((shown.data[i + c] ?? 0) - (hidden.data[i + c] ?? 0)) > 1)) {
                        rows.push(y);
                        break;
                    }
                }
            }
            assert.isNotEmpty(rows, "node a's label is drawn above it");
            return { x: node.x, y: (rows[Math.floor(rows.length / 2)] ?? 0) / scale };
        };

        /**
         * Walks one field: holds what it needs, sets it from the panel and compares the pictures.
         * @param field - the field.
         */
        const walkOne = async (field: LabelField): Promise<void> => {
            const test = CASES[field];
            const words = test.text ?? WORDS;
            // A field whose effect shows only at some measure: the first setup where graphty-element draws it.
            // What the field needs beside it is left for the panel to write: the reader sets only the field.
            const needs = labelFieldDescriptor(field)?.needs ?? [];
            const unneeded = (style: Style): Style =>
                Object.fromEntries(Object.entries(style).filter(([key]) => !needs.some((need) => need.field === key)));
            let base: Style = unneeded(test.base ?? {});
            if (test.bases !== undefined) {
                const want = test.value ?? labelFieldDescriptor(field)?.default !== true;
                let found: Style | undefined;
                for (const each of test.bases) {
                    await hold(words, each);
                    const without = await picture(element);
                    await hold(words, { ...each, [field]: want });
                    if (pixelsApart(without, await picture(element)) > 0) {
                        found = each;
                        break;
                    }
                }
                assert.isDefined(found, "graphty-element draws it under none of its setups");
                base = found;
            }
            await hold(words, base);
            let big: string | undefined;
            /** Which of the three labels graphty-element draws. */
            const drawnLabels = (): string[] => ["a", "b", "c"].filter((id) => element.labelOf(id)?.drawn === true);
            if (field === "declutter") {
                // Overlaps hidden, and the label of the node of least degree the largest, so keeping by size and by
                // degree differ. The size order compares the words' height on screen first: the three labels sit at
                // different depths, so a larger node alone keeps nothing if its label is the farthest (issue 10236).
                big = (
                    await session.styles.add({
                        name: "Big a",
                        target: "node",
                        selector: { match: "ids", nodes: ["a"] },
                        set: { "node.labelStyle": { size: 120 } },
                    })
                ).id;
                await session.styles.settled();
                await hideOverlaps(true);
                await element.waitForStableFrame();
                assert.notInclude(drawnLabels(), "a", "by degree, b's label is kept and a's, which it covers, hidden");
            }
            const before = await picture(element);
            // pickable draws nothing: where the words are drawn, a click selects nothing until it is set.
            const labelAt = field === "pickable" ? await labelPoint(words, base, before) : undefined;
            if (labelAt !== undefined) {
                await userEvent.click(canvasOf(), { position: labelAt });
                await session.styles.settled();
                assert.lengthOf(session.selection.nodes, 0, "a click on a label selects nothing before pickable");
                // A click on the drawing inspects the graph: back to the layer.
                tab = await openStyle("Key people");
            }
            const want = await setByHand(field, test);
            await waitFor(() => {
                const style = labelStyle(session, nodes);
                const got = style[field];
                assert.isDefined(got, "not written");
                if (want !== undefined) {
                    assert.isTrue(same(got, want), `wrote ${JSON.stringify(got)}, set ${JSON.stringify(want)}`);
                }
                // The one click wrote what graphty-element says the field needs (a look's switch, its partner).
                for (const need of needs) {
                    assert.isTrue(same(style[need.field], need.value), `did not write its need ${need.field}`);
                }
            });
            await session.styles.settled();
            if (labelAt !== undefined) {
                // Read again: the inspector's change of width can have moved the drawing since.
                await userEvent.click(canvasOf(), {
                    position: await labelPoint(words, { ...base, pickable: true }, await picture(element)),
                });
                await waitFor(() => {
                    assert.lengthOf(session.selection.nodes, 1, "a click on the label selects its node");
                });
                await session.selection.apply({ nodes: [] });
                tab = await openStyle("Key people");
                return;
            }
            const after = await picture(element);
            if (big !== undefined) {
                const kept = drawnLabels();
                assert.include(kept, "a", "by size, the largest label is kept");
                assert.notInclude(kept, "b", "by size, the label it covers is hidden");
                await hideOverlaps(false);
                await session.styles.remove(big);
                await session.styles.settled();
            }
            if (needs.length === 0) {
                assert.isAbove(pixelsApart(before, after), 0, "the picture does not change");
                return;
            }
            // Against its needs alone (a look's switch): the field itself changes the picture, not only its switch.
            await hold(words, { ...base, ...Object.fromEntries(needs.map((need) => [need.field, need.value])) });
            assert.isAbove(pixelsApart(await picture(element), after), 0, "the picture does not change");
        };

        /**
         * Sets a field from the panel, as a reader does.
         * @param field - the field.
         * @param test - its case.
         * @returns the value it should hold.
         */
        const hasLine = async (root: HTMLElement, field: LabelField): Promise<boolean> => {
            await session.styles.settled();
            return root.querySelector(`.ws-row[data-line="node.labelStyle.${field}"]`) !== null;
        };
        const setByHand = async (field: LabelField, test: WalkCase): Promise<unknown> => {
            const descriptor = labelFieldDescriptor(field);
            assert.isDefined(descriptor, field);
            if (field === "look") {
                // The look is a kind of the row, from the Kind select in its "..." settings (E196).
                await pickKind(await rowOf(), "Node label", "Dark");
                await closeSettings();
                return "dark";
            }
            if (field === "gradient" || field === "gradientType") {
                // The Background group's Radial tab writes both: a gradient, of the radial kind.
                const background = await openGroup(await openSettings(), "Background");
                const radial = within(background).getByRole<HTMLInputElement>("radio", { name: "Radial" });
                await userEvent.click(background.querySelector<HTMLElement>(`label[for="${radial.id}"]`) ?? radial);
                await closeSettings();
                return field === "gradient" ? true : "radial";
            }
            const place = placeOf(field);
            assert.isDefined(place, `${field}: no line reaches it`);
            const pop = place.row === true ? undefined : await openSettings();
            try {
                // A group's line is in its own pop-over, opened from the "..." menu (design "Input rules").
                let root = pop ?? (await rowOf());
                if (pop !== undefined && place.group !== undefined) {
                    root = await openGroup(pop, place.group.name);
                }
                if (field === "gradientDirection" && !(await hasLine(root, field))) {
                    // A gradient's direction is its Linear tab's line: picked first, as a reader does.
                    const linear = within(root).getByRole<HTMLInputElement>("radio", { name: "Linear" });
                    await userEvent.click(root.querySelector<HTMLElement>(`label[for="${linear.id}"]`) ?? linear);
                }
                if (!(await hasLine(root, place.line.field))) {
                    // A look's settings are drawn once its switch is on (graphty-element's drawnWhen): the reader
                    // switches it on first, from its own line.
                    for (const need of descriptor.needs ?? []) {
                        const switchLine = root.querySelector<HTMLElement>(
                            `.ws-row[data-line="node.labelStyle.${need.field}"]`,
                        );
                        assert.isNotNull(switchLine, `${field}: its line is not drawn, nor ${need.field}'s`);
                        if (typeof need.value === "boolean") {
                            await userEvent.click(within(switchLine).getByRole("checkbox"));
                        } else {
                            const box = within(switchLine).getByRole<HTMLInputElement>("textbox");
                            await typeIn(box, String(need.value).slice(1));
                        }
                    }
                }
                if (place.how === "unit") {
                    const line = await lineIn(root, `node.labelStyle.${place.line.field}:unit`);
                    const unit = place.line.unit?.find(
                        (each) => each.field === field || Object.keys(each.also ?? {}).includes(field),
                    );
                    assert.isDefined(unit, field);
                    await pickSegment(line, unit.name);
                    return field === "sizeMode" ? "screen" : undefined;
                }
                const line = await lineIn(root, `node.labelStyle.${place.line.field}`);
                if (place.line.rule === "R7t") {
                    // A font style toggle (owner, 2026-11-23): Bold writes the weight, the others their flag.
                    const word = field === "weight" ? "Bold" : `${field.charAt(0).toUpperCase()}${field.slice(1)}`;
                    await userEvent.click(within(line).getByRole("button", { name: word }));
                    return field === "weight" ? "bold" : true;
                }
                // The fields a reader types in: a slider's hidden value input is not one.
                const inputs = (): HTMLInputElement[] =>
                    [...line.querySelectorAll<HTMLInputElement>("input")].filter((each) => each.type !== "hidden");
                if (place.how === "pair") {
                    await typeIn(inputs()[1], String(test.value));
                    return test.value;
                }
                if (place.how === "side") {
                    const split = await lineIn(root, `node.labelStyle.${place.line.field}:sides`);
                    await userEvent.click(within(split).getByRole("checkbox", { name: "Separate sides" }));
                    await waitFor(() => {
                        assert.lengthOf(inputs(), 4);
                    });
                    await typeIn(inputs()[place.line.sides?.indexOf(field) ?? 0], String(test.value));
                    return test.value;
                }
                const { rule } = place.line;
                switch (descriptor.accepts) {
                    case "boolean": {
                        const on = !(descriptor.default === true);
                        await userEvent.click(within(line).getByRole("checkbox"));
                        return on;
                    }
                    case "number":
                        if (field.endsWith("pacity")) {
                            // An opacity is a slider in percent (owner's input rules): Home, then 1% a key.
                            const thumb = within(line).getByRole("slider");
                            await userEvent.click(thumb);
                            await userEvent.keyboard(
                                `{Home}${"{ArrowRight}".repeat(Math.round(Number(test.value) * 100))}`,
                            );
                            return test.value;
                        }
                        await typeIn(inputs()[0], String(test.value));
                        return test.value;
                    case "color":
                        await typeIn(within(line).getByRole<HTMLInputElement>("textbox"), String(test.value).slice(1));
                        return test.value;
                    case "colors": {
                        await userEvent.click(within(line).getByRole("button", { name: "Node label gradient colors" }));
                        const editor = await screen.findByTestId("gradient-editor");
                        const [first] = within(editor).getAllByTestId("gradient-editor-stop-hex");
                        await userEvent.tripleClick(first);
                        await userEvent.keyboard("00ff00{Enter}");
                        await userEvent.keyboard("{Escape}");
                        return test.value;
                    }
                    case "text":
                        if (rule === "R13") {
                            // FontPicker lists a CSS generic family by its plain name and writes its CSS name.
                            await pickOption(line, "Monospace");
                        } else if (rule === "R16") {
                            // A picture (R16): chosen in the Picture pop-over, written as the picture's asset.
                            await userEvent.click(inputs()[0]);
                            const dialog = await screen.findByRole("dialog", { name: "Picture" });
                            const file = new File([await (await fetch(colormapUrl)).arrayBuffer()], "colormap.png");
                            await choose(dialog, "Choose picture", [file]);
                            // The picture is picked once it is accepted: the pop-over then closes.
                            await waitFor(() => {
                                assert.isFalse(dialog.isConnected, "the Picture pop-over closes on the pick");
                            });
                            return undefined;
                        } else {
                            await typeIn(inputs()[0], String(test.value));
                        }
                        return test.value;
                    case "enum": {
                        const value = String(test.value);
                        if (rule === "R2") {
                            await pickSegment(line, "Inside");
                        } else if (rule === "R8" || rule === "R8f") {
                            await pickSegment(line, optionName(field, value));
                        } else if (rule === "R5b") {
                            // A weight's presets are a combo box: its name typed picks it.
                            await typeIn(inputs()[0], optionName(field, value));
                        } else {
                            await pickOption(line, optionName(field, value));
                        }
                        return test.value;
                    }
                    default:
                        throw new Error(`${field}: no control for ${descriptor.accepts}`);
                }
            } finally {
                if (document.querySelector("[data-thing-popover]") !== null) {
                    await closeSettings();
                }
            }
        };

        const reached: LabelField[] = [];
        const failed: string[] = [];
        for (const field of LABEL_STYLE_FIELDS) {
            try {
                await walkOne(field);
                reached.push(field);
            } catch (error) {
                failed.push(`${field}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
                // Back to the layer's Style tab for the next field.
                while (document.querySelector("[data-thing-popover]") !== null || screen.queryByRole("menu") !== null) {
                    await userEvent.keyboard("{Escape}");
                }
                tab = await openStyle("Key people");
            }
            const last = failed.at(-1);
            console.info(`[walk] ${field}: ${last?.startsWith(`${field}:`) === true ? `FAILED (${last})` : "ok"}`);
        }
        assert.deepEqual(failed, [], "every field is reached, written and drawn from the panel");
        assert.sameMembers(reached, [...LABEL_STYLE_FIELDS], "every field is reached");
        assert.lengthOf(LABEL_STYLE_FIELDS, 99);
    });
});
