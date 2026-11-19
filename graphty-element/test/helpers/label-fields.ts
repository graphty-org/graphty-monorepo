/**
 * @file The shared harness of label-fields-node.test.ts and label-fields-edge.test.ts: every field of
 * `LabelStyle` set on one text kind, in one view, under what it needs to draw, against the same style without it.
 *
 * Each field has a value that differs from its default and the sibling fields its `drawnWhen` names (plus any
 * measuring setup the field needs: a long wrapping text, several lines, a background to show a box). The baseline
 * frame holds the siblings; the measured frame adds the field. A field that changes no pixel is reported.
 */
import { assert } from "vitest";

import { type Channel, LABEL_STYLE_DESCRIPTORS, type LabelStyle } from "../../src/catalog";
import type { Graph } from "../../src/Graph";
import { CHANNEL_DESCRIPTORS, labelFieldOf } from "../../src/session/styles/channels";
import { pixelsOverBar, readCanvas } from "./whole-canvas";

type Style = Partial<Record<keyof LabelStyle, unknown>>;

/** One field's test: the value, and what the label style must hold beside it. */
export interface FieldCase {
    readonly value: unknown;
    /** What the style holds beside the field, in both frames. */
    readonly base?: Style;
    /**
     * Several setups, for a field whose effect shows only at some measure (a wrap width where counting a space
     * moves a word to the next line): the field must change the picture under at least one.
     */
    readonly bases?: readonly Style[];
    /** The words, where the field needs particular ones (a blank line, a number, markup runs). */
    readonly text?: string;
    /** Every node's or edge's text is styled, for a field that acts between labels (declutter). */
    readonly everyOne?: boolean;
}

/**
 * Wrap widths from narrow to wide, finely, for a field that changes where a line breaks: whether a space after the
 * text's last word counts moves that word only inside a window one space wide.
 */
const WRAP_SWEEP = Array.from({ length: 96 }, (_, i) => 0.5 + i * 0.1);
/** Short words, many of them, so a space counted or not moves a word across a line break. */
const SHORT_WORDS = "aa bb cc dd ee ff gg hh ii jj kk";

/** A long text with two lines, spaces to wrap at and a trailing space. */
export const WORDS = "Alpha beta gamma delta \nepsilon 12345 ";

const BACKGROUND = { background: "#ffee00" };

/**
 * What every field is drawn with. `size: 3` makes the label readable at the fitted camera (the catalog's `start`).
 */
export const FIELD_CASES: Readonly<Record<keyof LabelStyle, FieldCase>> = {
    look: { value: "dark" },
    enabled: { value: false },
    font: { value: "Courier New, monospace" },
    sizePx: { value: 20 },
    sizeMode: { value: "screen" },
    size: { value: 1.5 },
    letterSize: { value: 0.5 },
    weight: { value: "bold" },
    color: { value: "#ff0000" },
    italic: { value: true },
    wrapWidth: { value: 3 },
    wrapTrailingSpace: { value: true, text: SHORT_WORDS, bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth })) },
    wrapSkipEndSpace: {
        value: true,
        text: SHORT_WORDS,
        bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth, wrapTrailingSpace: true })),
    },
    wrapEllipsis: { value: true, base: { wrapWidth: 3, maxLines: 2 } },
    wrapAnywhere: { value: true, base: { wrapWidth: 2 } },
    wrapSpaceCount: { value: 4, text: SHORT_WORDS, bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth })) },
    maxLines: { value: 1 },
    maxLinesEllipsis: {
        value: false,
        text: SHORT_WORDS,
        bases: WRAP_SWEEP.map((wrapWidth) => ({ wrapWidth, maxLines: 1 })),
    },
    keepBlankLines: { value: true, text: "Alpha\n\nBeta" },
    runAlign: { value: "hanging", text: "<size='400'>Big</size> small words" },
    rotation: { value: 45 },
    lineHeight: { value: 2 },
    lineBox: { value: "glyphs", base: BACKGROUND },
    borderAlign: { value: "center", base: { borderWidth: 6 } },
    backgroundShape: { value: "circle", base: BACKGROUND },
    minScreenSize: { value: 200 },
    declutter: { value: "size", everyOne: true, base: { size: 8 } },
    minNodeScreenSize: { value: 2000 },
    // the label crosses the node drawn in front of it (see the test's "front" node)
    onTop: { value: true },
    textAlign: { value: "right" },
    opacity: { value: 0.3 },
    background: { value: "#ffee00" },
    backgroundOpacity: { value: 0.3, base: BACKGROUND },
    padding: { value: 2, base: BACKGROUND },
    boxPadding: { value: 2, base: BACKGROUND },
    cornerRadius: { value: 40, base: { padding: 4, ...BACKGROUND } },
    borderWidth: { value: 6 },
    borderColor: { value: "#ff0000", base: { borderWidth: 6 } },
    borderOpacity: { value: 0.2, base: { borderWidth: 6 } },
    gradient: { value: true },
    gradientType: { value: "radial", base: { gradient: true } },
    gradientColors: { value: ["#ff0000", "#00ff00"], base: { gradient: true } },
    gradientDirection: { value: "horizontal", base: { gradient: true, gradientType: "linear" } },
    location: { value: "bottom-right" },
    attachOffset: { value: 3 },
    offsetX: { value: 2 },
    offsetY: { value: 2 },
    shiftX: { value: 1 },
    shiftY: { value: 1 },
    // the box is the words and their margins: margins make the two differ
    shiftOf: { value: "words", base: { shiftX: 0.3, marginLeft: 40, marginRight: 40 } },
    gapOf: { value: "words", base: { location: "top" } },
    box: { value: "target-width", base: { location: "inside-top", ...BACKGROUND } },
    // pushed off the canvas, it is brought back
    keepInView: { value: true, base: { offsetX: 60 } },
    marginTop: { value: 30, base: BACKGROUND },
    marginBottom: { value: 30, base: BACKGROUND },
    marginLeft: { value: 30, base: BACKGROUND },
    marginRight: { value: 30, base: BACKGROUND },
    pointer: { value: true, base: BACKGROUND },
    pointerDirection: { value: "top", base: { pointer: true, ...BACKGROUND } },
    pointerWidth: { value: 90, base: { pointer: true, pointerHeight: 60, ...BACKGROUND } },
    pointerHeight: { value: 60, base: { pointer: true, ...BACKGROUND } },
    pointerOffset: { value: 60, base: { pointer: true, pointerWidth: 40, pointerHeight: 60, ...BACKGROUND } },
    pointerCurve: { value: true, base: { pointer: true, pointerWidth: 60, pointerHeight: 60, ...BACKGROUND } },
    outline: { value: "#ff0000" },
    outlineWidth: { value: 8, base: { outline: "#ff0000" } },
    outlineOpacity: { value: 0.2, base: { outline: "#ff0000", outlineWidth: 6 } },
    shadow: { value: true },
    shadowColor: { value: "#ff0000", base: { shadow: true } },
    shadowBlur: { value: 20, base: { shadow: true } },
    shadowOffsetX: { value: 10, base: { shadow: true } },
    shadowOffsetY: { value: 10, base: { shadow: true } },
    panelShadow: { value: true, base: BACKGROUND },
    panelShadowColor: { value: "#ff0000", base: { panelShadow: true, ...BACKGROUND } },
    panelShadowBlur: { value: 20, base: { panelShadow: true, ...BACKGROUND } },
    panelShadowOffsetX: { value: 10, base: { panelShadow: true, ...BACKGROUND } },
    panelShadowOffsetY: { value: 10, base: { panelShadow: true, ...BACKGROUND } },
    animation: { value: "shake" },
    animationSpeed: { value: 5, base: { animation: "shake" } },
    depthFade: { value: true },
    depthFadeNear: { value: 0, base: { depthFade: true } },
    depthFadeFar: { value: 1, base: { depthFade: true } },
    pickable: { value: true },
    badge: { value: "notification" },
    icon: { value: "A" },
    iconPosition: { value: "right", base: { icon: "A" } },
    // a progress badge fills from 0 by default: held still so the frame shows the value
    progress: { value: 0.8, base: { badge: "progress", animation: "none" } },
    smartOverflow: { value: true, text: "1500" },
    maxNumber: { value: 9, text: "1500", base: { smartOverflow: true } },
    overflowSuffix: { value: "WWW", text: "1500", base: { smartOverflow: true, maxNumber: 9 } },
    closeButton: { value: true },
};

/**
 * Fields whose change is not a picture: what they do is checked elsewhere, and why is said here.
 */
export const NOT_A_PICTURE: Readonly<Partial<Record<keyof LabelStyle, string>>> = {
    pickable: "Whether a click on the label picks its node: test/browser/label-click-picks-node.test.ts.",
};

/**
 * The text kinds label-fields-node.test.ts and label-fields-edge.test.ts measure, by style channel: a field channel
 * into one of these is measured there, in a scene built to show every field.
 */
export const MEASURED_TEXT_STYLES: readonly string[] = [
    "node.labelStyle",
    "node.xlabelStyle",
    "node.tooltipStyle",
    "edge.labelStyle",
    "edge.xlabelStyle",
    "edge.arrowHeadTextStyle",
    "edge.arrowTailTextStyle",
];

/** One text kind: the style channel its fields are written to and how its words are switched on. */
export interface TextKind {
    readonly name: string;
    readonly target: "node" | "edge";
    readonly styleChannel: string;
    readonly textChannel: string;
    /** How tall the words are drawn, where 3 (the catalog's start) puts them off the canvas. */
    readonly size?: number;
    /** What the measured style always holds for this kind (an external label placed where a label sits). */
    readonly base?: Style;
}

/**
 * Whether writing one field changes the picture under any of its setups.
 * @param graph - The mounted graph.
 * @param kind - The text kind.
 * @param test - The field's case.
 * @param selectors - What the layer paints.
 * @param selectors.one - The one element.
 * @param selectors.every - Every element.
 * @param before - Called before each frame is read.
 * @param write - What the layer sets, beside the words, to write the field over a style.
 * @returns Whether it drew.
 */
async function fieldDraws(
    graph: Graph,
    kind: TextKind,
    test: FieldCase,
    selectors: { one: object; every: object },
    before: () => Promise<void>,
    write: (style: Style) => Record<string, unknown>,
): Promise<boolean> {
    const session = graph.getSession();
    const words = { [kind.textChannel]: test.text ?? WORDS };
    const layer = await session.styles.add({
        name: `${kind.name} field`,
        target: kind.target,
        selector: test.everyOne === true ? selectors.every : selectors.one,
        set: words,
    } as never);
    try {
        for (const extra of test.bases ?? [test.base ?? {}]) {
            const base = { size: kind.size ?? 3, ...kind.base, ...test.base, ...extra };
            await session.styles.update(layer.id, { set: { ...words, [kind.styleChannel]: base } });
            await before();
            const without = await readCanvas(graph);
            await session.styles.update(layer.id, { set: { ...words, ...write(base) } });
            await before();
            if (pixelsOverBar(without, await readCanvas(graph)) > 0) {
                return true;
            }
        }
        return false;
    } finally {
        await session.styles.remove(layer.id);
    }
}

/**
 * Draw every field on one text kind in one view and return the fields that changed nothing.
 * @param graph - The mounted graph.
 * @param kind - The text kind.
 * @param view - The view the graph is in.
 * @param selectors - What the layer paints: the one element measured, and every element (`everyOne`).
 * @param selectors.one - The one element.
 * @param selectors.every - Every element.
 * @param before - Called before each frame is read (a tooltip's hover).
 * @returns The fields, and the field channels (`node.labelColor`), that drew nothing.
 */
export async function silentFields(
    graph: Graph,
    kind: TextKind,
    view: "2d" | "3d",
    selectors: { one: object; every: object },
    before: () => Promise<void> = async () => {},
): Promise<string[]> {
    const session = graph.getSession();
    // A field the catalog says draws on other text kinds only (`drawnOn`) is not measured on this one.
    const fields = LABEL_STYLE_DESCRIPTORS.filter(
        (d) => d.drawnOn === undefined || d.drawnOn.includes(kind.styleChannel as Channel),
    )
        .map((d) => d.field)
        .filter((f) => NOT_A_PICTURE[f] === undefined);
    // Words on the measured element beneath the measured layer, so removing that layer never takes the text away (a
    // tooltip's words gone and back would need the pointer to arrive again).
    const words = await session.styles.add({
        name: `${kind.name} words`,
        target: kind.target,
        selector: selectors.one,
        set: { [kind.textChannel]: WORDS },
    } as never);
    // The channels that write one field of this kind's style (`node.labelColor` writes `node.labelStyle`'s color):
    // each is measured here too, in this scene, which shows every field.
    const channelsOf = new Map<string, Channel[]>();
    for (const channel of Object.keys(CHANNEL_DESCRIPTORS) as Channel[]) {
        const into = labelFieldOf(channel);
        if (into?.into === kind.styleChannel) {
            channelsOf.set(into.field, [...(channelsOf.get(into.field) ?? []), channel]);
        }
    }
    const silent: string[] = [];
    for (const field of fields) {
        const test = FIELD_CASES[field];
        // the field written in the style, then each channel that writes it, over the same style without it
        const writers: [string, (style: Style) => Record<string, unknown>][] = [
            [field, (style) => ({ [kind.styleChannel]: { ...style, [field]: test.value } })],
            ...(channelsOf.get(field) ?? []).map((channel): [string, (style: Style) => Record<string, unknown>] => [
                channel,
                (style) => ({ [kind.styleChannel]: style, [channel]: test.value }),
            ]),
        ];
        for (const [name, write] of writers) {
            if (!(await fieldDraws(graph, kind, test, selectors, before, write))) {
                silent.push(name);
            }
        }
    }

    await session.styles.remove(words.id);
    assert.isAbove(fields.length, 80, "every label field is measured");
    return silent;
}
