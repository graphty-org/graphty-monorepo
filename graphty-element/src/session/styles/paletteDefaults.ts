/**
 * The default palettes a session fills into a color binding that names none, and the palettes a
 * saved specification names for the defaults it was painted through.
 */
import { knownPaletteIds, paletteDescriptor } from "../../catalog/palettes";
import type { Binding, LayerId, LayerSpec } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { channelDescriptor } from "./channels";
import type { PreparedBinding } from "./encoding";
import type { ScaleRegistry } from "./scales";
import { badCommand } from "./styleErrors";
import type { DefaultPalettes } from "./StylesApi";

/**
 * Refuse a defaults argument that names a kind other than the three palette kinds, a palette that
 * does not exist, or a palette of a different kind.
 * @param palettes - The defaults to set.
 * @throws `E_BAD_COMMAND` for a wrong kind; `E_UNKNOWN_PALETTE` for an unknown palette.
 */
export function assertDefaultPalettes(palettes: DefaultPalettes): void {
    for (const [kind, id] of Object.entries(palettes)) {
        if (kind !== "categorical" && kind !== "sequential" && kind !== "diverging") {
            throw badCommand(
                `setDefaultPalettes takes a palette for "categorical", "sequential" or "diverging", not "${kind}".`,
                { field: kind },
            );
        }

        if (id === undefined) {
            continue;
        }

        const palette = paletteDescriptor(String(id));
        if (palette === undefined) {
            const available = knownPaletteIds();
            throw new GraphtyError({
                code: "E_UNKNOWN_PALETTE",
                message: `There is no palette named "${String(id)}". Define it before making it a default.`,
                source: "style",
                details: { palette: id, available, candidates: available },
            });
        }

        if (palette.kind !== kind) {
            throw badCommand(`The palette "${palette.id}" is ${palette.kind}, so it cannot be the ${kind} default.`, {
                field: kind,
                palette: palette.id,
            });
        }
    }
}

/** What the default palettes are worked out from. */
export interface PaletteDefaultsSources {
    /** The scales a binding names, to tell a categorical binding from a numeric one. */
    readonly scales: ScaleRegistry;
    /**
     * The bindings the layer at an id was painted with by its own version, never an earlier one.
     * @param id - The layer.
     * @returns Its prepared bindings, or none for a layer not in the stack or not painted yet.
     */
    readonly fresh: (id: LayerId) => readonly PreparedBinding[];
}

/** The default palettes one session holds, and what reads and writes them. */
export interface PaletteDefaults {
    /** The defaults `setDefaultPalettes` chose; empty until it is called. */
    defaultPalettes: DefaultPalettes;
    /**
     * The bindings, as "layer id / channel", whose palette was filled in from a default rather
     * than named by the author, and the palette written.
     */
    readonly defaulted: Map<string, string>;
    /** The palette kind a color binding's default comes from, or null when it reads no palette. */
    readonly paletteKindOf: (binding: Binding) => keyof DefaultPalettes | null;
    /** Write the default palettes into a specification's color bindings that name none. */
    readonly withDefaultPalettes: (spec: LayerSpec, id: LayerId) => LayerSpec;
    /** Name, in a specification being saved, the palette each unnamed color binding was painted through. */
    readonly withResolvedPalettes: (spec: LayerSpec, id: LayerId) => LayerSpec;
}

/**
 * The default palettes of one session.
 * @param sources - The scales, and the bindings each layer was painted with.
 * @returns The defaults, empty until set, and what reads and writes them.
 */
export function createPaletteDefaults(sources: PaletteDefaultsSources): PaletteDefaults {
    const { scales } = sources;
    /** The defaults `setDefaultPalettes` chose; empty until it is called. */
    let defaultPalettes: DefaultPalettes = {};
    /**
     * The bindings, as "layer id / channel", whose palette was filled in from a default rather
     * than named by the author, and the palette written. Only ever read against the live stack,
     * so an entry for a layer that is gone answers for nothing.
     */
    const defaulted = new Map<string, string>();

    /**
     * The palette kind a color binding's default comes from, or null when it reads no palette.
     * @param binding - The binding.
     * @returns The kind.
     */
    const paletteKindOf = (binding: Binding): keyof DefaultPalettes | null => {
        if (
            !("by" in binding) ||
            binding.colors !== undefined ||
            binding.stops !== undefined ||
            binding.map !== undefined ||
            binding.scale === "passthrough"
        ) {
            return null;
        }

        if (scales.describe(binding.scale ?? "linear")?.domainKind === "categorical") {
            return "categorical";
        }

        return binding.midpoint === undefined ? "sequential" : "diverging";
    };

    /**
     * The color bindings of a specification that name no palette, and the default each takes.
     * @param spec - The specification.
     * @returns Each such channel, with its binding and the default palette's id (undefined when
     *   no default is set for its kind).
     */
    const unnamedPalettes = (spec: LayerSpec): { channel: string; binding: Binding; kind: keyof DefaultPalettes }[] => {
        const found: { channel: string; binding: Binding; kind: keyof DefaultPalettes }[] = [];
        for (const [channel, binding] of Object.entries(spec.encode ?? {})) {
            if (binding === undefined || channelDescriptor(channel)?.accepts !== "color") {
                continue;
            }

            const kind = paletteKindOf(binding);
            if (kind !== null && "by" in binding && binding.palette === undefined) {
                found.push({ channel, binding, kind });
            }
        }

        return found;
    };

    /**
     * Write the default palettes into a specification's color bindings that name none.
     * @param spec - The specification.
     * @param id - The layer it is written to, so the default it took can be found again.
     * @returns The specification with every default it takes named.
     */
    const withDefaultPalettes = (spec: LayerSpec, id: LayerId): LayerSpec => {
        let encode: Record<string, Binding> | undefined;
        for (const { channel, binding, kind } of unnamedPalettes(spec)) {
            const palette = defaultPalettes[kind];
            if (palette !== undefined) {
                encode ??= { ...(spec.encode as Record<string, Binding>) };
                encode[channel] = { ...binding, palette };
                defaulted.set(`${id}/${channel}`, palette);
            }
        }

        return encode === undefined ? spec : { ...spec, encode };
    };

    /**
     * Name, in a specification being saved, the palette each color binding that names none was
     * painted through, so a file never depends on the reading build's default (issue #6514). Only
     * this version's own paint answers, never the last paint of an earlier version that a held
     * repaint stands in with, and only for a binding reading the same path through the same scale;
     * a layer not painted yet keeps its bindings as written.
     * @param spec - The specification.
     * @param id - The layer it was read from.
     * @returns The specification with every painted default named.
     */
    const withResolvedPalettes = (spec: LayerSpec, id: LayerId): LayerSpec => {
        const fresh = sources.fresh(id);
        let encode: Record<string, Binding> | undefined;
        for (const { channel, binding } of unnamedPalettes(spec)) {
            const by = "by" in binding ? binding.by : undefined;
            const scale = ("scale" in binding ? binding.scale : undefined) ?? "linear";
            const palette = fresh.find((each) => each.channel === channel && each.path === by && each.scale === scale)
                ?.palette?.id;
            if (palette !== undefined) {
                encode ??= { ...(spec.encode as Record<string, Binding>) };
                encode[channel] = { ...binding, palette };
            }
        }

        return encode === undefined ? spec : { ...spec, encode };
    };

    return {
        get defaultPalettes(): DefaultPalettes {
            return defaultPalettes;
        },
        set defaultPalettes(next: DefaultPalettes) {
            defaultPalettes = next;
        },
        defaulted,
        paletteKindOf,
        withDefaultPalettes,
        withResolvedPalettes,
    };
}
