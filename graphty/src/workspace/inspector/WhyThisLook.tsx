import { ControlSection } from "@graphty/compact-mantine";
import type { Channel, ExplainTarget, LayerSource } from "@graphty/graphty-element/session";
import { Anchor, ColorSwatch, Group, Text } from "@mantine/core";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import type { Resolved } from "./inspected";
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
 * The row a layer belongs to, for the line's link: a run's row, or one of the Graph place's
 * built-in rows. A layer someone wrote by hand has no row in tier 1.
 * @param source - the layer's source.
 * @returns what the link opens, or null.
 */
function rowOf(source: LayerSource | undefined): Resolved | null {
    if (source?.by === "run") {
        return { kind: "run-row", run: source.runId };
    }
    if (source?.by === "element") {
        return source.reason === "selection" ? { kind: "selection-row" } : { kind: "everything-row" };
    }
    return null;
}

/**
 * Why one node or edge looks as it does (tier1-design.md section 2.7, "Why this look"): one line
 * per row that wins at least one property on it, highest first, read whole from graphty-element's
 * `styles.explain()`.
 * @param props - Component props
 * @param props.target - The node or edge
 * @returns The section, or nothing when the element cannot explain it
 */
export function WhyThisLook({ target }: { target: ExplainTarget }): React.JSX.Element | null {
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
            const color = contribution.values["node.color"] ?? contribution.values["edge.color"];
            return {
                layerId: contribution.layerId,
                name: contribution.name,
                swatch: typeof color === "string" ? color : null,
                tokens: channelTokens(won.get(contribution.layerId) ?? []),
                opens: rowOf(session.styles.get(contribution.layerId)?.source),
            };
        });

    return (
        <ControlSection label="Why this look" defaultOpened>
            {lines.map((line) => (
                <Group key={line.layerId} gap={6} wrap="nowrap" px="md" py={2} data-testid="why-line">
                    {line.swatch === null ? (
                        <span style={{ width: 12 }} />
                    ) : (
                        <ColorSwatch color={line.swatch} size={12} withShadow={false} aria-hidden />
                    )}
                    {line.opens === null ? (
                        <Text size="xs">{line.name}</Text>
                    ) : (
                        <Anchor
                            component="button"
                            size="xs"
                            onClick={() => {
                                const {opens} = line;
                                if (opens !== null && "run" in opens) {
                                    store.set({ inspected: { kind: opens.kind, id: opens.run } });
                                } else if (opens !== null) {
                                    store.set({ inspected: { kind: opens.kind } });
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
        </ControlSection>
    );
}
