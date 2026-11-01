/**
 * The selection editor in its first host: a style layer's Which nodes / Which edges
 * (design/ui/selection-groups/spec.md, section 2). The base is the filtered graph, references
 * follow the reader, and a group's count chip selects what it counts. A layer's selector is read
 * as a selection (a tier 4 flat rule through graphty-element's `scope.asUnion`, starting All),
 * and every edit writes the layer's selector as a `union` rule, one undo step per edit.
 */

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { Group, Text, UnstyledButton } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import type { Side } from "../style/cards";
import { useStepWriter } from "../style/useStepWriter";
import { newSelection } from "./model";
import { SelectionEditor } from "./SelectionEditor";
import { useSteps } from "./useSteps";
import { layerSelection } from "./values";
import { letterOf, NOUNS, reasonWords, stepWords, VERB_WORDS } from "./words";

/**
 * The open editor on one layer.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer of this side
 * @param props.name - the layer's row name, for the undo step's words
 * @param props.side - nodes or edges
 * @param props.onDone - closes the editor, handing focus back to the Which row
 * @returns The editor
 */
export function StyleSelection({
    session,
    layer,
    name,
    side,
    onDone,
}: Readonly<{
    session: GraphSession;
    layer: Layer;
    name: string;
    side: Side;
    onDone: () => void;
}>): React.JSX.Element | null {
    const [draft] = useState(() => newSelection(side === "node" ? "nodes" : "edges", "visible"));
    // The rule as last edited, until the element holds it: typing is never undone by a write on its way.
    const [local, setLocal] = useState<UnionLeaf | null>(null);
    const busy = useRef<() => boolean>(() => false);
    const writer = useStepWriter(session, `changing the conditions on ${name}`, () => {
        // Called just before the write counts as done: look once it has.
        queueMicrotask(() => {
            if (!busy.current()) {
                setLocal(null);
            }
        });
    });
    busy.current = writer.busy;
    const held = layerSelection(session, layer.selector, side);
    const leaving = useRef(0);
    if (held === null) {
        return null;
    }
    const rule = local ?? (held === "new" ? draft : held);
    return (
        <div
            className="ws-which-open"
            onFocus={() => {
                cancelAnimationFrame(leaving.current);
            }}
            onBlur={(event) => {
                // A click outside the editor ends it (spec 9); a move into one of its own lists
                // (drawn in a portal) comes back before the frame ends, and the table the editor
                // opened (its Group column, Matches only) is part of picking.
                const to = event.relatedTarget;
                if (
                    !(to instanceof HTMLElement) ||
                    to.closest(
                        "[data-portal], [role=listbox], [role=menu], .mantine-Popover-dropdown, .mantine-Combobox-dropdown, .ws-table",
                    ) !== null
                ) {
                    return;
                }
                cancelAnimationFrame(leaving.current);
                leaving.current = requestAnimationFrame(onDone);
            }}
        >
            <Text size="xs" fw={600} role="heading" aria-level={3}>
                Which {NOUNS[side].many}
            </Text>
            <SelectionEditor
                session={session}
                rule={rule}
                host="selector"
                onDone={onDone}
                onChange={(next) => {
                    setLocal(next);
                    writer.write([{ id: layer.id, patch: { selector: { match: "rule", where: next } } }]);
                }}
            />
        </div>
    );
}

/**
 * The folded Which row of a layer whose selector is a selection: "Which nodes", the total, and a
 * chip per step (its group's letter first when there are several), read live from the element.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.side - nodes or edges
 * @param props.buttonRef - the row button, which focus returns to
 * @param props.onOpen - opens the editor
 * @returns The row
 */
export function SelectionRow({
    session,
    rule,
    side,
    buttonRef,
    onOpen,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    side: Side;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    onOpen: () => void;
}>): React.JSX.Element {
    const reading = useSteps(session, rule);
    const multi = rule.branches.length > 1;
    const chips = rule.branches.flatMap((branch, at) =>
        branch.steps.map((step) => {
            const read = reading.branches[at]?.steps.find((each) => each.id === step.id);
            const words = stepWords(session, step, side, read);
            const state =
                read?.state === "inert" || read?.state === "pending" ? reasonWords(read.reason).short : words.test;
            return {
                key: step.id ?? "",
                words: `${multi ? `${branch.name ?? letterOf(at)}: ` : ""}${VERB_WORDS[step.op].word} ${words.value}${state === "" ? "" : ` ${state}`}`,
            };
        }),
    );
    const total = `${String(reading.total.count)} of ${String(reading.total.of)}`;
    return (
        <div // NOSONAR(S6819): an undrawn heading around the disclosure button (the accordion pattern)
            role="heading"
            aria-level={3}
            style={{ display: "contents" }}
        >
            <UnstyledButton
                ref={buttonRef}
                className="ws-which-row"
                aria-expanded={false}
                aria-label={[`Which ${NOUNS[side].many}`, total, ...chips.map((each) => each.words)].join(", ")}
                onClick={onOpen}
            >
                <Group gap={4} wrap="nowrap" className="ws-which-head">
                    <GLYPHS.expand size={12} aria-hidden style={{ transform: "rotate(-90deg)" }} />
                    <Text size="xs" fw={600} span>
                        Which {NOUNS[side].many}
                    </Text>
                    <Text size="xs" c="dimmed" span ml="auto">
                        {total}
                    </Text>
                </Group>
                <span className="ws-which-chips">
                    {chips.map((each) => (
                        <span key={each.key} className="ws-chip">
                            {each.words}
                        </span>
                    ))}
                </span>
            </UnstyledButton>
        </div>
    );
}
