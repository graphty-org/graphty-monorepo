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
 * (through a save and reopen too). A child row shows what it names: a node table what it added
 * as nodes, an edge table as edges, the left-out row only the rows left out. Every count is the
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
    // A child that names one part of its load shows that part; any other row, the whole load.
    const child = row.split(":").length > 2 ? sourceRowOf(sources, session.data.lastImport(), row)?.kind : undefined;
    const part = child === "nodes" || child === "edges" || child === "left-out" ? child : "all";
    const { leftOut } = load;
    const leftOutLines =
        leftOut === undefined || (part !== "all" && part !== "left-out") ? null : (
            <>
                <Text size="sm" px="md" py={2}>
                    {leftOutSentence(leftOut)}
                </Text>
                {keyedLines((leftOut.edges ?? []).map((edge) => leftOutRow(edge, leftOut.endColumns))).map(
                    ({ key, line }) => (
                        <DataRow key={key} name={line} />
                    ),
                )}
            </>
        );
    if (part === "left-out") {
        return (
            <ControlSection label="Left out" defaultOpened>
                {leftOutLines}
            </ControlSection>
        );
    }
    return (
        <ControlSection label="Added" defaultOpened>
            {part === "edges" ? null : <DataRow stat name="Nodes" value={load.added.nodes} />}
            {part === "nodes" ? null : <DataRow stat name="Edges" value={load.added.edges} />}
            {leftOutLines}
        </ControlSection>
    );
}
