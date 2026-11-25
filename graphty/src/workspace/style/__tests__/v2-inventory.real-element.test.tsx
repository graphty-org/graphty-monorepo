/**
 * Style panel v2's style inventory, on the REAL graphty-element: every style graphty-element offers (each
 * renderable channel, each label style field once per text kind, each enum option, each shader drawn in a
 * node's place, every channel a file's styles reach) must have a normal visible v2 control, and v2 may write
 * nothing that is not graphty-element's, graph-io's or asked for by the owner.
 *
 * A style counts as covered only through v2's own tables: a section thing's row main, a rubric's row, common,
 * Main or "+" sub-group line, a label rubric line, a text source or the Shaders section. The flag-off panel's
 * parts table, Find a setting, the loose lines a row draws only for a channel a layer already sets, and
 * coverage.ts's place strings are not homes.
 *
 * Each check compares what is missing with a committed known-gaps list, exactly: a gap that gets a control must
 * leave its list, and nothing may join one. The lists are meant to be empty once the panel is finished.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import {
    type Channel,
    type ChannelDescriptor,
    channelDescriptor,
    channelsFor,
    LABEL_STYLE_DESCRIPTORS,
    LABEL_STYLE_FIELDS,
    textFieldOf,
} from "@graphty/graphty-element/catalog";
import { fileStyleChannels, type GraphSettingKey } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import graphSettingsSource from "../../inspector/GraphSettingsV2.tsx?raw";
import { startForOrNone } from "../row";
import { KIND_GROUPS } from "../v2/kindGroups";
import {
    BACKGROUND_TABS,
    LABEL_COVERED,
    LABEL_OPTION_NAMES,
    LABEL_RUBRIC,
    type LabelField,
    TEXT_THINGS,
    varyingFields,
} from "../v2/labelRubric";
import { ruleOf } from "../v2/lineWrites";
import { ITEM_LISTS, LISTS } from "../v2/lists";
import { EDGE_RUBRIC, type LineSpec, NODE_RUBRIC, segmentOptions, SHAPE_REPLACE_RUBRIC } from "../v2/rubric";
import { SECTIONS, type ThingSpec } from "../v2/things";
import {
    BASE_CHANNELS,
    BASE_LABEL_FIELDS,
    FILE_TEXT_LOOKS,
    MASTER_CHANNELS,
    MASTER_LABEL_FIELDS,
    OWNER_REQUESTED,
    OWNER_REQUESTED_LABEL_FIELDS,
} from "./allowed-styles";
import { openProject, openStyle, sectionOf, written } from "./v2Harness";

type Side = "node" | "edge";
const SIDES: readonly Side[] = ["node", "edge"];

// ------------------------------------------------------------------------------------------------
// Known gaps: what each check finds missing today. A list may only shrink.
// ------------------------------------------------------------------------------------------------

/** Check 1: renderable channels with no normal visible control. */
const KNOWN_CHANNEL_GAPS: readonly string[] = [];

/** Check 1: graph-wide style settings with no line in Graph settings. */
const KNOWN_GRAPH_SETTING_GAPS: readonly string[] = [];

/** Check 2: label style fields, per text kind (`<style channel>.<field>`), with no line or no By data. */
const KNOWN_LABEL_FIELD_GAPS: readonly string[] = [];

/** Check 3: enum options no control offers (`<channel or label field>=<value>`). */
const KNOWN_OPTION_GAPS: readonly string[] = [];

/** Check 3: shaders drawn in a node's place that the Shape menu does not list, by name. */
const KNOWN_SHAPE_MENU_GAPS: readonly string[] = [];

/** Check 4: styles a reader switches on (a part head with an `off` value) that "+" does not add drawn. */
const KNOWN_SWITCH_ON_GAPS: readonly string[] = [];

/** Check 5: styles v2 writes that are neither graphty-element's at the merge base, graph-io's nor requested. */
const KNOWN_EXTRANEOUS: readonly string[] = [];

/**
 * Check 6: channels a file's styles reach that the owner ordered out of the panel ("remove orders and groups",
 * E420; "removing group and group outline", E422). graphty-element still draws them from an imported file. These
 * are not gaps and do not count against KNOWN_FILE_STYLE_GAPS; the owner can ask for them back.
 */
const OWNER_REMOVED_FILE_STYLES: Readonly<Record<string, string>> = {
    "node.zIndex": "E420, E422",
    "node.drawOrder": "E420, E422",
    "edge.drawOrder": "E420, E422",
    "node.groupPadding": "E420, E422",
    "node.groupPaddingRatio": "E420, E422",
    "node.groupPaddingOf": "E420, E422",
    "node.groupMinWidth": "E420, E422",
    "node.groupMinHeight": "E420, E422",
    "node.groupMinWidthBiasLeft": "E420, E422",
    "node.groupMinHeightBiasTop": "E420, E422",
    "node.groupIncludeLabels": "E420, E422",
};

/** Check 1: renderable channels the owner ordered out of the panel, with the ones a file's styles reach. */
const OWNER_REMOVED_CHANNELS: Readonly<Record<string, string>> = OWNER_REMOVED_FILE_STYLES;

/** Check 6: channels a file's styles reach with no normal visible control. */
const KNOWN_FILE_STYLE_GAPS: readonly string[] = [];

/**
 * graphty-element's graph settings (`GraphSettingKey`, what `session.config.inEffect` answers for). Typed as a
 * record over the element's type, so a setting graphty-element adds fails the typecheck until it is listed.
 */
const ELEMENT_GRAPH_SETTINGS: Readonly<Record<GraphSettingKey, true>> = {
    background: true,
    lighting: true,
    "node.sizeSpace": true,
    "labels.declutter": true,
    "labels.avoidNodesAndEdges": true,
};

/**
 * The project settings in graphty-element's `session.config` that do not change what the graph looks like, so
 * have no Graph settings line. Every other key of `session.config` must be a graph-wide style setting: a key
 * graphty-element adds fails check 1 until it joins one list or the other.
 */
const CONFIG_NOT_LOOKS: readonly string[] = [
    "acceleration",
    "author",
    "backgroundColor",
    "data",
    "editableBase",
    "layoutBehavior",
    "layoutTransition",
    "name",
    "pinnedStyle",
    "runAlgorithmsOnLoad",
    "runPlacement",
    "selectionStyle",
    // Bookkeeping, not a reader setting: whether graphty-element has written the starting cameras into this
    // project yet (`ProjectConfig.startingCamerasWritten`), so it writes them once. No line shows it.
    "startingCamerasWritten",
    "startingRows",
    "timelineHiddenAdded",
    "timelineHiddenLook",
];

/**
 * Graph-wide style settings: graphty-element's graph settings, and its graph background, lighting, rotation,
 * highlight, framing and label settings that change what the graph looks like (the Graph settings v2 lines).
 */
const GRAPH_SETTINGS: readonly string[] = [
    ...new Set([
        ...Object.keys(ELEMENT_GRAPH_SETTINGS),
        "background",
        "background.shader",
        "lighting",
        "viewRotation",
        "highlightColor",
        "framing.extent",
        "framing.padding",
        "node.sizeSpace",
        "minMarkSize",
        "labels.declutter",
        "labels.avoidNodesAndEdges",
        "labels.labelText",
        "labels.sampleCell",
    ]),
];

// ------------------------------------------------------------------------------------------------
// The inventory, from graphty-element
// ------------------------------------------------------------------------------------------------

/**
 * Each renderable channel of a kind.
 * @param side - nodes or edges.
 * @returns the descriptors.
 */
function renderable(side: Side): readonly ChannelDescriptor[] {
    return channelsFor(side).filter((descriptor) => descriptor.renderable);
}

/** Every text kind: its side and label style channel. */
const TEXT_KINDS = SIDES.flatMap((side) => Object.values(TEXT_THINGS[side]).map((thing) => ({ side, ...thing })));

/**
 * The channel that writes one label field of one text kind on its own, from graphty-element's `textFieldOf`.
 * @param side - nodes or edges.
 * @param style - the text kind's label style channel.
 * @param field - the field.
 * @returns the channel, or undefined where there is none.
 */
function flatChannel(side: Side, style: Channel, field: LabelField): Channel | undefined {
    return channelsFor(side).find(({ channel }) => {
        const found = textFieldOf(channel);
        return found?.into === style && found.field === field;
    })?.channel;
}

// ------------------------------------------------------------------------------------------------
// v2's homes
// ------------------------------------------------------------------------------------------------

/** The values a channel of a kind offers as options: an enum's values, a boolean's two. */
const VALUES_OF: Partial<Record<ChannelDescriptor["accepts"], (descriptor: ChannelDescriptor) => readonly string[]>> = {
    enum: (descriptor) => descriptor.values ?? [],
    boolean: () => ["true", "false"],
};

/** Each kind's rubrics, with the Shape row's replace-shader member. */
const RUBRICS = {
    node: [...Object.values(NODE_RUBRIC), SHAPE_REPLACE_RUBRIC],
    edge: Object.values(EDGE_RUBRIC),
} as const;

/**
 * Every rubric line of a kind, with the row's own list editors as lines.
 * @param side - nodes or edges.
 * @returns the lines.
 */
function rubricLines(side: Side): readonly LineSpec[] {
    return RUBRICS[side].flatMap((rubric) => [
        ...(rubric.rowOwns ?? []).map((channel): LineSpec => ({ channel })),
        ...(rubric.row === undefined ? [] : [rubric.row]),
        ...(rubric.common ?? []),
        ...rubric.main,
        ...(rubric.groups ?? []).flatMap((group) => group.lines),
    ]);
}

/**
 * Every channel one line edits.
 * @param line - the line.
 * @returns the channels.
 */
function channelsOfLine(line: LineSpec): readonly Channel[] {
    return [
        line.channel,
        ...(line.pair === undefined ? [] : [line.pair]),
        ...(line.units ?? []),
        ...(line.unit?.map(([, channel]) => channel) ?? []),
    ];
}

/**
 * Every thing of a kind's sections.
 * @param side - nodes or edges.
 * @returns the things.
 */
function thingsOf(side: Side): readonly ThingSpec[] {
    return SECTIONS[side].flatMap((section) => section.groups.flat());
}

/**
 * The label fields (`<style channel>.<field>`) whose line offers By data on the field's own channel, from the
 * lines themselves (`varyingFields`, what each line's by-data link binds). StylePanelV2ByData's real-element walk
 * opens every text kind's settings and finds each of these lines carrying its link.
 */
const LABEL_FIELDS_VARYING: ReadonlySet<string> = new Set<string>(
    TEXT_KINDS.flatMap(({ side, style }) => [...varyingFields(side, style)].map((field) => `${style}.${field}`)),
);

/**
 * Whether a text kind's field has a normal visible control: a label rubric line, and By data on its own
 * channel when it has one.
 * @param side - nodes or edges.
 * @param style - the text kind's label style channel.
 * @param field - the field.
 * @returns true when covered.
 */
function fieldCovered(side: Side, style: Channel, field: LabelField): boolean {
    return (
        LABEL_COVERED.has(field) &&
        (flatChannel(side, style, field) === undefined || LABEL_FIELDS_VARYING.has(`${style}.${field}`))
    );
}

/**
 * Every channel a kind's v2 tables give a normal visible control.
 * @param side - nodes or edges.
 * @returns the channels.
 */
function homed(side: Side): ReadonlySet<Channel> {
    const placed = new Set<Channel>([
        ...thingsOf(side).flatMap((thing) => thing.main),
        ...rubricLines(side).flatMap((line) => channelsOfLine(line)),
        ...Object.values(TEXT_THINGS[side]).flatMap((thing) => [
            thing.words,
            thing.style,
            ...(thing.distance === undefined ? [] : [thing.distance]),
            ...(thing.list === undefined ? [] : [thing.list]),
        ]),
        `${side}.shaders`,
    ]);
    // A label field's own channel is covered through its text kind's field line.
    for (const { channel } of channelsFor(side)) {
        const found = textFieldOf(channel);
        if (found !== undefined && found.into !== channel && fieldCovered(side, found.into, found.field)) {
            placed.add(channel);
        }
    }
    // A channel graphty-element marks as an older spelling of another (`supersededBy`: `node.gradientColor`, the
    // gradient list's two-color spelling) is edited through that channel's control, never one of its own.
    for (const { channel, supersededBy } of channelsFor(side)) {
        if (supersededBy !== undefined && placed.has(supersededBy)) {
            placed.add(channel);
        }
    }
    return placed;
}

const HOMED: Readonly<Record<Side, ReadonlySet<Channel>>> = { node: homed("node"), edge: homed("edge") };

/**
 * Whether a channel has a normal visible control.
 * @param channel - the channel.
 * @returns true when covered.
 */
function covered(channel: Channel): boolean {
    return HOMED[channel.startsWith("edge.") ? "edge" : "node"].has(channel);
}

/**
 * Asserts what a check finds missing is its known-gaps list exactly, naming each new gap and each closed one.
 * @param missing - what the check finds missing.
 * @param known - its known-gaps list.
 * @param what - what the check is about.
 */
function assertGaps(missing: readonly string[], known: readonly string[], what: string): void {
    const added = missing.filter((each) => !known.includes(each));
    const closed = known.filter((each) => !missing.includes(each));
    assert.deepEqual(
        { added, closed },
        { added: [], closed: [] },
        `${what}: ${String(missing.length)} missing; a new gap needs a control, a closed one leaves its list`,
    );
}

// ------------------------------------------------------------------------------------------------
// The checks
// ------------------------------------------------------------------------------------------------

describe("Style panel v2's style inventory", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("1. every renderable channel has a normal visible control", () => {
        for (const channel of Object.keys(OWNER_REMOVED_CHANNELS)) {
            assert.isFalse(covered(channel as Channel), `${channel} is out of the panel`);
        }
        const missing = SIDES.flatMap((side) =>
            renderable(side)
                .map(({ channel }) => channel)
                .filter((channel) => !covered(channel) && OWNER_REMOVED_CHANNELS[channel] === undefined),
        );
        assertGaps(missing, KNOWN_CHANNEL_GAPS, "KNOWN_CHANNEL_GAPS");
        assert.lengthOf(KNOWN_CHANNEL_GAPS, 0, "the gap list stays empty: a gap needs a control");
    });

    it("1. every graph-wide style setting has a line in Graph settings", async () => {
        const { session } = await openProject();
        const config = session.config as unknown as Record<string, unknown>;
        const unlisted = Object.keys(config)
            .filter((key) => typeof config[key] !== "function" && !CONFIG_NOT_LOOKS.includes(key))
            .filter((key) => !GRAPH_SETTINGS.some((setting) => setting === key || setting.startsWith(`${key}.`)));
        assert.deepEqual(unlisted, [], "every session.config key is a listed graph setting or not a look");
        const lines = new Set([...graphSettingsSource.matchAll(/line\(\s*"([\w.]+)"/g)].map(([, key]) => key));
        for (const match of graphSettingsSource.matchAll(/line="([\w.:]+)"/g)) {
            lines.add(match[1]);
        }
        const missing = GRAPH_SETTINGS.filter((key) => !lines.has(key));
        assertGaps(missing, KNOWN_GRAPH_SETTING_GAPS, "KNOWN_GRAPH_SETTING_GAPS");
    });

    it("2. every label style field of every text kind has a line, varying by data where it can", () => {
        assert.lengthOf(TEXT_KINDS, 8, "eight text kinds");
        // The fields are graphty-element's catalog's: each one it lists, it describes, so each is checked below.
        assert.sameMembers(
            LABEL_STYLE_DESCRIPTORS.map((descriptor) => descriptor.field),
            [...LABEL_STYLE_FIELDS],
            "every label style field graphty-element lists, it describes",
        );
        // Every field has a line, and every field with its own channel varies by data through it.
        assert.deepEqual(
            LABEL_STYLE_FIELDS.filter((field) => !LABEL_COVERED.has(field)),
            [],
            "every label field has a line",
        );
        const missing = TEXT_KINDS.flatMap(({ side, style }) =>
            LABEL_STYLE_FIELDS.filter((field) => !fieldCovered(side, style, field)).map((field) => `${style}.${field}`),
        );
        assertGaps(missing, KNOWN_LABEL_FIELD_GAPS, "KNOWN_LABEL_FIELD_GAPS");
        assert.lengthOf(KNOWN_LABEL_FIELD_GAPS, 0, "the gap list stays empty: a gap needs a control");
    });

    it("3. every option of every enum channel and enum label field is offered", () => {
        const missing: string[] = [];
        for (const side of SIDES) {
            const lines = rubricLines(side);
            const mains = new Set(thingsOf(side).flatMap((thing) => thing.main));
            for (const descriptor of renderable(side)) {
                const values = VALUES_OF[descriptor.accepts]?.(descriptor) ?? [];
                if (values.length === 0 || !covered(descriptor.channel)) {
                    continue;
                }
                // A row's main field and a list or select line list the element's every value.
                const own = lines.filter((line) => line.channel === descriptor.channel && line.unit === undefined);
                if (mains.has(descriptor.channel) || own.length === 0) {
                    continue;
                }
                const offered = new Set<string>();
                for (const line of own) {
                    const rule = ruleOf(line, descriptor);
                    if (rule === "R8" || rule === "R8f") {
                        for (const option of segmentOptions(line, values) ?? []) {
                            offered.add(option.value);
                        }
                    } else {
                        values.forEach((value) => offered.add(value));
                    }
                }
                missing.push(...values.filter((value) => !offered.has(value)).map((v) => `${descriptor.channel}=${v}`));
            }
        }
        const labelLines = [
            ...LABEL_RUBRIC.common,
            ...LABEL_RUBRIC.main,
            ...LABEL_RUBRIC.groups.flatMap((group) => group.lines),
        ];
        for (const descriptor of LABEL_STYLE_DESCRIPTORS) {
            if (descriptor.accepts !== "enum") {
                continue;
            }
            const values = descriptor.values ?? [];
            const line = labelLines.find((each) => each.field === descriptor.field && each.unit === undefined);
            const unitOf = labelLines.some((each) => each.unit?.some((unit) => descriptor.field in (unit.also ?? {})));
            let offered: readonly string[] = [];
            if (line !== undefined) {
                const { rule } = line;
                offered =
                    rule === "R8" || rule === "R8f"
                        ? (segmentOptions({ channel: descriptor.field }, values, LABEL_OPTION_NAMES) ?? []).map(
                              (option) => option.value,
                          )
                        : values;
            } else if (unitOf) {
                // A Unit line writes the field with one unit and takes it off with the others.
                offered = values;
            } else if (descriptor.field === "gradientType") {
                // The label Background group's Linear and Radial tabs (LabelPopover.tsx).
                offered = BACKGROUND_TABS.map((tab) => tab.value);
            } else if (descriptor.field === "look") {
                // A look is a kind of its text's row, picked from the Kind select in its "..." settings (E196).
                offered = KIND_GROUPS.flatMap((group) =>
                    group.members.flatMap((m) => (m.look === undefined ? [] : [m.look.id])),
                );
            }
            missing.push(...values.filter((value) => !offered.includes(value)).map((v) => `${descriptor.field}=${v}`));
        }
        assertGaps(missing, KNOWN_OPTION_GAPS, "KNOWN_OPTION_GAPS");
    });

    it("3. the Shape menu lists every shader drawn in a node's place, a custom one too", async () => {
        const { session } = await openProject();
        const added = await session.shaders.add(`/* graphty-shader 1
{ "id": "acme/disc", "name": "Inventory disc", "place": "replace" }
*/
vec4 shade(NodeInput n) {
    return vec4(1.0, 0.5, 0.0, 1.0 - step(1.0, length(n.uv)));
}
`);
        assert.isTrue(added.ok, JSON.stringify(added));
        const replacing = session.catalog
            .shaders()
            .filter((shader) => shader.target === "node" && shader.place === "replace")
            .map((shader) => shader.plainName);
        assert.include(replacing, "Inventory disc");

        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        // Shape's "+" lists Size and Shape (ia-design 2).
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const picker = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(picker);
        const list = await screen.findByRole("group", { name: /values$/ });
        const search = within(list).getByRole("combobox", { name: "Search" });
        const missing: string[] = [];
        for (const name of replacing) {
            await userEvent.clear(search);
            await userEvent.type(search, name);
            // The list settles on the search: either an option says the name or the list says nothing matches.
            const options = await waitFor(() => {
                const shown = within(list).queryAllByRole("option");
                assert.isTrue(
                    shown.length === 0 || shown.every((option) => (option.textContent ?? "").length > 0),
                    "the list has settled",
                );
                return shown.map((option) => option.textContent ?? "");
            });
            if (!options.some((text) => text.startsWith(name))) {
                missing.push(name);
            }
        }
        await userEvent.keyboard("{Escape}");
        assertGaps(missing, KNOWN_SHAPE_MENU_GAPS, "KNOWN_SHAPE_MENU_GAPS");
    });

    it("4. every style a reader switches on is a '+' entry whose start draws", async () => {
        const { session } = await openProject();
        const ctx = { session, beneath: () => ({}), layers: [], fresh: undefined };
        const missing: string[] = [];
        for (const side of SIDES) {
            for (const descriptor of renderable(side)) {
                const { channel, off } = descriptor;
                const text = textFieldOf(channel);
                if (off === undefined || descriptor.modifies !== undefined || text !== undefined) {
                    continue;
                }
                const thing = thingsOf(side).find((each) => each.main.includes(channel));
                if (thing === undefined) {
                    missing.push(`${channel}: no "+" entry`);
                    continue;
                }
                // What "+" writes for it: a list's first items, else its start, graphty-element's own `start`
                // where its default draws nothing (StylePanelV2's add).
                const list = side === "node" ? LISTS[thing.id] : undefined;
                const fresh = list === undefined ? ITEM_LISTS[channel]?.fresh : undefined;
                const value = list !== undefined ? "a list" : (fresh ?? startForOrNone(ctx, descriptor));
                const written = JSON.stringify(value);
                if (value === undefined || written === JSON.stringify(off)) {
                    missing.push(`${channel}: starts at ${written}`);
                }
            }
        }
        assertGaps(missing, KNOWN_SWITCH_ON_GAPS, "KNOWN_SWITCH_ON_GAPS");

        // The model above against the panel: Glow added through its real "+" writes what it predicts.
        const glow = renderable("node").find((descriptor) => descriptor.channel === "node.glow");
        assert.isDefined(glow);
        const predicted = glow === undefined ? undefined : startForOrNone(ctx, glow);
        const { id } = session.styles.list().find((each) => each.name === "Key people") ?? { id: "" };
        const tab = await openStyle("Key people");
        await userEvent.click(
            within(sectionOf(tab, "node-effects")).getByRole("button", { name: "Add to node effects" }),
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: "Glow" }));
        await waitFor(() => {
            assert.deepEqual(
                written(session, id, "node.glow"),
                predicted,
                "Glow's '+' writes the start the check uses",
            );
        });
        assert.notDeepEqual(predicted, glow?.off, "Glow starts drawn");
    });

    it("5. v2 writes only styles graphty-element had, graph-io writes or the owner asked for", () => {
        const allowed = new Set<string>([
            ...BASE_CHANNELS,
            ...MASTER_CHANNELS,
            ...fileStyleChannels(),
            ...OWNER_REQUESTED.map(({ channel }) => channel),
            ...FILE_TEXT_LOOKS,
        ]);
        const fields = new Set<string>([
            ...BASE_LABEL_FIELDS,
            ...MASTER_LABEL_FIELDS,
            ...OWNER_REQUESTED_LABEL_FIELDS.map(({ field }) => field),
        ]);
        // What v2 writes: every channel it has a control for, and the companions a "+" starts with.
        const writes = (side: Side): readonly string[] => [
            ...HOMED[side],
            ...thingsOf(side).flatMap((thing) =>
                thing.main.flatMap((channel) => (channelDescriptor(channel)?.needs ?? []).map((need) => need.channel)),
            ),
        ];
        const extraneous = [
            ...SIDES.flatMap((side) => [...new Set(writes(side))].filter((channel) => !allowed.has(channel))),
            ...[...LABEL_COVERED].filter((field) => !fields.has(field)).map((field) => `label field ${field}`),
        ];
        assertGaps(extraneous, KNOWN_EXTRANEOUS, "KNOWN_EXTRANEOUS");
    });

    it("6. every channel a file's styles reach has a normal visible control", () => {
        const removed = fileStyleChannels().filter((channel) => OWNER_REMOVED_FILE_STYLES[channel] !== undefined);
        assert.sameMembers(removed, Object.keys(OWNER_REMOVED_FILE_STYLES), "each removed style is one a file writes");
        const missing = fileStyleChannels().filter(
            (channel) => !covered(channel) && OWNER_REMOVED_FILE_STYLES[channel] === undefined,
        );
        assertGaps(missing, KNOWN_FILE_STYLE_GAPS, "KNOWN_FILE_STYLE_GAPS");
        assert.lengthOf(KNOWN_FILE_STYLE_GAPS, 0, "the gap list stays empty: a gap needs a control");
    });
});
