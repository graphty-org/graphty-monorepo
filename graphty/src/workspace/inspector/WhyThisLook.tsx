import { ControlSection } from "@graphty/compact-mantine";
import type { Channel, ExplainTarget, GraphSession } from "@graphty/graphty-element/session";
import { Anchor, ColorSwatch, Group, Stack, Text } from "@mantine/core";
import type React from "react";

import { focusInspectorTitle } from "../frame/focus";
import { findTreeRow } from "../graph-place/rows";
import { runName } from "../runWords";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import type { Resolved } from "./inspected";
import { hexOf } from "./reads";
import { channelTokens } from "./words";

/** One line: a row that wins at least one property on the element. */
interface WinnerLine {
    readonly layerId: string;
    readonly name: string;
    readonly swatch: string | null;
    readonly tokens: string[];
    readonly opens: Resolved | null;
}

/**
 * What a line names and opens: the style tree row that holds the layer -- the row the reader
 * would click in the Graph place, a run's group among them -- named with the folders that hold
 * it ("Louvain / Group 3"). A layer the tree does not list keeps its source's row: a run's row,
 * or one of the Graph place's built-in rows.
 * @param session - the element's session.
 * @param layerId - the layer.
 * @param fallbackName - the layer's own name, for a layer the tree does not list.
 * @returns the line's name and what its link opens, or null for no link.
 */
function rowOf(
    session: GraphSession,
    layerId: string,
    fallbackName: string,
): { readonly name: string; readonly opens: Resolved | null } {
    const layer = session.styles.get(layerId);
    const found = findTreeRow(session.styles.tree(), layer?.row ?? layerId);
    if (found !== undefined) {
        return {
            name: [...found.folders, found.row].map((row) => row.name).join(" / "),
            opens:
                found.row.kind === "folder"
                    ? { kind: "folder-row", row: found.row.id }
                    : { kind: "layer-row", layer: found.row.id },
        };
    }
    const source = layer?.source;
    if (source?.by === "run") {
        const run = session.runs.get(source.runId);
        return {
            name: run === undefined ? fallbackName : runName(session, run),
            opens: { kind: "run-row", run: source.runId },
        };
    }
    if (source?.by === "element") {
        return {
            name: fallbackName,
            opens: source.reason === "selection" ? { kind: "selection-row" } : { kind: "everything-row" },
        };
    }
    return { name: fallbackName, opens: null };
}

/**
 * Opens a line's row in the inspector.
 * @param store - the chrome store.
 * @param opens - the row.
 */
function openRow(store: WorkspaceStore, opens: Resolved): void {
    if ("run" in opens) {
        store.set({ inspected: { kind: opens.kind, id: opens.run } });
    } else if (opens.kind === "layer-row") {
        store.set({ inspected: { kind: opens.kind, id: opens.layer } });
    } else if (opens.kind === "folder-row") {
        store.set({ inspected: { kind: opens.kind, id: opens.row } });
    } else {
        store.set({ inspected: { kind: opens.kind } });
    }
    // The link goes with the inspector it was in: focus goes to the title of the row it opened,
    // once drawn, as after a find pick.
    requestAnimationFrame(focusInspectorTitle);
}

/**
 * Why one node or edge looks as it does (tier1-design.md section 2.7, "Why this look"): one line
 * per row that wins at least one property on it, highest first, read whole from graphty-element's
 * `styles.explain()`.
 * @param props - Component props
 * @param props.target - The node or edge
 * @returns The section, or nothing when the element cannot explain it
 */
export function WhyThisLook({ target }: Readonly<{ target: ExplainTarget }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    if (session === null) {
        return null;
    }
    let explanation;
    try {
        explanation = session.styles.explain(target);
    } catch {
        // E_BAD_COMMAND: the element is gone (removed between the selection and this read).
        return null;
    }

    const won = new Map<string, Channel[]>();
    for (const { channel, layerId } of explanation.channels) {
        won.set(layerId, [...(won.get(layerId) ?? []), channel]);
    }
    const lines: WinnerLine[] = [...explanation.contributions]
        .reverse()
        .filter((contribution) => won.has(contribution.layerId))
        .map((contribution) => {
            const color = hexOf(contribution.values["node.color"] ?? contribution.values["edge.color"]);
            return {
                layerId: contribution.layerId,
                ...rowOf(session, contribution.layerId, contribution.name),
                swatch: color ?? null,
                tokens: channelTokens(won.get(contribution.layerId) ?? []),
            };
        });

    return (
        <ControlSection label="Why this look" defaultOpened>
            {/* One list item per row: its link names the row, the words after it what it sets. */}
            <Stack component="ul" gap={0} m={0} p={0} style={{ listStyle: "none" }}>
                {lines.map((line) => (
                    <Group
                        component="li"
                        key={line.layerId}
                        gap={6}
                        wrap="nowrap"
                        px="md"
                        py={2}
                        data-testid="why-line"
                    >
                        {line.swatch === null ? (
                            <span style={{ width: 12, flexShrink: 0 }} />
                        ) : (
                            <ColorSwatch color={line.swatch} size={12} withShadow={false} aria-hidden />
                        )}
                        {line.opens === null ? (
                            <Text size="xs">{line.name}</Text>
                        ) : (
                            <Anchor
                                component="button"
                                size="xs"
                                // Says it opens the row, so it is never a second "Everything"
                                // beside the tree row of that name.
                                aria-label={`Open ${line.opens.kind === "folder-row" ? "folder" : "layer"} ${line.name}`}
                                onClick={() => {
                                    if (line.opens !== null) {
                                        openRow(store, line.opens);
                                    }
                                }}
                            >
                                {line.name}
                            </Anchor>
                        )}
                        <Text size="xs" c="dimmed" truncate>
                            {line.tokens.join(", ")}
                        </Text>
                    </Group>
                ))}
            </Stack>
        </ControlSection>
    );
}
