/**
 * Style panel v2's body for one kind (design/ui/style-panel-v2/design.md; the style-panel-v2
 * experiment): Find a setting, then every section in the design's order, each a `PlusList` section
 * with its rule below it and a "+" on its header, the only button the header has: its "+" opens the
 * section's menu (a section of one thing adds it directly), and its title adds nothing. A section
 * lists one row per thing the layer sets or the reader just added.
 */

import { ControlGroup, LabelsProvider } from "@graphty/compact-mantine";
import { type Channel, writeChannelList } from "@graphty/graphty-element/catalog";
import React, { useRef, useState } from "react";

import { cosmographOn, nodeModelsOn } from "../../features";
import { useWorkspace } from "../../state/WorkspaceContext";
import { FindSettingBox, FindSettingResults } from "../parts/FindSetting";
import { ChannelLine } from "../parts/PartPage";
import { itemChannels, partsFor, type PartSpec } from "../parts/parts";
import { useFindKey } from "../parts/useFindKey";
import { PickerNamesOnly } from "../pickerNames";
import type { RowContext } from "../PropertyRow";
import { needsFor, startForOrNone, writeIn, writeLine } from "../row";
import { ScrubSlots } from "../scrubSlots";
import { AddButton, type AddOption, Section } from "../Section";
import { focusLineNext } from "../useFocusLine";
import { channelWord, experimentChannelsOff, failureWords } from "../words";
import { viewDim } from "./drawn";
import { replaceUse } from "./families";
import { kindGroupOf, type KindMember, kindsShown, ownsOf } from "./kindGroups";
import { drawnItems, firstColors, ITEM_LISTS, LISTS } from "./lists";
import { PlusList } from "./PlusList";
import { FIT_TO_LABEL, lineFor, V2_LABELS } from "./rubric";
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
};

/**
 * Every channel the kind's parts offer here (an experiment that is off keeps its own out).
 * @param ctx - the row and kind.
 * @returns the channels.
 */
function kindChannels(ctx: RowContext): ReadonlySet<Channel> {
    const off = experimentChannelsOff({ cosmograph: cosmographOn(ctx.session), nodeModels: nodeModelsOn(ctx.session) });
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
    const offered = new Set(part.items.flatMap((item) => itemChannels(item)));
    const items = part.items.filter((item) => thing.items.includes(item.id)).flatMap((item) => itemChannels(item));
    // Fit to label sizes the shape: it is the Shape thing's, not the Label's (design 4).
    const moved = new Set<Channel>(thing.id === "shape" ? [] : FIT_TO_LABEL);
    const own = (thing.own ?? []).filter((c) => kindChannels.has(c));
    return [...new Set([...items.filter((c) => offered.has(c)), ...own])].filter((c) => !taken.has(c) && !moved.has(c));
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
            const channels = thingChannels(ctx, part, section, thing, kindChannels(ctx));
            return channels.length === 0 || mainOf(ctx, thing, channels) === undefined ? [] : [{ thing, channels }];
        }),
    );
    const shown = things.flat().filter(
        ({ thing, channels }) =>
            waiting.includes(thing.id) ||
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
 * A thing's rows: one, or for a kind group one per kind its layers draw, each with that kind's channels.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param channels - its channels.
 * @returns the rows.
 */
function rowsOf(
    ctx: RowContext,
    thing: ThingSpec,
    channels: readonly Channel[],
): readonly { thing: ThingSpec; channels: readonly Channel[]; kind?: KindMember }[] {
    const group = kindGroupOf(ctx.side, thing.id);
    if (group === undefined) {
        return [{ thing, channels }];
    }
    return kindsShown(ctx, group).map((kind) => {
        const owns = ownsOf(group, kind);
        return { thing, channels: channels.filter((channel) => owns.includes(channel)), kind };
    });
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
    // Things "+" added that the row does not set yet, waiting for their first value.
    const [waiting, setWaiting] = useState<readonly string[]>([]);
    const [menu, setMenu] = useState(false);
    // The thing "+" just added whose pop-over or picker opens at once (a list, an image).
    const [opening, setOpening] = useState<string | undefined>(undefined);
    const { things, shown } = thingsOf(ctx, part, section, waiting);
    // A one-only thing leaves the menu once set; Label stays, disabled, until a node can hold several
    // labels (design 7.4: list-valued labels are not in graphty-element yet).
    const groups: AddOption[][] = [
        ...things.map((group) =>
            group.flatMap(({ thing }): AddOption[] => {
                if (!shown.some((each) => each.thing === thing)) {
                    // A thing that draws nothing in this view (a 3D-only one in 2D) is dimmed, still pickable.
                    const main = thing.start ?? thing.main[0];
                    return [
                        {
                            key: thing.id,
                            label: thing.name,
                            dimmed: main === undefined ? undefined : viewDim(ctx, main),
                            hint: thing.hint,
                        },
                    ];
                }
                return thing.id === "label" ? [{ key: thing.id, label: thing.name, disabled: true }] : [];
            }),
        ),
    ];
    const options = groups.flat().filter((option) => option.disabled !== true);
    const add = (id: string): void => {
        setMenu(false);
        const found = things.flat().find((each) => each.thing.id === id);
        const thing = found?.thing;
        const main = found === undefined ? undefined : mainOf(ctx, found.thing, found.channels);
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
        if (first !== undefined || id === "image" || (ctx.side === "node" && LISTS[id] !== undefined)) {
            setOpening(id);
        }
        const start = first?.[main.channel] ?? (main.accepts === "text" ? undefined : startForOrNone(ctx, main));
        // A thing with no plain starting value (a text source, a list) waits for the reader's first pick.
        if (typeof start !== "number" && typeof start !== "boolean" && (typeof start !== "string" || start === "")) {
            setWaiting((now) => (now.includes(id) ? now : [...now, id]));
            return;
        }
        const value = start;
        // What "+" adds draws at once (design 5.1): with it, what graphty-element says it needs to draw, over a
        // list's first item (a chart's values and colors).
        const starts = Object.fromEntries(
            Object.entries({ ...first, ...needsFor(ctx, main.channel, value) }).filter(([c]) => c !== main.channel),
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
    const empty = shown.length === 0;
    // Only a section of one thing adds it straight from "+" (design 2.3); any other shows its menu,
    // so the reader sees what "+" adds, and a "+" with nothing left to add is not drawn.
    const single = section.groups.flat().length === 1;
    return (
        <div data-section={`${ctx.side}-${part.id}`} className="ws-section">
            <PlusList
                level="section"
                title={part.title}
                empty={empty}
                collapseKey={`${ctx.side}:${part.id}`}
                add={
                    options.length === 0 ? undefined : (
                        <AddButton
                            kind={ctx.side}
                            title={part.title}
                            groups={groups}
                            onAdd={add}
                            alwaysMenu={!single}
                            opened={single ? undefined : menu}
                            onOpenChange={single ? undefined : setMenu}
                        />
                    )
                }
            >
                {byKind(shown.flatMap(({ thing, channels }) => rowsOf(ctx, thing, channels))).map((run) => {
                    const drawn = run.rows.map(({ thing, channels, kind }) => (
                        <ThingRow
                            key={kind === undefined ? thing.id : `${thing.id}:${kind.id}`}
                            ctx={ctx}
                            thing={thing}
                            channels={channels}
                            kind={kind}
                            pending={waiting.includes(thing.id)}
                            opening={opening === thing.id}
                            onOpened={() => {
                                setOpening(undefined);
                            }}
                            onCancel={() => {
                                setWaiting((now) => now.filter((each) => each !== thing.id));
                            }}
                        />
                    ));
                    return run.legend === undefined ? (
                        drawn
                    ) : (
                        <ControlGroup key={run.legend} label={run.legend}>
                            {drawn}
                        </ControlGroup>
                    );
                })}
            </PlusList>
        </div>
    );
}

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
    const ctx: RowContext = { ...row, pickers: "listbox", listSections: sectionsOf, namesOnly: true, withNeeds: true };
    // The owner removed Order and groups from the panel (E420, E422): its part draws no section and Find a
    // setting finds none of its settings. graphty-element still draws them from an imported file.
    const parts = partsFor(
        ctx.side,
        experimentChannelsOff({ cosmograph: cosmographOn(ctx.session), nodeModels: nodeModelsOn(ctx.session) }),
    ).filter((part) => part.id !== "order");
    const sections = SECTIONS[ctx.side].flatMap((section) => {
        const part = parts.find((each) => each.id === section.part);
        return part === undefined ? [] : [{ part, section }];
    });
    const body =
        query.trim() === "" ? (
            // Every section is shown, an empty one as its header with its "+" (there is no reader switch for it).
            sections.map(({ part, section }) =>
                part.id === "shaders" ? (
                    <Section
                        key={part.id}
                        ctx={ctx}
                        spec={{
                            id: part.id,
                            title: part.title,
                            channels: itemChannels(part.items[0]),
                            shaders: true,
                            shapeOwnsReplace: true,
                            renderRow: (entry) => <ShaderUseRow ctx={ctx} entry={entry} />,
                        }}
                    />
                ) : (
                    <ThingSection key={part.id} ctx={ctx} part={part} section={section} />
                ),
            )
        ) : (
            <FindSettingResults
                ctx={ctx}
                query={query}
                parts={parts}
                line={(channel) => foundLine(ctx, channel)}
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
