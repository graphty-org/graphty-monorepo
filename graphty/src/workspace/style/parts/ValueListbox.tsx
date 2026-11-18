/**
 * The value picker of a choice property in the Style panel by part (the file-styles experiment): a
 * button showing the value, which opens a named, searchable list ("Search 53 shapes") of every
 * value graphty-element offers for the property, with its own name and picture. The values the
 * graph draws now come first, under "In this graph", each with how many nodes or edges carry it.
 */

import { PanelField, Popout, type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Button } from "@mantine/core";
import React, { useState } from "react";

import type { ValueSection } from "../v2/valueSections";
import { channelWord, countName } from "../words";

/** A choice listed after the property's own, as a value field takes it. */
interface ExtraChoice {
    readonly value: string;
    readonly label: string;
    readonly glyph?: React.ReactNode;
    readonly disabled?: boolean;
}

/**
 * A catalog picture, the element's own static SVG in currentColor.
 * @param props - Component props
 * @param props.svg - the picture
 * @returns The picture
 */
function Glyph({ svg }: Readonly<{ svg: string }>): React.JSX.Element {
    return <span aria-hidden className="ws-value-glyph" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/**
 * A property's values as the list's rows: the ones drawn now first, most drawn first, then the rest
 * in the catalog's order.
 * @param session - the element's session.
 * @param descriptor - the property.
 * @param extraChoices - choices listed after the property's own (Shape's shaders).
 * @returns the rows.
 */
function valueRows(
    session: GraphSession,
    descriptor: ChannelDescriptor,
    extraChoices: readonly ExtraChoice[],
): QuickAction[] {
    const values = session.catalog.channelValues(descriptor.channel);
    const drawn = session.styles.drawnValues(descriptor.channel);
    const row = (value: (typeof values)[number], count?: number): QuickAction => ({
        value: value.id,
        label: value.plainName,
        ...(value.glyph === undefined ? {} : { icon: <Glyph svg={value.glyph} /> }),
        ...(count === undefined
            ? { section: "All" }
            : {
                  section: "In this graph",
                  description: descriptor.target === "node" ? countName(count, 0) : countName(0, count),
              }),
    });
    const used = drawn.flatMap((each) => {
        const value = values.find((one) => one.id === each.value);
        return value === undefined ? [] : [row(value, each.count)];
    });
    const usedIds = new Set(used.map((each) => each.value));
    return [
        ...used,
        ...values.filter((value) => !usedIds.has(value.id)).map((value) => row(value)),
        ...extraChoices.map((choice): QuickAction => ({
            value: choice.value,
            label: choice.label,
            section: "More",
            ...(choice.glyph === undefined ? {} : { icon: choice.glyph }),
            ...(choice.disabled === true ? { disabled: true } : {}),
        })),
    ];
}

/**
 * A sectioned list's rows (Style panel v2, design section 8): the ones drawn now, then one
 * section's; while searching, every row, so search covers every section.
 * @param rows - every row.
 * @param sections - the list's sections.
 * @param section - the section shown.
 * @param searching - whether the reader is searching.
 * @returns the rows to list.
 */
function sectionRows(
    rows: readonly QuickAction[],
    sections: readonly ValueSection[],
    section: string,
    searching: boolean,
): QuickAction[] {
    const sectionOf = (value: string): string | undefined => sections.find((each) => each.values.includes(value))?.name;
    return rows
        .filter((row) => searching || row.section !== "All" || sectionOf(row.value) === section)
        .map((row) => (row.section === "All" ? { ...row, section: sectionOf(row.value) ?? row.section } : row));
}

/**
 * The value picker: see the file header.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the property
 * @param props.label - its accessible name, such as "Node shape"
 * @param props.value - the value set here, or undefined
 * @param props.shown - what it draws now, shown while nothing is set
 * @param props.mixed - whether the things it stands for hold different values
 * @param props.extraChoices - choices listed after the property's own
 * @param props.onPick - writes the value picked
 * @param props.sections - shows one section of a long list at a time, with a section select (Style panel v2)
 * @returns The picker
 */
export function ValueListbox({
    session,
    descriptor,
    label,
    value,
    shown,
    mixed = false,
    extraChoices = [],
    onPick,
    sections,
}: Readonly<{
    session: GraphSession;
    descriptor: ChannelDescriptor;
    label: string;
    value: unknown;
    shown: unknown;
    mixed?: boolean;
    extraChoices?: readonly ExtraChoice[];
    onPick: (value: string) => void;
    sections?: readonly ValueSection[];
}>): React.JSX.Element {
    const [opened, setOpened] = useState(false);
    const [query, setQuery] = useState("");
    const values = session.catalog.channelValues(descriptor.channel);
    const current = mixed ? undefined : values.find((each) => each.id === String(value ?? shown));
    const startSection =
        sections?.find((each) => current !== undefined && each.values.includes(current.id))?.name ??
        sections?.[0]?.name ??
        "";
    const [section, setSection] = useState(startSection);
    const rows = opened ? valueRows(session, descriptor, extraChoices) : [];
    const listed = sections === undefined ? rows : sectionRows(rows, sections, section, query.trim() !== "");
    const things = `${channelWord(descriptor.channel).toLowerCase()}s`;
    // As the shared choice field reads it: "mixed", or the default in force when nothing is set.
    const unset = value === undefined && !mixed;
    const prefix = unset ? "default " : "";
    let name = current === undefined ? label : `${label}, ${prefix}${current.plainName}`;
    if (mixed) {
        name = `${label}, mixed`;
    }
    return (
        <Popout
            opened={opened}
            onOpenChange={(open) => {
                setQuery("");
                setSection(startSection);
                setOpened(open);
            }}
        >
            <Popout.Trigger>
                <Button
                    variant="default"
                    size="compact-xs"
                    fullWidth
                    aria-label={name}
                    data-value-listbox={descriptor.channel}
                    justify="flex-start"
                    className="ws-value-listbox"
                    data-unset={unset ? "" : undefined}
                    leftSection={current?.glyph === undefined ? undefined : <Glyph svg={current.glyph} />}
                >
                    {mixed ? "Mixed" : (current?.plainName ?? "")}
                </Button>
            </Popout.Trigger>
            <Popout.Panel
                width={240}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: label }}
                closeLabel={`Close ${label}`}
            >
                {sections === undefined ? null : (
                    <PanelField
                        label={`${label} section`}
                        kind="select"
                        width="fill"
                        data={sections.map((each) => ({ value: each.name, label: each.name }))}
                        value={section}
                        onChange={(next) => {
                            setSection(String(next));
                        }}
                    />
                )}
                <QuickActions
                    role="group"
                    aria-label={`${label} values`}
                    placeholder={sections === undefined ? `Search ${String(values.length)} ${things}` : "Search"}
                    width={240}
                    height={320}
                    descriptions="end"
                    {...(current === undefined ? {} : { highlight: current.id })}
                    query={query}
                    onQueryChange={setQuery}
                    actions={listed}
                    onRun={(picked) => {
                        setOpened(false);
                        onPick(picked);
                    }}
                    onClose={() => {
                        setOpened(false);
                    }}
                />
            </Popout.Panel>
        </Popout>
    );
}
