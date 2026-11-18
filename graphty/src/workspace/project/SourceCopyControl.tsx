import { PopoutManager, SegmentedControl } from "@graphty/compact-mantine";
import type { GraphSession, LoadedSource, SourceCopy, SourceCopyChoice } from "@graphty/graphty-element/session";
import { Group, Input, Stack, Text } from "@mantine/core";
import React from "react";

import { sourceName } from "../data-place/words";
import { sourceReferencesOn } from "../features";
import { SettingsPopout } from "../options/SettingsPopout";
import { useSessionEvents } from "../sessionEvents";
import { useWorkspace } from "../state/WorkspaceContext";
import { noPathWords } from "./words";

/** The element's events after which the choices are read again. */
const COPY_EVENTS = ["source:copy", "project:changed"] as const;

const SECONDARY = "var(--cm-text-secondary)";

/**
 * The two choices, Reference disabled when graphty-element refuses it.
 * @param refused - whether Reference is refused.
 * @returns the segments.
 */
function choices(refused: boolean): { value: SourceCopyChoice; label: string; disabled?: boolean }[] {
    return [
        { value: "copy", label: "Copy" },
        { value: "reference", label: "Reference", disabled: refused },
    ];
}

/**
 * The reader's pick as one of graphty-element's choices.
 * @param value - the segment picked.
 * @returns the choice.
 */
function choiceOf(value: string): SourceCopyChoice {
    return value === "reference" ? "reference" : "copy";
}

/**
 * One data source in the settings pop-over: its name and its own Copy / Reference choice, with
 * graphty-element's reason when it refuses Reference.
 * @param props - Component props
 * @param props.session - the element's session.
 * @param props.entry - what graphty-element said of it (`data.copies()`).
 * @param props.name - its name.
 * @returns the row
 */
function SourceCopyRow({
    session,
    entry,
    name,
}: Readonly<{ session: GraphSession; entry: SourceCopy; name: string }>): React.JSX.Element {
    const refused = entry.refused === undefined ? undefined : noPathWords(entry.refused.params.reason);
    return (
        <Stack gap={2} data-source={entry.source}>
            <Text size="sm" truncate title={name}>
                {name}
            </Text>
            <SegmentedControl
                size="xs"
                label={`Save ${name} as`}
                value={entry.copy}
                data={choices(refused !== undefined)}
                onChange={(next) => {
                    session.data.setCopy(entry.source, choiceOf(next));
                }}
            />
            {refused === undefined ? null : (
                <Text size="xs" c={SECONDARY}>
                    {refused}
                </Text>
            )}
        </Stack>
    );
}

/**
 * How a save keeps the project's data sources (the source references experiment): one Copy /
 * Reference switch for every source graphty-element lets be a reference, and a settings pop-over
 * with each source's own choice. The switch shows neither choice, and "Mixed", when the sources'
 * choices differ. Every fact and every choice is graphty-element's (`data.copies()`,
 * `data.setCopy`); nothing is shown with the experiment off or with no source.
 * @param props - Component props
 * @param props.onSettingsOpen - told when the settings pop-over opens or closes, so the dialog
 *     around it leaves Escape to the pop-over while it is open.
 * @returns the control, or null
 */
export function SourceCopyControl({
    onSettingsOpen,
}: Readonly<{ onSettingsOpen?: (opened: boolean) => void }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionEvents(session, COPY_EVENTS);
    if (session === null || !sourceReferencesOn(session)) {
        return null;
    }
    const copies = session.data.copies();
    if (copies.length === 0) {
        return null;
    }
    const sources = new Map<string, LoadedSource>(session.data.sources().map((each) => [each.key, each]));
    const open = copies.filter((entry) => entry.refused === undefined);
    const shown = new Set(open.map((entry) => entry.copy));
    const mixed = shown.size > 1;
    const nameOf = (entry: SourceCopy): string => {
        const source = sources.get(entry.source);
        return source === undefined ? entry.source : sourceName(source);
    };

    return (
        // The wrapper names the switch only: the pop-over's rows, rendered inside its context
        // through the portal, would otherwise all be named by it too.
        <Group gap="xs" wrap="nowrap" align="flex-end" mt="sm">
            <Input.Wrapper label="Data sources">
                <SegmentedControl
                    size="xs"
                    // Neither segment drawn chosen while the sources' choices differ.
                    value={shown.size === 1 ? [...shown][0] : ""}
                    data={choices(false)}
                    disabled={open.length === 0}
                    onChange={(next) => {
                        for (const entry of open) {
                            session.data.setCopy(entry.source, choiceOf(next));
                        }
                    }}
                />
            </Input.Wrapper>
            {mixed ? (
                <Text size="xs" c={SECONDARY}>
                    Mixed
                </Text>
            ) : null}
            {/* Its own floating layer: the page's is under this dialog. */}
            <PopoutManager>
                <SettingsPopout
                    label="Data source settings"
                    // Beside the gear, away from the switch and its Mixed label.
                    placement="right"
                    changed={copies.some((entry) => entry.copy === "reference")}
                    onOpenChange={onSettingsOpen}
                >
                    <Stack gap="sm">
                        {copies.map((entry) => (
                            <SourceCopyRow key={entry.source} session={session} entry={entry} name={nameOf(entry)} />
                        ))}
                    </Stack>
                </SettingsPopout>
            </PopoutManager>
        </Group>
    );
}
