/**
 * The legend card's words (tier1-design.md section 2.4).
 *
 * graphty-element publishes the legend as neutral facts -- `styles.legend()` blocks with their
 * channel, field, domain and swatches -- and the app writes every word a reader sees: the section
 * titles, the Other row and the overflow line.
 *
 * Not written yet, because the element does not publish the facts behind them (#912): the
 * sentence saying what a higher value means, and the bound size range. The app does not work them
 * out from the swatches.
 */

import type { ScreenshotLegendSection } from "@graphty/graphty-element";
import type { Channel, ShaderUse } from "@graphty/graphty-element/catalog";
import {
    type GraphSession,
    type LegendBlock,
    type LegendFact,
    type LegendFactCode,
    type LegendSwatch,
    RESULT_SHAPE_CONTRACTS,
} from "@graphty/graphty-element/session";

import { highlightEntry } from "../analyze/words";
import { count, formatNumber } from "../inspector/words";
import { runName } from "../runWords";
import { sourceName } from "../style/row";
import { channelWord } from "../style/words";
import { unitOf } from "../time/timeActions";
import { rangeWords } from "../time/timeWords";

/** The property word each channel a legend shows goes by ("Color: PageRank"). */
const PROPERTY_WORDS: Partial<Record<Channel, string>> = {
    "node.color": "Color",
    "node.size": "Size",
    "node.shape": "Shape",
    "node.opacity": "Opacity",
    "node.outline": "Outline",
    "node.glow": "Glow",
    "node.label": "Label",
    "node.haloColor": "Halo",
    "edge.color": "Edge color",
    "edge.width": "Edge width",
    "edge.opacity": "Edge opacity",
    "edge.style": "Edge line",
    "edge.bandColor": "Edge band",
};

/** The channels whose swatches carry a size. */
const SIZE_CHANNELS: ReadonlySet<Channel> = new Set<Channel>(["node.size", "edge.width"]);

/**
 * The channels that write text onto the drawing, and the look of that text: the text is its own
 * key, so they get no section.
 */
const TEXT_CHANNELS: ReadonlySet<Channel> = new Set<Channel>([
    "node.label",
    "node.labelStyle",
    "node.xlabel",
    "node.xlabelStyle",
    "edge.xlabel",
    "edge.xlabelStyle",
    "edge.labelStyle",
    "node.tooltip",
    "edge.label",
    "edge.arrowHeadText",
    "edge.arrowTailText",
]);

/**
 * The channels whose key would be a bare number beside a name ("Key people 72", "Selected 0.4"):
 * a ring's or a band's width and opacity, a text's size, and how fast an edge's motion runs. Their
 * row is drawn, not read.
 */
const NUMBER_CHANNELS: ReadonlySet<Channel> = new Set<Channel>([
    "node.haloScale",
    "node.haloOpacity",
    "edge.bandWidth",
    "edge.bandOpacity",
    "node.labelSize",
    "edge.labelSize",
    "node.tooltipSize",
    "edge.arrowHeadTextSize",
    "edge.arrowTailTextSize",
    "edge.animationSpeed",
    "edge.patternCount",
]);

/**
 * The block with its rows in group order (Group 1, Group 2, ...) when they name a run's groups:
 * a group given its own color would otherwise come first. The Other row stays last.
 * @param block - the block.
 * @returns the block, its rows in rank order.
 */
function byRank(block: LegendBlock): LegendBlock {
    if (!block.swatches.some((swatch) => swatch.rank !== undefined)) {
        return block;
    }
    const place = (swatch: LegendSwatch): number =>
        swatch.role === "other" ? Infinity : (swatch.rank ?? Number.MAX_SAFE_INTEGER);
    return { ...block, swatches: [...block.swatches].sort((a, b) => place(a) - place(b)) };
}

/**
 * What the key is about: the blocks that encode the data. A layer that paints what the reader is
 * pointing at -- the Selected and Hovered rows, or any layer whose rule is a state -- says nothing
 * about the data, so its glow or halo is no entry of the key.
 * @param session - the session.
 * @returns the blocks `styles.legend()` returned, less those of a state layer.
 */
export function dataBlocks(session: GraphSession): LegendBlock[] {
    // ponytail: only a top-level state selector counts; a rule tree that mixes a state in is still keyed.
    return session.styles
        .legend()
        .filter((block) => session.styles.get(block.layerId)?.selector.match !== "state")
        .flatMap((block) => (isEffectBlock(block) ? effectRows(session, block) : [heldRows(session, block)]));
}

/** The channels whose value is a list of shader uses, each drawn by a shader the catalog names. */
const EFFECT_CHANNELS: ReadonlySet<Channel> = new Set<Channel>(["node.shaders", "edge.shaders"]);

/**
 * Whether a block keys effects: it is listed while the key shows, and never opens the key itself.
 * @param block - the block.
 * @returns true for an effects block.
 */
export function isEffectBlock(block: LegendBlock): boolean {
    return EFFECT_CHANNELS.has(block.channel);
}

/**
 * A shaders block's rows, each named by the shaders it draws ("Aura, Reticle"), as the catalog
 * names them; a shader a layer turns off is not drawn and not named. A row that draws no
 * effect is no row, and a block left with none is no block.
 * @param session - the session, for the catalog.
 * @param block - the block.
 * @returns the block, or none.
 */
function effectRows(session: GraphSession, block: LegendBlock): LegendBlock[] {
    const shaders = session.catalog.shaders();
    const named = (list: unknown): string[] =>
        Array.isArray(list)
            ? (list as readonly ShaderUse[]).flatMap((use) => {
                  const name = shaders.find((shader) => shader.id === use.shader)?.plainName;
                  return use.off === true || name === undefined ? [] : [name];
              })
            : [];
    const swatches = block.swatches.flatMap((swatch) => {
        const names = named(swatch.paints ?? swatch.value);
        return names.length === 0 ? [] : [{ ...swatch, name: names.join(", ") }];
    });
    return swatches.length === 0 ? [] : [{ ...block, swatches }];
}

/**
 * A category block's rows as its layer's own elements hold them, in the order the layer's groups
 * come (`styles.groups`, largest first: the order the Style tab's table lists them). A value none
 * of the layer's elements carries is no row, so a one-node layer bound to a column keys its one
 * value and not every value of the column; and giving one group its own color does not move its
 * row. The Other row stays last. A run's groups keep their rank order, and a block several layers
 * share keeps the element's rows, which already list only what the layers meet.
 * @param session - the session.
 * @param block - the block.
 * @returns the block, its rows those the layer holds.
 */
function heldRows(session: GraphSession, block: LegendBlock): LegendBlock {
    const path = block.field?.path;
    if (
        block.kind !== "categorical" ||
        path === undefined ||
        (block.layers?.length ?? 1) > 1 ||
        block.swatches.some((swatch) => swatch.rank !== undefined)
    ) {
        return block;
    }
    const held = session.styles.groups(block.layerId, path).filter((group) => group.count > 0);
    if (held.length === 0) {
        return block;
    }
    // ponytail: the element caps a block at 12 rows before this; a layer holding values past the
    // twelfth keys fewer rows than it holds. Filter in the element if a layer ever needs them.
    const place = new Map(held.map((group, at) => [String(group.value), at]));
    const at = (swatch: LegendSwatch): number =>
        swatch.role === "other" ? Infinity : (place.get(String(swatch.value)) ?? -1);
    const swatches = block.swatches.filter((swatch) => at(swatch) !== -1).sort((a, b) => at(a) - at(b));
    return { ...block, swatches };
}

/**
 * The block without the rows no element shows: a value it does not paint (`hidden`), drawn as the
 * layers beneath paint it, and a value a layer above paints over on every element carrying it
 * (`paintedOverBy`). A row for either would be a false claim; the key lists only what is drawn.
 * @param block - the block.
 * @returns the block, its drawn rows only.
 */
function paintedRows(block: LegendBlock): LegendBlock {
    const drawn = (swatch: LegendSwatch): boolean => swatch.hidden !== true && swatch.paintedOverBy === undefined;
    return block.swatches.every(drawn) ? block : { ...block, swatches: block.swatches.filter(drawn) };
}

/**
 * The blocks the legend shows: not a label's (it would list every name beside the name already
 * drawn), not a size that does not vary (a key for one size reads as "sizes done" while every
 * dot is the same, and a highlight's one width, "24", reads as a count), not a channel whose key
 * is a bare number (`NUMBER_CHANNELS`), not one whose row paints nothing right now (a Selected
 * row with nothing selected) or whose every element a filter step hides, and not one a layer
 * above paints over on every element (a key for
 * paint no reader can see is a false claim). A value the binding hides is no row, and a block left
 * with no rows is no block. A run's groups are listed in rank order.
 * @param blocks - the blocks `styles.legend()` returned.
 * @returns the blocks worth a key, in the same order.
 */
export function keyBlocks(blocks: readonly LegendBlock[]): LegendBlock[] {
    return blocks
        .filter(
            (block) =>
                !TEXT_CHANNELS.has(block.channel) &&
                !NUMBER_CHANNELS.has(block.channel) &&
                block.painted !== 0 &&
                // A layer whose every element a filter step hides keys nothing drawn.
                block.scope?.count !== 0 &&
                !(isSizeBlock(block) && (block.kind === "literal" || block.kind === "highlight")) &&
                !block.facts.some((fact) => fact.code === "legend.painted-over"),
        )
        .flatMap((block) => {
            const painted = paintedRows(block);
            // Every value at one size or width is a size that does not vary, however it is bound.
            const first = painted.swatches.at(0)?.size;
            const oneSize =
                isSizeBlock(block) &&
                block.kind === "categorical" &&
                first !== undefined &&
                painted.swatches.every((swatch) => swatch.size === first);
            return oneSize || (painted.swatches.length === 0 && block.swatches.length > 0) ? [] : [byRank(painted)];
        });
}

/**
 * Whether a block describes a size, so its swatches carry `size` rather than `color`.
 * @param block - the block.
 * @returns true for node size and edge width.
 */
export function isSizeBlock(block: LegendBlock): boolean {
    return SIZE_CHANNELS.has(block.channel);
}

/**
 * The section title: "<Property>: <row>". A channel with no key word of its own goes by the Style
 * tab's word for it ("Edge target end: Flow"), so a title never reads as the row's name alone and a
 * reader never sees a channel id.
 * @param block - the block.
 * @param rowName - the name of the row that paints it (the run's name, or the layer's).
 * @returns the title.
 */
export function sectionTitle(block: LegendBlock, rowName: string): string {
    const word = PROPERTY_WORDS[block.channel] ?? propertyWord(block.channel);
    return `${word}: ${rowName}`;
}

/**
 * The Style tab's word for a channel, with "Edge" in front of an edge's ("Edge pattern count").
 * @param channel - the channel.
 * @returns the word.
 */
function propertyWord(channel: Channel): string {
    const word = channelWord(channel);
    return channel.startsWith("edge.") ? `Edge ${word.charAt(0).toLowerCase()}${word.slice(1)}` : word;
}

/**
 * A number the way a legend prints it: as the inspector and the table print the same value
 * (`formatNumber`), so one score reads alike in all three.
 * @param value - the number.
 * @returns the words.
 */
function legendNumber(value: number): string {
    return Number.isFinite(value) ? formatNumber(value) : String(value);
}

/**
 * The text of one legend row, worded from the row's facts: "Group 3" for a run's group, "0 - 25"
 * for a stepped range, "0.3" for a ramp stop, the category itself, the entry for a fixed
 * value, and "other: 4 groups" for the folded bucket.
 * @param block - the block the row belongs to.
 * @param swatch - the row.
 * @param entry - the entry of a fixed-value row (`KeyNames.entry`).
 * @returns the text.
 */
export function swatchText(block: LegendBlock, swatch: LegendSwatch, entry?: string): string {
    const { value } = swatch;
    if (swatch.role === "other") {
        const groups = Array.isArray(value) ? value.length : 0;
        return `other: ${String(groups)} ${groups === 1 ? "group" : "groups"}`;
    }
    // A name the reader gave the value, kept by the element with the data, wins everywhere.
    if (swatch.name !== undefined) {
        return swatch.name;
    }
    if (swatch.rank !== undefined) {
        return `Group ${String(swatch.rank)}`;
    }
    if (swatch.extent !== undefined) {
        const { min, max } = swatch.extent;
        return min === max ? legendNumber(min) : `${legendNumber(min)} - ${legendNumber(max)}`;
    }
    return swatchValueText(block, swatch, entry);
}

/**
 * The text of a legend row that has no name, group or range of its own: what it paints, its
 * entry, or its value.
 * @param block - the block the row belongs to.
 * @param swatch - the row.
 * @param entry - the entry of a fixed-value row (`KeyNames.entry`).
 * @returns the text.
 */
function swatchValueText(block: LegendBlock, swatch: LegendSwatch, entry?: string): string {
    const { value } = swatch;
    if (block.kind === "literal" && swatch.color === undefined) {
        // A fixed pattern or shape names what it paints ("Solid"): the title already names the row.
        const paint = paintWords(swatch, block.channel);
        if (paint !== null) {
            return paint;
        }
    }
    if (block.kind === "literal" || block.kind === "highlight") {
        return entry ?? String(value);
    }
    if (block.kind !== "categorical" && typeof value === "number") {
        return legendNumber(value);
    }
    return String(value);
}

/**
 * The name of one row of a list block; the Other row, the one bucket the paint folded the smaller
 * groups into, is "Other".
 * @param block - the block the row belongs to.
 * @param swatch - the row.
 * @param entry - the entry of a fixed-value row (`KeyNames.entry`).
 * @returns its name.
 */
export function swatchName(block: LegendBlock, swatch: LegendSwatch, entry?: string): string {
    return swatch.role === "other" ? "Other" : swatchText(block, swatch, entry);
}

/** The sentence each legend fact is printed as. */
const FACT_SENTENCES: Readonly<Record<LegendFactCode, (param: (name: string) => string) => string>> = {
    "legend.clamped": (param) => `clamped at p${param("from")}/p${param("to")}`,
    "legend.not-plottable": (param) => `${param("count")} not plottable on a ${param("scale")} scale`,
    "legend.none-plottable": (param) => `no value is plottable on a ${param("scale")} scale`,
    "legend.no-value-in-domain": (param) => `no value has a place between ${param("min")} and ${param("max")}`,
    "legend.nothing-measured": () => "nothing measured",
    "legend.unreadable": (param) => `${param("count")} carry no value the scale can read`,
    "legend.lumped": (param) => `${param("count")} lumped into Other`,
    "legend.not-measured": (param) => `not measured (${param("count")})`,
    "legend.painted-over": (param) => `painted over by "${param("name")}"`,
};

/**
 * One legend fact as the sentence a reader sees, or null for a code this app has no words for
 * (the element may add codes in a minor release).
 * @param fact - the fact.
 * @returns the sentence, or null.
 */
export function factSentence(fact: LegendFact): string | null {
    const sentence = (FACT_SENTENCES as Partial<Record<string, (param: (name: string) => string) => string>>)[
        fact.code
    ];
    return sentence === undefined ? null : sentence((name) => String(fact.params[name]));
}

/**
 * What a list row paints when that is not a color: a shape or a line pattern in words
 * ("triangular_prism" reads "Triangular prism"), or a size as its number.
 * @param swatch - the row.
 * @param channel - the channel it paints, so an opacity reads as a percent.
 * @returns the words, or null for a row that paints a color or nothing.
 */
export function paintWords(swatch: LegendSwatch, channel?: Channel): string | null {
    if (typeof swatch.paints === "string" && swatch.paints !== "") {
        const words = swatch.paints.replaceAll(/[-_]+/g, " ");
        return words.charAt(0).toUpperCase() + words.slice(1);
    }
    if (swatch.size === undefined) {
        return null;
    }
    // An opacity reads as a percent, as its field in the Style tab does.
    return channel !== undefined && OPACITY.test(channel)
        ? `${String(Math.round(swatch.size * 100))}%`
        : String(Number(swatch.size.toPrecision(3)));
}

/** The channels whose number is an opacity. */
const OPACITY = /opacity$/i;

/**
 * What a list row prints beside its name: what it paints when that is not a color, else how many
 * elements carry it. A row already named by what it paints ("Solid") prints its count instead of
 * the same word twice.
 * @param block - the block the row belongs to.
 * @param swatch - the row.
 * @param entry - the entry of a fixed-value row (`KeyNames.entry`).
 * @returns the words or the count, or undefined for neither.
 */
export function swatchValue(block: LegendBlock, swatch: LegendSwatch, entry?: string): string | number | undefined {
    const paint = paintWords(swatch, block.channel);
    return paint === null || paint === swatchText(block, swatch, entry) ? swatch.count : paint;
}

/**
 * The line under a list that did not fit.
 * @param hidden - how many rows were left out.
 * @returns "28 more".
 */
export function overflowLine(hidden: number): string {
    return `${String(hidden)} more`;
}

/**
 * The line a key that scrolls shows at its foot: how many of its entries lie below.
 * @param below - how many.
 * @returns "3 more below".
 */
export function belowLine(below: number): string {
    return `${String(below)} more below`;
}

/** The key's one line when the reader asked for it and no layer paints anything it lists. */
export const NOTHING_KEYED = "Nothing is styled yet";

/**
 * How a layer above covers a section's elements: "covered by Agencies".
 * @param layer - The name of the layer that paints over it.
 * @returns The words.
 */
export function coveredWords(layer: string): string {
    return `covered by ${layer}`;
}

/**
 * The line under a section whose layer's elements a layer above paints in the same property, so
 * the section's paint does not show on them: "3 nodes covered by Big donors". A category lists only
 * the rows it draws (`paintedRows`), so a category block gets no line.
 * @param block - The block.
 * @param covers - The layers above that paint the property on the block's elements, and on how many.
 * @returns The line, or null when nothing covers it.
 */
export function coveredLine(
    block: LegendBlock,
    covers: readonly { readonly layer: string; readonly count: number }[],
): string | null {
    if (block.kind === "categorical" || covers.length === 0) {
        return null;
    }
    const noun = block.channel.startsWith("edge.") ? "edge" : "node";
    return covers.map(({ layer, count: n }) => `${count(n, noun)} ${coveredWords(layer)}`).join("; ");
}

/**
 * The line under a section whose layer selects some elements and not all (`block.scope`): which
 * layer and how many, "Picked: 3 of 24 nodes". The layer's name is left out where the title
 * already ends with it, and for a run's block, which the run's name in the title says.
 * @param block - The block.
 * @param title - Its section title.
 * @param layer - The name of its layer.
 * @returns The line, or null for a block of every element.
 */
export function scopeLine(block: LegendBlock, title: string, layer: string): string | null {
    if (block.scope === undefined) {
        return null;
    }
    const noun = block.channel.startsWith("edge.") ? "edge" : "node";
    const reach = `${block.scope.count.toLocaleString()} of ${count(block.scope.of, noun)}`;
    return block.runId !== undefined || title === layer || title.endsWith(`: ${layer}`) ? reach : `${layer}: ${reach}`;
}

/** How the key names the row behind a block, and the entry of a fixed-value row. */
interface KeyNames {
    /** The name of the row that paints the block: its run's, else its layer's. */
    readonly row: (block: LegendBlock) => string;
    /** The entry of a fixed-value row: a highlight's words ("On the path"), else the layer's name. */
    readonly entry: (block: LegendBlock) => string;
    /** A layer's name, by id; absent, the id. */
    readonly layer?: (layerId: string) => string;
    /** The layers above that paint a block's property on its elements, by name, and on how many. */
    readonly covers?: (block: LegendBlock) => readonly { readonly layer: string; readonly count: number }[];
}

/**
 * One section of the key: its title, the block it draws, a fixed-value row's entry, and whether it
 * is drawn as one line, its chip beside its title: a run's node and edge highlights in one color,
 * or a single row named as its title is (`keySections`).
 */
interface KeySection {
    readonly title: string;
    readonly block: LegendBlock;
    readonly entry: string;
    readonly merged: boolean;
    /** Which layer paints it and on how many, when that is some and not all (`scopeLine`). */
    readonly scope: string | null;
    /** How many of its elements a layer above paints in the same property (`coveredLine`). */
    readonly covered: string | null;
}

/**
 * The color of a one-swatch color highlight, the only kind two blocks of one run merge by: a
 * highlight, or a run's fixed value (the element paints a route or a chosen set as a mark, an
 * ordinary layer of the run's own, which the legend reads as a literal).
 * @param block - the block.
 * @returns its color, or undefined for any other block.
 */
function highlightColor(block: LegendBlock): string | undefined {
    const colorChannel = block.channel === "node.color" || block.channel === "edge.color";
    const marks = block.kind === "highlight" || (block.kind === "literal" && block.runId !== undefined);
    return marks && colorChannel && block.swatches.length === 1 ? block.swatches[0].color : undefined;
}

/**
 * One run's blocks for one channel as one block, top first: a run whose groups are layers paints
 * each group from a layer of its own -- a fixed value, or a copy of one rule -- and the key lists
 * them as one section of groups rather than a section per layer. Each fixed value's row is named
 * by its layer; when every group paints the same shape or pattern, one row says so.
 * @param top - the blocks worth a key, top first.
 * @param names - how to name a block's row and its entry.
 * @returns the blocks, each run's channel once.
 */
function runSections(top: readonly LegendBlock[], names: KeyNames): LegendBlock[] {
    const groups = new Map<string, LegendBlock[]>();
    const out: (LegendBlock | LegendBlock[])[] = [];
    for (const block of top) {
        const joins = block.runId !== undefined && (block.kind === "literal" || block.kind === "categorical");
        const key = `${block.runId ?? ""}|${block.channel}|${block.field?.path ?? ""}`;
        const literalKey = `${block.runId ?? ""}|${block.channel}|`;
        const group = joins ? (groups.get(key) ?? groups.get(literalKey)) : undefined;
        if (!joins) {
            out.push(block);
        } else if (group === undefined) {
            const fresh = [block];
            groups.set(key, fresh);
            groups.set(literalKey, fresh);
            out.push(fresh);
        } else {
            group.push(block);
        }
    }
    // A run whose groups are several layers: a channel only one of them writes (one group's shape)
    // is that layer's entry, headed by the layer, not by the run all the groups share.
    const grouped = new Set(out.flatMap((entry) => (Array.isArray(entry) && entry.length > 1 ? [entry[0].runId] : [])));
    return out.map((entry) => {
        if (!Array.isArray(entry)) {
            return entry;
        }
        if (entry.length === 1 && grouped.has(entry[0].runId)) {
            const { runId: _runId, ...own } = entry[0];
            return own;
        }
        return oneRunBlock(entry, names);
    });
}

/**
 * Several blocks of one run and channel as one (see {@link runSections}).
 * @param blocks - the blocks, top first.
 * @param names - how to name a fixed value's row.
 * @returns the block.
 */
function oneRunBlock(blocks: readonly LegendBlock[], names: KeyNames): LegendBlock {
    if (blocks.length === 1) {
        return blocks[0];
    }
    const rows = blocks.flatMap((block) =>
        block.kind === "literal"
            ? block.swatches.map((swatch) => ({ ...swatch, name: names.entry(block), rank: undefined }))
            : block.swatches,
    );
    const paintOf = (row: LegendSwatch): string => JSON.stringify([row.paints ?? null, row.size ?? null]);
    const shared = rows[0]?.color === undefined && rows.every((row) => paintOf(row) === paintOf(rows[0]));
    const found = blocks.find((block) => block.kind !== "literal") ?? blocks[0];
    // The groups' layers together: their selections summed, and no scope once they hold every one.
    const { scope: _scope, ...rest } = found;
    const of = found.scope?.of ?? 0;
    const together = blocks.every((block) => block.scope !== undefined)
        ? blocks.reduce((sum, block) => sum + (block.scope?.count ?? 0), 0)
        : of;
    const base: LegendBlock = together < of ? { ...rest, scope: { count: together, of } } : rest;
    if (shared) {
        // Every group the same shape or pattern: one row naming it, as a layer's fixed value reads.
        return { ...base, kind: "literal", swatches: [{ ...rows[0], name: undefined, count: undefined }] };
    }
    return { ...base, kind: "categorical", swatches: rows };
}

/**
 * The key's sections, top first. A run's node and edge highlights in one color are one section,
 * titled by the run alone ("Shortest path") with one entry ("On the path"), and marked `merged`:
 * two sections with the same chip told a reader nothing the one does not. The card draws a merged
 * section as one line, the chip and the run's name; an exported image keeps the title and entry.
 * A section whose one row is named as its title is ("Color: Agencies" over "Agencies") is marked
 * `merged` too, and drawn as the chip beside its title.
 * @param blocks - the blocks worth a key (`keyBlocks`), bottom layer first.
 * @param names - how to name a block's row and its entry.
 * @returns the sections.
 */
export function keySections(blocks: readonly LegendBlock[], names: KeyNames): KeySection[] {
    const top = runSections([...blocks].reverse(), names);
    const merged = new Set<LegendBlock>();
    const sections: KeySection[] = [];
    for (const block of top) {
        if (merged.has(block)) {
            continue;
        }
        const color = highlightColor(block);
        const twins = top.filter(
            (other) =>
                other !== block &&
                color !== undefined &&
                other.runId === block.runId &&
                other.channel !== block.channel &&
                highlightColor(other) === color,
        );
        twins.forEach((twin) => merged.add(twin));
        const row = names.row(block);
        const entry = names.entry(block);
        const one = twins.length > 0;
        // A layer's one fixed value named as the layer is: its title and its row would read the
        // same name twice ("Color: Agencies" over "Agencies"), so it is one line too.
        const only = block.swatches.length === 1 ? block.swatches[0] : undefined;
        const lone =
            !one && block.overflow === undefined && only !== undefined && swatchName(block, only, entry) === row;
        const title = one ? row : sectionTitle(block, row);
        const scope = scopeLine(block, title, names.layer?.(block.layerId) ?? block.layerId);
        const covered = coveredLine(block, names.covers?.(block) ?? []);
        sections.push({ title, block, entry, merged: one || lone, scope, covered });
    }
    return sections;
}

/**
 * The legend card as the key an exported image carries: the same sections, top first, in the same
 * words -- a ramp for a sequential or diverging block (a size wedge for a size), a row per value
 * otherwise, with its count or what it paints, and the overflow line.
 * @param blocks - the blocks `styles.legend()` returned, bottom layer first.
 * @param names - how to name a block's row and its entry.
 * @returns the sections, for `captureScreenshot({ legend })`.
 */
export function imageLegend(blocks: readonly LegendBlock[], names: KeyNames): ScreenshotLegendSection[] {
    return keySections(keyBlocks(blocks), names).map(({ title, block, entry, scope, covered }) => {
        if (block.kind === "sequential" || block.kind === "diverging") {
            const colors = block.swatches.flatMap((swatch) => (swatch.color === undefined ? [] : [swatch.color]));
            const first = block.swatches.at(0);
            const last = block.swatches.at(-1);
            const ramp = {
                min: first === undefined ? "" : swatchText(block, first),
                max: last === undefined ? "" : swatchText(block, last),
            };
            const rampNotes = [scope, covered].filter((note) => note !== null);
            return {
                title,
                ramp: isSizeBlock(block) ? ramp : { ...ramp, colors },
                ...(rampNotes.length === 0 ? {} : { note: rampNotes.join("; ") }),
            };
        }
        const rows = block.swatches.map((swatch) => {
            const shown = swatchValue(block, swatch, entry);
            const value = typeof shown === "number" ? legendNumber(shown) : shown;
            return {
                label: swatchName(block, swatch, entry),
                ...(swatch.color === undefined ? {} : { color: swatch.color }),
                ...(value === undefined ? {} : { value }),
            };
        });
        const notes = [
            scope,
            covered,
            block.overflow === undefined ? null : overflowLine(block.overflow.hidden),
        ].filter((note) => note !== null);
        return { title, rows, ...(notes.length === 0 ? {} : { note: notes.join("; ") }) };
    });
}

/**
 * The name of the row that paints a block: its run's name, else its layer's. A run whose data
 * changed since it ran is named as the run list names it, "PageRank, out of date", so the key never
 * passes off a stale result as current. A run that only no longer matches its scope (a filter step
 * since) is still right about the nodes it ran on, and the key names them only when the drawing
 * shows another count: "PageRank, full graph" when it ran on every node and a filter hides some,
 * "PageRank on 12 nodes" for a narrower run, and plain "PageRank" when as many are drawn as it ran
 * on.
 * @param session - the session.
 * @param block - the block.
 * @returns the name.
 */
function rowName(session: GraphSession, block: LegendBlock): string {
    // A binding names what it reads, not the layer it sits in ("Size: donations", never "Size:
    // Everything"); a run's own result is named by the run below, with its state.
    const path = block.runId === undefined || block.field?.result === undefined ? block.field?.path : undefined;
    if (path !== undefined) {
        return sourceName(session, { by: path }) ?? block.field?.technicalName ?? path;
    }
    const run = block.runId === undefined ? undefined : session.runs.get(block.runId);
    if (run === undefined) {
        return session.styles.get(block.layerId)?.name ?? block.layerId;
    }
    // The algorithm's name as the reader picked it, as the style tree names the run's row.
    const name = runName(session, run);
    // A run computed in a time window names that window, current or kept: "Degree, Jun 3 - Jun 12".
    const ran = run.caveats.window;
    if (ran !== undefined) {
        const named = `${name}, ${rangeWords(ran.from, ran.to, unitOf(session))}`;
        return run.status === "succeeded" && run.stale !== null ? `${named}, out of date` : named;
    }
    if (run.status !== "succeeded" || run.stale === null) {
        return name;
    }
    if (run.stale.reason === "data-changed" || run.stale.reason === "window-moved") {
        return `${name}, out of date`;
    }
    const { ranOn } = run.stale;
    const { visibleNodes, totalNodes } = session.visibility.summary;
    if (ranOn === visibleNodes) {
        return name;
    }
    return ranOn === totalNodes ? `${name}, full graph` : `${name} on ${count(ranOn, "node")}`;
}

/**
 * The key's names for a block, from the session: the row's run or layer name, and a highlight's
 * entry in the app's words for what the run marks, never the element's layer name.
 * @param session - the session.
 * @returns the names.
 */
export function keyNames(session: GraphSession): KeyNames {
    return {
        row: (block) => rowName(session, block),
        entry: (block) => {
            const run = block.runId === undefined ? undefined : session.runs.get(block.runId);
            // A route or a chosen set: a highlight, or the mark the element paints it with.
            const marked =
                block.kind === "highlight" ||
                (block.kind === "literal" &&
                    run !== undefined &&
                    RESULT_SHAPE_CONTRACTS[run.shape].layer === "highlight");
            if (marked && run !== undefined) {
                return highlightEntry(run.shape);
            }
            return session.styles.get(block.layerId)?.name ?? rowName(session, block);
        },
        layer: (layerId) => session.styles.get(layerId)?.name ?? layerId,
        covers: (block) => {
            // The copies a block stands for, each covered where a layer above wins its property;
            // a layer painting what the reader points at (Selected, Hovered) is no cover.
            const shares = new Map<string, number>();
            for (const id of block.layers ?? [block.layerId]) {
                addCovers(session, id, block.channel, shares);
            }
            return [...shares].map(([layer, n]) => ({ layer, count: n }));
        },
    };
}

/**
 * Adds the copies of one layer that the layers above it cover on one channel to `shares`, by the
 * covering layer's name.
 * @param session - the graph session.
 * @param id - the layer.
 * @param channel - the channel the block paints.
 * @param shares - the counts so far, by covering layer name.
 */
function addCovers(
    session: GraphSession,
    id: string,
    channel: LegendBlock["channel"],
    shares: Map<string, number>,
): void {
    // The blocks were read before this render: a layer removed since (a new project
    // clears the stack) covers nothing, and the element refuses to count it.
    if (session.styles.get(id) === undefined) {
        return;
    }
    for (const { layerId, count: n } of session.styles.counts(id).covers[channel]?.layers ?? []) {
        const above = session.styles.get(layerId);
        if (above !== undefined && above.selector.match !== "state") {
            // A run's layer goes by the run's name, as the Analyze list names it.
            const run = above.source.by === "run" ? session.runs.get(above.source.runId) : undefined;
            const name = run === undefined ? above.name : runName(session, run);
            shares.set(name, (shares.get(name) ?? 0) + n);
        }
    }
}
