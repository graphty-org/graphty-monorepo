/** Told each time a counted panel renders; set only by a test. */
let counter: ((id: string) => void) | null = null;

/**
 * Sets who is told when a counted panel (a `RenderCount`) renders: a test counting the renders
 * one change causes (#9423). Null stops it.
 * @param next - told the panel's id on each render, or null.
 */
export function setRenderCounter(next: ((id: string) => void) | null): void {
    counter = next;
}

/**
 * Tells the counter of a render.
 * @param id - the panel.
 */
export function countRender(id: string): void {
    counter?.(id);
}
