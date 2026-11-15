// What a stand-in tool must leave alone: an oracle that is yEd's or yEd Live's own drawing. An AI agent made those by
// operating the programs (TOOLS.md, "yEd's oracles"), so no script here can make them again.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Whether an oracle is yEd's or yEd Live's own drawing.
 * @param {string} oracles - the oracles folder
 * @param {string} name - the oracle's name, its file name without an extension
 * @returns {boolean} true for such a drawing, false for a stand-in, another program's, or no oracle yet
 */
export function isYedDrawing(oracles, name) {
    const path = join(oracles, `${name}.oracle.json`);
    if (!existsSync(path)) {
        return false;
    }
    const { program, standIn } = JSON.parse(readFileSync(path, "utf8"));
    return standIn === false && (program === "yEd" || program === "yEd Live");
}
