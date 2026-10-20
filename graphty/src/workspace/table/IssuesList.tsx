import { ControlSection } from "@graphty/compact-mantine";
import type { DataIssue, FixCode, GraphSession } from "@graphty/graphty-element/session";
import { Button, Text } from "@mantine/core";
import { TriangleAlert } from "lucide-react";
import React, { useState } from "react";

import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { fixLabel, issueLabel, issuePlace } from "./columns";

/**
 * Applies a fix, one undo step; a refusal says so on the notice.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice.
 * @param issue - the issue.
 * @param fix - the fix.
 */
function applyFix(session: GraphSession, store: WorkspaceStore, issue: DataIssue, fix: FixCode): void {
    session.data.fix(issue, fix).catch(() => {
        store.set({ notice: { message: "Not fixed" } });
    });
}

/**
 * Ignores an issue or brings it back, saved with the project.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice.
 * @param issue - the issue.
 * @param ignored - true to ignore it.
 */
function setIgnored(session: GraphSession, store: WorkspaceStore, issue: DataIssue, ignored: boolean): void {
    session.data.ignoreIssue(issue, ignored).catch(() => {
        store.set({ notice: { message: "Not changed" } });
    });
}

/**
 * One issue's buttons: each fix the element offers, then Ignore (Restore for an ignored one).
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
    return (
        <>
            {issue.fixes.map((fix) => (
                <Button
                    key={fix}
                    size="compact-xs"
                    variant="light"
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

/**
 * One issue's row: the warning icon, where it is, its label with the count, its buttons.
 * @param props - Component props
 * @param props.issue - the issue
 * @param props.where - the column, or "nodes" or "edges"
 * @returns the row
 */
export function IssueRow({ issue, where }: Readonly<{ issue: DataIssue; where?: string }>): React.JSX.Element {
    return (
        <li className="ws-issue" data-ignored={issue.ignored ? "" : undefined}>
            <TriangleAlert size={14} className="ws-issue-icon" aria-hidden />
            {where === undefined ? null : (
                <Text size="xs" fw={600} className="ws-issue-where">
                    {where}
                </Text>
            )}
            <Text size="xs" className="ws-issue-label">
                {issueLabel(issue)}
            </Text>
            <span className="ws-issue-actions">
                <IssueActions issue={issue} />
            </span>
        </li>
    );
}

/**
 * The maximized table's Issues list (spec section 3.5.3): every issue graphty-element counts,
 * flat, one row each with its fixes and Ignore; at the end an "Ignored 2" toggle that lists the
 * ignored ones again with Restore. Nothing when there is nothing to show.
 * @returns the section
 */
export function IssuesList(): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [showIgnored, setShowIgnored] = useState(false);
    if (session === null) {
        return null;
    }
    const all = session.data.issues({ includeIgnored: true });
    const open = all.filter((issue) => !issue.ignored);
    const ignored = all.filter((issue) => issue.ignored);
    const row = (issue: DataIssue): React.JSX.Element => (
        <IssueRow key={issue.id} issue={issue} where={issuePlace(issue, session).name} />
    );
    return (
        <ControlSection label="Issues" empty={all.length === 0}>
            <ul className="ws-issues" aria-label="Issues">
                {open.map(row)}
                {showIgnored ? ignored.map(row) : null}
            </ul>
            {ignored.length === 0 ? null : (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    aria-pressed={showIgnored}
                    onClick={() => {
                        setShowIgnored((now) => !now);
                    }}
                >
                    {`Ignored ${String(ignored.length)}`}
                </Button>
            )}
        </ControlSection>
    );
}
