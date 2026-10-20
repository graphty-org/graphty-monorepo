import type { DataIssue } from "@graphty/graphty-element/session";
import { HoverCard, Popover, TextInput } from "@mantine/core";
import { KeyRound, Link, Shapes, Sigma, TriangleAlert } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { ROLE_WORDS, type TableColumnChoice } from "./columns";
import { IssueRow } from "./IssuesList";
import { TYPE_ICONS } from "./typeIcons";

/** What an icon is the size of in a header. */
const ICON = 14;

/**
 * A header's leading icons: the type (a key's key), the role badge, the origin (a joined column's
 * link, a computed column's sigma).
 * @param props - Component props
 * @param props.column - the column
 * @returns the icons
 */
export function HeaderIcons({ column }: Readonly<{ column: TableColumnChoice }>): React.JSX.Element {
    const Type =
        column.group === "key"
            ? KeyRound
            : (TYPE_ICONS[column.descriptor?.type ?? (column.numeric ? "number" : "category")] ?? Shapes);
    const origin = column.group === "result" ? "computed" : column.descriptor?.origin;
    return (
        <span className="ws-th-icons" data-type={column.descriptor?.type}>
            <Type size={ICON} />
            {column.role === undefined ? null : (
                <span className="ws-th-role" data-role={column.role}>
                    {ROLE_WORDS[column.role] ?? column.role}
                </span>
            )}
            {origin === "joined" ? <Link size={ICON} data-origin="joined" /> : null}
            {origin === "computed" ? <Sigma size={ICON} data-origin="computed" /> : null}
        </span>
    );
}

/**
 * The warning on a header: hover shows each issue as a short label with its count, its fixes and
 * Ignore. The header's menu offers the same, for the keyboard.
 * @param props - Component props
 * @param props.header - the column's name
 * @param props.issues - the column's issues
 * @returns the warning
 */
export function HeaderWarning({
    header,
    issues,
}: Readonly<{ header: string; issues: readonly DataIssue[] }>): React.JSX.Element {
    return (
        <HoverCard openDelay={100} closeDelay={250} position="bottom-start" shadow="md">
            <HoverCard.Target>
                <span className="ws-th-warning" role="img" aria-label={`Issues in ${header}`}>
                    <TriangleAlert size={ICON} aria-hidden />
                </span>
            </HoverCard.Target>
            <HoverCard.Dropdown>
                <ul className="ws-issues" aria-label={`Issues in ${header}`}>
                    {issues.map((issue) => (
                        <IssueRow key={issue.id} issue={issue} />
                    ))}
                </ul>
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
        <Popover
            opened
            position="bottom-end"
            onChange={(opened) => {
                if (!opened) {
                    onDone(null);
                }
            }}
        >
            <Popover.Target>
                <span className="ws-th-anchor" />
            </Popover.Target>
            <Popover.Dropdown>
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
            </Popover.Dropdown>
        </Popover>
    );
}
