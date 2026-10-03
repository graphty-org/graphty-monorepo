/**
 * Splits a shell command line into the simple commands it would run, for the guard hook (design
 * section 9.4). It follows POSIX shell quoting closely enough to see through the ordinary
 * spellings of a command: quotes and backslashes, `;`, `&&`, `||`, `|`, `&` and newlines,
 * `$(...)`, backticks and process substitution, subshells, redirections, here-documents, leading
 * variable assignments, reserved words, and the wrappers `env`, `command`, `exec`, `nice`, `time`,
 * `timeout`, `stdbuf`, `xargs`, `eval` and `sh -c` (with bash, zsh, dash and ksh).
 *
 * It is not a shell. Text produced at run time (`$VAR`, `$(...)` used as a word) is kept as its
 * source text, so a determined command can still be spelled past it. Input it cannot parse (an
 * unterminated quote or substitution, an unbalanced parenthesis) throws, and the guard denies it.
 */

/**
 * One simple command.
 * @typedef {object} SimpleCommand
 * @property {string[]} argv the words after quote removal; a substitution stays as its source text
 * @property {boolean} background true when the command, or a list it is part of, ends in `&`
 * @property {string[]} input here-document bodies and here-strings fed to its standard input
 * @property {string[]} assign leading `NAME=value` assignments, including those given to `env`
 */

/** Characters that end an unquoted word. */
const META = new Set([" ", "\t", "\n", ";", "&", "|", "<", ">", "(", ")"]);

/** Words that start or end a compound command and are not themselves the command. */
const RESERVED = new Set(["{", "}", "!", "if", "then", "else", "elif", "fi", "do", "done", "while", "until"]);

const ASSIGNMENT = /^[A-Za-z_]\w*=/;

const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);

/** How deep `sh -c`, `eval` and `env -S` may nest before the input is refused. */
const MAX_DEPTH = 8;

/**
 * Parses `text` into its simple commands, with wrappers removed.
 * @param {string} text a shell command line, possibly several lines
 * @returns {SimpleCommand[]} every simple command, in source order, including those inside
 *   substitutions
 */
export function splitCommands(text) {
    return parse(text, 0);
}

/**
 * The last path component of a command name: `/usr/bin/git` is `git`.
 * @param {string} word a command word
 * @returns {string} its base name
 */
export function baseName(word) {
    return word.slice(word.lastIndexOf("/") + 1);
}

/**
 * Parses and unwraps, refusing runaway nesting.
 * @param {string} text the command line
 * @param {number} depth nesting of `sh -c` and friends so far
 * @returns {SimpleCommand[]} the unwrapped commands
 */
function parse(text, depth) {
    if (depth > MAX_DEPTH) throw new Error("commands nested too deeply");
    /** @type {SimpleCommand[]} */
    const raw = [];
    new Parser(text, raw).list(0, false);
    return raw.flatMap((cmd) => unwrap(cmd, depth));
}

class Parser {
    /**
     * A parser over one piece of text.
     * @param {string} s the text
     * @param {SimpleCommand[]} out where finished commands go
     */
    constructor(s, out) {
        this.s = s;
        this.out = out;
    }

    /**
     * Parses a command list until the end of the text or, inside parentheses, the closing `)`.
     * @param {number} start index to start at
     * @param {boolean} inParen true inside `(...)` or `$(...)`
     * @returns {number} the index after the list (after the `)` when `inParen`)
     */
    list(start, inParen) {
        const s = this.s;
        let i = start;
        /** @type {string | null} */
        let word = null;
        /** What the next finished word is: an argument, a redirection target, or a here-string. */
        let next = "arg";
        /** @type {{delim: string, strip: boolean, into: string[]}[]} */
        let heredocs = [];
        let cur = newCommand();
        let cmdStart = this.out.length;

        const endWord = () => {
            if (word === null) return;
            if (next === "arg") cur.argv.push(word);
            else if (next === "herestring") cur.input.push(word);
            next = "arg";
            word = null;
        };
        const endCommand = (background = false) => {
            endWord();
            if (cur.argv.length > 0) this.out.push(cur);
            if (background) for (let k = cmdStart; k < this.out.length; k++) this.out[k].background = true;
            cur = newCommand();
            cmdStart = this.out.length;
        };

        while (i < s.length) {
            const c = s[i];
            if (word === null && c === "#") {
                while (i < s.length && s[i] !== "\n") i++;
            } else if (c === " " || c === "\t") {
                endWord();
                i++;
            } else if (c === "\\") {
                if (s[i + 1] !== "\n") word = (word ?? "") + (s[i + 1] ?? "");
                i += 2;
            } else if (c === "'") {
                const close = s.indexOf("'", i + 1);
                if (close === -1) throw new Error("unterminated single quote");
                word = (word ?? "") + s.slice(i + 1, close);
                i = close + 1;
            } else if (c === '"') {
                const [text, after] = this.doubleQuoted(i + 1);
                word = (word ?? "") + text;
                i = after;
            } else if (c === "`") {
                const [source, after] = this.backtick(i);
                word = (word ?? "") + source;
                i = after;
            } else if (c === "$" && s[i + 1] === "(") {
                const after = this.list(i + 2, true);
                word = (word ?? "") + s.slice(i, after);
                i = after;
            } else if ((c === "<" || c === ">") && s[i + 1] === "(") {
                endWord();
                i = this.list(i + 2, true);
            } else if (c === "<" && s.startsWith("<<<", i)) {
                endWord();
                next = "herestring";
                i += 3;
            } else if (c === "<" && s[i + 1] === "<") {
                endWord();
                i += 2;
                const strip = s[i] === "-";
                if (strip) i++;
                while (s[i] === " " || s[i] === "\t") i++;
                const [delim, after] = this.delimiter(i);
                heredocs.push({ delim, strip, into: cur.input });
                i = after;
            } else if (c === "<" || c === ">") {
                if (word !== null && /^\d+$/.test(word)) word = null;
                endWord();
                i++;
                if (s[i] === ">" || s[i] === "&" || s[i] === "|") i++;
                next = "target";
            } else if (c === "&" && s[i + 1] === ">") {
                endWord();
                i += s[i + 2] === ">" ? 3 : 2;
                next = "target";
            } else if (c === "&" && s[i + 1] === "&") {
                endCommand();
                i += 2;
            } else if (c === "&") {
                endCommand(true);
                i++;
            } else if (c === "|" || c === ";") {
                endCommand();
                i += s[i + 1] === c || (c === "|" && s[i + 1] === "&") ? 2 : 1;
            } else if (c === "\n") {
                endCommand();
                i = this.heredocBodies(i + 1, heredocs);
                heredocs = [];
            } else if (c === "(") {
                endWord();
                i = this.list(i + 1, true);
            } else if (c === ")") {
                if (!inParen) throw new Error("unbalanced )");
                endCommand();
                return i + 1;
            } else {
                word = (word ?? "") + c;
                i++;
            }
        }
        if (inParen) throw new Error("unterminated ( or $(");
        endCommand();
        return i;
    }

    /**
     * Reads a double-quoted string, parsing any substitution inside it.
     * @param {number} start the index after the opening quote
     * @returns {[string, number]} the text and the index after the closing quote
     */
    doubleQuoted(start) {
        const s = this.s;
        let text = "";
        let i = start;
        while (i < s.length) {
            const c = s[i];
            if (c === '"') return [text, i + 1];
            if (c === "\\" && '$`"\\\n'.includes(s[i + 1])) {
                if (s[i + 1] !== "\n") text += s[i + 1];
                i += 2;
            } else if (c === "$" && s[i + 1] === "(") {
                const after = this.list(i + 2, true);
                text += s.slice(i, after);
                i = after;
            } else if (c === "`") {
                const [source, after] = this.backtick(i);
                text += source;
                i = after;
            } else {
                text += c;
                i++;
            }
        }
        throw new Error("unterminated double quote");
    }

    /**
     * Reads a backtick substitution and parses the commands inside it.
     * @param {number} start the index of the opening backtick
     * @returns {[string, number]} the source text and the index after the closing backtick
     */
    backtick(start) {
        const s = this.s;
        let i = start + 1;
        let inner = "";
        while (i < s.length && s[i] !== "`") {
            if (s[i] === "\\" && i + 1 < s.length) {
                inner += s[i + 1];
                i += 2;
            } else {
                inner += s[i++];
            }
        }
        if (i >= s.length) throw new Error("unterminated backtick");
        new Parser(inner, this.out).list(0, false);
        return [s.slice(start, i + 1), i + 1];
    }

    /**
     * Reads a here-document delimiter word, removing its quotes.
     * @param {number} start index of the word
     * @returns {[string, number]} the delimiter and the index after it
     */
    delimiter(start) {
        const s = this.s;
        let i = start;
        let delim = "";
        while (i < s.length && !META.has(s[i])) {
            if (s[i] === "'" || s[i] === '"') {
                const close = s.indexOf(s[i], i + 1);
                if (close === -1) throw new Error("unterminated quote in here-document delimiter");
                delim += s.slice(i + 1, close);
                i = close + 1;
            } else if (s[i] === "\\") {
                delim += s[i + 1] ?? "";
                i += 2;
            } else {
                delim += s[i++];
            }
        }
        if (delim === "") throw new Error("here-document without a delimiter");
        return [delim, i];
    }

    /**
     * Consumes the bodies of the here-documents opened on the line just ended.
     * @param {number} start index of the first body line
     * @param {{delim: string, strip: boolean, into: string[]}[]} heredocs the open here-documents
     * @returns {number} the index after the last delimiter line
     */
    heredocBodies(start, heredocs) {
        const s = this.s;
        let i = start;
        for (const doc of heredocs) {
            const lines = [];
            while (i < s.length) {
                const nl = s.indexOf("\n", i);
                const line = s.slice(i, nl === -1 ? s.length : nl);
                i = nl === -1 ? s.length : nl + 1;
                if ((doc.strip ? line.replace(/^\t+/, "") : line) === doc.delim) break;
                lines.push(line);
            }
            doc.into.push(lines.join("\n"));
        }
        return i;
    }
}

/**
 * A command with no words yet.
 * @returns {SimpleCommand} an empty command
 */
function newCommand() {
    return { argv: [], background: false, input: [], assign: [] };
}

/**
 * Removes assignments, reserved words and wrapper commands, so the command that really runs is
 * first. `sh -c`, `eval` and `env -S` strings are parsed again.
 * @param {SimpleCommand} cmd a command from the parser
 * @param {number} depth nesting so far
 * @returns {SimpleCommand[]} zero or more commands
 */
function unwrap(cmd, depth) {
    let argv = cmd.argv;
    const assign = [...cmd.assign];
    for (;;) {
        while (argv.length > 0 && (RESERVED.has(argv[0]) || ASSIGNMENT.test(argv[0]))) {
            if (ASSIGNMENT.test(argv[0])) assign.push(argv[0]);
            argv = argv.slice(1);
        }
        if (argv.length === 0) return [];
        const name = baseName(argv[0]);
        const rest = argv.slice(1);
        /**
         * Parses a nested command line, carrying this command's flags into it.
         * @param {string} text a nested command line
         * @returns {SimpleCommand[]} its commands
         */
        const nested = (text) =>
            parse(text, depth + 1).map((c) => ({
                ...c,
                background: c.background || cmd.background,
                assign: [...assign, ...c.assign],
            }));

        if (name === "eval") return nested(rest.join(" "));
        if (SHELLS.has(name)) {
            const flag = rest.findIndex((a) => /^-[a-zA-Z]+$/.test(a) && a.includes("c"));
            if (flag === -1) break;
            const script = rest.slice(flag + 1).find((a) => !a.startsWith("-"));
            return script === undefined ? [] : nested(script);
        }
        if (name === "env") {
            let k = 0;
            while (k < rest.length) {
                const a = rest[k];
                if (a === "--") {
                    k++;
                    break;
                }
                if (a === "-S" || a === "--split-string") return nested(rest.slice(k + 1).join(" "));
                if (a.startsWith("--split-string=")) {
                    return nested([a.slice("--split-string=".length), ...rest.slice(k + 1)].join(" "));
                }
                if (a === "-u" || a === "-C" || a === "--unset" || a === "--chdir") k += 2;
                else if (a.startsWith("-")) k++;
                else if (ASSIGNMENT.test(a)) {
                    assign.push(a);
                    k++;
                } else break;
            }
            argv = rest.slice(k);
            continue;
        }
        const skip = WRAPPERS[name];
        if (skip === undefined) break;
        argv = rest.slice(skip(rest));
    }
    return [{ ...cmd, argv, assign }];
}

/**
 * Counts the option words a wrapper takes before its command.
 * @param {string[]} args the wrapper's arguments
 * @param {Set<string>} withValue options that take the next word as their value
 * @param {number} [positional] plain words before the command (timeout's duration)
 * @returns {number} how many words to drop
 */
function optionsBefore(args, withValue, positional = 0) {
    let k = 0;
    while (k < args.length && args[k].startsWith("-") && args[k] !== "-") {
        if (args[k] === "--") return k + 1 + positional;
        k += withValue.has(args[k]) ? 2 : 1;
    }
    return k + positional;
}

/** @type {Record<string, (args: string[]) => number>} */
const WRAPPERS = {
    command: (a) => optionsBefore(a, new Set()),
    exec: (a) => optionsBefore(a, new Set(["-a"])),
    nice: (a) => optionsBefore(a, new Set(["-n"])),
    time: (a) => optionsBefore(a, new Set()),
    timeout: (a) => optionsBefore(a, new Set(["-s", "-k", "--signal", "--kill-after"]), 1),
    stdbuf: (a) => optionsBefore(a, new Set(["-i", "-o", "-e"])),
    xargs: (a) => optionsBefore(a, new Set(["-I", "-n", "-P", "-L", "-s", "-d", "-E", "-a"])),
};
