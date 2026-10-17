/**
 * Fitting a label to the screen: `sizeMode: "screen"` keeps the letters a fixed height in CSS
 * pixels at any zoom, and `keepInView` keeps the panel inside the canvas.
 *
 * Called once by every {@link RichTextLabel} after it is built. A no-op for now: the label's
 * world size and placement stay exactly as they were.
 */
import type { RichTextLabel } from "./RichTextLabel";

/**
 * Start fitting one label to the screen, when its style asks for it.
 * @param _label - The label just built.
 */
export function labelScreenFit(_label: RichTextLabel): void {
    // Filled in by the screen-fit work; doing nothing keeps today's drawing.
}
