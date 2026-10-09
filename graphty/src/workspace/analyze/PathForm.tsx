import "./path.css";

import { ResultRow, SearchInput, SegmentedControl, ToggleIconButton } from "@graphty/compact-mantine";
import type { AlgorithmDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession, NodeId } from "@graphty/graphty-element/session";
import { Button, Group, Input, Stack, Text, UnstyledButton } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import { OptionsForm } from "../options/OptionsForm";
import { useWorkspace } from "../state/WorkspaceContext";
import { isPathFollow, optionWords } from "./words";

/** The algorithm the Path popover runs. */
export const PATH_ALGORITHM = "shortest-path";

/**
 * Follow's choices on a directed graph: along the arrows, or either way. In is left to Made with's
 * advanced settings: From and To swapped asks the same question.
 */
const FOLLOW_CHOICES = ["out", "all"] as const;

/** How many nodes a field's list shows. */
const LIMIT = 8;

/** What a From or To field holds: the text, and the node it names once one is picked. */
interface NodeChoice {
    readonly text: string;
    readonly node: NodeId | null;
}

const EMPTY: NodeChoice = { text: "", node: null };

/** The two ends. */
type End = "source" | "target";

/** Each end's label. */
const END_WORDS: Readonly<Record<End, string>> = { source: "From", target: "To" };

/** Each end's hint, different for each so neither box can be taken for the other. */
const END_HINTS: Readonly<Record<End, string>> = { source: "Where the path starts", target: "Where the path ends" };

/**
 * The node hits for what was typed, from the element's find.
 * @param session - the element's session.
 * @param text - what was typed.
 * @returns the nodes, best first.
 */
function nodeHits(session: GraphSession, text: string): { id: NodeId; name: string }[] {
    if (text.trim() === "") {
        return [];
    }
    return session
        .find(text, { limit: LIMIT })
        .records.flatMap((hit) => (hit.kind === "node" ? [{ id: hit.id, name: hit.name }] : []));
}

/**
 * The node a field names: the one picked, else the one whose name is exactly the text.
 * @param session - the element's session.
 * @param choice - the field.
 * @returns the node, or null.
 */
function resolve(session: GraphSession, choice: NodeChoice): NodeId | null {
    if (choice.node !== null) {
        return choice.node;
    }
    const want = choice.text.trim().toLowerCase();
    return nodeHits(session, choice.text).find((hit) => hit.name.toLowerCase() === want)?.id ?? null;
}

/**
 * A node, filled in.
 * @param session - the element's session.
 * @param id - the node.
 * @returns the field's value.
 */
function chosen(session: GraphSession, id: NodeId | undefined): NodeChoice {
    return id === undefined ? EMPTY : { text: session.data.name(id) ?? String(id), node: id };
}

/** Props for NodeField. */
interface NodeFieldProps {
    session: GraphSession;
    end: End;
    value: NodeChoice;
    onChange: (value: NodeChoice) => void;
    picking: boolean;
    onPicking: (on: boolean) => void;
    error: string | null;
    autoFocus: boolean;
    inputRef: React.Ref<HTMLInputElement>;
    onPicked: () => void;
}

/**
 * From or To: a combobox over node names (Find's list, nodes only) with a pick button joined to
 * its end, which takes the next node clicked on the canvas.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.end - Which end
 * @param props.value - What it holds
 * @param props.onChange - Called with what it holds next
 * @param props.picking - Whether the next canvas click fills it
 * @param props.onPicking - Turns picking on or off
 * @param props.error - Why it names no node, or null
 * @param props.autoFocus - Whether it takes focus as the form opens
 * @param props.inputRef - The text box
 * @param props.onPicked - Called after Enter or a click picks a node, to move focus on
 * @returns The field
 */
function NodeField({
    session,
    end,
    value,
    onChange,
    picking,
    onPicking,
    error,
    autoFocus,
    inputRef,
    onPicked,
}: Readonly<NodeFieldProps>): React.JSX.Element {
    const label = END_WORDS[end];
    const listId = useId();
    // The option Enter picks: the first until the arrows move it, and marked as such.
    const [active, setActive] = useState(0);
    const [focused, setFocused] = useState(false);
    // The list shows while the text is typed in the field, not once a node is picked.
    const hits = value.node === null && focused ? nodeHits(session, value.text) : [];
    const optionId = (i: number): string => `${listId}-${String(i)}`;
    // Enter and a click pick the same way, and both move on to what is left to do.
    const pick = (hit: { id: NodeId; name: string }): void => {
        onChange({ text: hit.name, node: hit.id });
        setActive(0);
        onPicked();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (hits.length === 0) {
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (i + step + hits.length) % hits.length);
        } else if (event.key === "Enter") {
            // Enter picks the active node, or the first, and moves on to what is left to do.
            event.preventDefault();
            const hit = hits.at(Math.min(active, hits.length - 1));
            if (hit !== undefined) {
                pick(hit);
            }
        }
    };

    return (
        <Stack gap={2} className="ws-path-field">
            <SearchInput
                ref={inputRef}
                label={label}
                // The box's name says what it holds, so it is never taken for a "From" column.
                aria-label={`${label} node`}
                placeholder={END_HINTS[end]}
                value={value.text}
                onChange={(text) => {
                    onChange({ text, node: null });
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
                onFocus={() => {
                    setFocused(true);
                }}
                onBlur={() => {
                    setFocused(false);
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={hits.length > 0}
                aria-controls={hits.length > 0 ? listId : undefined}
                aria-activedescendant={hits.length > 0 ? optionId(Math.min(active, hits.length - 1)) : undefined}
                error={error ?? undefined}
                clearLabel={`Clear ${label}`}
                // The popover's focus trap takes the control marked data-autofocus.
                data-autofocus={autoFocus || undefined}
                rightSection={
                    <ToggleIconButton
                        label={`Pick ${label} on the canvas`}
                        icon={<GLYPHS.pick size={14} />}
                        checked={picking}
                        onChange={onPicking}
                    />
                }
            />
            {hits.length > 0 ? (
                <div // NOSONAR(S6819): the popup of an ARIA combobox on a text box; a native select cannot be one
                    id={listId}
                    role="listbox"
                    aria-label={`${label} nodes`}
                    className="ws-path-list"
                    // A press on a node keeps focus in the field, so the list is still there for the click.
                    onMouseDown={(event) => {
                        event.preventDefault();
                    }}
                >
                    {hits.map((hit, i) => (
                        <ResultRow
                            key={optionId(i)}
                            id={optionId(i)}
                            name={hit.name}
                            match={value.text}
                            icon={<GLYPHS.node size={14} />}
                            current={i === Math.min(active, hits.length - 1)}
                            onClick={() => {
                                pick(hit);
                            }}
                        />
                    ))}
                </div>
            ) : null}
            {/* Always there, so a screen reader hears the words arrive when picking starts. */}
            <Text size="xs" c="dimmed" role="status">
                {picking ? "Click a node on the canvas" : ""}
            </Text>
        </Stack>
    );
}

/** The pointer events a canvas pick swallows, so the click neither selects nor closes the popover. */
const PICK_EVENTS = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"] as const;

/**
 * While an end is being picked, takes the next node clicked on the canvas. The whole click is
 * kept from the element and the page, so it neither changes the selection nor closes the popover.
 * @param picking - the end being picked, or null.
 * @param onPicked - called with the end and the node clicked.
 */
function useCanvasPick(picking: End | null, onPicked: (end: End, node: NodeId) => void): void {
    const { element } = useWorkspace();
    useEffect(() => {
        if (picking === null || element === null) {
            return undefined;
        }
        let pressed: NodeId | null = null;
        const swallow = (event: Event): void => {
            if (!event.composedPath().includes(element)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (event.type === "pointerdown" && event instanceof PointerEvent) {
                const rect = element.getBoundingClientRect();
                const hit = element.elementAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
                pressed = hit?.kind === "node" ? hit.id : null;
            } else if (event.type === "click" && pressed !== null) {
                onPicked(picking, pressed);
            }
        };
        PICK_EVENTS.forEach((type) => {
            window.addEventListener(type, swallow, true);
        });
        return () => {
            PICK_EVENTS.forEach((type) => {
                window.removeEventListener(type, swallow, true);
            });
        };
    }, [picking, element, onPicked]);
}

/** Props for PathForm. */
interface PathFormProps {
    session: GraphSession;
    descriptor: AlgorithmDescriptor;
    /** Back to the Analyze list; absent when the popover opened straight on the path. */
    onBack?: () => void;
    /** Closes the popover. */
    onClose: () => void;
    /** Runs the path search with these parameters. */
    onRun: (params: Record<string, unknown>) => void;
}

/**
 * The Path popover's body (tier2-design.md section 2), titled "Shortest path": From and To, the
 * algorithm's other options (the Weight line, the advanced ones folded) and Find path. It opens
 * filled from the selection: one node fills From and focuses To; two fill both and focus Find
 * path. Esc stops a canvas pick first, then steps back to the Analyze list, or closes when the
 * popover opened on the path.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.descriptor - The shortest path algorithm
 * @param props.onBack - Back to the Analyze list
 * @param props.onClose - Closes the popover
 * @param props.onRun - Runs it
 * @returns The form
 */
export function PathForm({ session, descriptor, onBack, onClose, onRun }: Readonly<PathFormProps>): React.JSX.Element {
    const selected = session.selection.nodes;
    const [ends, setEnds] = useState<Record<End, NodeChoice>>(() => ({
        source: chosen(session, selected[0]),
        target: chosen(session, selected[1]),
    }));
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [picking, setPicking] = useState<End | null>(null);
    const [errors, setErrors] = useState<Record<End, string | null>>({ source: null, target: null });
    const [onPicked] = useState(() => (end: End, node: NodeId) => {
        setEnds((now) => ({ ...now, [end]: chosen(session, node) }));
        setErrors((now) => ({ ...now, [end]: null }));
        setPicking(null);
    });
    useCanvasPick(picking, onPicked);
    const inputs = { source: useRef<HTMLInputElement>(null), target: useRef<HTMLInputElement>(null) };
    const runButton = useRef<HTMLButtonElement>(null);
    const followLabel = useId();

    // The ends are the form's own fields; every other option goes through the shared form.
    // Follow is the form's own row too, shown only where edges have a direction.
    const options = descriptor.options.filter(
        (o) => o.name !== "source" && o.name !== "target" && !isPathFollow(descriptor.key, o.name),
    );
    const followOption = descriptor.options.find((o) => isPathFollow(descriptor.key, o.name));
    const directed = session.status.directed && followOption !== undefined;
    const follow = typeof values.direction === "string" ? values.direction : "all";
    // Focus goes to the first thing left to do: From, To, or Find path.
    const focus = (["source", "target", "run"] as const)[Math.min(selected.length, 2)];

    const set = (end: End) => (value: NodeChoice) => {
        setEnds((now) => ({ ...now, [end]: value }));
        setErrors((now) => ({ ...now, [end]: null }));
    };

    const onKeyDown = (event: React.KeyboardEvent): void => {
        if (!isPanelEscape(event)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (picking !== null) {
            setPicking(null);
        } else if (onBack === undefined) {
            onClose();
        } else {
            onBack();
        }
    };

    const field = (end: End): React.JSX.Element => (
        <NodeField
            session={session}
            end={end}
            value={ends[end]}
            onChange={set(end)}
            picking={picking === end}
            onPicking={(on) => {
                setPicking(on ? end : null);
            }}
            error={errors[end]}
            autoFocus={focus === end}
            inputRef={inputs[end]}
            onPicked={() => {
                // On to the other end while it is empty, else to Find path.
                const other: End = end === "source" ? "target" : "source";
                (ends[other].text.trim() === "" ? inputs[other] : runButton).current?.focus();
            }}
        />
    );

    return (
        <form // NOSONAR(S6847): catches Esc bubbling from the form's own controls to step back
            className="ws-analyze"
            onKeyDown={onKeyDown}
            aria-label="Shortest path"
            onSubmit={(event) => {
                event.preventDefault();
                const source = resolve(session, ends.source);
                const target = resolve(session, ends.target);
                const missing = (end: End): string | null =>
                    ends[end].text.trim() === "" ? "Choose a node" : `No node named ${ends[end].text.trim()}`;
                if (source === null || target === null) {
                    setErrors({
                        source: source === null ? missing("source") : null,
                        target: target === null ? missing("target") : null,
                    });
                    return;
                }
                // On a directed graph the run records which way it followed, so Made with can say.
                onRun({ ...values, source, target, ...(directed ? { direction: follow } : {}) });
            }}
        >
            <Stack gap={8}>
                <Group gap={4} wrap="nowrap">
                    {onBack === undefined ? null : (
                        <UnstyledButton aria-label="Back to analyses" onClick={onBack} className="ws-analyze-back">
                            <GLYPHS.back size={16} />
                        </UnstyledButton>
                    )}
                    <span aria-hidden="true">
                        <GLYPHS.paths size={16} />
                    </span>
                    <Text size="sm" fw={600}>
                        Shortest path
                    </Text>
                </Group>
                {field("source")}
                {field("target")}
                {directed && followOption !== undefined && (
                    <Input.Wrapper label="Follow" labelElement="div" labelProps={{ id: followLabel }}>
                        <SegmentedControl
                            aria-labelledby={followLabel}
                            fullWidth
                            value={follow}
                            data={FOLLOW_CHOICES.map((value) => ({
                                value,
                                label: optionWords(descriptor.key, followOption).choice(value),
                            }))}
                            onChange={(picked) => {
                                setValues({ ...values, direction: picked });
                            }}
                        />
                    </Input.Wrapper>
                )}
                <OptionsForm
                    session={session}
                    options={options}
                    values={values}
                    words={(option) => optionWords(descriptor.key, option)}
                    weightReads={descriptor.weightMeaning ?? null}
                    algorithm={descriptor.key}
                    onChange={(name, value) => {
                        setValues({ ...values, [name]: value });
                    }}
                />
                <Group justify="flex-end">
                    <Button ref={runButton} size="xs" type="submit" data-autofocus={focus === "run" || undefined}>
                        Find path
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
