import { ControlSection, DataRow } from "@graphty/compact-mantine";
import { Text } from "@mantine/core";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { leftOutRow, leftOutSentence, loadIndexOf, sourceRowOf } from "./words";

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
 * A Sources row in the inspector. A load's row: what it added and, when it left edge rows out,
 * how many and why, then the left-out rows themselves, which the element keeps with the load
 * (through a save and reopen too). A table child shows what it names: a node table what it added
 * as nodes, an edge table as edges. The left-out child shows its whole load. Every count is the
 * element's (`data.sources()`).
 * @param props - Component props
 * @param props.row - The Sources row id, `source:<load>` or `source:<load>:<child>`
 * @returns The values
 */
export function SourceValues({ row }: Readonly<{ row: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const sources = session?.data.sources() ?? [];
    const load = sources[loadIndexOf(row) ?? -1];
    if (session === null || load === undefined) {
        return (
            <Text size="xs" c="dimmed" p="md">
                This row is gone
            </Text>
        );
    }
    // A table child shows what its table added; a load and its left-out child, the whole load.
    const child = row.split(":").length > 2 ? sourceRowOf(sources, session.data.lastImport(), row)?.kind : undefined;
    const part = child === "nodes" || child === "edges" ? child : "all";
    const { leftOut } = load;
    return (
        <ControlSection label="Added" defaultOpened>
            {part === "edges" ? null : <DataRow stat name="Nodes" value={load.added.nodes} />}
            {part === "nodes" ? null : <DataRow stat name="Edges" value={load.added.edges} />}
            {leftOut === undefined || part !== "all" ? null : (
                <>
                    <Text size="sm" px="md" py={2}>
                        {leftOutSentence(leftOut)}
                    </Text>
                    {/* One wrapping line per row, so a long row reads whole. */}
                    {keyedLines((leftOut.edges ?? []).map((edge) => leftOutRow(edge, leftOut.endColumns))).map(
                        ({ key, line }) => (
                            <Text key={key} size="sm" px="md" py={2}>
                                {line}
                            </Text>
                        ),
                    )}
                </>
            )}
        </ControlSection>
    );
}
