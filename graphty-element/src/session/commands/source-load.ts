/**
 * @file The ops a load from a network source dispatches: `data.import-source`, which carries the
 * rows the load read (outside the command, with the credential), so undo and redo replay them and
 * never fetch. None yet: the load rejects with `E_SOURCE_UNSUPPORTED` until it lands, and its
 * definition, its `COMMANDS` entry and its door land with it.
 */

import type { SessionCommand } from "../planning";
import type { CommandDefinition } from "../project/Dispatcher";

/** The source-load ops' definitions. */
export const SOURCE_LOAD_DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [];
