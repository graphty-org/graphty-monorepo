/**
 * @file The op a load from a network source dispatches: `data.import-source`. The load reads the
 * source outside the command, with the credential, and hands the command the rows it read, so
 * undo and redo replay those rows and never fetch, and no credential ever reaches the command,
 * the history or the journal. It runs exactly as `data.import` with held rows does.
 */

import type { SessionCommand } from "../planning";
import type { CommandDefinition, UndoableDefinition } from "../project/Dispatcher";
import { dataImport, type DataImportCommand } from "./data";

/** `data.import-source`: the rows a network source load read, loaded as one undoable step. */
export interface DataImportSourceCommand extends Omit<DataImportCommand, "op" | "held"> {
    readonly op: "data.import-source";
    /** The rows the load read; required, so nothing is ever fetched by the command. */
    readonly held: NonNullable<DataImportCommand["held"]>;
}

/**
 * The source id a command's source names: `source:<id>` as `data.source()` reports it.
 * @param command - The command.
 * @returns The id, or null.
 */
function sourceIdOf(command: DataImportSourceCommand): string | null {
    const { type } = command.source;
    return type?.startsWith("source:") === true ? type.slice("source:".length) : (type ?? null);
}

const dataImportSource: UndoableDefinition<DataImportSourceCommand> = {
    ...(dataImport as unknown as UndoableDefinition<DataImportSourceCommand>),
    op: "data.import-source",
    undo: {
        kind: "undoable",
        label: (command) => `Loaded ${command.source.name ?? sourceIdOf(command) ?? "a source"}`,
        fact: (command) => ({
            code: "data.import-source",
            params: { source: sourceIdOf(command), name: command.source.name ?? null },
        }),
    },
    execute: (command, ctx) => dataImport.execute({ ...command, op: "data.import" }, ctx),
};

/** The source-load ops' definitions. */
export const SOURCE_LOAD_DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [dataImportSource];
