/**
 * Waits until the next frame has been painted: a task queued from the frame's callback runs after
 * that frame's paint.
 */
const afterNextPaint = (): Promise<void> =>
    new Promise((resolve) => {
        requestAnimationFrame(() => {
            setTimeout(resolve);
        });
    });

/**
 * Waits until the page has finished every transition and finite animation, then has the browser
 * draw the whole page afresh, so a screenshot shows what the page looks like now and not the order
 * it got there in.
 *
 * The browser redraws only the part of the page that changed. Where a changed area's edge cuts a
 * rounded corner (a focus ring, a pill, a card), that corner's edge pixels come out one color level
 * off from a whole drawing. So a part that arrives a frame earlier or later -- a dialog's focus, a
 * status chip, a fading placeholder -- left 1 to 59 pixels different between two captures of one
 * build (#9408). Changing the root's opacity for one painted frame and back redraws everything.
 * @param doc - the story's document.
 */
export async function paintSettled(doc: Document = document): Promise<void> {
    // An infinite animation (a loading pulse) never finishes; the capture stops it for the shot.
    const ending = doc.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.all(ending.map((a) => a.finished.catch(() => undefined)));
    const root = doc.documentElement.style;
    const before = root.opacity;
    root.opacity = "0.999";
    await afterNextPaint();
    root.opacity = before;
    await afterNextPaint();
}
