import { ControlSection, DataRow } from "@graphty/compact-mantine";
import { Text } from "@mantine/core";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { leftOutRow, leftOutSentence, type SourceFact, sourceFacts, sourceKeyOf } from "./words";

/**
 * Lines with a key each: the line itself, numbered when it repeats.
 * @param lines - the lines, in order.
 * @returns each with its key.
 */
function keyedLines(lines: readonly string[]): { key: string; line: string }[] {
    const seen = new Map<string, number>();
    return lines.map((line) => {
        const n = (seen.get(line) ?? 0) + 1;
        seen.set(line, n);
        return { key: `${line}#${String(n)}`, line };
    });
}

/**
 * One section of facts, or nothing for none.
 * @param props - Component props
 * @param props.label - the section's name
 * @param props.facts - its rows
 * @returns the section
 */
function Facts({ label, facts }: Readonly<{ label: string; facts: readonly SourceFact[] }>): React.JSX.Element | null {
    return facts.length === 0 ? null : (
        <ControlSection label={label} defaultOpened>
            {facts.map(({ name, value }) => (
                <DataRow key={name} stat name={name} value={value} />
            ))}
        </ControlSection>
    );
}

/**
 * A load in the inspector: what it was and when it was retrieved, simple statistics, how a joined
 * table was joined, and the edge rows it left out, which the element keeps with the load (through
 * a save and reopen too). Every fact is the element's; a fact a load does not have draws no row.
 * Never reads a load's `config`, `credential` or `validators`.
 * @param props - Component props
 * @param props.row - The inspected id, `source:<key>`
 * @returns The values
 */
export function SourceValues({ row }: Readonly<{ row: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const sources = session?.data.sources() ?? [];
    const key = sourceKeyOf(row);
    const load = sources.find((each) => each.key === key);
    if (session === null || load === undefined) {
        return (
            <Text size="xs" c="dimmed" p="md">
                This row is gone
            </Text>
        );
    }
    const facts = sourceFacts(load, sources, {
        columns: session.data.attributes().filter((each) => each.sources?.includes(key)).length,
        issues: session.data.issues().filter((each) => each.source === key).length,
        waiting: session.data.pendingSourceLoads().some((each) => each.id === load.loadKey),
    });
    const { leftOut } = load;
    return (
        <>
            <Facts label="Source" facts={facts.source} />
            <Facts label="Statistics" facts={facts.statistics} />
            <Facts label="Join" facts={facts.join} />
            {leftOut === undefined ? null : (
                <ControlSection label="Left out" defaultOpened>
                    <Text size="sm" px="md" py={2}>
                        {leftOutSentence(leftOut)}
                    </Text>
                    {/* One wrapping line per row, so a long row reads whole. */}
                    {keyedLines((leftOut.edges ?? []).map((edge) => leftOutRow(edge, leftOut.endColumns))).map(
                        ({ key: lineKey, line }) => (
                            <Text key={lineKey} size="sm" px="md" py={2}>
                                {line}
                            </Text>
                        ),
                    )}
                </ControlSection>
            )}
        </>
    );
}
