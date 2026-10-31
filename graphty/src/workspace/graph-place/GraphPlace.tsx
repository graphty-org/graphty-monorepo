import "./graph-place.css";

import { EllipsizedName } from "@graphty/compact-mantine";
import { Text, UnstyledButton } from "@mantine/core";
import React, { useMemo } from "react";

import { focusInspectorTitle } from "../frame/focus";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { FindBox } from "./FindBox";
import { StyleTree } from "./StyleTree";
import { useSessionVersion } from "./useSessionVersion";

/**
 * The footer line: "Add data to start" while there is no graph, else nothing (the layer list is
 * never empty, and its "+" offers Analyze).
 * @param props - Component props
 * @param props.hasGraph - Whether the element holds a node
 * @returns The line, or null
 */
function Footer({ hasGraph }: Readonly<{ hasGraph: boolean }>): React.JSX.Element | null {
    return hasGraph ? null : <Text className="ws-graph-footer">Add data to start</Text>;
}

/**
 * The Graph place (tier1-design.md section 2.5): the graph title line, the find box, the style
 * tree (tier 3 design section 2.1) and one footer line. Everything it shows is read from graphty-element's session.
 * @returns The Graph place
 */
export function GraphPlace(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const projectName = useWorkspaceState((state) => state.project?.name ?? "");
    const version = useSessionVersion(session);

    const { name, hasGraph } = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so the memo runs again on each session change
        return session === null
            ? { name: projectName, hasGraph: false }
            : {
                  name: session.data.source()?.name ?? projectName,
                  hasGraph: session.data.statistics().nodeCount > 0,
              };
    }, [session, version, projectName]);

    return (
        <section className="ws-graph-place" aria-label="Graph place">
            {/* The graph's own row: it opens the graph in the inspector, as a click on empty
                canvas does, and keeps the selection. */}
            <UnstyledButton
                className="ws-graph-title cm-focus-inside"
                onClick={() => {
                    store.set({ inspected: { kind: "graph" } });
                    // Focus goes to the graph's heading once the inspector draws it, so the
                    // press does something visible even when the graph is already inspected.
                    requestAnimationFrame(focusInspectorTitle);
                }}
            >
                <Text span className="ws-graph-title-prefix">
                    Graph
                </Text>
                {/* The whole name as a tooltip only while it is cut short. */}
                <EllipsizedName name={name} className="ws-graph-title-name" self />
            </UnstyledButton>
            <div className="ws-graph-treebar">
                <FindBox />
            </div>
            {session === null ? null : <StyleTree session={session} />}
            <Footer hasGraph={hasGraph} />
        </section>
    );
}
