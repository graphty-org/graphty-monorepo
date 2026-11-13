/**
 * The gradient of a node's Fill in the Style panel by part (the file-styles experiment): the
 * gradient's stops drawn and edited in the shared gradient editor, read from and written to the
 * element's two list channels (`node.gradientColors`, `node.gradientStops`) through the catalog's
 * one reader and writer of their items, both in one step. The editor picks colors without
 * opacity, so a stop keeps the opacity its color was written with.
 */

import { type ColorStop, GradientEditor } from "@graphty/compact-mantine";
import { readChannelList, toColorValue, writeChannelList } from "@graphty/graphty-element/catalog";
import React, { useRef } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { failureWords } from "../words";

/** The stops a gradient the row does not set yet starts from, for the reader to change. */
const STARTING: readonly ColorStop[] = [
    { id: "0", offset: 0, color: "#ffffff" },
    { id: "1", offset: 1, color: "#000000" },
];

/**
 * The stops a row's gradient holds: one per color, at its stop, else spread evenly; and each
 * stop's color as written, by stop id.
 * @param ctx - the row.
 * @returns the stops and the colors as written.
 */
function stopsOf(ctx: RowContext): { stops: ColorStop[]; written: ReadonlyMap<string, string> } {
    const colors = readChannelList("node.gradientColors", lineIn(ctx, "node.gradientColors")?.value);
    const offsets = readChannelList("node.gradientStops", lineIn(ctx, "node.gradientStops")?.value);
    if (colors.length === 0) {
        return { stops: [...STARTING], written: new Map() };
    }
    const even = offsets.length !== colors.length;
    return {
        stops: colors.map((color, at) => ({
            id: String(at),
            offset: even ? at / Math.max(1, colors.length - 1) : Number(offsets[at]),
            color: toColorValue(String(color))?.hex.slice(0, 7) ?? "#000000",
        })),
        written: new Map(colors.map((color, at) => [String(at), String(color)])),
    };
}

/**
 * A stop's color to write: as it was written when the reader did not change it, else the new color
 * with the opacity the stop had.
 * @param stop - the stop.
 * @param written - the color the stop was written with, if it was.
 * @returns the color.
 */
function colorOf(stop: ColorStop, written: string | undefined): string {
    const was = written === undefined ? undefined : toColorValue(written)?.hex;
    if (written === undefined || was === undefined) {
        return stop.color;
    }
    return was.slice(0, 7).toLowerCase() === stop.color.toLowerCase() ? written : `${stop.color}${was.slice(7)}`;
}

/**
 * The gradient's stops row: see the file header. Drawn while the row sets the gradient's colors,
 * or waits for them.
 * @param props - Component props
 * @param props.ctx - the row
 * @returns The row
 */
export function GradientRow({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { store } = useWorkspace();
    const moving = useRef(false);
    const { stops, written } = stopsOf(ctx);
    const write = (next: readonly ColorStop[]): void => {
        const sorted = [...next].sort((a, b) => a.offset - b.offset);
        const colors = writeChannelList(
            "node.gradientColors",
            sorted.map((stop) => colorOf(stop, written.get(stop.id))),
        );
        const offsets = writeChannelList(
            "node.gradientStops",
            sorted.map((stop) => Math.round(stop.offset * 1000) / 1000),
        );
        writeIn(ctx, "node.gradientColors", { value: colors }, { "node.gradientStops": offsets }, true).catch(
            (error: unknown) => {
                store.set({ notice: { message: failureWords("The gradient", "changed", error), error: true } });
            },
        );
    };
    return (
        <div className="ws-row" data-line="node.gradientColors" data-set="">
            <span className="ws-field-label">
                <span className="ws-field-name">Colors</span>
            </span>
            <GradientEditor
                stops={stops}
                showDirection={false}
                maxStops={Number.POSITIVE_INFINITY}
                onChange={(changed) => {
                    // A drag reports every step; it is written once, when it settles.
                    if (!moving.current) {
                        write(changed);
                    }
                }}
                onChangeStart={() => {
                    moving.current = true;
                }}
                onChangeEnd={(changed) => {
                    moving.current = false;
                    write(changed);
                }}
            />
        </div>
    );
}
