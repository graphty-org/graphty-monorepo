/**
 * The value picker of a choice property in the Style panel by part (the file-styles experiment): a
 * button showing the value, which opens a named, searchable list ("Search 53 shapes") of every
 * value graphty-element offers for the property, with its own name and picture. The values the
 * graph draws now come first, under "In this graph", each with how many nodes or edges carry it.
 */

import { Popout, type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Button } from "@mantine/core";
import React, { useState } from "react";

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
    return <span aria-hidden dangerouslySetInnerHTML={{ __html: svg }} style={{ display: "inline-flex" }} />;
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
 * The value picker: see the file header.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the property
 * @param props.label - its accessible name, such as "Node shape"
 * @param props.value - the value set here, or undefined
 * @param props.shown - what it draws now, shown while nothing is set
 * @param props.extraChoices - choices listed after the property's own
 * @param props.onPick - writes the value picked
 * @returns The picker
 */
export function ValueListbox({
    session,
    descriptor,
    label,
    value,
    shown,
    extraChoices = [],
    onPick,
}: Readonly<{
    session: GraphSession;
    descriptor: ChannelDescriptor;
    label: string;
    value: unknown;
    shown: unknown;
    extraChoices?: readonly ExtraChoice[];
    onPick: (value: string) => void;
}>): React.JSX.Element {
    const [opened, setOpened] = useState(false);
    const [query, setQuery] = useState("");
    const values = session.catalog.channelValues(descriptor.channel);
    const current = values.find((each) => each.id === (value ?? shown));
    const things = `${channelWord(descriptor.channel).toLowerCase()}s`;
    const name = current === undefined ? label : `${label}, ${current.plainName}`;
    return (
        <Popout
            opened={opened}
            onOpenChange={(open) => {
                setQuery("");
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
                    leftSection={current?.glyph === undefined ? undefined : <Glyph svg={current.glyph} />}
                >
                    {current?.plainName ?? ""}
                </Button>
            </Popout.Trigger>
            <Popout.Panel
                width={240}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: label }}
                closeLabel={`Close ${label}`}
            >
                <QuickActions
                    role="group"
                    aria-label={`${label} values`}
                    placeholder={`Search ${String(values.length)} ${things}`}
                    width={240}
                    height={320}
                    descriptions="end"
                    query={query}
                    onQueryChange={setQuery}
                    actions={opened ? valueRows(session, descriptor, extraChoices) : []}
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
