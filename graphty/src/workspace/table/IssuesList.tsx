import { ControlSection, EntityChip } from "@graphty/compact-mantine";
import type { DataIssue, FixCode, GraphSession, SourceKey } from "@graphty/graphty-element/session";
import { Button, Text } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { countOf, fixDone, fixLabel, ignoreAll, issueLabel, issuePlace } from "./columns";

/**
 * What a settled issue is said as, once, politely: "families: 1 value made blank".
 * @param session - the element's session, for where the issue is.
 * @param issue - the issue.
 * @param done - what was done, in the past tense.
 * @returns the words.
 */
function settledWords(session: GraphSession, issue: DataIssue, done: string): string {
    return `${issuePlace(issue, session).name}: ${countOf(issue.count, "value")} ${done}`;
}

/**
 * Applies a fix, one undo step, and says so; a refusal says so on the notice.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice.
 * @param issue - the issue.
 * @param fix - the fix.
 */
function applyFix(session: GraphSession, store: WorkspaceStore, issue: DataIssue, fix: FixCode): void {
    const said = settledWords(session, issue, fixDone(fix));
    session.data.fix(issue, fix).then(
        () => {
            store.set({ announcement: said });
        },
        () => {
            store.set({ notice: { message: "Not fixed" } });
        },
    );
}

/**
 * Ignores an issue or brings it back, saved with the project.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice.
 * @param issue - the issue.
 * @param ignored - true to ignore it.
 */
function setIgnored(session: GraphSession, store: WorkspaceStore, issue: DataIssue, ignored: boolean): void {
    const said = settledWords(session, issue, ignored ? "ignored" : "restored");
    session.data.ignoreIssue(issue, ignored).then(
        () => {
            store.set({ announcement: said });
        },
        () => {
            store.set({ notice: { message: "Not changed" } });
        },
    );
}

/**
 * One issue's buttons: the fix the data already shows, pressed (a click keeps it and settles the
 * issue); each other fix the element offers; then Ignore (Restore for an ignored one). A fixed
 * issue shows the fix that settled it, pressed, and nothing to click.
 * @param props - Component props
 * @param props.issue - the issue
 * @returns the buttons
 */
function IssueActions({ issue }: Readonly<{ issue: DataIssue }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    if (session === null) {
        return null;
    }
    const label = issueLabel(issue);
    if (issue.status === "fixed") {
        return issue.fixedBy === undefined ? null : (
            <Button
                size="compact-xs"
                variant="filled"
                aria-pressed
                disabled
                aria-label={`${fixLabel(issue.fixedBy)}: ${label}`}
            >
                {fixLabel(issue.fixedBy)}
            </Button>
        );
    }
    if (issue.ignored) {
        return (
            <Button
                size="compact-xs"
                variant="subtle"
                aria-label={`Restore ${label}`}
                onClick={() => {
                    setIgnored(session, store, issue, false);
                }}
            >
                Restore
            </Button>
        );
    }
    const { current } = issue;
    return (
        <>
            {current === undefined ? null : (
                <Button
                    size="compact-xs"
                    variant="filled"
                    aria-pressed
                    aria-label={`${fixLabel(current)}: ${label}`}
                    onClick={() => {
                        applyFix(session, store, issue, current);
                    }}
                >
                    {fixLabel(current)}
                </Button>
            )}
            {issue.fixes.map((fix) => (
                <Button
                    key={fix}
                    size="compact-xs"
                    variant="default"
                    aria-pressed={false}
                    aria-label={`${fixLabel(fix)}: ${label}`}
                    onClick={() => {
                        applyFix(session, store, issue, fix);
                    }}
                >
                    {fixLabel(fix)}
                </Button>
            ))}
            <Button
                size="compact-xs"
                variant="subtle"
                aria-label={`Ignore ${label}`}
                onClick={() => {
                    setIgnored(session, store, issue, true);
                }}
            >
                Ignore
            </Button>
        </>
    );
}

/** Where an issue is: its table, and the column (or "nodes" or "edges") it is named by. */
interface IssueWhere {
    readonly kind: "node" | "edge";
    readonly name: string;
}

/**
 * One issue's row: the warning icon, where it is as a node or edge chip, its label with the count,
 * its buttons.
 * @param props - Component props
 * @param props.issue - the issue
 * @param props.where - the table and the column, or "nodes" or "edges"
 * @param props.onShowRows - narrows the table to the rows the issue is on (an open issue's "Show rows")
 * @returns the row
 */
export function IssueRow({
    issue,
    where,
    onShowRows,
}: Readonly<{ issue: DataIssue; where?: IssueWhere; onShowRows?: (issue: DataIssue) => void }>): React.JSX.Element {
    return (
        <li
            className="ws-issue"
            data-ignored={issue.ignored ? "" : undefined}
            data-fixed={issue.status === "fixed" ? "" : undefined}
        >
            <GLYPHS.warning size={14} className="ws-issue-icon" aria-hidden />
            {where === undefined ? null : <EntityChip kind={where.kind}>{where.name}</EntityChip>}
            <Text size="sm" className="ws-issue-label">
                {issueLabel(issue)}
            </Text>
            <span className="ws-issue-actions">
                <IssueActions issue={issue} />
                {onShowRows === undefined || issue.ignored || issue.status === "fixed" ? null : (
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        aria-label={`Show rows: ${issueLabel(issue)}`}
                        onClick={() => {
                            onShowRows(issue);
                        }}
                    >
                        Show rows
                    </Button>
                )}
            </span>
        </li>
    );
}

/**
 * A toggle that lists a group of issues again: "Ignored 2", "Resolved 3".
 * @param props - Component props
 * @param props.label - the group's name
 * @param props.count - how many it holds
 * @param props.shown - whether it is listed
 * @param props.onToggle - lists it or stops
 * @returns the toggle, or null for an empty group
 */
function GroupToggle({
    label,
    count,
    shown,
    onToggle,
}: Readonly<{ label: string; count: number; shown: boolean; onToggle: () => void }>): React.JSX.Element | null {
    if (count === 0) {
        return null;
    }
    return (
        <Button size="compact-xs" variant="subtle" aria-pressed={shown} onClick={onToggle}>
            {`${label} ${String(count)}`}
        </Button>
    );
}

/**
 * The maximized table's Issues list (spec section 3.5.3): every issue graphty-element counts,
 * flat, one row each with its table and column as a chip, the fix the data shows pressed, the
 * other fixes and Ignore; at the end "Ignored 2", which lists the ignored ones again with Restore,
 * and "Resolved 3", which lists the fixed ones with the fix that settled each; "Ignore in all columns"
 * ignores every open one as one undo step. Nothing when there is nothing to show. With `source`,
 * only that load's issues: the Sources row's popover draws it so.
 * @param props - Component props
 * @param props.source - lists only this load's issues
 * @returns the section
 */
export function IssuesList({ source }: Readonly<{ source?: SourceKey }> = {}): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [showIgnored, setShowIgnored] = useState(false);
    const [showResolved, setShowResolved] = useState(false);
    if (session === null) {
        return null;
    }
    const all = session.data
        .issues({ includeIgnored: true, includeFixed: true })
        .filter((issue) => source === undefined || issue.source === source);
    const resolved = all.filter((issue) => issue.status === "fixed");
    const open = all.filter((issue) => issue.status !== "fixed" && !issue.ignored);
    const ignored = all.filter((issue) => issue.status !== "fixed" && issue.ignored);
    const row = (issue: DataIssue): React.JSX.Element => {
        const { kind, name } = issuePlace(issue, session);
        return <IssueRow key={issue.id} issue={issue} where={{ kind, name }} />;
    };
    return (
        <ControlSection
            label="Issues"
            empty={all.length === 0}
            actions={
                open.length === 0 ? undefined : (
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => {
                            ignoreAll(session, store, open);
                        }}
                    >
                        Ignore in all columns
                    </Button>
                )
            }
        >
            <ul className="ws-issues" aria-label="Issues">
                {open.map(row)}
                {showIgnored ? ignored.map(row) : null}
            </ul>
            <GroupToggle
                label="Ignored"
                count={ignored.length}
                shown={showIgnored}
                onToggle={() => {
                    setShowIgnored((now) => !now);
                }}
            />
            {showResolved ? (
                <ul className="ws-issues" aria-label="Resolved">
                    {resolved.map(row)}
                </ul>
            ) : null}
            <GroupToggle
                label="Resolved"
                count={resolved.length}
                shown={showResolved}
                onToggle={() => {
                    setShowResolved((now) => !now);
                }}
            />
        </ControlSection>
    );
}
