/**
 * The close button a label draws when its style says `closeButton: true`: an x in the panel's
 * top-right corner.
 *
 * A no-op for now: it reserves no room and draws nothing, so every label looks as it did.
 */

/** A rectangle on the label's own canvas, in canvas units before the texture's scale. */
export interface LabelCanvasRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * How big the close button is on the label's canvas.
 * @param _options - The label's resolved style.
 * @param _options.closeButton - Whether the label draws a close button.
 * @param _options.fontSize - How tall the label's letters are on its canvas.
 * @returns Its side, in canvas units; zero draws no button and reserves no room.
 */
export function closeGlyphSize(_options: { closeButton: boolean; fontSize: number }): number {
    return 0;
}

/**
 * Draw the close button.
 * @param _ctx - The label's canvas, already scaled to canvas units.
 * @param _rect - Where the button goes.
 */
export function drawCloseGlyph(_ctx: CanvasRenderingContext2D, _rect: LabelCanvasRect): void {
    // Filled in by the close-button work.
}
