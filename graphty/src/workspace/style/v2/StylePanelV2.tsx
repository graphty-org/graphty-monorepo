/**
 * Style panel v2's body for one kind (design/ui/style-panel-v2/design.md; the style-panel-v2
 * experiment): Find a setting, then every section in the design's order, each a `PlusList` section
 * with its rule below it and a "+" on its header, the only button the header has: its "+" opens the
 * section's menu (a section of one thing adds it directly), and its title adds nothing. A section
 * lists one row per thing the layer sets or the reader just added.
 */

import { LabelsProvider } from "@graphty/compact-mantine";
import { type Channel, writeChannelList } from "@graphty/graphty-element/catalog";
import React, { useRef, useState } from "react";

import { cosmographOn, nodeModelsOn } from "../../features";
import { useWorkspace, useWorkspaceState } from "../../state/WorkspaceContext";
import { FindSettingBox, FindSettingResults } from "../parts/FindSetting";
import { ChannelLine } from "../parts/PartPage";
import { itemChannels, partsFor, type PartSpec } from "../parts/parts";
import { useFindKey } from "../parts/useFindKey";
import { PickerNamesOnly } from "../pickerNames";
import type { RowContext } from "../PropertyRow";
import { startForOrNone, writeIn, writeLine } from "../row";
import { AddButton, type AddOption, Section } from "../Section";
import { addShader, pickedShader, placeOf, shaderEntries, type ShaderEntry } from "../shaderSlots";
import { focusLineNext } from "../useFocusLine";
import { channelWord, experimentChannelsOff, failureWords } from "../words";
import { groupOutlineShaders, isGroupOutline, replaceUse } from "./families";
import { ITEM_LISTS, LISTS, nextColor } from "./lists";
import { PlusList } from "./PlusList";
import { FIT_TO_LABEL, lineFor, V2_LABELS } from "./rubric";
import { RubricLine } from "./RubricLine";
import { ShaderUseRow } from "./ShaderUseRow";
import { ThingRow } from "./ThingRow";
import { mainOf, SECTIONS, type SectionThings, setOn, type ThingSpec } from "./things";
import { sectionsOf } from "./valueSections";

/** Words Find a setting finds a setting by in this panel only: the names its things give them. */
const FIND_WORDS: Partial<Readonly<Record<Channel, readonly string[]>>> = {
    "edge.arrowHead": ["target end"],
    "node.visible": ["visibility"],
    "edge.visible": ["visibility"],
    "node.label": ["name", "label"],
    "edge.label": ["name", "label"],
};

/** The words of the button that shows a section while empty sections are not shown (design 11). */
const ADD_SECTION = "Add section";

/**
 * Every channel of a thing that its section offers: its items' and its own, less what another
 * thing of the section takes as its own.
 * @param part - its section's part.
 * @param section - its section.
 * @param thing - the thing.
 * @returns the channels.
 */
function thingChannels(part: PartSpec, section: SectionThings, thing: ThingSpec): readonly Channel[] {
    const taken = new Set(section.groups.flat().flatMap((each) => (each === thing ? [] : (each.own ?? []))));
    const offered = new Set(part.items.flatMap((item) => itemChannels(item)));
    const items = part.items.filter((item) => thing.items.includes(item.id)).flatMap((item) => itemChannels(item));
    // Fit to label sizes the shape: it is the Shape thing's, not the Label's (design 4).
    const moved = new Set<Channel>(thing.id === "shape" ? [] : FIT_TO_LABEL);
    return [...new Set([...items, ...(thing.own ?? [])])].filter(
        (c) => offered.has(c) && !taken.has(c) && !moved.has(c),
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
            const channels = thingChannels(part, section, thing);
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
 * What "+" writes for a list thing (design 5.1): its first item, a slice of the next color, a
 * line, an empty field or table cell.
 * @param ctx - the row.
 * @param id - the thing's id.
 * @param main - its main channel.
 * @returns the writes, or undefined for a thing that is not a list.
 */
function firstItem(ctx: RowContext, id: string, main: Channel): Partial<Record<Channel, string>> | undefined {
    const list = ctx.side === "node" ? LISTS[id] : undefined;
    if (list !== undefined) {
        return { [list.colors]: writeChannelList(list.colors, [nextColor(ctx, [])]) };
    }
    const items = ITEM_LISTS[main];
    return items === undefined ? undefined : { [main]: items.fresh };
}

/** The Group outline item's key in Order and groups' "+" menu. */
const GROUP_OUTLINE = "groupOutline";

/**
 * The group outlines a section lists: Order and groups' on the node tab (design 4.1), else none.
 * @param ctx - the row.
 * @param part - the section's part.
 * @returns the outlines' uses.
 */
function outlinesOf(ctx: RowContext, part: PartSpec): readonly ShaderEntry[] {
    return part.id === "order" && ctx.side === "node"
        ? shaderEntries(ctx).filter((entry) => isGroupOutline(ctx, entry))
        : [];
}

/**
 * Whether the row sets anything a section holds.
 * @param ctx - the row.
 * @param part - its part.
 * @param section - its things.
 * @returns true when it does.
 */
function sectionUsed(ctx: RowContext, part: PartSpec, section: SectionThings): boolean {
    // A shader in the shapes' place is the Shape row's, never the Shaders section's (design 4.1).
    return part.id === "shaders"
        ? shaderEntries(ctx).some((entry) => placeOf(entry) !== "replace" && !isGroupOutline(ctx, entry))
        : thingsOf(ctx, part, section, []).shown.length > 0 || outlinesOf(ctx, part).length > 0;
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
 * One section: see the file header.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.part - its part
 * @param props.section - its things
 * @param props.openMenu - opens its "+" menu at once (picked from Add section)
 * @returns The section
 */
function ThingSection({
    ctx,
    part,
    section,
    openMenu = false,
}: Readonly<{ ctx: RowContext; part: PartSpec; section: SectionThings; openMenu?: boolean }>): React.JSX.Element {
    const { store } = useWorkspace();
    // Things "+" added that the row does not set yet, waiting for their first value.
    const [waiting, setWaiting] = useState<readonly string[]>([]);
    const [menu, setMenu] = useState(openMenu);
    // The thing "+" just added whose pop-over or picker opens at once (a list, an image).
    const [opening, setOpening] = useState<string | undefined>(undefined);
    const { things, shown } = thingsOf(ctx, part, section, waiting);
    // A one-only thing leaves the menu once set; Label stays, disabled, until a node can hold several
    // labels (design 7.4: list-valued labels are not in graphty-element yet).
    const outlines = outlinesOf(ctx, part);
    const takesOutlines = part.id === "order" && ctx.side === "node";
    const groups: AddOption[][] = [
        ...things.map((group) =>
            group.flatMap(({ thing }) => {
                if (!shown.some((each) => each.thing === thing)) {
                    return [{ key: thing.id, label: thing.name }];
                }
                return thing.id === "label" ? [{ key: thing.id, label: thing.name, disabled: true }] : [];
            }),
        ),
        // A group outline is a shader use, and a layer may draw several (design 4.1).
        ...(takesOutlines ? [[{ key: GROUP_OUTLINE, label: "Group outline" }]] : []),
    ];
    const options = groups.flat().filter((option) => option.disabled !== true);
    const add = (id: string): void => {
        setMenu(false);
        if (id === GROUP_OUTLINE) {
            const [first] = groupOutlineShaders();
            if (first !== undefined) {
                pickedShader(ctx.session, first)
                    .then((shader) => addShader(ctx, shader))
                    .then(() => {
                        store.set({ announcement: "Group outline added" });
                    })
                    .catch((error: unknown) => {
                        store.set({ notice: { message: failureWords("Group outline", "added", error), error: true } });
                    });
            }
            return;
        }
        const found = things.flat().find((each) => each.thing.id === id);
        const thing = found?.thing;
        const main = found === undefined ? undefined : mainOf(ctx, found.thing, found.channels);
        if (thing === undefined || main === undefined) {
            return;
        }
        focusLineNext(ctx.session, main.channel);
        const first = firstItem(ctx, id, main.channel);
        // A list thing opens on its list, and an Image on its picker (design 5.1).
        if (first !== undefined || id === "image") {
            setOpening(id);
        }
        const start = first?.[main.channel] ?? (main.accepts === "text" ? undefined : startForOrNone(ctx, main));
        const starts = first === undefined || main.channel in first ? thing.starts : { ...thing.starts, ...first };
        // A thing with no plain starting value (a text source, a list) waits for the reader's first pick.
        if (typeof start !== "number" && typeof start !== "boolean" && (typeof start !== "string" || start === "")) {
            setWaiting((now) => (now.includes(id) ? now : [...now, id]));
            return;
        }
        // What "+" adds draws at once (design 5.1): an end with no arrowhead starts with one.
        const value = thing.drawn !== undefined && (start === "none" || start === 0) ? thing.drawn : start;
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
    const empty = shown.length === 0 && outlines.length === 0;
    // Only a section of one thing adds it straight from "+" (design 2.3); any other shows its menu,
    // so the reader sees what "+" adds, and a "+" with nothing left to add is not drawn.
    const single = section.groups.flat().length + (takesOutlines ? 1 : 0) === 1;
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
                {shown.map(({ thing, channels }) => (
                    <ThingRow
                        key={thing.id}
                        ctx={ctx}
                        thing={thing}
                        channels={channels}
                        pending={waiting.includes(thing.id)}
                        opening={opening === thing.id}
                        onOpened={() => {
                            setOpening(undefined);
                        }}
                        onCancel={() => {
                            setWaiting((now) => now.filter((each) => each !== thing.id));
                        }}
                    />
                ))}
                {outlines.map((entry) => (
                    <ShaderUseRow key={entry.key} ctx={ctx} entry={entry} outline />
                ))}
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
    const showEmpty = useWorkspaceState((state) => state.styleEmptySections);
    // Sections picked from Add section while empty sections are not shown (design 11).
    const [revealed, setRevealed] = useState<readonly string[]>([]);
    const box = useRef<HTMLInputElement>(null);
    const onKeyDown = useFindKey(box);
    const ctx: RowContext = { ...row, pickers: "listbox", listSections: sectionsOf, namesOnly: true };
    const parts = partsFor(
        ctx.side,
        experimentChannelsOff({ cosmograph: cosmographOn(ctx.session), nodeModels: nodeModelsOn(ctx.session) }),
    );
    const sections = SECTIONS[ctx.side].flatMap((section) => {
        const part = parts.find((each) => each.id === section.part);
        return part === undefined ? [] : [{ part, section }];
    });
    const shownSections = sections.filter(
        ({ part, section }) => showEmpty || revealed.includes(part.id) || sectionUsed(ctx, part, section),
    );
    const hidden = sections.filter((each) => !shownSections.includes(each));
    const addSection =
        hidden.length === 0 ? null : (
            <div className="ws-add-section" data-add-section="">
                <PlusList
                    level="section"
                    title={ADD_SECTION}
                    empty
                    heading={false}
                    add={
                        <AddButton
                            kind={ctx.side}
                            title={ADD_SECTION}
                            name={ADD_SECTION}
                            alwaysMenu
                            groups={[hidden.map(({ part }) => ({ key: part.id, label: part.title }))]}
                            onAdd={(id) => {
                                setRevealed((now) => [...now, id]);
                            }}
                        />
                    }
                />
            </div>
        );
    const body =
        query.trim() === "" ? (
            shownSections.map(({ part, section }) =>
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
                            listed: (entry) => !isGroupOutline(ctx, entry),
                            renderRow: (entry) => <ShaderUseRow ctx={ctx} entry={entry} />,
                        }}
                    />
                ) : (
                    <ThingSection
                        key={part.id}
                        ctx={ctx}
                        part={part}
                        section={section}
                        openMenu={!showEmpty && revealed.includes(part.id)}
                    />
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
                    <section
                        className="ws-style-group"
                        data-group={ctx.side}
                        data-style-parts=""
                        data-style-panel-v2=""
                    >
                        <FindSettingBox query={query} onQuery={setQuery} inputRef={box} />
                        {body}
                        {query.trim() === "" ? addSection : null}
                    </section>
                </PickerNamesOnly.Provider>
            </LabelsProvider>
        </div>
    );
}
