/**
 * The gradient of a node's Fill in the Style panel by part (the file-styles experiment): the
 * gradient's stops drawn and edited in the shared gradient editor, read from and written to the
 * element's two list channels (`node.gradientColors`, `node.gradientStops`) through the catalog's
 * one reader and writer of their items.
 */

import { type ColorStop, GradientEditor } from "@graphty/compact-mantine";
import { readChannelList, toColorValue, writeChannelList } from "@graphty/graphty-element/catalog";
import React, { useRef } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { failureWords } from "../words";

/**
 * The stops a row's gradient holds: one per color, at its stop, else spread evenly.
 * @param ctx - the row.
 * @returns the stops.
 */
function stopsOf(ctx: RowContext): ColorStop[] {
    const colors = readChannelList("node.gradientColors", lineIn(ctx, "node.gradientColors")?.value);
    const offsets = readChannelList("node.gradientStops", lineIn(ctx, "node.gradientStops")?.value);
    const even = offsets.length !== colors.length;
    return colors.map((color, at) => ({
        id: String(at),
        offset: even ? at / Math.max(1, colors.length - 1) : Number(offsets[at]),
        color: toColorValue(String(color))?.hex.slice(0, 7) ?? "#000000",
    }));
}

/**
 * The gradient's stops row: see the file header. Drawn while the row sets the gradient's colors.
 * @param props - Component props
 * @param props.ctx - the row
 * @returns The row
 */
export function GradientRow({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { store } = useWorkspace();
    const moving = useRef(false);
    const write = (stops: readonly ColorStop[]): void => {
        const sorted = [...stops].sort((a, b) => a.offset - b.offset);
        const colors = writeChannelList(
            "node.gradientColors",
            sorted.map((stop) => stop.color),
        );
        const offsets = writeChannelList(
            "node.gradientStops",
            sorted.map((stop) => Math.round(stop.offset * 1000) / 1000),
        );
        writeIn(ctx, "node.gradientColors", { value: colors })
            .then(() => writeIn(ctx, "node.gradientStops", { value: offsets }))
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords("The gradient", "changed", error), error: true } });
            });
    };
    return (
        <div className="ws-row" data-line="node.gradientColors" data-set="">
            <GradientEditor
                stops={stopsOf(ctx)}
                showDirection={false}
                maxStops={8}
                onChange={(stops) => {
                    // A drag reports every step; it is written once, when it settles.
                    if (!moving.current) {
                        write(stops);
                    }
                }}
                onChangeStart={() => {
                    moving.current = true;
                }}
                onChangeEnd={(stops) => {
                    moving.current = false;
                    write(stops);
                }}
            />
        </div>
    );
}
