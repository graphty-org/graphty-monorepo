import type { CodedFact } from "@graphty/graphty-element/session";
import { Button, Group, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { modelName, useModelStates } from "../canvas/models";
import { useWorkspace } from "../state/WorkspaceContext";
import { countChip, waitingParts } from "./modelWords";
import { PartsPopover } from "./PartsPopover";

/**
 * The Parts button's accessible name (design 13.9): "police: 1 file missing", or the models a zip
 * holds, "set: 3 models".
 * @param model - the model's name.
 * @param parts - what it waits for.
 * @returns the name.
 */
function partsName(model: string, parts: readonly CodedFact[]): string {
    const chip = countChip(parts);
    if (parts.length === 1 && parts[0].code === "E_MODEL_AMBIGUOUS") {
        return `${model}: ${chip?.word ?? ""}`;
    }
    return `${model}: ${String(parts.length)} ${parts.length === 1 ? "file" : "files"} missing`;
}

/** Props for ModelProblems. */
interface ModelProblemsProps {
    /** What the layer's `node.model` names. */
    readonly modelRef: string;
    /** The row the Parts pop-over opens beside. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /** Called once the Parts pop-over closed, to put focus back on the Shape field. */
    readonly onDone: () => void;
    /** Moves a picture the layer names as its model to `node.texture` (design 13.5). */
    readonly onUseAsPicture?: () => void;
    /** The reader just picked this model while it waits for parts: the Parts pop-over opens. */
    readonly openParts?: boolean;
    /** Called once the Parts pop-over opened for `openParts`, or the model needs none. */
    readonly onPartsOpened?: () => void;
}

/**
 * The Shape field's controls for the model it names (design 13.9), read from graphty-element's model states: a
 * Parts button while the model waits for parts, opening the Parts pop-over (what is missing is its tooltip), and
 * Use as picture when the model named is a picture. Every other problem is a line of the Model settings tooltip
 * (`modelProblemLines` in modelWords.ts).
 * @param props - Component props
 * @param props.modelRef - what the layer names
 * @param props.anchor - the row the pop-over opens beside
 * @param props.onDone - focus back on the Shape field
 * @param props.onUseAsPicture - moves a picture named as the model to `node.texture`
 * @param props.openParts - opens the Parts pop-over once the model waits
 * @param props.onPartsOpened - called once that is done
 * @returns The buttons, or nothing
 */
export function ModelProblems({
    modelRef,
    anchor,
    onDone,
    onUseAsPicture,
    openParts = false,
    onPartsOpened,
}: Readonly<ModelProblemsProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const states = useModelStates(session);
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const change = states.find((s) => s.ref === modelRef);
    const parts = waitingParts(change);
    const name = session === null ? "Model" : modelName(session, modelRef);
    const waiting = parts.length > 0;
    const settled = change !== undefined && change.state !== "pending";
    useEffect(() => {
        // Picked while it waits: the Parts pop-over takes the Models pop-over's place.
        if (openParts && settled) {
            if (waiting) {
                setOpen(true);
            }
            onPartsOpened?.();
        }
    }, [openParts, settled, waiting, onPartsOpened]);
    useEffect(() => {
        // The last part arrived: the pop-over goes, and focus goes back to the field.
        if (open && !waiting) {
            setOpen(false);
            store.set({ announcement: `${name} drawn` });
            onDone();
        }
    }, [open, waiting, name, store, onDone]);
    if (session === null || change === undefined) {
        return null;
    }
    const partsChip = countChip(parts);
    const refusal = waiting ? undefined : change.problems.find((p) => p.code.startsWith("E_"));
    const picture = refusal?.params.assetKind === "image" && onUseAsPicture !== undefined;
    if (partsChip === undefined && !picture) {
        return null;
    }
    return (
        <Group gap={4} className="ws-model-chips">
            {partsChip === undefined ? null : (
                <Tooltip label={`${partsChip.word}: ${partsChip.tip}`}>
                    <Button
                        ref={buttonRef}
                        size="compact-xs"
                        variant="default"
                        aria-label={partsName(name, parts)}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        onClick={() => {
                            setOpen(true);
                        }}
                    >
                        Parts
                    </Button>
                </Tooltip>
            )}
            {picture ? (
                <Tooltip label={`Use ${name} as picture`}>
                    <Button
                        size="compact-xs"
                        variant="default"
                        aria-label={`Use ${name} as picture`}
                        onClick={onUseAsPicture}
                    >
                        Use as picture
                    </Button>
                </Tooltip>
            ) : null}
            {waiting ? (
                <PartsPopover
                    opened={open}
                    anchor={anchor}
                    modelRef={modelRef}
                    parts={parts}
                    onClose={() => {
                        setOpen(false);
                        buttonRef.current?.focus();
                    }}
                />
            ) : null}
        </Group>
    );
}
