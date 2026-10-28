import { EntityChip } from "@graphty/compact-mantine";
import type { JoinChoices, JoinReport } from "@graphty/graphty-element/session";
import { Button, Menu } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";

/** Which rows a Show button narrows a table to. */
export type JoinShow = "not-in-graph" | "without-value" | null;

/** Props for MatchChips. */
interface MatchChipsProps {
    /** The element's counts for the join as chosen. */
    report: JoinReport;
    /** The join as chosen. */
    choices: JoinChoices;
    /** Takes changed choices (Use, Keep first, Keep both). */
    onChange: (choices: JoinChoices) => void;
    /** What a Show button narrows the tables to now. */
    show: JoinShow;
    /** Takes a new Show. */
    onShow: (show: JoinShow) => void;
    /** Whether the repeated-key warning was ignored. */
    repeatedIgnored: boolean;
    /** Ignores the repeated-key warning. */
    onIgnoreRepeated: () => void;
}

/**
 * A count with its noun, singular for one.
 * @param count - the count.
 * @param one - the noun for one.
 * @param many - the noun for more.
 * @returns the words, such as "1 repeated key".
 */
function counted(count: number, one: string, many: string): string {
    return `${formatNumber(count)} ${count === 1 ? one : many}`;
}

/**
 * A chip's Show button: pressed while its rows are shown.
 * @param props - Component props
 * @param props.which - the rows it shows
 * @param props.show - what is shown now
 * @param props.onShow - takes a new Show
 * @param props.what - what it shows, for its name
 * @returns the button
 */
function ShowButton({
    which,
    show,
    onShow,
    what,
}: Readonly<{ which: JoinShow; show: JoinShow; onShow: (show: JoinShow) => void; what: string }>): React.JSX.Element {
    const on = show === which;
    return (
        <Button
            size="compact-xs"
            variant={on ? "light" : "subtle"}
            aria-pressed={on}
            aria-label={`Show ${what}`}
            onClick={() => {
                onShow(on ? null : which);
            }}
        >
            Show
        </Button>
    );
}

/**
 * A chip's Use button: matches with case or spaces ignored.
 * @param props - Component props
 * @param props.what - "case" or "spaces"
 * @param props.onUse - turns it on
 * @returns the button
 */
function UseButton({ what, onUse }: Readonly<{ what: string; onUse: () => void }>): React.JSX.Element {
    return (
        <Button size="compact-xs" variant="subtle" aria-label={`Use ignoring ${what}`} onClick={onUse}>
            Use
        </Button>
    );
}

/**
 * The join screen's live counts (spec section 3.6), every number from graphty-element's join
 * report: matched, not in graph, nodes with no value (each with Show), a repeated key (its menu:
 * Keep first, Keep both, Ignore), and the matches ignoring case or spaces would add (with Use). An
 * edge file reads as edges added, new nodes and nodes updated. A zero count is not drawn.
 * @param props - Component props
 * @param props.report - The element's counts
 * @param props.choices - The join as chosen
 * @param props.onChange - Takes changed choices
 * @param props.show - What a Show button narrows the tables to now
 * @param props.onShow - Takes a new Show
 * @param props.repeatedIgnored - Whether the repeated-key warning was ignored
 * @param props.onIgnoreRepeated - Ignores it
 * @returns The chips
 */
export function MatchChips({
    report,
    choices,
    onChange,
    show,
    onShow,
    repeatedIgnored,
    onIgnoreRepeated,
}: Readonly<MatchChipsProps>): React.JSX.Element {
    const shape = choices.shape ?? "node-values";
    const edges = shape === "edges";
    const kind = shape === "edge-values" ? "edge" : "node";
    return (
        <ul className="jn-chips" aria-label="Matches">
            {edges ? (
                <>
                    {report.newEdges > 0 ? (
                        <li>
                            <EntityChip kind="edge">{counted(report.newEdges, "edge added", "edges added")}</EntityChip>
                        </li>
                    ) : null}
                    {report.newNodes > 0 ? (
                        <li>
                            <EntityChip kind="node">{counted(report.newNodes, "new node", "new nodes")}</EntityChip>
                        </li>
                    ) : null}
                    {report.updatedNodes > 0 ? (
                        <li>
                            <EntityChip kind="node">
                                {counted(report.updatedNodes, "node updated", "nodes updated")}
                            </EntityChip>
                        </li>
                    ) : null}
                </>
            ) : (
                <li>
                    <EntityChip kind={kind}>{formatNumber(report.matched)} matched</EntityChip>
                </li>
            )}
            {report.notInGraph > 0 ? (
                <li className="jn-chip">
                    <span>{formatNumber(report.notInGraph)} not in graph</span>
                    <ShowButton which="not-in-graph" show={show} onShow={onShow} what="rows not in graph" />
                </li>
            ) : null}
            {report.withoutValue > 0 && !edges ? (
                <li className="jn-chip">
                    <EntityChip kind={kind}>{formatNumber(report.withoutValue)} no value</EntityChip>
                    {kind === "node" ? (
                        <ShowButton which="without-value" show={show} onShow={onShow} what="nodes with no value" />
                    ) : null}
                </li>
            ) : null}
            {report.repeatedKeys > 0 && !repeatedIgnored ? (
                <li className="jn-chip" data-warning="">
                    <Menu position="bottom-start" withinPortal>
                        <Menu.Target>
                            <Button
                                size="compact-xs"
                                variant="subtle"
                                color="yellow"
                                leftSection={<GLYPHS.warning size={14} aria-hidden />}
                            >
                                {counted(report.repeatedKeys, "repeated key", "repeated keys")}
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item
                                aria-checked={choices.repeated !== "both"}
                                onClick={() => {
                                    onChange({ ...choices, repeated: "first" });
                                }}
                            >
                                Keep first
                            </Menu.Item>
                            <Menu.Item
                                aria-checked={choices.repeated === "both"}
                                onClick={() => {
                                    onChange({ ...choices, repeated: "both" });
                                }}
                            >
                                Keep both
                            </Menu.Item>
                            <Menu.Item onClick={onIgnoreRepeated}>Ignore</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </li>
            ) : null}
            {report.extraIgnoringCase > 0 ? (
                <li className="jn-chip">
                    <span>+{formatNumber(report.extraIgnoringCase)} ignoring case</span>
                    <UseButton
                        what="case"
                        onUse={() => {
                            onChange({ ...choices, ignoreCase: true });
                        }}
                    />
                </li>
            ) : null}
            {report.extraIgnoringSpaces > 0 ? (
                <li className="jn-chip">
                    <span>+{formatNumber(report.extraIgnoringSpaces)} ignoring spaces</span>
                    <UseButton
                        what="spaces"
                        onUse={() => {
                            onChange({ ...choices, ignoreSpaces: true });
                        }}
                    />
                </li>
            ) : null}
        </ul>
    );
}
