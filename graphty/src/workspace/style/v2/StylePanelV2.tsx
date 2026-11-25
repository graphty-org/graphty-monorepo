/**
 * Style panel v2's body for one kind (design/ui/style-panel-v2/design.md; the style-panel-v2
 * experiment): Find a setting, then every section in the design's order, each a `PlusList` section
 * with its rule below it and a "+" on its header, the only button the header has: its "+" opens the
 * section's menu (a section of one thing adds it directly), and its title adds nothing. A section
 * lists one row per thing the layer sets or the reader just added.
 */

import { LabelsProvider } from "@graphty/compact-mantine";
import {
    type Channel,
    type ChannelDescriptor,
    type LabelLookId,
    MAIN_LABEL_ID,
    writeChannelList,
} from "@graphty/graphty-element/catalog";
import { Divider } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { cosmographOn } from "../../features";
import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import type { FoundHome } from "../parts/find";
import { FindSettingBox, FindSettingResults } from "../parts/FindSetting";
import { ChannelLine } from "../parts/PartPage";
import { itemChannels, partsFor, type PartSpec } from "../parts/parts";
import { useFindKey } from "../parts/useFindKey";
import { PickerNamesOnly } from "../pickerNames";
import type { RowContext } from "../PropertyRow";
import { needsFor, startForOrNone, startsWithFor, writeIn, writeLine } from "../row";
import { ScrubSlots } from "../scrubSlots";
import { AddButton, type AddOption } from "../Section";
import { useShaderList } from "../shaderList";
import { focusLineNext } from "../useFocusLine";
import { channelWord, experimentChannelsOff, failureWords } from "../words";
import { dataChannelOf } from "./dataEntries";
import { viewDim } from "./drawn";
import { replaceUse } from "./families";
import { kindGroupOf, type KindMember, kindsShown, kindStarts, lineWidthOf, ownsOf, PLAIN_LOOK } from "./kindGroups";
import {
    beneathEntry,
    entryIds,
    entryName,
    entryNumber,
    freshEntryId,
    labelsBeneath,
    listChannel,
    roomForLabel,
    writeEntry,
} from "./labelEntries";
import { TEXT_THINGS } from "./labelRubric";
import { labelWords } from "./labelWords";
import { drawnItems, firstColors, ITEM_LISTS, LISTS } from "./lists";
import { PlusList, PlusListKind } from "./PlusList";
import { rowNames } from "./rowNames";
import { lineFor, V2_LABELS } from "./rubric";
import { RubricLine } from "./RubricLine";
import { ShaderUseRow } from "./ShaderUseRow";
import { ThingRow } from "./ThingRow";
import { byKind, mainOf, SECTIONS, type SectionThings, setOn, type ThingSpec } from "./things";
import { sectionsOf } from "./valueSections";

/** Words Find a setting finds a setting by in this panel only: the names its things give them. */
const FIND_WORDS: Partial<Readonly<Record<Channel, readonly string[]>>> = {
    "edge.arrowHead": ["target end"],
    "node.visible": ["visibility"],
    "edge.visible": ["visibility"],
    "node.label": ["name", "label"],
    "edge.label": ["name", "label"],
    "node.flat": ["shading", "finish"],
    "node.unlit": ["shading", "finish"],
};

/**
 * Every channel the kind's parts offer here (an experiment that is off keeps its own out).
 * @param ctx - the row and kind.
 * @returns the channels.
 */
function kindChannels(ctx: RowContext): ReadonlySet<Channel> {
    const off = experimentChannelsOff({ cosmograph: cosmographOn(ctx.session) });
    return new Set(partsFor(ctx.side, off).flatMap((part) => part.items.flatMap((item) => itemChannels(item))));
}

/**
 * Every channel of a thing that its section offers: its items' and its own (a channel another part of
 * the kind holds, such as an edge's animation speed, which the line part lists), less what another
 * thing of the kind takes as its own.
 * @param ctx - the row and kind.
 * @param part - its section's part.
 * @param section - its section.
 * @param thing - the thing.
 * @param kindChannels - every channel the kind's parts offer here.
 * @returns the channels.
 */
function thingChannels(
    ctx: RowContext,
    part: PartSpec,
    section: SectionThings,
    thing: ThingSpec,
    kindChannels: ReadonlySet<Channel>,
): readonly Channel[] {
    const taken = new Set(
        SECTIONS[ctx.side].flatMap((each) =>
            each.groups.flat().flatMap((other) => (other === thing ? [] : (other.own ?? []))),
        ),
    );
    const off = experimentChannelsOff({ cosmograph: cosmographOn(ctx.session) });
    const source =
        thing.from === undefined ? part : (partsFor(ctx.side, off).find((each) => each.id === thing.from) ?? part);
    const offered = new Set(source.items.flatMap((item) => itemChannels(item)));
    const items = source.items.filter((item) => thing.items.includes(item.id)).flatMap((item) => itemChannels(item));
    // A channel another thing owns (Fit to label is the Size row's, not the Label's) is that thing's alone.
    const own = (thing.own ?? []).filter((c) => kindChannels.has(c));
    // A pie's, chart's or record's data spec is its own, though no `parts.ts` item lists it (DataRow.tsx).
    const data = dataChannelOf(ctx, thing.id);
    return [...new Set([...items.filter((c) => offered.has(c)), ...own, ...(data === undefined ? [] : [data])])].filter(
        (c) => !taken.has(c),
    );
}

/**
 * A section's things the element offers here, in "+" menu groups, and those the row sets.
 * @param ctx - the row.
 * @param part - its part.
 * @param section - its things.
 * @param waiting - things "+" added that wait for their first value.
 * @returns the groups and the shown things.
 */
function thingsOf(
    ctx: RowContext,
    part: PartSpec,
    section: SectionThings,
    waiting: readonly string[],
): {
    readonly things: readonly (readonly { thing: ThingSpec; channels: readonly Channel[] }[])[];
    readonly shown: readonly { thing: ThingSpec; channels: readonly Channel[] }[];
} {
    const things = section.groups.map((group) =>
        group.flatMap((thing) => {
            if (thing.shader === true) {
                return [{ thing, channels: [] }];
            }
            const channels = thingChannels(ctx, part, section, thing, kindChannels(ctx));
            return channels.length === 0 || mainOf(ctx, thing, channels) === undefined ? [] : [{ thing, channels }];
        }),
    );
    const shown = things.flat().filter(
        ({ thing, channels }) =>
            waitsFor(waiting, thing.id) ||
            channels.some((c) => setOn(ctx, c)) ||
            // A shader drawn in the shapes' place keeps the Shape row (design 5).
            (thing.id === "shape" && replaceUse(ctx) !== undefined),
    );
    return { things, shown };
}

/**
 * What "+" writes for a list thing (design 5.1): two items of colors unlike each other and the node's,
 * or none while the layers beneath draw a list there (the editor shows it, an edit writes one item);
 * a line, an empty field or table cell.
 * @param ctx - the row.
 * @param id - the thing's id.
 * @param main - its main channel.
 * @returns the writes, or undefined for a thing that is not a list or inherits one.
 */
function firstItem(ctx: RowContext, id: string, main: Channel): Partial<Record<Channel, string>> | undefined {
    const list = ctx.side === "node" ? LISTS[id] : undefined;
    if (list !== undefined) {
        return drawnItems(ctx, list.colors).items.length > 0
            ? undefined
            : { [list.colors]: writeChannelList(list.colors, firstColors(ctx)) };
    }
    const items = ITEM_LISTS[main];
    return items === undefined ? undefined : { [main]: items.fresh };
}

/**
 * A setting Find a setting found, as the line its thing's pop-over draws (design 2.1).
 * @param ctx - the row.
 * @param channel - the setting.
 * @returns the line.
 */
function foundLine(ctx: RowContext, channel: Channel): React.ReactNode {
    const found = lineFor(ctx.side, channel);
    return found === undefined ? (
        <ChannelLine ctx={ctx} channel={channel} word={channelWord(channel)} />
    ) : (
        <RubricLine ctx={ctx} line={found.line} />
    );
}

/**
 * A setting's heading in Find a setting's results: see `findHomes`.
 * @param side - nodes or edges.
 * @param title - its section's heading.
 * @param thing - its thing.
 * @param channel - the setting.
 * @returns the heading.
 */
function homeHeading(side: "node" | "edge", title: string, thing: ThingSpec, channel: Channel): string {
    const named = thing.unnamed === true || thing.name === title ? title : `${title} - ${thing.name}`;
    const kind = kindGroupOf(side, thing.id)?.members.find((member) => member.owns(channel));
    const sub = lineFor(side, channel)?.group;
    const own = kind === undefined || kind.plainName === thing.name ? named : `${named} (${kind.plainName})`;
    return sub === undefined ? own : `${own} - ${sub}`;
}

/**
 * Where this panel holds each setting, for Find a setting's headings: its section, its thing when the section
 * does not already name it, the kind of a kind group ("Arrows - Arrow (Target)") and the pop-over sub-group
 * ("Shape - Custom shape"), ranked in the panel's order (E675).
 * @param ctx - the row and kind.
 * @param sections - the kind's sections the element offers, with their parts.
 * @returns each setting's home.
 */
function findHomes(
    ctx: RowContext,
    sections: readonly { part: PartSpec; section: SectionThings }[],
): ReadonlyMap<Channel, FoundHome> {
    const homes = new Map<Channel, FoundHome>();
    const offered = kindChannels(ctx);
    const ranks = new Map<string, number>();
    for (const { part, section } of sections) {
        const title = section.title ?? part.title;
        for (const thing of section.groups.flat()) {
            for (const channel of thing.shader === true ? [] : thingChannels(ctx, part, section, thing, offered)) {
                const heading = homeHeading(ctx.side, title, thing, channel);
                const rank = ranks.get(heading) ?? ranks.size;
                ranks.set(heading, rank);
                if (!homes.has(channel)) {
                    homes.set(channel, { heading, rank });
                }
            }
        }
    }
    return homes;
}

/**
 * Whether "+" added a thing, or one of its kinds (`endCaption:source`), that waits for its first value.
 * @param waiting - the waiting things.
 * @param id - the thing's id.
 * @returns true when it waits.
 */
function waitsFor(waiting: readonly string[], id: string): boolean {
    return waiting.some((each) => each === id || each.startsWith(`${id}:`));
}

/**
 * A thing's rows: one, or for a kind group one per kind its layers draw or "+" added and waits on, each with
 * that kind's channels.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param channels - its channels.
 * @param waiting - the things and kinds "+" added that wait for their first value.
 * @returns the rows.
 */
function rowsOf(
    ctx: RowContext,
    thing: ThingSpec,
    channels: readonly Channel[],
    waiting: readonly string[],
): readonly ThingRowOf[] {
    if (thing.id === "label") {
        return labelRowsOf(ctx, thing, channels, waiting);
    }
    return kindRowsOf(ctx, thing, channels, waiting);
}

/** One row of a section: its thing, its channels, its kind and, for a further label, its entry. */
interface ThingRowOf {
    readonly thing: ThingSpec;
    readonly channels: readonly Channel[];
    readonly kind?: KindMember;
    readonly entry?: { readonly id: string; readonly n: number };
}

/** What parts a "+" item's thing from the look it adds a label in: `label#card`. */
const LOOK_SEP = "#";

/**
 * The "+" items that add a label in a look (E196): Card, Dark, Pill and Callout after Label, as Label is offered.
 * @param ctx - the row.
 * @param label - Label's own "+" item.
 * @returns the items.
 */
function lookOptions(ctx: RowContext, label: AddOption): AddOption[] {
    const looks = kindGroupOf(ctx.side, "label")?.members.flatMap((member) =>
        member.look === undefined || member.look.id === PLAIN_LOOK ? [] : [member],
    );
    return (looks ?? []).map((member) => ({
        ...label,
        key: `${label.key}${LOOK_SEP}${member.look?.id ?? ""}`,
        label: member.plainName,
    }));
}

/** What a waiting further label's key starts with: `label:@<id>`. */
const ENTRY_WAIT = "label:@";

/**
 * A row's key, and what "+" waits on for it: its thing, its thing and kind (`arrow:source`), or its further label.
 * @param row - the row.
 * @param row.thing - its thing.
 * @param row.kind - its kind, if any.
 * @param row.entry - its further label, if any.
 * @returns the key.
 */
function waitKeyOf({ thing, kind, entry }: ThingRowOf): string {
    if (entry !== undefined) {
        return `${ENTRY_WAIT}${entry.id}`;
    }
    return kind === undefined ? thing.id : `${thing.id}:${kind.id}`;
}

/**
 * A row's React key: its wait key, but one key for every kind of a row whose kinds replace each other in place (a
 * label's looks and its Glyph, a tooltip's looks), so changing its kind keeps the row, and its open pop-over, open.
 * @param row - the row.
 * @returns the key.
 */
function rowKeyOf(row: ThingRowOf): string {
    const { thing, kind, entry } = row;
    if (entry !== undefined || kind === undefined) {
        return waitKeyOf(row);
    }
    // A Label is one row whatever its kind; another text's looks share their style's row.
    if (thing.id === "label") {
        return thing.id;
    }
    return kind.look === undefined ? waitKeyOf(row) : `${thing.id}:${kind.look.style}`;
    return waitKeyOf(row);
}

/**
 * A Label's rows: the main label's (by kind), when the row sets it or "+" added it, then one per further label
 * (labelEntries.ts) the row sets or "+" added and waits on, each numbered from 2 as on every layer.
 * @param ctx - the row.
 * @param thing - the Label thing.
 * @param channels - its channels.
 * @param waiting - what "+" added that waits for its first value.
 * @returns the rows.
 */
function labelRowsOf(
    ctx: RowContext,
    thing: ThingSpec,
    channels: readonly Channel[],
    waiting: readonly string[],
): readonly ThingRowOf[] {
    const list = listChannel(ctx.side);
    const own = channels.filter((channel) => channel !== list);
    const ids = [
        ...entryIds(ctx),
        ...waiting.filter((key) => key.startsWith(ENTRY_WAIT)).map((key) => key.slice(ENTRY_WAIT.length)),
    ].filter((id, at, all) => all.indexOf(id) === at);
    const mainShown = ids.length === 0 || waiting.includes(thing.id) || own.some((channel) => setOn(ctx, channel));
    const main = mainShown ? kindRowsOf(ctx, thing, own, waiting) : [];
    const { words } = TEXT_THINGS[ctx.side].label;
    return [
        ...main,
        ...ids.map((id) => ({
            thing,
            channels: [words],
            entry: { id, n: entryNumber(ctx, ids, id) },
        })),
    ];
}

/**
 * A thing's rows by kind: see `rowsOf`.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param channels - its channels.
 * @param waiting - the things and kinds "+" added that wait for their first value.
 * @returns the rows.
 */
function kindRowsOf(
    ctx: RowContext,
    thing: ThingSpec,
    channels: readonly Channel[],
    waiting: readonly string[],
): readonly ThingRowOf[] {
    const group = kindGroupOf(ctx.side, thing.id);
    if (group === undefined) {
        return [{ thing, channels }];
    }
    const shownKinds = new Set(kindsShown(ctx, group).map((member) => member.id));
    const kinds = group.members.filter(
        (member) => shownKinds.has(member.id) || waiting.includes(`${thing.id}:${member.id}`),
    );
    return kinds.map((kind) => {
        const owns = ownsOf(group, kind);
        return { thing, channels: channels.filter((channel) => owns.includes(channel)), kind };
    });
}

/**
 * The first kind of a thing's kind group that no row draws yet, for a thing with several kinds at once (Arrow,
 * End caption, Plate); never for Label, whose further rows are further labels.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param waiting - the kinds "+" added that wait for their first value (taken too).
 * @returns the kind, or undefined.
 */
function freeKind(ctx: RowContext, thing: ThingSpec, waiting: readonly string[]): KindMember | undefined {
    const group = kindGroupOf(ctx.side, thing.id);
    // A text's looks are one row's kinds, never a second row of it (E196).
    if (group === undefined || thing.id === "label" || group.members.some((member) => member.look !== undefined)) {
        return undefined;
    }
    const drawn = new Set(kindsShown(ctx, group).map((member) => member.id));
    return group.members.find((member) => !drawn.has(member.id) && !waiting.includes(`${thing.id}:${member.id}`));
}

/**
 * What "+" adds for a thing: a kind group already drawn adds its first free kind; the main channel it writes.
 * @param ctx - the row.
 * @param found - the thing and its channels, if the section offers it.
 * @param shown - the things the row shows.
 * @param waiting - what "+" added that waits for its first value.
 * @returns the free kind, if any, and the main channel, if any.
 */
function plusTarget(
    ctx: RowContext,
    found: { readonly thing: ThingSpec; readonly channels: readonly Channel[] } | undefined,
    shown: readonly { readonly thing: ThingSpec }[],
    waiting: readonly string[],
): { readonly free?: KindMember; readonly main?: ChannelDescriptor } {
    if (found === undefined) {
        return {};
    }
    const free = shown.some((each) => each.thing === found.thing) ? freeKind(ctx, found.thing, waiting) : undefined;
    const thing = free === undefined ? found.thing : { ...found.thing, main: [free.head], start: free.head };
    return { free, main: mainOf(ctx, thing, found.channels) };
}

/**
 * What "+" writes beside a kind group's kind: its size at graphty-element's start where the layer sets none (an
 * arrow, so its Size line shows; ia-design 2).
 * @param ctx - the row.
 * @param thing - the thing "+" adds.
 * @param main - the kind's main channel.
 * @returns the writes.
 */
function sizeStarts(ctx: RowContext, thing: ThingSpec, main: Channel): Record<string, unknown> {
    const group = kindGroupOf(ctx.side, thing.id);
    const kind = group?.members.find((member) => member.head === main);
    return Object.fromEntries(Object.entries(kindStarts(group, kind)).filter(([c]) => !setOn(ctx, c as Channel)));
}

/**
 * Whether a row is the main label's, drawn as words (a Glyph is not a label to edit by name).
 * @param ctx - the row.
 * @param row - the section's row.
 * @returns true for the main label's row.
 */
function isMainLabel(ctx: RowContext, row: ThingRowOf): boolean {
    return row.thing.id === "label" && row.entry === undefined && row.kind?.head === TEXT_THINGS[ctx.side].label.words;
}

/**
 * The Text "+" item that edits a label already drawn: a pencil before its name, as it edits a label rather than
 * adding one, and what it draws (the words its row shows, "name, below") in its tooltip: no words in the bar (E106).
 * @param ctx - the row.
 * @param id - the label's id, `MAIN_LABEL_ID` for the main label.
 * @param name - its row's name.
 * @returns the item.
 */
function editOption(ctx: RowContext, id: string, name: string): AddOption {
    const words = labelWords(ctx, id);
    return {
        key: `${ENTRY_WAIT}${id}`,
        label: name,
        icon: <GLYPHS.rename size={14} aria-hidden />,
        name: `Edit ${name}`,
        hint: words === "" ? `Edit ${name}` : `Edit ${name}: ${words}`,
        // Restyling a label already drawn adds none, so the cap never holds it back.
        disabled: ctx.many === undefined ? undefined : true,
    };
}

/**
 * One section: see the file header.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.part - its part
 * @param props.section - its things
 * @returns The section
 */
function ThingSection({
    ctx,
    part,
    section,
}: Readonly<{ ctx: RowContext; part: PartSpec; section: SectionThings }>): React.JSX.Element {
    const { store } = useWorkspace();
    const id = section.id ?? part.id;
    const title = section.title ?? part.title;
    const sectionBox = useRef<HTMLDivElement>(null);
    // Effects holds the tab's shaders (E668): its Shader item opens the one gallery, each use a row of its own.
    const holdsShaders = section.groups.flat().some((thing) => thing.shader === true);
    const shaders = useShaderList(
        ctx,
        {
            id,
            title: "Shader",
            channels: [ctx.side === "node" ? "node.shaders" : "edge.shaders"],
            shaders: true,
            shapeOwnsReplace: true,
            renderRow: (entry) => <ShaderUseRow ctx={ctx} entry={entry} />,
        },
        sectionBox,
        holdsShaders,
    );
    // Things "+" added that the row does not set yet, waiting for their first value. Kept while the Node and Edge tabs
    // switch (which draws the sections anew), so a row "+" added and left empty stays until it is removed.
    const waitKey = `${ctx.row.join(",")}:${ctx.side}:${part.id}`;
    const [waiting, setWaiting] = useState<readonly string[]>(() => WAITING.get(waitKey) ?? []);
    useEffect(() => {
        WAITING.set(waitKey, waiting);
    }, [waitKey, waiting]);
    const [menu, setMenu] = useState(false);
    // The thing "+" just added whose pop-over or picker opens at once (a list, an image).
    const [opening, setOpening] = useState<string | undefined>(undefined);
    const { things, shown } = thingsOf(ctx, part, section, waiting);
    const rows = shown.flatMap(({ thing, channels }) => rowsOf(ctx, thing, channels, waiting));
    const shownIds = [
        ...entryIds(ctx),
        ...waiting.filter((key) => key.startsWith(ENTRY_WAIT)).map((key) => key.slice(ENTRY_WAIT.length)),
    ];
    // A one-only thing leaves the menu once set. Label stays: once one is drawn, it adds a further label (E265).
    const groups: AddOption[][] = [
        ...things.map((group) =>
            group.flatMap(({ thing }): AddOption[] => {
                if (thing.shader === true) {
                    // Any number of shaders: the item always opens the gallery.
                    return [{ key: thing.id, label: thing.name }];
                }
                if (!shown.some((each) => each.thing === thing)) {
                    // A thing that draws nothing in this view (a 3D-only one in 2D) is dimmed, still pickable.
                    const main = thing.start ?? thing.main.at(0);
                    return [
                        {
                            key: thing.id,
                            label: thing.name,
                            dimmed: main === undefined ? undefined : viewDim(ctx, main),
                            hint: thing.hint,
                        },
                    ];
                }
                // A kind group with a kind still free adds it (a second Arrow is the source end, ia-design 2),
                // dimmed as that kind is in this view (a plate in 3D, E669).
                const free = freeKind(ctx, thing, waiting);
                if (free !== undefined) {
                    return [{ key: thing.id, label: thing.name, hint: thing.hint, dimmed: viewDim(ctx, free.head) }];
                }
                // Several rows edited together share plain channels only, so a further label waits for one row.
                // graphty-element draws at most LABEL_CAP further labels, so "+" stops offering one there.
                return thing.id === "label"
                    ? [
                          {
                              key: thing.id,
                              label: thing.name,
                              disabled: ctx.many === undefined && roomForLabel(ctx, shownIds) ? undefined : true,
                          },
                      ]
                    : [];
            }),
        ),
    ];
    // Label's "+" also adds a label in each look but the plain one, which Label adds (E196): never a Glyph.
    const plus = groups.map((group) =>
        group.flatMap((option) => (option.key === "label" ? [option, ...lookOptions(ctx, option)] : [option])),
    );
    // Above them, apart, the further labels already drawn: the row's own and those a layer beneath draws, to restyle
    // here (E263, E265). Each has a pencil, as it edits a label rather than adding one, and picking it opens its
    // pop-over.
    const label = plus.flat().find((option) => option.key === "label");
    const own = entryIds(ctx);
    const existing: AddOption[] =
        label === undefined
            ? []
            : [
                  ...new Set([
                      ...own,
                      ...labelsBeneath(ctx),
                      ...shownIds.filter((id) => beneathEntry(ctx, id) !== undefined),
                  ]),
              ]
                  .sort((a, b) => entryNumber(ctx, shownIds, a) - entryNumber(ctx, shownIds, b))
                  .map((id) => editOption(ctx, id, entryName(ctx, id, entryNumber(ctx, shownIds, id))));
    // The main label is one of them, by its row's name ("Card"), while its row is drawn.
    const mainRow = label === undefined ? undefined : rows.find((row) => isMainLabel(ctx, row));
    if (mainRow !== undefined) {
        const { name } = rowNames(ctx, mainRow.thing, mainRow.kind, undefined);
        existing.unshift(editOption(ctx, MAIN_LABEL_ID, name));
    }
    plus.unshift(existing);
    const options = plus.flat().filter((option) => option.disabled !== true);
    // A Label already drawn adds a further label (labelEntries.ts), waiting for its source as the first does.
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords("Label", "added", error), error: true } });
    };
    const addsEntry = (thing: ThingSpec | undefined, look: LabelLookId | undefined): boolean => {
        if (thing?.id !== "label" || !shown.some((each) => each.thing === thing)) {
            return false;
        }
        const taken = waiting.filter((key) => key.startsWith(ENTRY_WAIT)).map((key) => key.slice(ENTRY_WAIT.length));
        const entry = freshEntryId(ctx, taken);
        if (entry === undefined) {
            return false;
        }
        setWaiting((now) => [...now, `${ENTRY_WAIT}${entry}`]);
        // Its look is written at once, so its row shows its look while it waits for its source. A plain Label names
        // the plain look: a further label naming none draws in the main label's, whatever that later becomes.
        writeEntry(ctx, entry, { style: { look: look ?? PLAIN_LOOK } }).catch(fail);
        return true;
    };
    // The first label in a look: its look is written, and its row waits for its source as Label's does.
    const addsLook = (look: LabelLookId | undefined): boolean => {
        const { style } = TEXT_THINGS[ctx.side].label;
        if (look === undefined) {
            return false;
        }
        setWaiting((now) => (now.includes("label") ? now : [...now, "label"]));
        writeIn(ctx, style, { value: { look } }).catch(fail);
        return true;
    };
    // A label already drawn: its pop-over opens (the main label's on its row), and one a layer beneath draws gets
    // a row here, waiting for the first thing the reader changes on it.
    const editDrawn = (key: string): void => {
        const drawnId = key.slice(ENTRY_WAIT.length);
        if (drawnId === MAIN_LABEL_ID) {
            setOpening("label");
            return;
        }
        if (!entryIds(ctx).includes(drawnId)) {
            setWaiting((now) => (now.includes(key) ? now : [...now, key]));
        }
        setOpening(key);
    };
    const add = (id: string): void => {
        setMenu(false);
        if (id === "shader") {
            shaders.openGallery();
            return;
        }
        if (id.startsWith(ENTRY_WAIT)) {
            editDrawn(id);
            return;
        }
        const [thingId, look] = id.split(LOOK_SEP) as [string, LabelLookId | undefined];
        const found = things.flat().find((each) => each.thing.id === thingId);
        if (addsEntry(found?.thing, look) || addsLook(look)) {
            return;
        }
        const { free, main } = plusTarget(ctx, found, shown, waiting);
        const thing = found?.thing;
        if (thing === undefined || main === undefined) {
            return;
        }
        // A text source's row opens its list and takes focus itself: an unanswered ask would wait for the tab's
        // next render and then pull focus from the control the reader is using.
        if (main.accepts !== "text") {
            focusLineNext(ctx.session, main.channel);
        }
        const first = firstItem(ctx, id, main.channel);
        // A list thing opens on its list, and an Image on its picker (design 5.1).
        if (first !== undefined || id === "image" || (ctx.side === "node" && Object.hasOwn(LISTS, id))) {
            setOpening(id);
        }
        const start = first?.[main.channel] ?? (main.accepts === "text" ? undefined : startForOrNone(ctx, main));
        // A thing with no plain starting value (a text source, a list) waits for the reader's first pick.
        if (typeof start !== "number" && typeof start !== "boolean" && (typeof start !== "string" || start === "")) {
            // A further kind of a drawn thing waits as a row of its own (a second End caption is the source end).
            const key = free === undefined ? id : `${id}:${free.id}`;
            setWaiting((now) => (now.includes(key) ? now : [...now, key]));
            return;
        }
        const value = start;
        // What "+" adds draws at once (design 5.1): with it, what graphty-element says it needs to draw and starts
        // with (a plate's card shape), over a list's first item (a chart's values and colors).
        const starts = Object.fromEntries(
            Object.entries({
                ...sizeStarts(ctx, thing, main.channel),
                ...first,
                ...needsFor(ctx, main.channel, value),
                ...startsWithFor(ctx, main.channel),
                ...free?.plusStarts?.(lineWidthOf(ctx)),
            }).filter(([c]) => c !== main.channel),
        );
        // Its own undo step, never merged with the first edit after it (design 12.13).
        const written =
            ctx.many === undefined
                ? ctx.session.transaction(`adding ${thing.name.toLowerCase()}`, (tx) =>
                      writeLine(tx, ctx.row, ctx.side, main.channel, { value }, ctx.fresh, starts),
                  )
                : writeIn(ctx, main.channel, { value }, starts);
        written
            .then(() => {
                store.set({ announcement: `${thing.name} added` });
            })
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords(thing.name, "added", error), error: true } });
            });
    };
    const empty = shown.length === 0 && shaders.entries.length === 0;
    // Only a section of one thing adds it straight from "+" (design 2.3); any other shows its menu,
    // so the reader sees what "+" adds, and a "+" with nothing left to add is not drawn.
    const single = section.groups.flat().length === 1;
    return (
        <div // eslint-disable-line jsx-a11y/no-static-element-interactions -- only catches the shader paste shortcut bubbling from the section's own controls
            ref={sectionBox}
            data-section={`${ctx.side}-${id}`}
            className="ws-section"
            onKeyDown={holdsShaders ? shaders.onKeyDown : undefined}
        >
            <PlusList
                level="section"
                title={title}
                empty={empty}
                collapseKey={`${ctx.side}:${id}`}
                add={
                    options.length === 0 ? undefined : (
                        <AddButton
                            kind={ctx.side}
                            title={title}
                            groups={plus}
                            onAdd={add}
                            alwaysMenu={!single}
                            opened={single ? undefined : menu}
                            onOpenChange={single ? undefined : setMenu}
                        />
                    )
                }
            >
                {byKind(rows).map((run) => {
                    const drawn = run.rows.map((row) => {
                        const { thing, channels, kind, entry } = row;
                        const key = waitKeyOf(row);
                        return (
                            <ThingRow
                                key={rowKeyOf(row)}
                                ctx={ctx}
                                thing={thing}
                                channels={channels}
                                kind={kind}
                                entry={entry}
                                pending={waiting.includes(key) || (entry === undefined && waiting.includes(thing.id))}
                                opening={opening === (entry === undefined ? thing.id : key)}
                                onOpened={() => {
                                    setOpening(undefined);
                                }}
                                onCancel={() => {
                                    setWaiting((now) =>
                                        now.filter(
                                            (each) => each !== key && (entry !== undefined || each !== thing.id),
                                        ),
                                    );
                                }}
                            />
                        );
                    });
                    return run.legend === undefined ? (
                        drawn
                    ) : (
                        <PlusListKind key={run.legend} label={run.legend}>
                            {drawn}
                        </PlusListKind>
                    );
                })}
                {shaders.rows}
            </PlusList>
            {shaders.overlays}
        </div>
    );
}

/** Each section's waiting things, by row, kind and section, kept across the sections being drawn anew. */
const WAITING = new Map<string, readonly string[]>();

/**
 * One kind's Style panel v2 body: see the file header.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @returns The body
 */
export function StylePanelV2({ ctx: row }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const [query, setQuery] = useState("");
    const box = useRef<HTMLInputElement>(null);
    const onKeyDown = useFindKey(box);
    // Each press or key in the panel starts a new undo step: a drag stays one step, and two deliberate edits of one
    // setting undo one at a time (graphty-element merges back-to-back edits of a setting otherwise).
    const onKeyDownCapture = (): void => {
        row.session.history.endStep();
    };
    const ctx: RowContext = { ...row, pickers: "listbox", listSections: sectionsOf, namesOnly: true, withNeeds: true };
    // The owner removed Order and groups from the panel (E420, E422): its part draws no section and Find a
    // setting finds none of its settings. graphty-element still draws them from an imported file.
    const parts = partsFor(ctx.side, experimentChannelsOff({ cosmograph: cosmographOn(ctx.session) })).filter(
        (part) => part.id !== "order",
    );
    const sections = SECTIONS[ctx.side].flatMap((section) => {
        const part = parts.find((each) => each.id === section.part);
        return part === undefined ? [] : [{ part, section }];
    });
    const homes = query.trim() === "" ? new Map<Channel, FoundHome>() : findHomes(ctx, sections);
    const drawnLines = new Set<string>();
    const body =
        query.trim() === "" ? (
            // Every section is shown, an empty one as its header with its "+" (there is no reader switch for it); a
            // separator parts the mark's parts from how it shows (E551, ia-design 1).
            sections.map(({ part, section }) => (
                <React.Fragment key={part.id}>
                    {section.breakBefore === true && <Divider data-section-break="" />}
                    <ThingSection ctx={ctx} part={part} section={section} />
                </React.Fragment>
            ))
        ) : (
            <FindSettingResults
                ctx={ctx}
                query={query}
                parts={parts}
                line={(channel) => {
                    // A pair or a unit line holds several channels: it is drawn once, for the first found.
                    const found = lineFor(ctx.side, channel);
                    const key = found === undefined ? channel : `${found.group ?? ""}:${found.line.channel}`;
                    if (drawnLines.has(key)) {
                        return null;
                    }
                    drawnLines.add(key);
                    return foundLine(ctx, channel);
                }}
                home={(channel) => homes.get(channel)}
                words={(channel) => {
                    const found = lineFor(ctx.side, channel);
                    return [found?.line.name ?? "", found?.group ?? "", ...(FIND_WORDS[channel] ?? [])].filter(
                        (word) => word !== "",
                    );
                }}
            />
        );
    return (
        <div // eslint-disable-line jsx-a11y/no-static-element-interactions -- only catches the "/" key bubbling from the panel's own controls
            onKeyDown={onKeyDown}
            onPointerDownCapture={() => {
                row.session.history.endStep();
            }}
            onKeyDownCapture={onKeyDownCapture}
        >
            <LabelsProvider labels={V2_LABELS}>
                <PickerNamesOnly.Provider value>
                    <ScrubSlots.Provider value>
                        <section
                            className="ws-style-group"
                            data-group={ctx.side}
                            data-style-parts=""
                            data-style-panel-v2=""
                        >
                            <FindSettingBox query={query} onQuery={setQuery} inputRef={box} />
                            {body}
                        </section>
                    </ScrubSlots.Provider>
                </PickerNamesOnly.Provider>
            </LabelsProvider>
        </div>
    );
}
