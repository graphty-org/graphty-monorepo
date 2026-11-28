/**
 * @file Giving the host its thread back between slices of work, and work kept for a turn when none is out.
 *
 * A pass that yields mid-way (a repaint, a filter, a search) gives that turn to input and drawing. Work
 * made ahead for later -- the copies a draft build keeps for the next one -- must not take it: it waits
 * until no pass has yielded a turn it has not had back, so it is never done in the middle of one, nor
 * counted as part of one.
 */

/** Turns handed to the host and not yet back. */
let away = 0;

/**
 * Hand the host the thread for one task, so input and drawing run between two slices.
 * @returns Settles on the next task.
 */
export function nextTask(): Promise<void> {
    away++;
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            away--;
            resolve();
        }, 0);
    });
}

/**
 * Do some work once the current task is done and no pass is waiting on a turn it handed back; until
 * then it goes to the back of the queue again.
 * @param work - The work.
 */
export function whenIdle(work: () => void): void {
    const timer: unknown = setTimeout(() => {
        if (away > 0) {
            whenIdle(work);
            return;
        }
        work();
    }, 0);
    // In Node, the idle work keeps no process alive.
    (timer as { unref?: () => void }).unref?.();
}
