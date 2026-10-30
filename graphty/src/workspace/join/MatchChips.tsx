import { EntityChip } from "@graphty/compact-mantine";
import type { JoinChoices, JoinReport } from "@graphty/graphty-element/session";
import { Button, Chip, Menu } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { type JoinShow, shownChips } from "./shownChips";

/** Props for MatchChips. */
interface MatchChipsProps {
    /** The chips row's id: the screen's description. */
    id: string;
    /** The element's counts for the join as chosen. */
    report: JoinReport;
    /** The join as chosen. */
    choices: JoinChoices;
    /** Takes changed choices (Keep first, Keep both). */
    onChange: (choices: JoinChoices) => void;
    /** What a count chip narrows the tables to now. */
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
 * A menu choice that shows whether it is the one in effect, with a check and aria-checked.
 * @param props - Component props
 * @param props.checked - whether it is in effect
 * @param props.onClick - chooses it
 * @param props.children - its words
 * @returns the item
 */
function ChoiceItem({
    checked,
    onClick,
    children,
}: Readonly<{ checked: boolean; onClick: () => void; children: string }>): React.JSX.Element {
    return (
        <Menu.Item
            aria-checked={checked}
            leftSection={checked ? <GLYPHS.check size={14} aria-hidden /> : <span className="jn-check-room" />}
            onClick={onClick}
        >
            {children}
        </Menu.Item>
    );
}

/**
 * A count chip that narrows the tables to what it counts, the table bar's "With issues" chip.
 * @param props - Component props
 * @param props.which - what it narrows to
 * @param props.show - what is narrowed to now
 * @param props.onShow - takes a new Show
 * @param props.children - its words
 * @returns the chip
 */
function CountChip({
    which,
    show,
    onShow,
    children,
}: Readonly<{
    which: JoinShow;
    show: JoinShow;
    onShow: (show: JoinShow) => void;
    children: string;
}>): React.JSX.Element {
    return (
        <Chip
            size="xs"
            checked={show === which}
            onChange={(checked) => {
                onShow(checked ? which : null);
            }}
        >
            {children}
        </Chip>
    );
}

/**
 * The join screen's live counts (spec section 3.6), every number from graphty-element's join
 * report. A count the tables can show is a toggle chip that narrows them to what it counts:
 * matched and no value (the graph's nodes), not in graph (the file's rows). A repeated key opens
 * its menu (Keep first, Keep both, Ignore); the matches Ignore case and Ignore spaces would add are
 * counted on their boxes in the Match row. An edge file reads as edges added, new nodes and nodes updated, which
 * name no rows. A zero count is not drawn.
 * @param props - Component props
 * @param props.id - The row's id
 * @param props.report - The element's counts
 * @param props.choices - The join as chosen
 * @param props.onChange - Takes changed choices
 * @param props.show - What a count chip narrows the tables to now
 * @param props.onShow - Takes a new Show
 * @param props.repeatedIgnored - Whether the repeated-key warning was ignored
 * @param props.onIgnoreRepeated - Ignores it
 * @returns The chips
 */
export function MatchChips({
    id,
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
    const toggles = shownChips(report, choices);
    // Rows with an end the graph lacks: added with a new node, or left out, as the reader chooses.
    const unknownEnds = report.unknownEndRows;
    return (
        <ul className="jn-chips" aria-label="Matches" id={id}>
            {edges ? (
                <>
                    {report.newEdges > 0 ? (
                        <li>
                            <CountChip which="added" show={show} onShow={onShow}>
                                {counted(report.newEdges, "edge added", "edges added")}
                            </CountChip>
                        </li>
                    ) : null}
                    {report.newNodes > 0 ? (
                        <li>
                            <CountChip which="new-end" show={show} onShow={onShow}>
                                {counted(report.newNodes, "new node", "new nodes")}
                            </CountChip>
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
                    {toggles.includes("matched") ? (
                        <CountChip which="matched" show={show} onShow={onShow}>
                            {`${formatNumber(report.matched)} matched`}
                        </CountChip>
                    ) : (
                        <EntityChip kind={kind}>{formatNumber(report.matched)} matched</EntityChip>
                    )}
                </li>
            )}
            {report.notInGraph > 0 ? (
                <li>
                    <CountChip which="not-in-graph" show={show} onShow={onShow}>
                        {`${formatNumber(report.notInGraph)} not in graph`}
                    </CountChip>
                </li>
            ) : null}
            {report.withoutValue > 0 && !edges ? (
                <li>
                    {toggles.includes("without-value") ? (
                        <CountChip which="without-value" show={show} onShow={onShow}>
                            {`${formatNumber(report.withoutValue)} no value`}
                        </CountChip>
                    ) : (
                        <EntityChip kind={kind}>{formatNumber(report.withoutValue)} no value</EntityChip>
                    )}
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
                            <ChoiceItem
                                checked={choices.repeated !== "both"}
                                onClick={() => {
                                    onChange({ ...choices, repeated: "first" });
                                }}
                            >
                                Keep first
                            </ChoiceItem>
                            <ChoiceItem
                                checked={choices.repeated === "both"}
                                onClick={() => {
                                    onChange({ ...choices, repeated: "both" });
                                }}
                            >
                                Keep both
                            </ChoiceItem>
                            <Menu.Item onClick={onIgnoreRepeated}>Ignore</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </li>
            ) : null}
            {edges && unknownEnds > 0 ? (
                <li className="jn-chip" data-warning="">
                    <Menu position="bottom-start" withinPortal>
                        <Menu.Target>
                            <Button
                                size="compact-xs"
                                variant="subtle"
                                color="yellow"
                                leftSection={<GLYPHS.warning size={14} aria-hidden />}
                            >
                                {counted(unknownEnds, "unknown end", "unknown ends")}
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <ChoiceItem
                                checked={choices.unknownEnds !== "leave-out"}
                                onClick={() => {
                                    onChange({ ...choices, unknownEnds: "add" });
                                }}
                            >
                                Add as new nodes
                            </ChoiceItem>
                            <ChoiceItem
                                checked={choices.unknownEnds === "leave-out"}
                                onClick={() => {
                                    onChange({ ...choices, unknownEnds: "leave-out" });
                                }}
                            >
                                Leave those rows out
                            </ChoiceItem>
                        </Menu.Dropdown>
                    </Menu>
                </li>
            ) : null}
        </ul>
    );
}
