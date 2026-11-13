/**
 * @file The palettes and label looks a session holds because a saved file carried them.
 *
 * A save file must open the same way on any later build, so it carries every palette and label
 * look its layers name, built-ins included, and a reader resolves a name against what the file
 * carried before its own catalog (design/architecture/self-contained-save-files.md). A palette the
 * reading build no longer ships, or ships with other colors, paints the colors the file was saved
 * with.
 *
 * The session holds them beside its scales, in the one registry the stack checks a layer against
 * and the repaint paints from, so a layer is never accepted against a palette the repaint cannot
 * find. Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { labelLook, type LabelLookDescriptor } from "../../catalog/label-looks";
import type { LabelStyle } from "../../catalog/label-style";
import { paletteDescriptor } from "../../catalog/palettes";
import type { LayerSpec, PaletteDescriptor } from "../../catalog/types";
import { GraphtyError } from "../../errors";

/** What a session holds because a file carried it, by id. */
export interface CarriedLooks {
    readonly palettes: Map<string, PaletteDescriptor>;
    readonly labelLooks: Map<string, LabelLookDescriptor>;
}

/**
 * The refusal a malformed carried entry gets.
 * @param message - What is wrong.
 * @param details - The entry's id.
 * @returns The error.
 */
function badCommand(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "style", details });
}

/** The carried parts of a style document. */
export interface CarriedDocument {
    readonly palettes?: readonly PaletteDescriptor[];
    readonly labelLooks?: readonly LabelLookDescriptor[];
}

/**
 * An empty holding.
 * @returns Nothing carried yet.
 */
export function createCarriedLooks(): CarriedLooks {
    return { palettes: new Map(), labelLooks: new Map() };
}

/**
 * A palette by name: the carried one, else the catalog's (built-in or registered).
 * @param carried - What the session holds.
 * @param id - The palette name.
 * @returns The descriptor, or undefined.
 */
export function resolvePalette(carried: CarriedLooks, id: string): PaletteDescriptor | undefined {
    return carried.palettes.get(id) ?? paletteDescriptor(id);
}

/**
 * A label look by name: the carried one, else the catalog's.
 * @param carried - What the session holds.
 * @param id - The look name.
 * @returns The descriptor, or undefined.
 */
export function resolveLabelLook(carried: CarriedLooks, id: string): LabelLookDescriptor | undefined {
    return carried.labelLooks.get(id) ?? labelLook(id);
}

const expanded = new WeakMap<LabelStyle, { readonly look: LabelLookDescriptor; readonly full: LabelStyle }>();

/**
 * A label style with its look's fields filled in beneath its own: what the repaint stacks. A style
 * with no look, or a look nothing holds, comes back as it is.
 * @param style - A label style a layer writes.
 * @param carried - What the session holds.
 * @returns The style the layer paints.
 */
export function withLabelLook(style: LabelStyle, carried: CarriedLooks): LabelStyle {
    const look = style.look === undefined ? undefined : resolveLabelLook(carried, style.look);
    if (look === undefined) {
        return style;
    }

    const cached = expanded.get(style);
    if (cached?.look === look) {
        return cached.full;
    }

    const full: Record<string, unknown> = { ...look.style };
    for (const [field, value] of Object.entries(style)) {
        if (value !== undefined) {
            full[field] = value;
        }
    }

    expanded.set(style, { look, full: full });
    return full;
}

/**
 * The palette and label look names these layers use.
 * @param specs - The layers.
 * @returns The names, each in the order first named.
 */
function namedLooks(specs: readonly LayerSpec[]): { palettes: Set<string>; labelLooks: Set<string> } {
    const palettes = new Set<string>();
    const labelLooks = new Set<string>();
    for (const spec of specs) {
        for (const binding of Object.values(spec.encode ?? {})) {
            if (binding !== undefined && "by" in binding && binding.palette !== undefined) {
                palettes.add(String(binding.palette));
            }
        }

        for (const [channel, value] of Object.entries(spec.set ?? {})) {
            const look = channel.endsWith("Style") ? (value as { look?: unknown } | null)?.look : undefined;
            if (typeof look === "string") {
                labelLooks.add(look);
            }
        }
    }

    return { palettes, labelLooks };
}

/**
 * What a document of these layers carries: every palette and label look they name, built-ins
 * included, as this session resolves them.
 * @param specs - The layers being written out.
 * @param carried - What the session holds.
 * @returns The descriptors, each list empty when nothing is named.
 */
export function carriedFor(
    specs: readonly LayerSpec[],
    carried: CarriedLooks,
): { palettes: PaletteDescriptor[]; labelLooks: LabelLookDescriptor[] } {
    const named = namedLooks(specs);
    return {
        palettes: [...named.palettes].flatMap((id) => resolvePalette(carried, id) ?? []),
        labelLooks: [...named.labelLooks].flatMap((id) => resolveLabelLook(carried, id) ?? []),
    };
}

/**
 * Refuse a carried palette or label look that is not well formed: it is data off a disk.
 * @param document - The carried parts.
 * @throws `E_BAD_COMMAND` naming the first bad entry.
 */
export function checkCarried(document: CarriedDocument): void {
    const kinds: readonly unknown[] = ["sequential", "diverging", "categorical"];
    for (const palette of document.palettes ?? []) {
        const { id, colors, kind } = palette as { id?: unknown; colors?: unknown; kind?: unknown };
        const colorList =
            Array.isArray(colors) && colors.length > 0 && colors.every((each) => typeof each === "string");
        if (typeof id !== "string" || !colorList || !kinds.includes(kind)) {
            throw badCommand("A style document carries a palette that is not an id, a kind and a list of colors.", {
                palette: typeof id === "string" ? id : null,
            });
        }
    }

    for (const look of document.labelLooks ?? []) {
        const { id, style } = look as { id?: unknown; style?: unknown };
        if (typeof id !== "string" || typeof style !== "object" || style === null || Array.isArray(style)) {
            throw badCommand("A style document carries a label look that is not an id and a style.", {
                look: typeof id === "string" ? id : null,
            });
        }
    }
}

/**
 * Hold what a document carries, so its layers resolve against it.
 *
 * A held entry nothing in the stack names any more is let go first, so a file opened after another
 * reads its own palettes, or the catalog's, never the earlier file's. An id the session already
 * holds keeps what it holds, so applying a style file never repaints a layer already in the stack.
 * @param carried - What the session holds.
 * @param document - The carried parts.
 * @param stack - The layers in the stack now.
 * @returns A function that puts the holding back as it was, for a refused apply.
 */
export function holdCarried(carried: CarriedLooks, document: CarriedDocument, stack: readonly LayerSpec[]): () => void {
    const before = { palettes: new Map(carried.palettes), labelLooks: new Map(carried.labelLooks) };
    const named = namedLooks(stack);
    for (const id of carried.palettes.keys()) {
        if (!named.palettes.has(id)) {
            carried.palettes.delete(id);
        }
    }

    for (const id of carried.labelLooks.keys()) {
        if (!named.labelLooks.has(id)) {
            carried.labelLooks.delete(id);
        }
    }

    // ponytail: an id the stack already resolves through the catalog takes the document's entry, so
    // a style file applied onto a project with other colors under that id repaints its layers; rename
    // on collision, as shaders do, if that ever matters.
    for (const palette of document.palettes ?? []) {
        if (!carried.palettes.has(palette.id)) {
            carried.palettes.set(palette.id, Object.freeze({ ...palette }));
        }
    }

    for (const look of document.labelLooks ?? []) {
        if (!carried.labelLooks.has(look.id)) {
            carried.labelLooks.set(look.id, Object.freeze({ ...look }));
        }
    }

    return () => {
        for (const key of ["palettes", "labelLooks"] as const) {
            const map = carried[key] as Map<string, unknown>;
            map.clear();
            for (const [id, entry] of before[key]) {
                map.set(id, entry);
            }
        }
    };
}
