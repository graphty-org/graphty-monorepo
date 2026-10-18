/**
 * A filter that passes each event object the first time it sees it.
 *
 * Babylon's scene input manager raises one POINTERWHEEL per wheel axis that changed, each
 * carrying the same WheelEvent, so a trackpad turn (deltaX and deltaY both set) arrives twice.
 * Every POINTERWHEEL consumer runs its event through one of these to handle the turn once.
 * @returns A function that answers true the first time it is given an event, false after.
 */
export function firstSight(): (event: Event) => boolean {
    const seen = new WeakSet<Event>();
    return (event) => {
        if (seen.has(event)) {
            return false;
        }

        seen.add(event);
        return true;
    };
}
