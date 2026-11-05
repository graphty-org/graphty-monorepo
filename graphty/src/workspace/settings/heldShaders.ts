/**
 * Held shaders: shader text that arrived in a file and waits for the reader to run it. The element
 * holds them and runs each one's checks on `approve`; this file only lists them for the load
 * report and the Held shaders row, and runs them one at a time when the reader says Run.
 */

import type { GraphSession, ProjectShader } from "@graphty/graphty-element/session";

import type { Notice } from "../state/store";
import { heldShadersWords } from "../style/words";

/**
 * The project's held shaders.
 * @param session - the element's session.
 * @returns them, in the project's order.
 */
export function heldShaders(session: GraphSession): readonly ProjectShader[] {
    return session.shaders.list().filter((shader) => shader.state === "held");
}

/**
 * Runs held shaders, one at a time, each through the element's checks.
 * @param session - the element's session.
 * @param ids - the shaders; all held ones when absent.
 * @returns how many did not pass their checks.
 */
export async function runHeld(session: GraphSession, ids?: readonly string[]): Promise<number> {
    let failed = 0;
    for (const id of ids ?? heldShaders(session).map((shader) => shader.id)) {
        const result = await session.shaders.approve(id);
        if (!result.ok) {
            failed++;
        }
    }
    return failed;
}

/**
 * A load report's notice with the shaders the load held named after its message, and Run as its
 * action. Unchanged when nothing is held.
 * @param session - the element's session.
 * @param notice - the load's notice.
 * @param onRun - runs them, and says how it went.
 * @returns the notice.
 */
export function withHeldShaders(session: GraphSession, notice: Notice, onRun: () => void): Notice {
    const held = heldShaders(session);
    if (held.length === 0) {
        return notice;
    }
    return {
        ...notice,
        message: `${notice.message.replace(/\.$/, "")}. ${heldShadersWords(held.map((shader) => shader.plainName))}`,
        action: { label: "Run", run: onRun },
    };
}
