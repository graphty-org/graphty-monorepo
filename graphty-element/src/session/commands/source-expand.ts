/**
 * @file The ops click-to-expand dispatches: `data.source-expand`, which carries the fetched rows
 * so redo never fetches, and `data.collapse`. None yet: expanding and collapsing reject with
 * `E_SOURCE_UNSUPPORTED` until they land, with their definitions, `COMMANDS` entries and doors.
 */

import type { SessionCommand } from "../planning";
import type { CommandDefinition } from "../project/Dispatcher";

/** The source-expand ops' definitions. */
export const SOURCE_EXPAND_DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [];
