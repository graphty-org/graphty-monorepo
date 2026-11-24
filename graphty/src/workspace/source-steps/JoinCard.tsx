import "./source-steps.css";

import { ComboInput, SegmentedControl } from "@graphty/compact-mantine";
import { DEFAULT_BRANCH_PALETTE, type GraphSession, type SourceColumnProfile } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Kbd, Radio, Select, Stack, Switch, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useRef } from "react";

import { sourceName } from "../data-place/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { ariaKey, formatKey } from "../keys/keys";
import { useSessionEvents } from "../sessionEvents";
import type { JoinCardState, JoinField1 } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { cancelCard, commitCard } from "./actions";
import { CancelButton } from "./CancelButton";
import {
    field1Profile,
    field2Profile,
    holdsNodes,
    joinCardOf,
    joinCounts,
    sourceColumns,
    spaceChoices,
    swapped,
    updateJoin,
} from "./join";
import { JoinPreview } from "./JoinPreview";
import { COMMIT_KEY, PREVIEW_KEY } from "./keys";
import { canPreview, openDraft, setChoice, startPreview } from "./preview";
import { cellWords, COUNT_WORDS, distinctWords, editTitleWords, JOIN_WORDS, moreWords, PREVIEW_WORDS } from "./words";

/** The element's events after which the card reads its draft again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/** Field 1's Field value for the space's own key. */
const KEY_VALUE = "key";

/**
 * A field's distinct count and first samples, and how many more values it holds.
 * @param props - Component props
 * @param props.profile - the field's profile, from the element
 * @param props.label - whose samples, for the accessible name
 * @returns the line
 */
function Samples({
    profile,
    label,
}: Readonly<{ profile: SourceColumnProfile | null; label: string }>): React.JSX.Element | null {
    if (profile === null) {
        return null;
    }
    const more = profile.distinct - profile.samples.length;
    return (
        <Group gap={6} wrap="wrap" aria-label={`${label} ${JOIN_WORDS.samples.toLowerCase()}`}>
            <Text size="xs">{distinctWords(profile.distinct)}</Text>
            {profile.samples.map((sample) => (
                <Text key={String(sample)} size="xs" c="dimmed">
                    {cellWords(sample)}
                </Text>
            ))}
            {more > 0 ? (
                <Text size="xs" c="dimmed">
                    {`+${formatNumber(more)}`}
                </Text>
            ) : null}
        </Group>
    );
}

/**
 * A select whose picks the card writes.
 * @param props - Component props
 * @param props.name - its accessible name
 * @param props.data - its choices
 * @param props.value - the choice now, or null
 * @param props.onPick - takes a pick
 * @returns the select
 */
function Pick({
    name,
    data,
    value,
    onPick,
}: Readonly<{
    name: string;
    data: readonly { readonly value: string; readonly label: string }[];
    value: string | null;
    onPick: (value: string) => void;
}>): React.JSX.Element {
    return (
        <Select
            size="xs"
            aria-label={name}
            placeholder={name.replace(/^Field \d /, "")}
            allowDeselect={false}
            data={data.map((each) => ({ ...each }))}
            value={value}
            onChange={(next) => {
                if (next !== null && next !== value) {
                    onPick(next);
                }
            }}
        />
    );
}

/**
 * Field 1's Field select value: Key, or the source and column it names.
 * @param field - Field 1.
 * @returns the value.
 */
function field1Value(field: JoinField1): string {
    return field.field === undefined || field.source === undefined
        ? KEY_VALUE
        : JSON.stringify([field.source, field.field]);
}

/**
 * Field 1: the nodes already in the graph, by their space (named as the Type), matched on their
 * Key or on a column of a source that supplied them.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card's picks
 * @returns the rows
 */
function Field1({ session, card }: Readonly<{ session: GraphSession; card: JoinCardState }>): React.JSX.Element {
    const { store } = useWorkspace();
    const { field1 } = card;
    const built = session.data.sources();
    const filled = new Set(
        session.data
            .spaces()
            .filter((row) => row.nodes > 0)
            .map((row) => row.space),
    );
    const spaces = spaceChoices(session).filter((choice) => filled.has(choice.value));
    const row = session.data.spaces().find((each) => each.space === field1?.space);
    const suppliers = built.filter((source) => row?.sources.includes(source.key) === true);
    const columns = suppliers.flatMap((source) =>
        sourceColumns(session, source.key, "nodes").map((column) => ({
            value: JSON.stringify([source.key, column]),
            label: suppliers.length > 1 ? `${column} (${sourceName(source)})` : column,
        })),
    );
    const fieldValue = field1 === null ? null : field1Value(field1);
    return (
        <fieldset className="ss-field">
            <Text component="legend" size="xs" fw={600}>
                {JOIN_WORDS.field1}
            </Text>
            <Pick
                name={`${JOIN_WORDS.field1} ${JOIN_WORDS.type.toLowerCase()}`}
                data={spaces}
                value={field1?.space ?? null}
                onPick={(space) => {
                    updateJoin(store, { field1: { space } }, session);
                }}
            />
            {field1 === null ? null : (
                <Pick
                    name={`${JOIN_WORDS.field1} ${JOIN_WORDS.field.toLowerCase()}`}
                    data={[{ value: KEY_VALUE, label: JOIN_WORDS.key }, ...columns]}
                    value={fieldValue}
                    onPick={(value) => {
                        if (value === KEY_VALUE) {
                            updateJoin(store, { field1: { space: field1.space } }, session);
                            return;
                        }
                        const [source, field] = JSON.parse(value) as [string, string];
                        updateJoin(store, { field1: { space: field1.space, source, field } }, session);
                    }}
                />
            )}
            <Samples profile={field1Profile(session, field1)} label={JOIN_WORDS.field1} />
        </fieldset>
    );
}

/**
 * Field 2: the incoming source and its field.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card's picks
 * @returns the rows
 */
function Field2({ session, card }: Readonly<{ session: GraphSession; card: JoinCardState }>): React.JSX.Element {
    const { store } = useWorkspace();
    const { field2 } = card;
    const sources = [...session.data.staged(), ...session.data.sources()].map((source) => ({
        value: source.key,
        label: sourceName(source),
    }));
    return (
        <fieldset className="ss-field">
            <Text component="legend" size="xs" fw={600}>
                {JOIN_WORDS.field2}
            </Text>
            <Pick
                name={`${JOIN_WORDS.field2} ${JOIN_WORDS.source.toLowerCase()}`}
                data={sources}
                value={field2?.source ?? null}
                onPick={(source) => {
                    updateJoin(store, { field2: { source } }, session);
                }}
            />
            {field2 === null ? null : (
                <Pick
                    name={`${JOIN_WORDS.field2} ${JOIN_WORDS.field.toLowerCase()}`}
                    data={sourceColumns(session, field2.source).map((column) => ({ value: column, label: column }))}
                    value={field2.field ?? null}
                    onPick={(field) => {
                        updateJoin(store, { field2: { source: field2.source, field } }, session);
                    }}
                />
            )}
            <Samples profile={field2Profile(session, field2)} label={JOIN_WORDS.field2} />
        </fieldset>
    );
}

/**
 * The six live counts and the Ignore case / Ignore spaces switches with how many more keys each
 * would match, all from `data.matchCounts`.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card's picks
 * @returns the counts, or nothing while a field is unpicked
 */
function Counts({ session, card }: Readonly<{ session: GraphSession; card: JoinCardState }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const counts = joinCounts(session, card);
    if (counts === null) {
        return null;
    }
    const toggles = [
        { id: "ignoreCase", label: JOIN_WORDS.ignoreCase, on: card.ignoreCase, more: counts.moreWithIgnoreCase },
        {
            id: "ignoreSpaces",
            label: JOIN_WORDS.ignoreSpaces,
            on: card.ignoreSpaces,
            more: counts.moreWithIgnoreSpaces,
        },
    ] as const;
    return (
        <Stack gap={4}>
            {/* A term and its number, so a screen reader says which count each number is; drawn
                number first. */}
            <dl className="ss-counts">
                {COUNT_WORDS.map(({ id, label }) => (
                    <div key={id} className="ss-count">
                        <Text component="dt" size="xs" c="dimmed">
                            {label}
                        </Text>
                        <Text component="dd" size="xs" fw={600}>
                            {formatNumber(counts[id])}
                        </Text>
                    </div>
                ))}
            </dl>
            {toggles.map((toggle) => {
                const more = moreWords(toggle.more);
                return (
                    <Group key={toggle.id} gap={6} wrap="nowrap">
                        <Switch
                            size="xs"
                            label={toggle.label}
                            checked={toggle.on}
                            onChange={(event) => {
                                setChoice(store, session, { [toggle.id]: event.currentTarget.checked });
                            }}
                        />
                        {more === null ? null : (
                            <Text size="xs" c="dimmed" aria-label={`${toggle.label} more`}>
                                {more}
                            </Text>
                        )}
                    </Group>
                );
            })}
        </Stack>
    );
}

/**
 * The act: Make an edge (with its edge type and direction) or Merge 2 into 1, neither picked until
 * the reader picks one. Both need node rows in source 2 (`E_STEP_NEEDS_NODES`).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card's picks
 * @returns the radio group
 */
function Act({ session, card }: Readonly<{ session: GraphSession; card: JoinCardState }>): React.JSX.Element {
    const { store } = useWorkspace();
    const source = card.field2?.source;
    const needsNodes = source !== undefined && !holdsNodes(session, source);
    const edgeTypes = session.data
        .types()
        .filter((type) => type.kind === "edge")
        .map((type) => ({ value: type.name }));
    return (
        <Stack gap={4}>
            <Radio.Group
                size="xs"
                label={
                    <Group gap={6} component="span">
                        <span>{JOIN_WORDS.act}</span>
                        {needsNodes ? (
                            <Text component="span" size="xs" c="dimmed">
                                {JOIN_WORDS.needsNodes}
                            </Text>
                        ) : null}
                    </Group>
                }
                value={card.act}
                onChange={(value) => {
                    updateJoin(store, { act: value === "merge" ? "merge" : "edge" }, session);
                }}
            >
                <Stack gap={4} mt={4}>
                    <Radio size="xs" value="edge" label={JOIN_WORDS.edge} disabled={needsNodes} />
                    <Radio size="xs" value="merge" label={JOIN_WORDS.merge} disabled={needsNodes} />
                </Stack>
            </Radio.Group>
            {card.act === "edge" && !needsNodes ? (
                <Group gap={6} wrap="nowrap">
                    <ComboInput
                        label={JOIN_WORDS.edgeType}
                        width="100%"
                        variant="outlined"
                        placeholder={JOIN_WORDS.edgeType}
                        options={edgeTypes}
                        value={card.edgeType}
                        onChange={(next) => {
                            updateJoin(store, { edgeType: String(next).trim() }, session);
                        }}
                    />
                    <SegmentedControl
                        size="xs"
                        aria-label={JOIN_WORDS.direction}
                        value={card.reversed ? "21" : "12"}
                        data={[
                            { value: "12", label: JOIN_WORDS.oneToTwo },
                            { value: "21", label: JOIN_WORDS.twoToOne },
                        ]}
                        onChange={(value) => {
                            updateJoin(store, { reversed: value === "21" }, session);
                        }}
                    />
                </Group>
            ) : null}
        </Stack>
    );
}

/**
 * The Join card (design 5.2, the source-steps experiment): Field 1 in the graph, a swap, Field 2
 * incoming, the live counts once both are picked, and the act. Nothing is written while it is
 * open; Cancel (Esc) closes it.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card's picks
 * @returns the card
 */
export function JoinCard({
    session,
    card,
}: Readonly<{ session: GraphSession; card: JoinCardState }>): React.JSX.Element {
    const { store } = useWorkspace();
    const form = useRef<HTMLFormElement>(null);
    useEffect(() => {
        form.current?.querySelector<HTMLElement>("input")?.focus();
    }, []);
    // The draft's acts and Before / After change what the preview reads.
    useSessionEvents(session, DRAFT_EVENTS);
    // A draft gone by any door (a project opened, the graph cleared) leaves nothing to commit: the
    // card picks again.
    useEffect(
        () =>
            session.on("data:draft-changed", () => {
                const now = joinCardOf(store.get().sourceCard);
                if (now !== null && now.preview !== null && openDraft(session) === null) {
                    store.set({ sourceCard: { ...now, preview: null, drill: null } });
                }
            }),
        [session, store],
    );
    const swap = swapped(session, card);
    const previewing = card.preview !== null;
    // The join preview, drawn by graphty-element while the draft is drawn: Commit, Esc and closing
    // the card take it off. In the selection branches' first two colors: merged, then new.
    const drawn = previewing && openDraft(session)?.displayed === true;
    useEffect(() => {
        if (!drawn) {
            return undefined;
        }
        const [merged, added] = session.scope.options.branchPalette ?? DEFAULT_BRANCH_PALETTE;
        const view = session.styles.showDraft({ merged, new: added });
        return () => {
            view.end();
        };
    }, [drawn, session]);
    // Editing a committed step, the card names it, so the reader knows which step is open.
    const edited = card.editing === null ? undefined : session.data.steps()[card.editing];
    const editedSource =
        edited === undefined
            ? undefined
            : session.data.sources({ staged: true }).find((each) => each.key === edited.source);
    const title =
        edited === undefined
            ? JOIN_WORDS.join
            : editTitleWords(edited, editedSource === undefined ? edited.source : sourceName(editedSource));
    const cancel = (): void => {
        cancelCard(store, session);
    };
    return (
        <form // eslint-disable-line jsx-a11y/no-noninteractive-element-interactions -- catches Esc bubbling from the card's own controls to cancel it
            ref={form}
            className="ss-card ss-join"
            aria-label={title}
            onSubmit={(event) => {
                // Enter in a field submits a form: only the Commit button and the window's Enter commit.
                event.preventDefault();
            }}
            onKeyDown={(event) => {
                // An open select's Esc closes its list, not the card.
                const open = (event.target as HTMLElement).getAttribute("aria-expanded") === "true";
                if (event.key === "Escape" && !event.defaultPrevented && !open) {
                    event.preventDefault();
                    event.stopPropagation();
                    cancel();
                }
            }}
        >
            <Stack gap={6}>
                {edited === undefined ? null : (
                    <Text size="xs" fw={600}>
                        {title}
                    </Text>
                )}
                <Field1 session={session} card={card} />
                <Group justify="center">
                    <Tooltip label={JOIN_WORDS.swap}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={JOIN_WORDS.swap}
                            disabled={swap === null}
                            onClick={() => {
                                if (swap !== null) {
                                    updateJoin(store, swap, session);
                                }
                            }}
                        >
                            <GLYPHS.swap size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Group>
                <Field2 session={session} card={card} />
                <Counts session={session} card={card} />
                <Act session={session} card={card} />
                <JoinPreview session={session} card={card} />
                <Group gap={6} justify="flex-end">
                    <CancelButton onClick={cancel} />
                    {/* Keyed apart: the click that starts the preview must not land on Commit, as it
                        would if React reused this one button for both. */}
                    {previewing ? (
                        <Button
                            key="commit"
                            size="compact-xs"
                            onClick={() => {
                                void commitCard(store, session);
                            }}
                            rightSection={<Kbd size="xs">{formatKey(COMMIT_KEY)}</Kbd>}
                            aria-keyshortcuts={ariaKey(COMMIT_KEY)}
                        >
                            {PREVIEW_WORDS.commit}
                        </Button>
                    ) : (
                        <Button
                            key="preview"
                            size="compact-xs"
                            disabled={!canPreview(card)}
                            rightSection={<Kbd size="xs">{formatKey(PREVIEW_KEY)}</Kbd>}
                            aria-keyshortcuts={ariaKey(PREVIEW_KEY)}
                            onClick={() => {
                                void startPreview(store, session);
                            }}
                        >
                            {PREVIEW_WORDS.preview}
                        </Button>
                    )}
                </Group>
            </Stack>
        </form>
    );
}
