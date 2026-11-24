/**
 * The value picker of a choice property in the Style panel by part (the file-styles experiment): a
 * button showing the value, which opens a named, searchable list ("Search 53 shapes") of every
 * value graphty-element offers for the property, with its own name and picture. The values the
 * graph draws now come first, under "In this graph", each with how many nodes or edges carry it.
 */

import { PanelField, type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Box, Button } from "@mantine/core";
import React, { useState } from "react";

import { Pop, PopPanel, PopTrigger } from "../../options/Drill";
import { channelWord, countName } from "../words";

/** A choice listed after the property's own, as a value field takes it. */
/** One section of a value list: its name and the value ids it holds, in the list's order. */
export interface ValueSection {
    readonly name: string;
    readonly values: readonly string[];
}

interface ExtraChoice {
    readonly value: string;
    readonly label: string;
    readonly glyph?: React.ReactNode;
    readonly disabled?: boolean;
    /** The section it is listed in, after the list's own (Shape's Models and Shaders); unset, "More". */
    readonly section?: string;
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
 * @param counts - whether a row in use says how many things draw it.
 * @param icons - the app's glyph of each value the element pictures none of.
 * @returns the rows.
 */
function valueRows(
    session: GraphSession,
    descriptor: ChannelDescriptor,
    extraChoices: readonly ExtraChoice[],
    counts: boolean,
    icons: Readonly<Record<string, React.ReactNode>> | undefined,
): QuickAction[] {
    const values = session.catalog.channelValues(descriptor.channel);
    const drawn = session.styles.drawnValues(descriptor.channel);
    const iconOf = (value: (typeof values)[number]): React.ReactNode =>
        value.glyph === undefined ? icons?.[value.id] : <Glyph svg={value.glyph} />;
    const row = (value: (typeof values)[number], count?: number): QuickAction => ({
        value: value.id,
        label: value.plainName,
        ...(iconOf(value) === undefined ? {} : { icon: iconOf(value) }),
        ...(count === undefined
            ? { section: "All" }
            : {
                  section: "In this graph",
                  ...(counts
                      ? { description: descriptor.target === "node" ? countName(count, 0) : countName(0, count) }
                      : {}),
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
            section: choice.section ?? "More",
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
    const named = new Set(sections.map((each) => each.name));
    return rows
        .filter((row) => {
            if (searching) {
                return true;
            }
            if (row.section === "All") {
                return sectionOf(row.value) === section;
            }
            // A choice listed in a section of its own (Shape's Shaders) shows with that section only.
            return !named.has(row.section ?? "") || row.section === section;
        })
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
 * @param props.counts - whether a row in use says how many things draw it (not in Style panel v2, #8739)
 * @param props.icons - the app's glyph of each value the element pictures none of (Style panel v2's R10 lucide lists)
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
    counts = true,
    icons,
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
    counts?: boolean;
    icons?: Readonly<Record<string, React.ReactNode>>;
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
    const rows = opened ? valueRows(session, descriptor, extraChoices, counts, icons) : [];
    // The extra choices' own sections follow the list's, in the order the choices come.
    const allSections =
        sections === undefined
            ? undefined
            : [
                  ...sections,
                  ...[
                      ...new Set(
                          extraChoices.flatMap((choice) => (choice.section === undefined ? [] : [choice.section])),
                      ),
                  ]
                      .filter((name) => !sections.some((each) => each.name === name))
                      .map((name) => ({ name, values: [] })),
              ];
    const listed = allSections === undefined ? rows : sectionRows(rows, allSections, section, query.trim() !== "");
    const things = `${channelWord(descriptor.channel).toLowerCase()}s`;
    // As the shared choice field reads it: "mixed", or the default in force when nothing is set.
    const unset = value === undefined && !mixed;
    const prefix = unset ? "default " : "";
    let name = current === undefined ? label : `${label}, ${prefix}${current.plainName}`;
    if (mixed) {
        name = `${label}, mixed`;
    }
    return (
        <Pop
            opened={opened}
            onOpenChange={(open) => {
                setQuery("");
                setSection(startSection);
                setOpened(open);
            }}
        >
            <PopTrigger>
                <Button
                    variant="default"
                    size="compact-xs"
                    fullWidth
                    aria-label={name}
                    data-value-listbox={descriptor.channel}
                    justify="flex-start"
                    className="ws-value-listbox"
                    data-unset={unset ? "" : undefined}
                    leftSection={
                        current?.glyph === undefined ? icons?.[current?.id ?? ""] : <Glyph svg={current.glyph} />
                    }
                >
                    {mixed ? "Mixed" : (current?.plainName ?? "")}
                </Button>
            </PopTrigger>
            <PopPanel
                width={240}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: label }}
                closeLabel={`Close ${label}`}
            >
                {allSections === undefined ? null : (
                    // Inset as the search box under it is (8 px each side).
                    <Box mx={8} mt={8}>
                        <PanelField
                            label={`${label} section`}
                            kind="select"
                            width="fill"
                            data={allSections.map((each) => ({ value: each.name, label: each.name }))}
                            value={section}
                            onChange={(next) => {
                                setSection(String(next));
                            }}
                        />
                    </Box>
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
            </PopPanel>
        </Pop>
    );
}
