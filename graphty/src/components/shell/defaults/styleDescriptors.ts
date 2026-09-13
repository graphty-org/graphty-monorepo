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
 * 2. A calculatedStyle may not output into `style.label.*`. NodeStyle.label is a
 *    ZodOptional<ZodPrefault<...>> that ChangeManager.getSchemaItemFromPath does not
 *    descend, so such a layer THROWS. The label layer is therefore a static style
 *    behind a selector.
 * 3. A JMESPath literal needs backticks around it, which is the form
 *    graphty-element's own KruskalAlgorithm.ts:41 ships. A JSON ARRAY is a literal too,
 *    which is what lets a selector name an explicit set of node ids; see
 *    {@link topDegreeLabelLayer}.
 *
 * The palette hexes below are copied, not imported: they are the Okabe-Ito set from
 * graphty-element/src/config/palettes/categorical.ts (OKABE_ITO_COLORS), and
 * graphty/src/types/graphty-element.d.ts does not re-export the palettes, so the app
 * cannot reach them. The copy is asserted against nothing but the source comment, so
 * the citation is the guard.
 */

import { LABEL_TEXT_COLOR } from "./loadDefaults";

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
 * A selector matching exactly the named node ids, and no other node.
 *
 * `id == 'A' || id == 'B'` is the attested form (LayeredStyles.stories.ts:89-91), but it
 * cannot be built from arbitrary ids without quoting rules of its own, so this uses the
 * JSON-literal form of the same test: `contains` over a backtick literal. Two details
 * are load-bearing:
 *
 * - `to_string(id)` is required. The ids arrive as strings (`readDegreeResults` stores
 *   `String(node.id)`) while the record the selector matches carries the id as the file
 *   wrote it, which is a NUMBER on the numerically-identified files. JMESPath `contains`
 *   compares by type, so without the coercion a numeric-id graph would match nothing and
 *   draw no labels at all.
 * - A backtick inside the literal would close it, so the JSON is escaped for backticks.
 *   JSON.stringify has already escaped quotes and backslashes.
 *
 * `id` is the field the ids are compared against because that is the default
 * `data.knownFields.nodeIdPath` (DataConfig.ts:4), the same assumption the degree
 * selector above makes about its result path.
 * @param ids - the node ids to match. An empty list matches no node.
 * @returns the JMESPath selector.
 */
function nodeIdSetSelector(ids: readonly string[]): string {
    const literal = JSON.stringify(ids).replaceAll("`", "\\`");

    return `contains(\`${literal}\`, to_string(id))`;
}

/**
 * Labels on the top-degree nodes.
 *
 * Static, not calculated: `label.enabled` is read only off the merged static style at
 * mesh build, and a calculatedStyle whose output is `style.label.*` throws in
 * ChangeManager. `textColor` is set because RichTextStyle defaults it to #000000, which
 * is invisible on the canvas ground.
 *
 * There are two selector forms, and only one of them keeps 7.2's budget:
 *
 * - With `labelNodeIds`, the selector names those nodes and nothing else, so exactly
 *   `labelCount` labels are drawn -- which is what "labels on the top
 *   clamp(round(sqrt(n)), 5, 50) nodes by degree" asks for. Pass the first `labelCount`
 *   ids of `DegreeResults.byDegreeDescending`, which is already sorted by degree with a
 *   stable id tie-break, so the set is deterministic.
 * - With only `degreeThreshold`, the selector is a degree comparison, and EVERY node at
 *   the cut degree is kept. That overshoots the budget by the size of the tie group at
 *   the cut: on the shipped cat fixture (20 nodes, degrees 4,4,4 then twelve 3s) the
 *   budget is 5, the cut degree is 3, and 15 of the 20 nodes are labelled. The form
 *   exists because a degree cut is all `labelDegreeThreshold` can express, not because
 *   the overshoot is wanted.
 * @param input - which nodes to label, and optionally the attribute to draw.
 * @param input.degreeThreshold - the cut from `labelDegreeThreshold`; used only when no ids are given.
 * @param input.labelNodeIds - the exact nodes to label, highest degree first. Overrides the cut.
 * @param input.labelAttribute - the attribute to draw as the label; omitted falls back to the node id.
 * @returns the top-degree label layer.
 */
export function topDegreeLabelLayer(input: {
    /** The cut from `labelDegreeThreshold`; used only when no ids are given. */
    readonly degreeThreshold: number;
    /** The exact nodes to label. When given, the label count is exact. */
    readonly labelNodeIds?: readonly string[];
    /** The attribute to draw as the label. Omitted falls back to the node id. */
    readonly labelAttribute?: string;
}): StyleLayerDescriptor {
    const label: Record<string, unknown> = {
        enabled: true,
        textColor: LABEL_TEXT_COLOR,
    };

    if (input.labelAttribute !== undefined) {
        label.textPath = input.labelAttribute;
    }

    const selector =
        input.labelNodeIds === undefined
            ? `algorithmResults.graphty.degree.degree >= \`${String(input.degreeThreshold)}\``
            : nodeIdSetSelector(input.labelNodeIds);

    return {
        metadata: {
            name: "Top degree labels",
            description: "Labels the highest-degree nodes (spec 7.2).",
            algorithmSource: LOAD_DEFAULTS_LAYER_SOURCE,
        },
        node: {
            selector,
            style: { label },
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
