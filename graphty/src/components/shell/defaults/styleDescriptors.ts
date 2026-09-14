/**
 * The style layers spec 7.2 and 7.5 paint, as plain descriptors.
 *
 * Spec 7.2 (design/ui/app-shell-progressive-disclosure-design.md lines 5666-5692) asks
 * a load for three encodings -- one neutral node colour, node size by degree on a
 * square-root scale with the largest node at most 4x the base, and labels on the top
 * clamp(round(sqrt(n)), 5, 50) nodes by degree -- and spec 7.5's community reading
 * needs a fourth: a colour per group.
 *
 * Every function here RETURNS a layer and adds nothing. The layer objects are shaped
 * exactly as graphty-element's StyleManager takes them, with three rules the shipped
 * code makes non-negotiable:
 *
 * 1. `calculatedStyle` is a SIBLING of `style`, never nested inside it.
 *    Styles.getCalculatedStylesForNode only reads the sibling, so a nested
 *    calculatedStyle is silently dropped and the encoding never appears.
 * 2. A calculatedStyle MAY now output into `style.label.*`, as of the element fix of
 *    2026-09-13. NodeStyle.label is a `RichTextStyle.prefault({...}).optional()`, and
 *    ChangeManager.getSchemaItemFromPath used to stop at the first wrapper and throw
 *    "don't know how to retreive path for: enabled"; it now unwraps optional, prefault,
 *    default, nullable, non-optional, readonly and catch before descending
 *    (graphty-element/src/ChangeManager.ts `unwrapSchema`). The leaf is still validated:
 *    `style.label.enabled` is parsed against RichTextStyle's own `z.boolean()`, so a
 *    calculated value of the wrong type is still rejected.
 * 3. A JMESPath literal needs backticks around it, which is the form
 *    graphty-element's own KruskalAlgorithm.ts:41 ships.
 *
 * The palette hexes below are copied, not imported: they are the Okabe-Ito set from
 * graphty-element/src/config/palettes/categorical.ts (OKABE_ITO_COLORS), and
 * graphty/src/types/graphty-element.d.ts does not re-export the palettes, so the app
 * cannot reach them. The copy is asserted against nothing but the source comment, so
 * the citation is the guard.
 */



/** A calculated style. `calculatedStyle` is a SIBLING of `style`, never nested in it. @public */
export interface CalculatedStyleDescriptor {
    /** Input paths; each must match /^data\.|algorithmResults\./ . */
    readonly inputs: readonly string[];
    /** Output path; must start with "style.". */
    readonly output: string;
    /** The expression body, evaluated with StyleHelpers in scope. */
    readonly expr: string;
}

/** The node half of a layer. @public */
export interface NodeLayerDescriptor {
    /** A JMESPath boolean expression, or "" for every node. */
    readonly selector: string;
    /** A static NodeStyle fragment. */
    readonly style: Readonly<Record<string, unknown>>;
    /** The calculated half, when there is one. */
    readonly calculatedStyle?: CalculatedStyleDescriptor;
}

/** One style layer, shaped exactly as graphty-element's StyleManager takes it. @public */
export interface StyleLayerDescriptor {
    /** Names the layer in the layer list, and tags where it came from. */
    readonly metadata: {
        /** The layer's own name. */
        readonly name: string;
        /** What it does, for the layer inspector. */
        readonly description?: string;
        /** "<namespace>:<type>" when a run produced it, so the run's layers can be removed together. */
        readonly algorithmSource?: string;
    };
    /** The node half. Every layer this module builds is node-only. */
    readonly node: NodeLayerDescriptor;
}

/**
 * The algorithmSource tag every layer the 7.2 defaults add carries.
 *
 * It exists so a dataset boundary can remove the shell's OWN layers and nothing else.
 * graphty-element's style stack opens with its `default` layer, which carries
 * `NodeStyle.parse(defaultNodeStyle)` and therefore every node's shape type
 * (graphty-element/src/Styles.ts:54-67); removing the stack by index took that with it
 * and the next load died in mesh building with "shape with type required to create
 * mesh". Tagging is the same mechanism a community run already uses to retire its own
 * layers, so there is one way to do this rather than two.
 */
export const LOAD_DEFAULTS_LAYER_SOURCE = "shell:load-defaults";

/**
 * The per-node degree the label rule reads, as a calculatedStyle input path.
 *
 * It is `graphty`.`degree`.`degree`: the namespace and type graphty-element's own
 * DegreeAlgorithm registers, and the per-node result it writes with
 * `addNodeResult(nodeId, "degree", degree)`. The same path appears in
 * `analysis/runs.ts`, which READS the results back; a path that drifted would leave the
 * rule matching nothing and the reader with no labels and no error.
 */
export const DEGREE_INPUT_PATH = "algorithmResults.graphty.degree.degree";

/** Where the label rule writes its verdict. Validated against RichTextStyle's own `enabled`. */
export const LABEL_ENABLED_OUTPUT_PATH = "style.label.enabled";

/**
 * Labels on the most connected nodes, as a RULE rather than a list.
 *
 * CALCULATED, not static, and not a selector over node ids -- the product owner's
 * instruction of 2026-09-13: "use a calculated node and the default text style for adding
 * labels to nodes by degree. it must be added as a style layer and have a setting that can
 * disable that feature." What was here before named the five highest-degree node ids in a
 * `contains(...)` selector, so the layer described one dataset: it had to be rebuilt on
 * every load, said nothing a reader could read as a rule, and meant nothing at all once
 * the data changed under it. This layer matches every node (`selector: ""`) and asks the
 * node's own degree whether to draw its label, so the same layer keeps its meaning across
 * a reload, a re-run and a different file.
 *
 * THE DEFAULT TEXT STYLE, and nothing else. The layer decides WHETHER a label is drawn;
 * how it looks is the element's own RichTextStyle prefault. It must not name a colour: the
 * canvas ground is the element's clear colour #F5F5F5, so the #000000 default reads at
 * 19.26:1, and the dark-panel ink this once set read at about 1.1:1 -- the glyph fill
 * vanished and what stayed legible was the alpha fringing round it (2026-09-13). The only
 * thing the static half may carry is `textPath`, which is WHICH attribute to draw rather
 * than how it looks, and only when the caller names one.
 *
 * The rule is `degree >= cut`. It cannot count, and it cannot split a tie either, so the
 * cut is chosen for it by `labelCutFor` in loadDefaults.ts: inside 7.2's budget where a cut
 * fits, and the highest tie group whole where none does -- which is what gives a
 * near-regular graph labels at all. Everything about HOW MANY nodes end up labelled is
 * decided there and nothing here needs to know; the layer only carries the cut.
 *
 * `typeof` guards the comparison because a node the degree pass never reached carries no
 * result at all, and `undefined >= 0` is false while `null >= 0` is TRUE -- a bare
 * comparison would label every unreached node on a graph whose cut is zero.
 *
 * There is no node-id parameter. One was accepted and ignored between 2026-09-13 and this
 * change, which meant the signature promised a list this layer had stopped being; a caller
 * passing ids now gets a compile error instead of a silent no-op.
 * @param input - the cut, and optionally the attribute to draw.
 * @param input.degreeThreshold - the cut from `labelCutFor` (or `labelDegreeThreshold`).
 * @param input.labelAttribute - the attribute to draw as the label; omitted falls back to the node id.
 * @returns the top-degree label layer.
 */
export function topDegreeLabelLayer(input: {
    /** The cut from `labelCutFor`: a node is labelled at or above this degree. */
    readonly degreeThreshold: number;
    /** The attribute to draw as the label. Omitted falls back to the node id. */
    readonly labelAttribute?: string;
}): StyleLayerDescriptor {
    const style: Record<string, unknown> =
        input.labelAttribute === undefined ? {} : { label: { textPath: input.labelAttribute } };

    return {
        metadata: {
            name: "Top degree labels",
            description: "Labels the most connected nodes (spec 7.2). Settings > Performance turns this off.",
            algorithmSource: LOAD_DEFAULTS_LAYER_SOURCE,
        },
        node: {
            selector: "",
            style,
            calculatedStyle: {
                inputs: [DEGREE_INPUT_PATH],
                output: LABEL_ENABLED_OUTPUT_PATH,
                expr: `typeof arguments[0] === "number" && arguments[0] >= ${String(input.degreeThreshold)}`,
            },
        },
    };
}

/** How many groups get a colour. Eight, because the palette has eight and it cycles past that. */
export const COMMUNITY_COLOUR_CAP = 8;

/**
 * The Okabe-Ito categorical palette, colourblind-safe, copied from the element's own
 * OKABE_ITO_COLORS (graphty-element/src/config/palettes/categorical.ts).
 */
export const COMMUNITY_PALETTE: readonly string[] = [
    "#E69F00",
    "#56B4E9",
    "#009E73",
    "#F0E442",
    "#0072B2",
    "#D55E00",
    "#CC79A7",
    "#999999",
];

/** The layer name and description the community run's layers carry. */
export const COMMUNITY_LAYER_NAME = "Groups (Communities, Louvain)";

/** The algorithmSource tag on every layer a community run adds. */
export const COMMUNITY_LAYER_SOURCE = "graphty:louvain";

/**
 * One layer per coloured group, largest first, capped at COMMUNITY_COLOUR_CAP. Groups
 * past the cap get no layer and keep the neutral colour.
 *
 * The cap is eight rather than the eleven design line 2302 draws because the palette
 * has exactly eight entries and the element's own okabeIto() helper CYCLES past that --
 * okabeIto(8) returns okabeIto(0) -- which would paint group 9 identically to group 1
 * and break the "11 largest, rest neutral" reading the cap exists to make true.
 * Inventing three more hexes to reach eleven would be inventing colour.
 *
 * Selectors only: no calculatedStyle appears anywhere in this function, so there is no
 * way for a nesting mistake to silently drop a group's colour.
 * @param groups - every group with its id and size, in any order.
 * @returns one layer per coloured group, largest first.
 */
export function communityColourLayers(
    groups: readonly {
        readonly communityId: number;
        readonly size: number;
    }[],
): readonly StyleLayerDescriptor[] {
    const ordered = [...groups].sort((left, right) => {
        if (right.size !== left.size) {
            return right.size - left.size;
        }

        return left.communityId - right.communityId;
    });

    return ordered.slice(0, COMMUNITY_COLOUR_CAP).map((group, index) => {
        const rank = index + 1;

        return {
            metadata: {
                name: `${COMMUNITY_LAYER_NAME} ${String(rank)}`,
                description: `Group ${String(group.communityId)}, ${String(group.size)} members.`,
                algorithmSource: COMMUNITY_LAYER_SOURCE,
            },
            node: {
                selector: `algorithmResults.graphty.louvain.communityId == \`${String(group.communityId)}\``,
                style: { texture: { color: COMMUNITY_PALETTE[index] } },
            },
        };
    });
}
