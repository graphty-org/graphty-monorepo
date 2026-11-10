import "../selection/selection.css";
import "./join-workspace.css";

import type { GraphSession, JoinLookup, JoinsDraft } from "@graphty/graphty-element/session";
import { Button, SegmentedControl, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { joinWorkspaceOn } from "../features";
import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey, isTypingTarget, matchesKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { JoinBody } from "./Body";
import { type JoinSide, type JoinWorkspaceApi, JoinWorkspaceContext } from "./context";
import { JOIN_KEYS } from "./words";

/** Where a key belongs to an open list or menu, which closes itself on Escape. */
const SELF_CLOSING = '[role="menu"], [role="listbox"], [role="dialog"]:not(.jw-modal), [data-expanded]';

/**
 * The join workspace, while the store says it is open and the `join-workspace` experiment is on.
 * @returns the workspace, or null.
 */
export function JoinWorkspace(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const open = useWorkspaceState((state) => state.joinWorkspace);
    if (open === null || session === null || !joinWorkspaceOn(session)) {
        return null;
    }
    return (
        <JoinModal
            session={session}
            held={open.held}
            onClose={() => {
                store.set({ joinWorkspace: null });
            }}
        />
    );
}

/** Props for the open workspace. */
interface JoinModalProps {
    readonly session: GraphSession;
    /** Tables the workspace opens holding. */
    readonly held: readonly JoinLookup[];
    /** Shuts the workspace. */
    readonly onClose: () => void;
}

/**
 * The open workspace: a modal over the app (the selection workspace's frame), its title bar with
 * Undo, Redo, Before and After, Cancel and Done, and the build's body under it. Nothing reaches
 * the graph until Done, which joins every step as one undo step.
 * @param props - Component props
 * @param props.session - the element's session.
 * @param props.held - tables the workspace opens holding.
 * @param props.onClose - shuts the workspace.
 * @returns the workspace.
 */
function JoinModal({ session, held, onClose }: JoinModalProps): React.JSX.Element | null {
    const titleId = useId();
    const box = useRef<HTMLElement>(null);
    // One recipe per opening; the tables it was opened with are held first.
    const [draft] = useState<JoinsDraft>(() => {
        const made = session.data.prepareJoins();
        held.forEach((table) => made.hold(table));
        return made;
    });
    const [version, setVersion] = useState(0);
    const [step, select] = useState<string | null>(null);
    const [side, setSide] = useState<JoinSide>("after");
    const [closing, setClosing] = useState<"done" | "cancel" | null>(null);
    const api: JoinWorkspaceApi = useMemo(
        () => ({
            session,
            draft,
            version,
            edit: (change) => {
                change(draft);
                setVersion((count) => count + 1);
            },
            step,
            select,
            side,
            setSide,
            addTable: async (file) => {
                const read = await session.data.prepare({ config: { file }, name: file.name });
                try {
                    const key = draft.hold({ ...read.lookup(), name: file.name });
                    setVersion((count) => count + 1);
                    return key;
                } finally {
                    read.dispose();
                }
            },
        }),
        [session, draft, version, step, side],
    );

    const close = (how: "done" | "cancel"): void => {
        if (closing !== null) {
            return;
        }
        setClosing(how);
        if (how === "cancel") {
            draft.discard();
            onClose();
            return;
        }
    };
    // Done takes the body down first (it reads the draft, which commit() ends), then commits.
    const committed = useRef(false);
    useEffect(() => {
        if (closing === "done" && !committed.current) {
            committed.current = true;
            void draft.commit().finally(onClose);
        }
    }, [closing, draft, onClose]);
    const closeRef = useRef(close);
    closeRef.current = close;
    const editRef = useRef(api.edit);
    editRef.current = api.edit;

    // The workspace's keys win over the app's while it is open: Undo and Redo step through the
    // recipe, not the project's history (the recipe is not in it until Done).
    useEffect(() => {
        const keys = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || event.isComposing) {
                return;
            }
            const target = event.target instanceof Element ? event.target : null;
            if (matchesKey(event, JOIN_KEYS.done)) {
                event.preventDefault();
                closeRef.current("done");
            } else if (matchesKey(event, JOIN_KEYS.cancel)) {
                if (target?.closest(SELF_CLOSING) === null || target === null) {
                    event.preventDefault();
                    closeRef.current("cancel");
                }
            } else if (!isTypingTarget(target) && matchesKey(event, JOIN_KEYS.undo)) {
                event.preventDefault();
                editRef.current((each) => {
                    each.undo();
                });
            } else if (!isTypingTarget(target) && matchesKey(event, JOIN_KEYS.redo)) {
                event.preventDefault();
                editRef.current((each) => {
                    each.redo();
                });
            }
        };
        globalThis.addEventListener("keydown", keys, true);
        return () => {
            globalThis.removeEventListener("keydown", keys, true);
        };
    }, []);
    // Focus starts in the workspace, so its keys and Tab stay there.
    useEffect(() => {
        box.current?.focus();
    }, []);

    const frame = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ws-body");
    if (frame === null) {
        return null;
    }
    return createPortal(
        <JoinWorkspaceContext.Provider value={api}>
            <div className="sel-ws-scrim" aria-hidden />
            <section
                ref={box}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="sel-ws sel-modal jw-modal"
            >
                <header className="sel-ws-head">
                    <Text size="sm" fw={600} className="sel-ws-title" id={titleId} truncate>
                        Join
                    </Text>
                    <HistoryButton
                        label="Undo"
                        combo={JOIN_KEYS.undo}
                        icon={GLYPHS.undo}
                        disabled={!draft.canUndo}
                        onClick={() => {
                            api.edit((each) => {
                                each.undo();
                            });
                        }}
                    />
                    <HistoryButton
                        label="Redo"
                        combo={JOIN_KEYS.redo}
                        icon={GLYPHS.redo}
                        disabled={!draft.canRedo}
                        onClick={() => {
                            api.edit((each) => {
                                each.redo();
                            });
                        }}
                    />
                    <span className="sel-spacer" />
                    <SegmentedControl
                        size="xs"
                        aria-label="Preview"
                        value={side}
                        data={[
                            { value: "before", label: "Before" },
                            { value: "after", label: "After" },
                        ]}
                        onChange={(value) => {
                            setSide(value === "before" ? "before" : "after");
                        }}
                    />
                    <span className="sel-ws-gap" />
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        aria-keyshortcuts={ariaKey(JOIN_KEYS.cancel)}
                        rightSection={
                            <Text span size="sm" c="dimmed" className="sel-key">
                                Esc
                            </Text>
                        }
                        onClick={() => {
                            close("cancel");
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="compact-xs"
                        aria-keyshortcuts={ariaKey(JOIN_KEYS.done)}
                        loading={closing === "done"}
                        rightSection={
                            <Text span size="sm" className="sel-key">
                                {formatKey(JOIN_KEYS.done)}
                            </Text>
                        }
                        onClick={() => {
                            close("done");
                        }}
                    >
                        Done
                    </Button>
                </header>
                {closing === null ? <JoinBody /> : <div className="jw-body" />}
            </section>
        </JoinWorkspaceContext.Provider>,
        frame,
    );
}

/**
 * Undo or Redo in the title bar: its glyph, then its key, which is also its accessible shortcut.
 * @param props - Component props
 * @param props.label - "Undo" or "Redo".
 * @param props.combo - its key.
 * @param props.icon - its glyph.
 * @param props.disabled - nothing to undo or redo.
 * @param props.onClick - the press.
 * @returns the button.
 */
function HistoryButton({
    label,
    combo,
    icon: Icon,
    disabled,
    onClick,
}: Readonly<{
    label: string;
    combo: string;
    icon: (typeof GLYPHS)["undo"];
    disabled: boolean;
    onClick: () => void;
}>): React.JSX.Element {
    return (
        <Tooltip label={label}>
            <Button
                size="compact-xs"
                variant="subtle"
                aria-label={label}
                aria-keyshortcuts={ariaKey(combo)}
                disabled={disabled}
                leftSection={<Icon size={14} aria-hidden />}
                onClick={onClick}
            >
                <Text span size="sm" c="dimmed" className="sel-key">
                    {formatKey(combo)}
                </Text>
            </Button>
        </Tooltip>
    );
}
