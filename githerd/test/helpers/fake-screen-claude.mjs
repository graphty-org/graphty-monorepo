/**
 * A fake interactive `claude` for the tmux tests: it draws a recorded screen
 * (`test/fixtures/screens.json`) in its pane and logs every key it receives. The first argument is
 * a scenario file; the rest is the real worker command line, whose `-n` name replaces the recorded
 * session's name on the screen.
 *
 * Scenario: `{screen, log, sessionsDir, registry, onType}`.
 * - `screen`: the fixture to draw first.
 * - `log`: a JSON-lines file; every key is one line, `{typed}`, `{key}` or `{submit}`; the first
 *   line is `{argv, pid}`.
 * - `sessionsDir` and `registry`: the registry entry (`status`, `waitingFor`) written to
 *   `<sessionsDir>/<pid>.json`; null writes none, like a session held by a dialog at start.
 * - `onType`: a fixture to switch to at the first typed character (a dialog that opens while the
 *   doorbell is typed); the typed text is lost, as it would be.
 *
 * On a screen with the prompt box, typed text shows in the box; C-u clears it; Enter submits it,
 * and `/exit` exits. On any other screen keys are only logged.
 */
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [scenarioFile, ...argv] = process.argv.slice(2);
const scenario = JSON.parse(readFileSync(scenarioFile, "utf8"));
const screens = JSON.parse(readFileSync(new URL("../fixtures/screens.json", import.meta.url), "utf8"));
const name = argv[argv.indexOf("-n") + 1];
const log = (/** @type {any} */ entry) => appendFileSync(scenario.log, `${JSON.stringify(entry)}\n`);
log({ argv, pid: process.pid });

const registryFile = join(scenario.sessionsDir, `${process.pid}.json`);
if (scenario.registry) {
    const entry = {
        pid: process.pid,
        sessionId: `sess-${process.pid}`,
        cwd: process.cwd(),
        name,
        ...scenario.registry,
    };
    writeFileSync(registryFile, JSON.stringify(entry));
}

let current = scenario.screen;
/** The box's text once a key changed it; null shows the recorded box. */
let buffer = /** @type {string | null} */ (null);
let switchedOnType = false;

/**
 * The current screen's lines, the recorded name replaced, with the typed text in the prompt box.
 * Typing appends to what the recorded box holds.
 * @returns {{lines: string[], box: number}} the lines and the box line's index, -1 when none
 */
function lines() {
    const fixture = screens[current];
    const out = fixture.text.replaceAll(fixture.name, name).split("\n");
    const top = out.findLastIndex((l) => l.startsWith("\u2500") && l.endsWith(` ${name} \u2500`));
    const box = top >= 0 && out[top + 1]?.startsWith("\u276F") ? top + 1 : -1;
    if (box >= 0 && buffer !== null) out[box] = `\u276F\u00A0${buffer}`;
    return { lines: out, box };
}

/** Draws the screen, one line per row. */
function draw() {
    const rows = lines().lines.map((l, i) => `\u001b[${i + 1};1H\u001b[2K${l}`);
    process.stdout.write(`\u001b[2J${rows.join("")}`);
}

/** Removes the registry entry and exits. */
function quit() {
    rmSync(registryFile, { force: true });
    process.exit(0);
}

process.on("SIGTERM", quit);
process.on("SIGHUP", quit);
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
/**
 * Takes one key.
 * @param {string} ch the key
 */
function key(ch) {
    if (ch === "\r") {
        log({ submit: buffer ?? "" });
        if (buffer === "/exit") quit();
        buffer = "";
    } else if (ch === "\u0015") {
        log({ key: "C-u" });
        buffer = "";
    } else if (ch === "\u001b") {
        log({ key: "Escape" });
    } else {
        log({ typed: ch });
        type(ch);
    }
}

/**
 * A typed character: the scenario's dialog opens at the first one; otherwise it goes into the box.
 * @param {string} ch the character
 */
function type(ch) {
    if (scenario.onType && !switchedOnType) {
        switchedOnType = true;
        current = scenario.onType;
        return;
    }
    const { box } = lines();
    if (box < 0) return;
    const recorded = screens[current].text.split("\n")[box] ?? "";
    buffer = (buffer ?? recorded.slice(2).trimEnd()) + ch;
}

process.stdin.on("data", (/** @type {string} */ chunk) => {
    for (const ch of chunk) key(ch);
    draw();
});
draw();
