import { ControlSection, DataRow, TargetTooltip } from "@graphty/compact-mantine";
import { sourceDescriptors } from "@graphty/graphty-element/catalog";
import { ActionIcon, Text } from "@mantine/core";
import type React from "react";

import { GLYPHS } from "../glyphs";
import { editableSettings, openServerForm, settingsFacts } from "../server/commands";
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
 * @param props.actions - what the section's header holds, if anything
 * @returns the section
 */
function Facts({
    label,
    facts,
    actions,
}: Readonly<{ label: string; facts: readonly SourceFact[]; actions?: React.ReactNode }>): React.JSX.Element | null {
    return facts.length === 0 ? null : (
        <ControlSection label={label} defaultOpened actions={actions}>
            {facts.map(({ name, value }) => (
                <DataRow key={name} stat name={name} value={value} />
            ))}
        </ControlSection>
    );
}

/**
 * A load in the inspector: what it was and when it was retrieved, simple statistics, how a joined
 * table was joined, and the edge rows it left out, which the element keeps with the load (through
 * a save and reopen too). A network load also shows what it connects to and fetches, with an edit
 * control that opens the form filled in. Every fact is the element's; a fact a load does not have
 * draws no row. Never reads a load's `config`, `credential` or `validators`: a network load's
 * settings come only from `sourceSettings`, which is redacted.
 * @param props - Component props
 * @param props.row - The inspected id, `source:<key>`
 * @returns The values
 */
export function SourceValues({ row }: Readonly<{ row: string }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
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
    const settings = editableSettings(session, key);
    const entry = sourceDescriptors().find((each) => each.id === settings?.source);
    const network = settings === undefined || entry === undefined ? undefined : settingsFacts(entry, settings);
    const facts = sourceFacts(load, sources, {
        issues: session.data.issues({ source: key }).length,
        waiting: session.data.pendingSourceLoads().some((each) => each.id === load.loadKey),
        ...(network === undefined ? {} : { settings: network.rows }),
    });
    const { leftOut } = load;
    const edit =
        settings === undefined ? undefined : (
            <TargetTooltip label="Edit source">
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Edit source"
                    onClick={() => {
                        openServerForm(store, settings.source, key);
                    }}
                >
                    <GLYPHS.rename size={14} aria-hidden />
                </ActionIcon>
            </TargetTooltip>
        );
    return (
        <>
            <Facts label="Source" facts={facts.source} actions={edit} />
            {(network?.long ?? []).map(({ name, value }) => (
                <ControlSection key={name} label={name} defaultOpened>
                    <Text size="sm" px="md" py={2} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {value}
                    </Text>
                </ControlSection>
            ))}
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
