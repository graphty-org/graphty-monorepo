/**
 * The kind a kind group's row was just switched to from its pop-over (`<side>:<kind id>`): a kind with a row of its
 * own (an outline's Over line, a caption's Source) draws a new row, whose pop-over opens again, so the switch never
 * takes the pop-over away (MemberMenu.tsx's KindMenu marks it, ThingRow.tsx takes it).
 */
let reopening: string | undefined;

/**
 * Marks the kind a pop-over switches its row to; the mark goes by the next frame after the switch settles.
 * @param key - the row's `<side>:<kind id>`.
 * @param settled - the switch.
 */
export function markReopening(key: string, settled: Promise<unknown>): void {
    reopening = key;
    const clear = (): void => {
        requestAnimationFrame(() => {
            if (reopening === key) {
                reopening = undefined;
            }
        });
    };
    settled.then(clear, clear);
}

/**
 * Whether a row just drawn is the kind its pop-over switched to, and so opens its pop-over; asked once.
 * @param key - the row's `<side>:<kind id>`.
 * @returns true for that row.
 */
export function takeReopening(key: string): boolean {
    if (reopening !== key) {
        return false;
    }
    reopening = undefined;
    return true;
}
