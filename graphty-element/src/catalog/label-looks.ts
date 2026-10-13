/**
 * @file Named label looks: a whole label appearance under one name, picked the way a palette is.
 *
 * A label has some fifty settings, and nobody should meet them to get a readable label. A look is
 * a starting point a layer names with {@link LabelStyle.look}; the layer then writes only the
 * fields it changes, and {@link labelLookChanges} reports which those are -- so an editor can say
 * "edited" and offer each changed field back to the look's value without comparing anything
 * itself.
 *
 * Every look sets its own text and background colors, and every one measures at least 4.5:1
 * between them (WCAG AA for body text), checked by `test/catalog/glyphs.test.ts`. The default look
 * sets nothing: it is the element's own label, black text on the element's light canvas. The
 * others name the element's own face with a generic fallback, so a machine without Verdana draws
 * them in its sans serif rather than in the browser's default serif.
 */

import type { LabelStyle } from "./label-style";

/** The id of a named label look. */
export type LabelLookId = "default" | "card" | "dark" | "pill" | "callout";

/** A named label look. */
export interface LabelLookDescriptor {
    /** What a layer writes into {@link LabelStyle.look}. */
    readonly id: LabelLookId;
    /** The default name to show for it. An application may replace it by id. */
    readonly plainName: string;
    /** The fields the look sets. A field it leaves out is the element's own default. */
    readonly style: Readonly<Omit<LabelStyle, "look" | "enabled">>;
}

/** Every named label look, the element's own first. */
export const LABEL_LOOKS: readonly LabelLookDescriptor[] = Object.freeze([
    { id: "default", plainName: "Default", style: {} },
    {
        id: "card",
        plainName: "Card",
        style: {
            font: "Verdana, sans-serif",
            color: "#1a1a1a",
            background: "#ffffff",
            padding: 6,
            cornerRadius: 6,
            borderWidth: 1,
            borderColor: "#8a8a8a",
        },
    },
    {
        id: "dark",
        plainName: "Dark",
        style: { font: "Verdana, sans-serif", color: "#ffffff", background: "#222222", padding: 6, cornerRadius: 6 },
    },
    {
        id: "pill",
        plainName: "Pill",
        style: {
            font: "Verdana, sans-serif",
            color: "#ffffff",
            background: "#1f5fa8",
            padding: 8,
            cornerRadius: 24,
            weight: "bold",
        },
    },
    {
        id: "callout",
        plainName: "Callout",
        style: {
            font: "Verdana, sans-serif",
            color: "#1a1a1a",
            background: "#fff4c2",
            padding: 6,
            cornerRadius: 6,
            pointer: true,
            pointerDirection: "bottom",
        },
    },
] satisfies LabelLookDescriptor[]);

/**
 * The look with this id.
 * @param id - A look id, such as one read from a saved document.
 * @returns Its descriptor, or undefined for an id no look has.
 */
export function labelLook(id: string): LabelLookDescriptor | undefined {
    return LABEL_LOOKS.find((look) => look.id === id);
}

/**
 * Fields that are not part of a look, so never reported as a change from one: the look itself, the
 * on/off switch, where the label sits, what its size is measured in, whether it is drawn over the
 * graph and whether it takes clicks -- placement and behavior, which no look sets and an editor
 * offers beside the look.
 */
const NOT_LOOK_FIELDS: ReadonlySet<string> = new Set(["look", "enabled", "location", "sizeUnit", "onTop", "pickable"]);

/**
 * The fields a label style changes from the look it names.
 *
 * A field counts when the style sets it and its value differs from the look's (the default look,
 * when the style names none). `look` itself, `enabled` (the label's on/off switch), `location`,
 * `sizeUnit`, `onTop` and `pickable` (where it sits, what its size is measured in and how it
 * behaves) are never changes. An empty list means the style is exactly its look.
 * @param style - A label style a layer writes.
 * @returns The changed fields, in the style's own order.
 */
export function labelLookChanges(style: LabelStyle): (keyof LabelStyle)[] {
    const base: Readonly<Record<string, unknown>> = labelLook(style.look ?? "default")?.style ?? {};

    return (Object.keys(style) as (keyof LabelStyle)[]).filter(
        (field) =>
            !NOT_LOOK_FIELDS.has(field) &&
            style[field] !== undefined &&
            JSON.stringify(style[field]) !== JSON.stringify(base[field]),
    );
}

const expanded = new WeakMap<LabelStyle, LabelStyle>();

/**
 * A label style with its look's fields filled in beneath its own.
 *
 * What the repaint stacks: a layer that names a look covers every field the look sets, as if the
 * layer had written them, and its own fields win over the look's. A style with no look, or a look
 * no catalog entry has, comes back as it is.
 * @param style - A label style a layer writes.
 * @returns The style the layer paints.
 */
export function withLabelLook(style: LabelStyle): LabelStyle {
    const look = style.look === undefined ? undefined : labelLook(style.look);

    if (look === undefined) {
        return style;
    }

    let full = expanded.get(style);

    if (full === undefined) {
        full = { ...look.style };

        for (const [field, value] of Object.entries(style)) {
            if (value !== undefined) {
                (full as Record<string, unknown>)[field] = value;
            }
        }

        expanded.set(style, full);
    }

    return full;
}
