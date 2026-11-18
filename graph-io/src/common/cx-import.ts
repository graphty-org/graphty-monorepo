/**
 * What the CX and CX2 importers share: reading a document's aspect events through the streaming scanner.
 */

import type { ImportInput } from "../types.js";
import { EMPTY_INPUT_CODE, SYNTAX_CODE } from "./codes.js";
import { textChunks, throwIfAborted } from "./input.js";
import { type AspectEvent, JsonScanError, scanAspects } from "./json-elements.js";
import type { ResolvedImportOptions } from "./options.js";
import type { ImportReportBuilder } from "./report.js";

/** How many scanner events pass between two checks of the cancellation signal. */
const ABORT_CHECK_INTERVAL = 64;

/**
 * Hand every aspect event of a CX or CX2 document to `onEvent`, checking the cancellation signal as it goes. A
 * document that is not JSON fails the report (E_EMPTY_INPUT or E_SYNTAX) and throws.
 * @param input - the input
 * @param report - the report
 * @param options - the resolved options
 * @param onEvent - takes each event in document order
 */
export async function scanCxDocument(
    input: ImportInput,
    report: ImportReportBuilder,
    options: ResolvedImportOptions,
    onEvent: (event: AspectEvent) => void,
): Promise<void> {
    let sinceCheck = 0;
    try {
        for await (const event of scanAspects(textChunks(input, report, options), report)) {
            if (++sinceCheck >= ABORT_CHECK_INTERVAL) {
                sinceCheck = 0;
                throwIfAborted(options.signal);
            }
            onEvent(event);
        }
    } catch (err) {
        if (err instanceof JsonScanError) {
            report.fail(err.empty ? EMPTY_INPUT_CODE : SYNTAX_CODE, err.message, { line: err.line });
        }
        throw err;
    }
}
