import { ControlSection } from "@graphty/compact-mantine";
import type { Channel, ExplainTarget, GraphSession } from "@graphty/graphty-element/session";
import { Anchor, ColorSwatch, Group, Stack, Text } from "@mantine/core";
import type React from "react";

import { focusInspectorTitle } from "../frame/focus";
import { findTreeRow } from "../graph-place/rows";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { focusLineNext } from "../style/useFocusLine";
import { hidden, paintedHex } from "./reads";
import { channelTokens } from "./words";

/** What a line's link opens: the style tree row holding the layer, or Everything for the element's own. */
type Opens = { readonly kind: "layer-row"; readonly layer: string } | { readonly kind: "everything-row" };

/** One line: a row that wins at least one property on the element. */
interface WinnerLine {
    readonly layerId: string;
    readonly name: string;
    readonly swatch: string | null;
    readonly tokens: string[];
    readonly opens: Opens;
    /** The property whose line the link lands on: the color the swatch shows, else the first it wins. */
    readonly channel: Channel;
}

/**
 * What a line names and opens: the style tree row that holds the layer -- the row the reader
 * would click in the Graph place -- named with the folders that hold it ("Louvain / Group 3").
 * The tree lists every layer but the element's own (they are locked: its defaults and hover
 * halos), which open the Everything row.
 * @param session - the element's session.
 * @param layerId - the layer.
 * @param fallbackName - the layer's own name, for a layer the tree does not list.
 * @returns the line's name and what its link opens.
 */
function rowOf(
    session: GraphSession,
    layerId: string,
    fallbackName: string,
): { readonly name: string; readonly opens: Opens } {
    const layer = session.styles.get(layerId);
    const found = findTreeRow(session.styles.tree(), layer?.row ?? layerId);
    if (found !== undefined) {
        return {
            name: [...found.folders, found.row].map((row) => row.name).join(" / "),
            opens: { kind: "layer-row", layer: found.row.id },
        };
    }
    return { name: fallbackName, opens: { kind: "everything-row" } };
}

/**
 * Opens a line's row in the inspector, on its Style tab: the look and the rule that picks what
 * it paints are what the link was followed for. Focus lands on the line of the property the link
 * explains (its Color), on that kind's tab; on a tab that draws no such line, on the title of the
 * row it opened, as after a find pick.
 * @param session - the element's session the row is in.
 * @param store - the chrome store.
 * @param opens - the row.
 * @param channel - the property the link explains.
 */
function openRow(session: GraphSession, store: WorkspaceStore, opens: Opens, channel: Channel): void {
    const tab = "style";
    store.set({
        inspected: opens.kind === "layer-row" ? { kind: opens.kind, id: opens.layer, tab } : { kind: opens.kind, tab },
        styleSide: channel.startsWith("edge.") ? "edge" : "node",
    });
    // The Style tab hands focus to the line as it draws it; one that drew no such line withdraws
    // the ask, so it never takes focus later, and the title takes it instead.
    focusLineNext(session, channel);
    requestAnimationFrame(() => {
        if ((document.activeElement?.closest(`[data-line="${channel}"]`) ?? null) === null) {
            focusLineNext(session, null);
            focusInspectorTitle();
        }
    });
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
    } catch (error) {
        // E_BAD_COMMAND: the element is gone (removed between the selection and this read).
        hidden("styles.explain", error, "E_BAD_COMMAND");
        return null;
    }

    const won = new Map<string, [Channel, ...Channel[]]>();
    for (const { channel, layerId } of explanation.channels) {
        const had = won.get(layerId);
        won.set(layerId, had === undefined ? [channel] : [...had, channel]);
    }
    const lines: WinnerLine[] = [...explanation.contributions].reverse().flatMap((contribution) => {
        const channels = won.get(contribution.layerId);
        if (channels === undefined) {
            return [];
        }
        const color = paintedHex(contribution.values["node.color"] ?? contribution.values["edge.color"]);
        return [
            {
                layerId: contribution.layerId,
                ...rowOf(session, contribution.layerId, contribution.name),
                swatch: color ?? null,
                tokens: channelTokens(channels),
                channel: channels.find((channel) => channel.endsWith(".color")) ?? channels[0],
            },
        ];
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
                        <Anchor
                            component="button"
                            size="xs"
                            // Says it opens the row, so it is never a second "Everything"
                            // beside the tree row of that name.
                            aria-label={`Open layer ${line.name}`}
                            onClick={() => {
                                openRow(session, store, line.opens, line.channel);
                            }}
                        >
                            {line.name}
                        </Anchor>
                        <Text size="xs" c="dimmed" truncate>
                            {line.tokens.join(", ")}
                        </Text>
                    </Group>
                ))}
            </Stack>
        </ControlSection>
    );
}
