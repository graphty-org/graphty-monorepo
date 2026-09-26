/**
 * @file Stand-in command definitions for the dispatcher tests.
 *
 * The real vocabulary arrives slice by slice; these exercise the dispatcher's own rules (steps,
 * groups, rollback, transactions) without depending on any of it.
 */

import { Dispatcher, type ExemptDefinition, type UndoableDefinition } from "../../../src/session/project/Dispatcher";
import type { CompiledLayer } from "../../../src/session/styles/Layer";

/** A stand-in layer stack; nothing here looks inside one. */
export function stack(name: string): readonly CompiledLayer[] {
    return Object.freeze([{ name } as unknown as CompiledLayer]);
}

/** The name of the stand-in stack currently in state, or null for an empty stack. */
export function stackName(dispatcher: Dispatcher): string | null {
    const top = dispatcher.state.styles[0] as unknown as { name: string } | undefined;
    return top?.name ?? null;
}

interface SetStyles {
    readonly op: "fake.styles";
    readonly name: string;
}

interface SetConfig {
    readonly op: "fake.config";
    readonly key: string;
    readonly value: string;
}

interface FailAfterWrite {
    readonly op: "fake.fail-after-write";
    readonly key: string;
}

interface FailBeforeWrite {
    readonly op: "fake.fail-before-write";
}

interface Select {
    readonly op: "fake.select";
    readonly id: string;
}

const immediate = { kind: "immediate" } as const;

const setStyles: UndoableDefinition<SetStyles> = {
    op: "fake.styles",
    undo: { kind: "undoable", label: (c) => `Styled ${c.name}` },
    moves: false,
    keys: () => ["styles"],
    lane: immediate,
    execute(c, ctx) {
        ctx.draft.styles = stack(c.name);
        return c.name;
    },
};

const setConfig: UndoableDefinition<SetConfig> = {
    op: "fake.config",
    undo: { kind: "undoable", label: (c) => `Set ${c.key}`, coalesce: (c) => `config:${c.key}` },
    moves: false,
    keys: (c) => [`config/${c.key}`],
    lane: immediate,
    execute(c, ctx) {
        ctx.draft.config.set(c.key, c.value);
    },
};

const failAfterWrite: UndoableDefinition<FailAfterWrite> = {
    op: "fake.fail-after-write",
    undo: { kind: "undoable", label: () => "Fails late" },
    moves: false,
    keys: (c) => [`config/${c.key}`],
    lane: immediate,
    execute(c, ctx) {
        ctx.draft.config.set(c.key, "partial");
        throw new Error("failed after writing");
    },
};

const failBeforeWrite: UndoableDefinition<FailBeforeWrite> = {
    op: "fake.fail-before-write",
    undo: { kind: "undoable", label: () => "Fails early" },
    moves: false,
    keys: () => [],
    lane: immediate,
    execute() {
        throw new Error("failed before writing");
    },
};

/** Exempt: keeps the command it was handed, so a test can see it ran and what it was given. */
export const selections: Select[] = [];

const select: ExemptDefinition<Select> = {
    op: "fake.select",
    undo: { kind: "exempt", reason: "Selection is not a step" },
    moves: false,
    keys: () => [],
    lane: immediate,
    execute(c) {
        selections.push(c);
    },
};

/** Every fake command. */
export type FakeCommand = SetStyles | SetConfig | FailAfterWrite | FailBeforeWrite | Select;

/** A clock the tests move by hand. */
export interface FakeClock {
    now(): number;
    advance(ms: number): void;
}

/** A dispatcher over the fake definitions, a hand-moved clock, and the changes it published. */
export function setup(): {
    dispatcher: Dispatcher;
    published: { slices: readonly string[]; cause: string }[];
    clock: FakeClock;
} {
    let time = 0;
    const clock: FakeClock = {
        now: () => time,
        advance: (ms) => {
            time += ms;
        },
    };
    const published: { slices: readonly string[]; cause: string }[] = [];
    const dispatcher = new Dispatcher({
        definitions: [setStyles, setConfig, failAfterWrite, failBeforeWrite, select],
        now: clock.now,
        publish: (change) => published.push(change),
    });

    return { dispatcher, published, clock };
}
