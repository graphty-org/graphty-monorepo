/**
 * @file The tour ops: `tour.save` keeps tours under names, `tour.remove` forgets them, and
 * `tour.rename` and `tour.move` rename and reorder them.
 *
 * The tours are one whole value (the `tours` slice): tours are few and small, so every op writes
 * the whole list and its undo restores it exactly. Each op is an undoable step on the immediate
 * lane. Playing a tour moves the camera, which no project saves, so it is no op here.
 */

import { EASING_NAMES, timeProblem, type Tour, type TourStop } from "../../camera/tour";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableDefinition } from "../project/Dispatcher";
import type { SavedTour } from "../project/state";

/** `tour.save`: keep tours under names, replacing a tour already under one in its place. */
interface TourSaveCommand {
    readonly op: "tour.save";
    readonly tours: readonly SavedTour[];
}

/** `tour.remove`: forget saved tours. */
interface TourRemoveCommand {
    readonly op: "tour.remove";
    readonly names: readonly string[];
}

/** `tour.rename`: give a saved tour a new name, keeping its place. */
interface TourRenameCommand {
    readonly op: "tour.rename";
    readonly from: string;
    readonly to: string;
}

/** `tour.move`: put a saved tour at a place in the order. */
interface TourMoveCommand {
    readonly op: "tour.move";
    readonly name: string;
    /** The 0-based place, clamped to the order. */
    readonly index: number;
}

/** Every tour op. */
export type TourCommand = TourSaveCommand | TourRemoveCommand | TourRenameCommand | TourMoveCommand;

/**
 * The refusal for a tour name nothing is saved under.
 * @param missing - The names not saved.
 * @param tours - The saved tours.
 * @returns The error.
 */
function unknownTour(missing: readonly string[], tours: readonly SavedTour[]): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `No tour is saved as "${missing[0]}".`,
        source: "view",
        details: { missing: [...missing], available: tours.map((saved) => saved.name) },
    });
}

/**
 * Refuse an empty tour name.
 * @param name - The name.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` `{ reason: "empty-name" }`.
 */
function assertTourName(name: string): void {
    if (typeof name !== "string" || name.trim() === "") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "A tour needs a name, because the name is what a person finds it by.",
            source: "view",
            details: { reason: "empty-name" },
        });
    }
}

/**
 * A tour checked and copied into the frozen form the slice keeps.
 * @param tour - The tour as given.
 * @returns The frozen copy.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` `{ option, stop? }` for a bad flight, hold,
 *     view or easing.
 */
function frozenTour(tour: Tour): Tour {
    const range = (option: string, stop?: number): GraphtyError =>
        new GraphtyError({
            code: "E_OPTION_RANGE",
            message:
                stop === undefined
                    ? `A tour's ${option} is not one the element knows.`
                    : `Stop ${String(stop)} of the tour has a ${option} the element cannot use.`,
            source: "view",
            details: { option, ...(stop === undefined ? {} : { stop }) },
        });

    if (tour.easing !== undefined && !EASING_NAMES.includes(tour.easing)) {
        throw range("easing");
    }

    const given: readonly TourStop[] = Array.isArray(tour.stops) ? tour.stops : [];
    const stops = given.map((stop, index): TourStop => {
        if (typeof stop?.view !== "string") {
            throw range("view", index);
        }

        const time = timeProblem(stop, index);
        if (time !== null) {
            throw range(String(time.params.option), index);
        }

        return Object.freeze({
            view: stop.view,
            ...(stop.duration === undefined ? {} : { duration: stop.duration }),
            ...(stop.hold === undefined ? {} : { hold: stop.hold }),
        });
    });

    return Object.freeze({
        stops: Object.freeze(stops),
        ...(tour.easing === undefined ? {} : { easing: tour.easing }),
    });
}

/**
 * The 0-based place an op gives, checked.
 * @param index - The place.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` `{ option: "index" }` for a place that is not a
 *     whole number.
 */
function assertIndex(index: number): void {
    if (!Number.isInteger(index)) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: "A tour's place is a whole number.",
            source: "view",
            details: { option: "index" },
        });
    }
}

const tourSave: UndoableDefinition<TourSaveCommand> = {
    op: "tour.save",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => ["tours"],
    undo: {
        kind: "undoable",
        fact: (command) => ({ code: "tour.save", params: { names: command.tours.map((saved) => saved.name) } }),
    },
    execute: (command, ctx) => {
        const next = [...ctx.state.tours];
        for (const saved of command.tours) {
            assertTourName(saved.name);
            const entry: SavedTour = Object.freeze({ name: saved.name, tour: frozenTour(saved.tour) });
            const at = next.findIndex((held) => held.name === saved.name);
            if (at === -1) {
                next.push(entry);
            } else {
                next[at] = entry;
            }
        }

        ctx.draft.tours = next;
    },
};

const tourRemove: UndoableDefinition<TourRemoveCommand> = {
    op: "tour.remove",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => ["tours"],
    undo: {
        kind: "undoable",
        fact: (command) => ({ code: "tour.remove", params: { names: [...command.names] } }),
    },
    execute: (command, ctx) => {
        const { tours } = ctx.state;
        const missing = command.names.filter((name) => !tours.some((saved) => saved.name === name));
        if (missing.length > 0) {
            throw unknownTour(missing, tours);
        }

        ctx.draft.tours = tours.filter((saved) => !command.names.includes(saved.name));
    },
};

const tourRename: UndoableDefinition<TourRenameCommand> = {
    op: "tour.rename",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => ["tours"],
    undo: {
        kind: "undoable",
        fact: (command) => ({ code: "tour.rename", params: { from: command.from, to: command.to } }),
    },
    execute: (command, ctx) => {
        const { tours } = ctx.state;
        if (!tours.some((saved) => saved.name === command.from)) {
            throw unknownTour([command.from], tours);
        }
        if (command.to === command.from) {
            return;
        }
        assertTourName(command.to);
        if (tours.some((saved) => saved.name === command.to)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A tour is already saved as "${command.to}".`,
                source: "view",
                details: { reason: "name-taken", name: command.to },
            });
        }

        ctx.draft.tours = tours.map((saved) =>
            saved.name === command.from ? Object.freeze({ name: command.to, tour: saved.tour }) : saved,
        );
    },
};

const tourMove: UndoableDefinition<TourMoveCommand> = {
    op: "tour.move",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => ["tours"],
    undo: {
        kind: "undoable",
        fact: (command) => ({ code: "tour.move", params: { name: command.name, index: command.index } }),
    },
    execute: (command, ctx) => {
        const { tours } = ctx.state;
        const moving = tours.find((saved) => saved.name === command.name);
        if (moving === undefined) {
            throw unknownTour([command.name], tours);
        }
        assertIndex(command.index);

        const next = tours.filter((saved) => saved !== moving);
        next.splice(Math.max(0, Math.min(next.length, command.index)), 0, moving);
        ctx.draft.tours = next;
    },
};

/**
 * Every saved tour with stops naming one view renamed to another.
 * @param tours - The saved tours.
 * @param from - The view's old name.
 * @param to - Its new name.
 * @returns The rewritten list and the names of the tours that changed.
 */
export function renameTourStops(
    tours: readonly SavedTour[],
    from: string,
    to: string,
): { readonly tours: readonly SavedTour[]; readonly changed: readonly string[] } {
    const changed: string[] = [];
    const next = tours.map((saved) => {
        if (!saved.tour.stops.some((stop) => stop.view === from)) {
            return saved;
        }
        changed.push(saved.name);
        const stops = saved.tour.stops.map((stop) =>
            stop.view === from ? Object.freeze({ ...stop, view: to }) : stop,
        );
        return Object.freeze({ name: saved.name, tour: Object.freeze({ ...saved.tour, stops: Object.freeze(stops) }) });
    });
    return { tours: next, changed };
}

/** The tour ops' definitions. */
export const TOUR_DEFINITIONS = [tourSave, tourRemove, tourRename, tourMove] as const;
