import { Popout, PopoutManager } from "@graphty/compact-mantine";
import type { DataIssue } from "@graphty/graphty-element/session";
import { Button, Group, HoverCard, TextInput, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { issueLabel, rolePill, type TableColumnChoice } from "./columns";
import { IssueRow } from "./IssuesList";
import { TYPE_ICONS } from "./typeIcons";

/** What an icon is the size of in a header. */
const ICON = 14;

/**
 * A header's leading icons: the type (a key's key), the role pill when its word is not the
 * column's name (never on a key), the origin (a joined column's link, a computed column's sigma).
 * @param props - Component props
 * @param props.column - the column
 * @returns the icons
 */
export function HeaderIcons({ column }: Readonly<{ column: TableColumnChoice }>): React.JSX.Element {
    const typeName = column.descriptor?.type ?? (column.numeric ? "number" : "category");
    const Type = column.group === "key" ? GLYPHS.key : (TYPE_ICONS[typeName] ?? GLYPHS.mixed);
    const origin = column.group === "result" ? "computed" : column.descriptor?.origin;
    const pill = rolePill(column);
    return (
        <span className="ws-th-icons" data-type={column.descriptor?.type}>
            <Type size={ICON} />
            {pill === undefined ? null : (
                <span className="ws-th-role" data-role={column.role}>
                    {pill}
                </span>
            )}
            {origin === "joined" ? <GLYPHS.joined size={ICON} data-origin="joined" /> : null}
            {origin === "computed" ? <GLYPHS.computed size={ICON} data-origin="computed" /> : null}
        </span>
    );
}

/**
 * The warning on a header: hover shows each issue as a short label with its count, its fixes,
 * Ignore and Show rows, and Ignore all. The header's menu offers the same, for the keyboard and
 * touch; a screen reader hears the warning's name and, as its description, each issue's label,
 * without hovering.
 * @param props - Component props
 * @param props.header - the column's name
 * @param props.issues - the column's issues
 * @param props.onShowRows - narrows the table to the rows one issue is on
 * @param props.onIgnoreAll - ignores every one of the column's issues, one undo step
 * @returns the warning
 */
export function HeaderWarning({
    header,
    issues,
    onShowRows,
    onIgnoreAll,
}: Readonly<{
    header: string;
    issues: readonly DataIssue[];
    onShowRows?: (issue: DataIssue) => void;
    onIgnoreAll?: () => void;
}>): React.JSX.Element {
    const described = useId();
    return (
        <HoverCard openDelay={100} closeDelay={250} position="bottom-start" shadow="md">
            <HoverCard.Target>
                <span // NOSONAR(S6819): a glyph inside a hover target, named by aria-label; an <img> cannot hold the icon component
                    className="ws-th-warning"
                    role="img"
                    aria-label={`Issues in ${header}`}
                    aria-describedby={described}
                >
                    <GLYPHS.warning size={ICON} aria-hidden />
                    <VisuallyHidden id={described}>{issues.map(issueLabel).join(", ")}</VisuallyHidden>
                </span>
            </HoverCard.Target>
            <HoverCard.Dropdown>
                <ul className="ws-issues" aria-label={`Issues in ${header}`}>
                    {issues.map((issue) => (
                        <IssueRow key={issue.id} issue={issue} onShowRows={onShowRows} />
                    ))}
                </ul>
                {onIgnoreAll === undefined ? null : (
                    <Group justify="flex-end" px={4} pt={4}>
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            aria-label={`Ignore all issues in ${header}`}
                            onClick={onIgnoreAll}
                        >
                            Ignore all
                        </Button>
                    </Group>
                )}
            </HoverCard.Dropdown>
        </HoverCard>
    );
}

/**
 * The column's new name, typed in a pop-over under its header: Enter renames, Escape or a click
 * outside cancels.
 * @param props - Component props
 * @param props.name - the name now
 * @param props.onDone - takes the new name, or null to cancel
 * @returns the pop-over
 */
export function RenamePopover({
    name,
    onDone,
}: Readonly<{ name: string; onDone: (name: string | null) => void }>): React.JSX.Element {
    const [text, setText] = useState(name);
    const input = useRef<HTMLInputElement>(null);
    const anchor = useRef<HTMLSpanElement>(null);
    // Focused once the menu that opened it has closed and handed focus back to its header, so the
    // hand-back does not land after it.
    useEffect(() => {
        const timer = setTimeout(() => {
            input.current?.focus();
            input.current?.select();
        }, 0);
        return () => {
            clearTimeout(timer);
        };
    }, []);
    return (
        <>
            <span className="ws-th-anchor" ref={anchor} />
            {/* Opened from the header menu, so there is no Popout.Trigger: the panel docks to the header. */}
            <PopoutManager>
                <Popout
                    opened
                    onOpenChange={(opened) => {
                        if (!opened) {
                            onDone(null);
                        }
                    }}
                >
                    <Popout.Panel
                        width={220}
                        header={{ variant: "title", title: "Rename column" }}
                        anchorX={anchor}
                        anchorY={anchor}
                        placement="bottom"
                    >
                        <Popout.Content>
                            <TextInput
                                size="xs"
                                ref={input}
                                aria-label="Column name"
                                value={text}
                                onChange={(event) => {
                                    setText(event.currentTarget.value);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        onDone(text);
                                    } else if (event.key === "Escape") {
                                        onDone(null);
                                    }
                                }}
                            />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </PopoutManager>
        </>
    );
}
