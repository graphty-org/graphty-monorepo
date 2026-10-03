/**
 * The workspace's one command list.
 *
 * Every menu item, toolbar button, key and Quick actions row is a command from this list, so a
 * door uses its command's one label word for word (tier1-design.md section 4, "Words"). Each
 * package declares its commands in its own `<package>/commands.ts` with `defineRegistration`;
 * `../registrations.ts` collects them, and nothing else edits another package's file.
 *
 * A command that is declared but not built yet is a stub (`stub: true`): it holds its id, so the
 * Frame's expected-id test passes, but no menu, key or list draws it (the design's rule: an
 * unbuilt item is not drawn).
 */

import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";

import { assertAppKey } from "../keys/keys";
import type { WorkspaceStore } from "../state/store";

/**
 * Where Quick actions lists a command (tier1-design.md section 2.3: "grouped by its home").
 */
type CommandGroup =
    | "Go to"
    | "Graph tree"
    | "Analyze"
    | "Data"
    | "View"
    | "Layout"
    | "Selection"
    | "Project"
    | "Settings and help";

/** What a command's `run` and `disabled` read. */
export interface CommandContext {
    /** The element's session; null before the element has come up or with no project open. */
    readonly session: GraphSession | null;
    /** The element itself, for its view doors (camera, screenshot); never to change the graph. */
    readonly element: GraphtyElement | null;
    /** The workspace's chrome state: place, dialog, panels, notice. */
    readonly workspace: WorkspaceStore;
}

/** One command. */
export interface Command {
    /** Stable id, `<area>.<verb>`, such as `"project.save"`. */
    readonly id: string;
    /** The one label every door shows, such as `"Save"` or `"Open project or file..."`. */
    readonly label: string;
    /** Its home in Quick actions. */
    readonly group: CommandGroup;
    /**
     * Its keys, most important first: `"Mod+S"`, `"Shift+Mod+Z"`, `"?"`, `"G"`. `Mod` is Ctrl,
     * or Cmd on a Mac. The first is the one menus and tooltips show. A single character with no
     * modifier is a single-key shortcut, which the reader can switch off (WCAG 2.1.4).
     */
    readonly keys?: readonly string[];
    /** Extra words Quick actions matches ("field", "column"). */
    readonly keywords?: readonly string[];
    /** A tooltip sentence, where the label alone is not enough. */
    readonly description?: string;
    /** Why it cannot run now, or null when it can. Drawn grayed with the reason, still focusable. */
    readonly disabled?: (ctx: CommandContext) => string | null;
    /** Does it. */
    readonly run: (ctx: CommandContext) => void | Promise<void>;
    /** Declared but not built: holds the id, drawn nowhere. */
    readonly stub?: boolean;
}

/** An inspected kind (tier1-design.md section 2.7): its tabs and which tab it opens on. */
export interface InspectedKind {
    /** The kind's id, such as `"node"`, `"measure-row"`, `"graph"`. */
    readonly kind: string;
    /** Its tabs in order. A kind with one body has none. */
    readonly tabs: readonly ("style" | "values")[];
    /** The tab it opens on until the reader picks another. */
    readonly defaultTab?: "style" | "values";
    /** A tab it always opens on, ignoring the remembered one (a single node opens on Values). */
    readonly alwaysOpenOn?: "style" | "values";
}

/** What one package hands the Frame. */
export interface WorkspaceRegistration {
    /** The package's directory under `workspace/`, such as `"export"`. */
    readonly owner: string;
    /** Its commands. */
    readonly commands: readonly Command[];
    /** The inspected kinds it introduces. */
    readonly inspectedKinds?: readonly InspectedKind[];
}

/**
 * Declares one package's registration. Checks nothing by itself; `createRegistry` does.
 * @param registration - the package's commands and kinds.
 * @returns the same registration, typed.
 */
export function defineRegistration(registration: WorkspaceRegistration): WorkspaceRegistration {
    return registration;
}

/**
 * Declares commands a package has not built yet: each holds its id and label and runs nothing.
 * @param commands - the ids, labels, groups and keys.
 * @returns the stub commands.
 */
export function stubCommands(commands: readonly Omit<Command, "run" | "stub">[]): Command[] {
    return commands.map((command) => ({ ...command, stub: true, run: () => undefined }));
}

/**
 * The File list, shared word for word by the main menu and the project-name menu
 * (tier1-design.md section 2.1). Each is registered by the package that owns it.
 */
export const FILE_LIST = ["file.open", "project.save", "file.export"] as const;

/**
 * Every command id the tier 1 design needs, by owning package. A package that drops one fails
 * `registrations.test.ts`. A package may add commands not listed here.
 */
export const EXPECTED_COMMAND_IDS: Readonly<Record<string, readonly string[]>> = {
    frame: [
        "project.new",
        "project.rename",
        "history.undo",
        "history.redo",
        "place.graph",
        "place.data",
        "selection.clear",
        "help.shortcuts",
        "help.documentation",
        "help.about",
    ],
    start: ["file.open", "data.new"],
    settings: ["settings.open"],
    privacy: ["settings.privacy", "help.report"],
    toolbar: [
        "view.open",
        "view.legend",
        "view.fit",
        "view.frame-selection",
        "view.toggle-dimension",
        "quick-actions.open",
        "selection.neighborhood",
    ],
    analyze: ["analyze.open"],
    layout: ["layout.open", "layout.rerun", "layout.reshuffle"],
    "graph-place": ["find.focus"],
    style: ["style.add-label-line"],
    table: ["table.toggle"],
    export: ["file.export"],
    project: ["project.save", "project.save-as", "project.close"],
};

/** The commands, looked up and listed. */
export interface WorkspaceCommands {
    /** Every command, stubs included, in registration order. */
    readonly all: readonly Command[];
    /** Every built command (no stubs), in registration order. */
    readonly live: readonly Command[];
    /** The inspected kinds, by id. */
    readonly kinds: ReadonlyMap<string, InspectedKind>;
    /**
     * A command by id.
     * @param id - the command id.
     * @returns the command, or undefined.
     */
    get: (id: string) => Command | undefined;
    /**
     * A built command by id: undefined for a stub, so a door to it is not drawn.
     * @param id - the command id.
     * @returns the command, or undefined.
     */
    built: (id: string) => Command | undefined;
}

/**
 * Builds the registry, refusing what would break a door: a duplicate id, a key two commands
 * share, or a key graphty-element owns on a focused canvas.
 * @param registrations - every package's registration.
 * @returns the registry.
 */
export function createRegistry(registrations: readonly WorkspaceRegistration[]): WorkspaceCommands {
    const byId = new Map<string, Command>();
    const byKey = new Map<string, string>();
    const kinds = new Map<string, InspectedKind>();

    for (const { owner, commands, inspectedKinds = [] } of registrations) {
        for (const command of commands) {
            if (byId.has(command.id)) {
                throw new Error(`Command "${command.id}" is registered twice (again by ${owner})`);
            }
            byId.set(command.id, command);
            for (const key of command.keys ?? []) {
                assertAppKey(key, command.id);
                const holder = byKey.get(key);
                if (holder !== undefined) {
                    throw new Error(`Key "${key}" is bound to both "${holder}" and "${command.id}"`);
                }
                byKey.set(key, command.id);
            }
        }
        for (const kind of inspectedKinds) {
            if (kinds.has(kind.kind)) {
                throw new Error(`Inspected kind "${kind.kind}" is registered twice (again by ${owner})`);
            }
            kinds.set(kind.kind, kind);
        }
    }

    const all = [...byId.values()];
    const live = all.filter((command) => command.stub !== true);

    return {
        all,
        live,
        kinds,
        get: (id) => byId.get(id),
        built: (id) => {
            const command = byId.get(id);
            return command?.stub === true ? undefined : command;
        },
    };
}
