import { PopoutManager, SegmentedControl } from "@graphty/compact-mantine";
import type { LoadedSource, SourceCopy, SourceCopyChoice, SourceKey } from "@graphty/graphty-element/session";
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

/** The dialog's choices not yet saved, by source: they take effect when its Save is pressed. */
export type PendingCopies = ReadonlyMap<SourceKey, SourceCopyChoice>;

/**
 * One data source in the settings pop-over: its name and its own Copy / Reference choice, with
 * graphty-element's reason when it refuses Reference.
 * @param props - Component props
 * @param props.entry - what graphty-element said of it (`data.copies()`).
 * @param props.value - the choice shown: the dialog's pending one, else graphty-element's.
 * @param props.name - its name.
 * @param props.onPick - told the reader's choice.
 * @returns the row
 */
function SourceCopyRow({
    entry,
    value,
    name,
    onPick,
}: Readonly<{
    entry: SourceCopy;
    value: SourceCopyChoice;
    name: string;
    onPick: (choice: SourceCopyChoice) => void;
}>): React.JSX.Element {
    const refused = entry.refused === undefined ? undefined : noPathWords(entry.refused.params.reason);
    return (
        <Stack gap={2} data-source={entry.source}>
            <Text size="sm" truncate title={name}>
                {name}
            </Text>
            <SegmentedControl
                size="xs"
                label={`Save ${name} as`}
                value={value}
                data={choices(refused !== undefined)}
                onChange={(next) => {
                    onPick(choiceOf(next));
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
 * choices differ. What can be a reference and the saved choices are graphty-element's
 * (`data.copies()`); the reader's picks are the dialog's pending choices until its Save hands them
 * to graphty-element (`applyCopies` in actions.ts), so Cancel leaves the project as it was.
 * Nothing is shown with the experiment off or with no source.
 * @param props - Component props
 * @param props.pending - the dialog's choices not yet saved.
 * @param props.onPending - told the dialog's choices after a pick.
 * @param props.onSettingsOpen - told when the settings pop-over opens or closes, so the dialog
 *     around it leaves Escape to the pop-over while it is open.
 * @returns the control, or null
 */
export function SourceCopyControl({
    pending,
    onPending,
    onSettingsOpen,
}: Readonly<{
    pending: PendingCopies;
    onPending: (next: PendingCopies) => void;
    onSettingsOpen?: (opened: boolean) => void;
}>): React.JSX.Element | null {
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
    const valueOf = (entry: SourceCopy): SourceCopyChoice =>
        entry.refused === undefined ? (pending.get(entry.source) ?? entry.copy) : "copy";
    const shown = new Set(open.map((entry) => valueOf(entry)));
    const pick = (entries: readonly SourceCopy[], choice: SourceCopyChoice): void => {
        const next = new Map(pending);
        for (const entry of entries) {
            next.set(entry.source, choice);
        }
        onPending(next);
    };
    const mixed = shown.size > 1;
    const nameOf = (entry: SourceCopy): string => {
        const source = sources.get(entry.source);
        return source === undefined ? entry.source : sourceName(source);
    };

    return (
        // The wrapper names the switch only: the pop-over's rows, rendered inside its context
        // through the portal, would otherwise all be named by it too.
        <Group gap="xs" wrap="nowrap" align="flex-end" mt="sm">
            <Input.Wrapper
                label="Data sources"
                // Above the switch, where the settings pop-over beside the gear never covers it.
                description={mixed ? "Mixed" : undefined}
            >
                <SegmentedControl
                    size="xs"
                    // Neither segment drawn chosen while the sources' choices differ.
                    value={shown.size === 1 ? [...shown][0] : ""}
                    data={choices(false)}
                    disabled={open.length === 0}
                    onChange={(next) => {
                        pick(open, choiceOf(next));
                    }}
                />
            </Input.Wrapper>
            {/* Its own floating layer: the page's is under this dialog. */}
            <PopoutManager>
                <SettingsPopout
                    label="Data source settings"
                    // Beside the gear, away from the switch.
                    placement="right"
                    changed={copies.some((entry) => valueOf(entry) === "reference")}
                    onOpenChange={onSettingsOpen}
                >
                    <Stack gap="sm">
                        {copies.map((entry) => (
                            <SourceCopyRow
                                key={entry.source}
                                entry={entry}
                                value={valueOf(entry)}
                                name={nameOf(entry)}
                                onPick={(choice) => {
                                    pick([entry], choice);
                                }}
                            />
                        ))}
                    </Stack>
                </SettingsPopout>
            </PopoutManager>
        </Group>
    );
}
