import { ControlSection } from "@graphty/compact-mantine";
import type { Channel, ExplainTarget, GraphSession } from "@graphty/graphty-element/session";
import { Anchor, ColorSwatch, Group, Stack, Text } from "@mantine/core";
import type React from "react";

import { focusInspectorTitle } from "../frame/focus";
import { findTreeRow } from "../graph-place/rows";
import { runName } from "../runWords";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { focusLineNext } from "../style/useFocusLine";
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
    /** The property whose line the link lands on: the color the swatch shows, else the first it wins. */
    readonly channel: Channel | undefined;
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
 * Opens a line's row in the inspector, on its Style tab: the look and the rule that picks what
 * it paints are what the link was followed for. Focus lands on the line of the property the link
 * explains (its Color), on that kind's tab; with no property, or a tab that draws no such line,
 * on the title of the row it opened, as after a find pick.
 * @param store - the chrome store.
 * @param opens - the row.
 * @param channel - the property the link explains, when it names one.
 */
function openRow(store: WorkspaceStore, opens: Resolved, channel?: Channel): void {
    const tab = "style";
    const side = channel === undefined ? {} : ({ styleSide: channel.startsWith("edge.") ? "edge" : "node" } as const);
    if ("run" in opens) {
        store.set({ inspected: { kind: opens.kind, id: opens.run, tab }, ...side });
    } else if (opens.kind === "layer-row") {
        store.set({ inspected: { kind: opens.kind, id: opens.layer, tab }, ...side });
    } else if (opens.kind === "folder-row") {
        store.set({ inspected: { kind: opens.kind, id: opens.row, tab }, ...side });
    } else {
        store.set({ inspected: { kind: opens.kind, tab }, ...side });
    }
    if (channel === undefined) {
        requestAnimationFrame(focusInspectorTitle);
        return;
    }
    // The Style tab hands focus to the line as it draws it; one that drew no such line withdraws
    // the ask, so it never takes focus later, and the title takes it instead.
    focusLineNext(channel);
    requestAnimationFrame(() => {
        if ((document.activeElement?.closest(`[data-line="${channel}"]`) ?? null) === null) {
            focusLineNext(null);
            focusInspectorTitle();
        }
    });
}

/**
 * A link that opens the style tree row holding a layer, on its Style tab, named as Why this look
 * names it ("Louvain / Group 3"); plain text for a layer no row opens.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer
 * @param props.name - the name drawn, when not the row's own
 * @returns The link
 */
export function LayerLink({
    session,
    layer,
    name,
}: Readonly<{ session: GraphSession; layer: string; name?: string }>): React.JSX.Element {
    const { store } = useWorkspace();
    const row = rowOf(session, layer, session.styles.get(layer)?.name ?? layer);
    const shown = name ?? row.name;
    if (row.opens === null) {
        return <>{shown}</>;
    }
    const { opens } = row;
    return (
        <Anchor
            component="button"
            size="xs"
            style={{ verticalAlign: "baseline" }}
            aria-label={`Open ${opens.kind === "folder-row" ? "folder" : "layer"} ${row.name}`}
            onClick={() => {
                openRow(store, opens);
            }}
        >
            {shown}
        </Anchor>
    );
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
            const channels = won.get(contribution.layerId) ?? [];
            const color = hexOf(contribution.values["node.color"] ?? contribution.values["edge.color"]);
            return {
                layerId: contribution.layerId,
                ...rowOf(session, contribution.layerId, contribution.name),
                swatch: color ?? null,
                tokens: channelTokens(channels),
                channel: channels.find((channel) => channel.endsWith(".color")) ?? channels[0],
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
                                        openRow(store, line.opens, line.channel);
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
