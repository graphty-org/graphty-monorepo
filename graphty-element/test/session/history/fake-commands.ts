/**
 * @file Stand-in command definitions for the dispatcher tests.
 *
 * The real vocabulary arrives slice by slice; these exercise the dispatcher's own rules (steps,
 * groups, rollback, transactions) without depending on any of it.
 */

import type { OperationCategory } from "../../../src/managers/OperationQueueManager";
import {
    Dispatcher,
    type ExemptDefinition,
    type Scheduler,
    type UndoableDefinition,
} from "../../../src/session/project/Dispatcher";
import type { RunEntry } from "../../../src/session/project/state";
import type { CompiledLayer } from "../../../src/session/styles/Layer";

/** A stand-in layer stack; nothing here looks inside one. */
export function stack(name: string): readonly CompiledLayer[] {
    return Object.freeze([{ name, layer: { name } } as unknown as CompiledLayer]);
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

/** Promises a queued fake awaits, opened by the test. */
class Gates {
    private readonly gates = new Map<string, { promise: Promise<void>; open: () => void }>();

    /** The gate called `name`, made on first use. */
    private get(name: string): { promise: Promise<void>; open: () => void } {
        let gate = this.gates.get(name);
        if (gate === undefined) {
            let open: () => void = () => undefined;
            const promise = new Promise<void>((resolve) => {
                open = resolve;
            });
            gate = { promise, open };
            this.gates.set(name, gate);
        }

        return gate;
    }

    wait(name: string | undefined): Promise<void> | undefined {
        return name === undefined ? undefined : this.get(name).promise;
    }

    open(name: string): void {
        this.get(name).open();
    }

    reset(): void {
        this.gates.clear();
    }
}

/** The gates of the queued fakes. */
export const gates = new Gates();

/** Every queued fake that started executing, in order: `run:<id>`, `import:<name>`, `edge:<id>`. */
export const executions: string[] = [];

interface Run {
    readonly op: "fake.run";
    readonly id: string;
    readonly gate?: string;
}

interface Import {
    readonly op: "fake.import";
    readonly name: string;
    readonly gate?: string;
    /** Assigned by the element's own property pair, which collapses while queued. */
    readonly element?: boolean;
}

interface AddNode {
    readonly op: "fake.add-node";
    readonly id: string;
}

interface Pin {
    readonly op: "fake.pin";
    readonly id: string;
}

interface AddEdge {
    readonly op: "fake.add-edge";
    readonly source: string;
    readonly target: string;
}

/** A run: queued, and writes its entry only after its computation (the gate). */
const run: UndoableDefinition<Run> = {
    op: "fake.run",
    undo: { kind: "undoable", label: (c) => `Ran ${c.id}` },
    moves: false,
    keys: (c) => [`runs/${c.id}`],
    lane: { kind: "queued", category: "algorithm-run" },
    async execute(c, ctx) {
        executions.push(`run:${c.id}`);
        await gates.wait(c.gate);
        ctx.draft.runs.set(c.id, { id: c.id } as unknown as RunEntry);
        return c.id;
    },
};

/**
 * A chunked import: queued, holds the whole graph, writes a first chunk, awaits, then writes the
 * rest. The `config` key `graph` stands in for the rows until the graph primitives exist.
 */
const load: UndoableDefinition<Import> = {
    op: "fake.import",
    undo: { kind: "undoable", label: (c) => `Loaded ${c.name}` },
    moves: false,
    keys: () => ["graph"],
    lane: { kind: "queued", category: "data-add", coalesce: (c) => (c.element === true ? "element-source" : null) },
    async execute(c, ctx) {
        executions.push(`import:${c.name}`);
        ctx.draft.config.set("graph", `${c.name}:partial`);
        await gates.wait(c.gate);
        ctx.draft.config.set("graph", c.name);
    },
};

/** Adds one node: immediate, holds its id. `config/node/<id>` stands in for the row. */
const addNode: UndoableDefinition<AddNode> = {
    op: "fake.add-node",
    undo: { kind: "undoable", label: (c) => `Added ${c.id}` },
    moves: false,
    keys: (c) => [`graph/${c.id}`],
    lane: { kind: "immediate" },
    execute(c, ctx) {
        ctx.draft.config.set(`node/${c.id}`, true);
    },
};

/** Pins one node: immediate, needs the node's id and holds its pin. */
const pin: UndoableDefinition<Pin> = {
    op: "fake.pin",
    undo: { kind: "undoable", label: (c) => `Pinned ${c.id}` },
    moves: false,
    keys: (c) => [`graph/${c.id}`, `pins/${c.id}`],
    lane: { kind: "immediate" },
    execute(c, ctx) {
        ctx.draft.config.set(`pin/${c.id}`, true);
    },
};

/** Adds one edge: queued, holds both endpoints. */
const addEdge: UndoableDefinition<AddEdge> = {
    op: "fake.add-edge",
    undo: { kind: "undoable", label: (c) => `Added ${c.source}-${c.target}` },
    moves: false,
    keys: (c) => [`graph/${c.source}`, `graph/${c.target}`],
    lane: { kind: "queued", category: "data-add" },
    execute(c, ctx) {
        executions.push(`edge:${c.source}-${c.target}`);
        ctx.draft.config.set(`edge/${c.source}-${c.target}`, true);
    },
};

/** Every fake command. */
export type FakeCommand =
    | SetStyles
    | SetConfig
    | FailAfterWrite
    | FailBeforeWrite
    | Select
    | Run
    | Import
    | AddNode
    | Pin
    | AddEdge;

/** One slot on the fake queue. */
interface FakeSlot {
    readonly category: OperationCategory;
    readonly onTurn: () => Promise<void>;
    readonly controller: AbortController;
    started: boolean;
}

/**
 * A queue the tests move by hand: nothing runs until `next()`, so step boundaries and settle
 * order do not depend on timers.
 */
export class FakeQueue implements Scheduler {
    readonly slots: FakeSlot[] = [];

    enqueue(category: OperationCategory, onTurn: () => Promise<void>): { signal: AbortSignal; cancel(): void } {
        const slot: FakeSlot = { category, onTurn, controller: new AbortController(), started: false };
        this.slots.push(slot);

        return {
            signal: slot.controller.signal,
            cancel: () => {
                this.drop(slot);
            },
        };
    }

    /** Slots not yet started. */
    get queued(): number {
        return this.slots.filter((slot) => !slot.started).length;
    }

    /**
     * Start the oldest slot not yet started.
     * @returns Settles when that slot is given up.
     */
    async next(): Promise<void> {
        const slot = this.slots.find((candidate) => !candidate.started);
        if (slot === undefined) {
            throw new Error("The fake queue has nothing queued.");
        }

        slot.started = true;
        await slot.onTurn();
        this.remove(slot);
    }

    /** Drop every slot of a category, as the real queue's obsolescence rules do. */
    obsolete(category: OperationCategory): void {
        for (const slot of this.slots.filter((candidate) => candidate.category === category)) {
            this.drop(slot);
        }
    }

    private drop(slot: FakeSlot): void {
        if (!slot.started) {
            this.remove(slot);
        }

        slot.controller.abort();
    }

    private remove(slot: FakeSlot): void {
        const index = this.slots.indexOf(slot);
        if (index !== -1) {
            this.slots.splice(index, 1);
        }
    }
}

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
    queue: FakeQueue;
} {
    let time = 0;
    const clock: FakeClock = {
        now: () => time,
        advance: (ms) => {
            time += ms;
        },
    };
    const published: { slices: readonly string[]; cause: string }[] = [];
    const queue = new FakeQueue();
    gates.reset();
    executions.length = 0;
    const dispatcher = new Dispatcher({
        definitions: [setStyles, setConfig, failAfterWrite, failBeforeWrite, select, run, load, addNode, pin, addEdge],
        now: clock.now,
        events: { project: (change) => published.push(change) },
        scheduler: queue,
    });

    return { dispatcher, published, clock, queue };
}
