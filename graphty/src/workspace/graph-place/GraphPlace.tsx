import "./graph-place.css";

import { Anchor, Text, Tooltip } from "@mantine/core";
import React, { useMemo } from "react";

import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { FindBox } from "./FindBox";
import { PaintTree } from "./PaintTree";
import { paintRows } from "./rows";
import { useSessionVersion } from "./useSessionVersion";

/**
 * The footer line's one message: with no graph, "Add data to start"; with a graph and nothing
 * run, "Analyze (Shift+A) to add results here", Analyze a link to the Analyze popover.
 * @param props - Component props
 * @param props.hasGraph - Whether the element holds a node
 * @param props.hasRuns - Whether anything has been run
 * @returns The line, or null when there is nothing to say
 */
function Footer({ hasGraph, hasRuns }: Readonly<{ hasGraph: boolean; hasRuns: boolean }>): React.JSX.Element | null {
    const analyze = useCommand("analyze.open");
    if (!hasGraph) {
        return <Text className="ws-graph-footer">Add data to start</Text>;
    }
    if (hasRuns) {
        return null;
    }
    const key = analyze?.command.keys?.[0] ?? "Shift+A";
    return (
        <Text className="ws-graph-footer">
            {analyze === null ? (
                "Analyze"
            ) : (
                <Anchor component="button" type="button" inherit onClick={analyze.run}>
                    Analyze
                </Anchor>
            )}{" "}
            ({key}) to add results here
        </Text>
    );
}

/**
 * The Graph place (tier1-design.md section 2.5): the graph title line, the find box, the paint
 * tree and one footer line. Everything it shows is read from graphty-element's session.
 * @returns The Graph place
 */
export function GraphPlace(): React.JSX.Element {
    const { session } = useWorkspace();
    const projectName = useWorkspaceState((state) => state.project?.name ?? "");
    const version = useSessionVersion(session);

    const { rows, name, hasGraph } = useMemo(() => {
        void version; // NOSONAR(S3735): reads the change count so the memo runs again on each session change
        return session === null
            ? { rows: [], name: projectName, hasGraph: false }
            : {
                  rows: paintRows(session),
                  name: session.data.source()?.name ?? projectName,
                  hasGraph: session.data.statistics().nodeCount > 0,
              };
    }, [session, version, projectName]);

    return (
        <section className="ws-graph-place" aria-label="Graph place">
            <div className="ws-graph-title">
                <Text span className="ws-graph-title-prefix">
                    Graph
                </Text>
                <Tooltip label={name}>
                    <Text span className="ws-graph-title-name">
                        {name}
                    </Text>
                </Tooltip>
            </div>
            <div className="ws-graph-treebar">
                <FindBox />
            </div>
            {session === null ? null : <PaintTree rows={rows} />}
            <Footer hasGraph={hasGraph} hasRuns={rows.some((row) => row.runId !== undefined)} />
        </section>
    );
}
