import { Tooltip } from "@mantine/core";
import { useId, useUncontrolled } from "@mantine/hooks";
import React from "react";

import type { ChangeHandler } from "../../types/events";

// Figma's 3 x 3 auto layout alignment picker (design/figma-spec.md 5.7): an 88 x 56 gray box of
// nine cells, each a radio with a tooltip. An idle cell is a 2 x 2 dot; the chosen cell draws
// three bars (7, 10 and 5 long) lined up the way the children will be; the cell under the
// pointer previews the bars in the secondary ink. The look is the stylesheet's
// (src/theme/css/selection.css.ts, `cm-align*`).
//
// Keyboard: the group is one Tab stop (native radios sharing a name), and the arrows move in two
// dimensions -- Left / Right along the row, Up / Down along the column, stopping at the edges --
// which Figma's radios do not do (a 3 x 3 grid read as one line of nine is hard to steer; spec
// section 14).
//
// Each tooltip wraps its radio, so the radio carries the aria-describedby. The matrix nests no
// Tooltip.Group: the shell-wide group (src/theme/components/overlays.ts) is what makes the
// hand-off from cell to cell instant and keeps one tooltip showing at a time, and a group of the
// matrix's own would turn the hand-off cold on every way in from the rest of the shell.

/** The rows and columns of the matrix, top to bottom and left to right. */
const ROWS = ["top", "middle", "bottom"] as const;
const COLUMNS = ["left", "center", "right"] as const;

/** One cell of the matrix: `"top-left"` .. `"bottom-right"`. */
export type AlignmentMatrixValue = `${(typeof ROWS)[number]}-${(typeof COLUMNS)[number]}`;

/** Every value, in reading order. */
export const ALIGNMENT_MATRIX_VALUES: readonly AlignmentMatrixValue[] = ROWS.flatMap((row) =>
    COLUMNS.map((column): AlignmentMatrixValue => `${row}-${column}`),
);

/** The English name of each cell, Figma's tooltip wording. */
const DEFAULT_CELL_LABELS: Record<AlignmentMatrixValue, string> = {
    "top-left": "Align top left",
    "top-center": "Align top center",
    "top-right": "Align top right",
    "middle-left": "Align left",
    "middle-center": "Align center",
    "middle-right": "Align right",
    "bottom-left": "Align bottom left",
    "bottom-center": "Align bottom center",
    "bottom-right": "Align bottom right",
};

/** The three bars' lengths, px (C21). */
const BARS = [7, 10, 5] as const;

/** Where the bars sit across their own axis, by the cell's row or column index. */
const CROSS = ["flex-start", "center", "flex-end"] as const;

/**
 * Props for the AlignmentMatrix.
 */
export interface AlignmentMatrixProps {
    /** The chosen cell. Supply it to drive the matrix from your own state. */
    value?: AlignmentMatrixValue;
    /** The cell chosen before anything is picked, when the matrix keeps its own state. @default "top-left" */
    defaultValue?: AlignmentMatrixValue;
    /** Called with the newly chosen cell and the event that chose it. */
    onChange?: ChangeHandler<AlignmentMatrixValue>;
    /**
     * Which way the children run, which is how the bars are drawn: `"vertical"` stacks three
     * horizontal bars, `"horizontal"` stands three vertical bars side by side.
     * @default "vertical"
     */
    direction?: "horizontal" | "vertical";
    /** The group's accessible name. @default "Alignment" */
    label?: string;
    /** The name (and tooltip) of each cell, when the English defaults will not do. */
    cellLabels?: Partial<Record<AlignmentMatrixValue, string>>;
    /** Whether the matrix cannot be used. @default false */
    disabled?: boolean;
    /** The shared name of the radio inputs. One is generated when left out. */
    name?: string;
}

/**
 * The 3 x 3 alignment picker of an auto layout frame: nine radios drawn as dots, with the chosen
 * one drawn as the three bars of the alignment it sets.
 * @param props - Component props
 * @param props.value - The chosen cell, to drive the matrix from your own state
 * @param props.defaultValue - The cell chosen before anything is picked
 * @param props.onChange - Called with the newly chosen cell and the event
 * @param props.direction - Which way the children run, and so how the bars are drawn
 * @param props.label - The group's accessible name
 * @param props.cellLabels - The name and tooltip of each cell
 * @param props.disabled - Whether the matrix cannot be used
 * @param props.name - The shared name of the radio inputs
 * @returns the matrix
 * @example
 * ```tsx
 * <AlignmentMatrix value={align} onChange={setAlign} direction="horizontal" />
 * ```
 */
export function AlignmentMatrix({
    value,
    defaultValue,
    onChange,
    direction = "vertical",
    label = "Alignment",
    cellLabels,
    disabled = false,
    name,
}: AlignmentMatrixProps): React.JSX.Element {
    const groupName = useId(name);
    const [selected, setSelected] = useUncontrolled<AlignmentMatrixValue>({
        value,
        defaultValue,
        finalValue: "top-left",
        onChange,
    });

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        const step = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
        if (disabled || step === undefined || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        // The browser would otherwise walk all nine radios in one line.
        event.preventDefault();
        const index = ALIGNMENT_MATRIX_VALUES.indexOf(selected);
        const row = Math.min(2, Math.max(0, Math.floor(index / 3) + step[0]));
        const column = Math.min(2, Math.max(0, (index % 3) + step[1]));
        const next = ALIGNMENT_MATRIX_VALUES[row * 3 + column];
        if (next !== selected) {
            setSelected(next, event);
        }
        event.currentTarget
            .closest(".cm-align")
            ?.querySelector<HTMLInputElement>(`input[value="${next}"]`)
            ?.focus();
    };

    return (
        <div
            role="radiogroup"
            aria-label={label}
            aria-disabled={disabled || undefined}
            className="cm-align"
            data-direction={direction}
            data-disabled={disabled || undefined}
            data-testid="alignment-matrix"
        >
            <div className="cm-align-grid">
                {ALIGNMENT_MATRIX_VALUES.map((cell, index) => {
                    const checked = cell === selected;
                    const cellLabel = cellLabels?.[cell] ?? DEFAULT_CELL_LABELS[cell];
                    // Vertical children line up along the row's column; horizontal ones along
                    // the column's row.
                    const cross = CROSS[direction === "vertical" ? index % 3 : Math.floor(index / 3)];
                    return (
                        <div
                            key={cell}
                            className="cm-align-cell"
                            data-value={cell}
                            data-checked={checked || undefined}
                            style={{ "--cm-align-cross": cross } as React.CSSProperties}
                        >
                            <Tooltip label={cellLabel} disabled={disabled}>
                                <input
                                    type="radio"
                                    name={groupName}
                                    value={cell}
                                    checked={checked}
                                    disabled={disabled}
                                    aria-label={cellLabel}
                                    onKeyDown={handleKeyDown}
                                    onChange={(event) => {
                                        setSelected(cell, event);
                                    }}
                                />
                            </Tooltip>
                            <span className="cm-align-dot" aria-hidden="true" />
                            <span className="cm-align-bars" aria-hidden="true">
                                {BARS.map((length) => (
                                    <span
                                        key={length}
                                        className="cm-align-bar"
                                        style={{ "--cm-bar": `${String(length)}px` } as React.CSSProperties}
                                    />
                                ))}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
