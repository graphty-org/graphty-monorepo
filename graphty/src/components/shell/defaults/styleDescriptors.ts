/**
 * The one style layer a load paints, as a layer specification the element accepts unchanged.
 *
 * Spec 7.2 (design/ui/app-shell-progressive-disclosure-design.md lines 5666-5692) asks a load
 * for three encodings. Two of them -- a neutral node colour and node size by degree -- were
 * reverted on 2026-09-13 in favour of graphty-element's own hand-tuned defaults, and the third
 * is here: labels on the most connected nodes.
 *
 * WHAT THIS FILE STOPPED BEING. It used to build layers for graphty-element's 1.x stack: a
 * JMESPath selector string, a loose `style` record, and a `calculatedStyle` sibling carrying a
 * JavaScript expression that the element compiled with the `Function` constructor and ran with no
 * try/catch. Three quarters of its header was rules for not tripping over that machinery -- keep
 * `calculatedStyle` a SIBLING of `style` or it is silently dropped, remember the backticks round
 * a JMESPath literal, know which output paths the schema unwraps. None of those rules has
 * anywhere left to apply: a layer is now data, the selector is a declared shape rather than a
 * string, and what a layer paints is a closed set of channels.
 *
 * THE COMMUNITY COLOURS LEFT ENTIRELY. `communityColourLayers` built one layer per group from the
 * element's Okabe-Ito palette, capped at eight because the element's own helper cycles past that.
 * A community run now paints itself: the session derives a categorical colour encoding from the
 * run's result shape on its first completion, scoped to the nodes the run actually grouped, with
 * the palette, the legend and the swatch counts read off the same prepared binding the repaint
 * painted from. One derivation, in the element, for every algorithm of that shape.
 */

import { type LayerSpec, quotePath, resultPath, type RunId } from "@graphty/graphty-element/session";

/**
 * The template id every layer the 7.2 defaults add carries.
 *
 * It exists so a dataset boundary can sweep the SHELL's own layers and nothing else, through
 * `styles.removeBySource(...)`. It replaces an `algorithmSource` string in a metadata bag that
 * only a convention kept meaningful; `LayerSource` is declared, and an element-owned layer is
 * never swept whatever a predicate says -- which is what used to take graphty-element's own base
 * layer out of the stack and kill the next load in mesh building.
 */
export const SHELL_DEFAULTS_TEMPLATE_ID = "shell:load-defaults";

/**
 * The attribute the label layer draws when the caller names none.
 *
 * `data.id` is the key every importer leaves on the record it built a node from -- the id is
 * EXTRACTED from it by `nodeIdPath`, and extracting a value does not remove it -- so this is the
 * same string the element's own label prefault used to draw. It is named here rather than left
 * implicit because the channel vocabulary has no way to say "switch the label on and let the
 * element choose the words": `node.label` IS the words, and a layer that supplies none draws
 * nothing at all.
 */
export const DEFAULT_LABEL_ATTRIBUTE_PATH = "data.id";

/**
 * The field a node-metric run publishes its per-node measurement under.
 *
 * Every node-metric result shape publishes `value`, `rank` and `percentile` per node, so the
 * degree run's connection count is `results.<runId>.value`. The old spelling walked an
 * `algorithmResults.graphty.degree.degree` bag that only the layer and the reader of the layer
 * knew the shape of; this one is the path the run itself publishes.
 */
export const METRIC_VALUE_FIELD = "value";

/**
 * Labels on the most connected nodes, as a RULE rather than a list.
 *
 * The product owner's instruction of 2026-09-13: "use a calculated node and the default text
 * style for adding labels to nodes by degree. it must be added as a style layer and have a
 * setting that can disable that feature." What was here before that named the five
 * highest-degree node ids in a selector, so the layer described one dataset and meant nothing
 * once the data changed under it. This layer asks each node's own degree whether to draw its
 * label, so the same layer keeps its meaning across a reload, a re-run and a different file.
 *
 * THE DEFAULT TEXT STYLE, and nothing else. The layer decides WHICH nodes are labelled and with
 * WHAT WORDS; how the words look is the element's own label style. It must not name a colour:
 * the canvas ground is the element's clear colour #F5F5F5, so the #000000 default reads at
 * 19.26:1, and the dark-panel ink this once set read at about 1.1:1 -- the glyph fill vanished
 * and what stayed legible was the alpha fringing round it (2026-09-13).
 *
 * The rule is `value >= cut`. It cannot count, and it cannot split a tie either, so the cut is
 * chosen for it by `labelCutFor` in loadDefaults.ts: inside 7.2's budget where a cut fits, and
 * the highest tie group whole where none does -- which is what gives a near-regular graph labels
 * at all. Everything about HOW MANY nodes end up labelled is decided there.
 *
 * The selector names the degree run, so a node the run never reached carries no value, reads
 * absent and is not painted -- rather than being compared against the cut and labelled because
 * `null >= 0` is true, which is what the expression this replaces had to guard by hand.
 * @param input - the run that measured the degrees, the cut, and the attribute to draw.
 * @param input.degreeRunId - the run whose per-node value the rule reads.
 * @param input.degreeThreshold - the cut from `labelCutFor`; a node is labelled at or above it.
 * @param input.labelAttribute - the attribute path to draw as the label. Omitted draws the id.
 * @returns the top-degree label layer.
 */
export function topDegreeLabelLayer(input: {
    /** The run whose per-node measurement the rule reads. */
    readonly degreeRunId: RunId;
    /** The cut from `labelCutFor`: a node is labelled at or above this degree. */
    readonly degreeThreshold: number;
    /** The attribute path to draw as the label. Omitted draws `data.id`. */
    readonly labelAttribute?: string;
}): LayerSpec {
    // Built by the element rather than spelled here, and QUOTED because it is going into an
    // expression: a run id carries its algorithm's name, and a hyphenated name -- "shortest-path"
    // -- lexes its hyphen as arithmetic and gets the whole selector refused. Degree has no hyphen,
    // so writing it by hand worked; the next metric to be wired up this way is where it would
    // have stopped working, silently.
    const valuePath = quotePath(resultPath(input.degreeRunId, METRIC_VALUE_FIELD));

    return {
        name: "Top degree labels",
        target: "node",
        kind: "custom",
        source: { by: "template", templateId: SHELL_DEFAULTS_TEMPLATE_ID },
        selector: {
            match: "expression",
            where: `${valuePath} >= \`${String(input.degreeThreshold)}\``,
        },
        encode: {
            "node.label": {
                by: input.labelAttribute ?? DEFAULT_LABEL_ATTRIBUTE_PATH,
                scale: "passthrough",
            },
        },
    };
}
