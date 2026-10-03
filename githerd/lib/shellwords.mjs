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

/**
 * The parser's position in one command list.
 * @typedef {object} ListState
 * @property {number} i the index of the next character
 * @property {string | null} word the word being read, or null between words
 * @property {"arg" | "target" | "herestring"} next what the word being read becomes
 * @property {{delim: string, strip: boolean, into: string[]}[]} heredocs here-documents opened on this line
 * @property {SimpleCommand} cur the command being read
 * @property {number} cmdStart the first output command of the current `&`-able list
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
        /** @type {ListState} */
        const st = { i: start, word: null, next: "arg", heredocs: [], cur: newCommand(), cmdStart: this.out.length };
        while (st.i < this.s.length) {
            if (this.step(st, inParen)) return st.i;
        }
        if (inParen) throw new Error("unterminated ( or $(");
        this.endCommand(st);
        return st.i;
    }

    /**
     * Finishes the word being read, if any.
     * @param {ListState} st the list being parsed
     */
    endWord(st) {
        if (st.word === null) return;
        if (st.next === "arg") st.cur.argv.push(st.word);
        else if (st.next === "herestring") st.cur.input.push(st.word);
        st.next = "arg";
        st.word = null;
    }

    /**
     * Finishes the command being read; `&` marks it and the commands of its list as background.
     * @param {ListState} st the list being parsed
     * @param {boolean} [background] true after `&`
     */
    endCommand(st, background = false) {
        this.endWord(st);
        if (st.cur.argv.length > 0) this.out.push(st.cur);
        if (background) for (let k = st.cmdStart; k < this.out.length; k++) this.out[k].background = true;
        st.cur = newCommand();
        st.cmdStart = this.out.length;
    }

    /**
     * Consumes one token's worth of text.
     * @param {ListState} st the list being parsed
     * @param {boolean} inParen true inside `(...)` or `$(...)`
     * @returns {boolean} true when a `)` closed the list
     */
    step(st, inParen) {
        const s = this.s;
        const c = s[st.i];
        if (st.word === null && c === "#") {
            while (st.i < s.length && s[st.i] !== "\n") st.i++;
            return false;
        }
        if (c === " " || c === "\t") {
            this.endWord(st);
            st.i++;
            return false;
        }
        if (this.wordPart(st) || this.redirection(st)) return false;
        return this.operator(st, inParen);
    }

    /**
     * Reads a quoted or escaped piece of a word, or a substitution inside one.
     * @param {ListState} st the list being parsed
     * @returns {boolean} true when it consumed something
     */
    wordPart(st) {
        const s = this.s;
        const c = s[st.i];
        let text;
        if (c === "\\" && s[st.i + 1] === "\n") {
            // A line continuation: no word starts here.
            st.i += 2;
            return true;
        } else if (c === "\\") {
            text = s[st.i + 1] ?? "";
            st.i += 2;
        } else if (c === "'") {
            const close = s.indexOf("'", st.i + 1);
            if (close === -1) throw new Error("unterminated single quote");
            text = s.slice(st.i + 1, close);
            st.i = close + 1;
        } else if (c === '"') {
            [text, st.i] = this.doubleQuoted(st.i + 1);
        } else if (c === "`") {
            [text, st.i] = this.backtick(st.i);
        } else if (c === "$" && s[st.i + 1] === "(") {
            const after = this.list(st.i + 2, true);
            text = s.slice(st.i, after);
            st.i = after;
        } else {
            return false;
        }
        st.word = (st.word ?? "") + text;
        return true;
    }

    /**
     * Reads a redirection, a here-document or here-string, or a process substitution.
     * @param {ListState} st the list being parsed
     * @returns {boolean} true when it consumed something
     */
    redirection(st) {
        const s = this.s;
        const c = s[st.i];
        const d = s[st.i + 1];
        if (c === "&" && d === ">") {
            this.endWord(st);
            st.i += s[st.i + 2] === ">" ? 3 : 2;
            st.next = "target";
            return true;
        }
        if (c !== "<" && c !== ">") return false;
        if (d === "(") {
            this.endWord(st);
            st.i = this.list(st.i + 2, true);
        } else if (c === "<" && d === "<") {
            this.endWord(st);
            if (s[st.i + 2] === "<") {
                st.next = "herestring";
                st.i += 3;
            } else {
                this.heredoc(st);
            }
        } else {
            if (st.word !== null && /^\d+$/.test(st.word)) st.word = null;
            this.endWord(st);
            st.i++;
            if (s[st.i] === ">" || s[st.i] === "&" || s[st.i] === "|") st.i++;
            st.next = "target";
        }
        return true;
    }

    /**
     * Opens a here-document at `<<`; its body is read after the line ends.
     * @param {ListState} st the list being parsed, at the `<<`
     */
    heredoc(st) {
        const s = this.s;
        st.i += 2;
        const strip = s[st.i] === "-";
        if (strip) st.i++;
        while (s[st.i] === " " || s[st.i] === "\t") st.i++;
        const [delim, after] = this.delimiter(st.i);
        st.heredocs.push({ delim, strip, into: st.cur.input });
        st.i = after;
    }

    /**
     * Reads a control operator, a newline, a parenthesis, or one plain character of a word.
     * @param {ListState} st the list being parsed
     * @param {boolean} inParen true inside `(...)` or `$(...)`
     * @returns {boolean} true when a `)` closed the list
     */
    operator(st, inParen) {
        const s = this.s;
        const c = s[st.i];
        const d = s[st.i + 1];
        if (c === "&") {
            this.endCommand(st, d !== "&");
            st.i += d === "&" ? 2 : 1;
        } else if (c === "|" || c === ";") {
            this.endCommand(st);
            st.i += d === c || (c === "|" && d === "&") ? 2 : 1;
        } else if (c === "\n") {
            this.endCommand(st);
            st.i = this.heredocBodies(st.i + 1, st.heredocs);
            st.heredocs = [];
        } else if (c === "(") {
            this.endWord(st);
            st.i = this.list(st.i + 1, true);
        } else if (c === ")") {
            if (!inParen) throw new Error("unbalanced )");
            this.endCommand(st);
            st.i++;
            return true;
        } else {
            st.word = (st.word ?? "") + c;
            st.i++;
        }
        return false;
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
 * Drops leading reserved words and assignments, recording the assignments.
 * @param {string[]} argv the words
 * @param {string[]} assign collects the assignments
 * @returns {string[]} the words from the command name on
 */
function stripLeading(argv, assign) {
    let k = 0;
    while (k < argv.length && (RESERVED.has(argv[k]) || ASSIGNMENT.test(argv[k]))) {
        if (ASSIGNMENT.test(argv[k])) assign.push(argv[k]);
        k++;
    }
    return argv.slice(k);
}

/** `env` options that take the next word as their value. */
const ENV_WITH_VALUE = new Set(["-u", "-C", "--unset", "--chdir"]);

/**
 * Reads `env`'s options and assignments.
 * @param {string[]} rest env's arguments
 * @param {string[]} assign collects the assignments
 * @returns {{split?: string, k: number}} the command line `-S` gives, or how many words precede
 *   the command
 */
function envOptions(rest, assign) {
    let k = 0;
    while (k < rest.length) {
        const a = rest[k];
        if (a === "--") return { k: k + 1 };
        if (a === "-S" || a === "--split-string") return { split: rest.slice(k + 1).join(" "), k };
        if (a.startsWith("--split-string=")) {
            return { split: [a.slice("--split-string=".length), ...rest.slice(k + 1)].join(" "), k };
        }
        if (ENV_WITH_VALUE.has(a)) k += 2;
        else if (a.startsWith("-") || ASSIGNMENT.test(a)) {
            if (!a.startsWith("-")) assign.push(a);
            k++;
        } else break;
    }
    return { k };
}

/**
 * The script a shell runs with `-c`.
 * @param {string[]} rest the shell's arguments
 * @returns {string | null | undefined} the script; undefined when `-c` has none, null without `-c`
 */
function shellScript(rest) {
    const flag = rest.findIndex((a) => /^-[a-zA-Z]+$/.test(a) && a.includes("c"));
    if (flag === -1) return null;
    return rest.slice(flag + 1).find((a) => !a.startsWith("-"));
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
    for (;;) {
        argv = stripLeading(argv, assign);
        if (argv.length === 0) return [];
        const name = baseName(argv[0]);
        const rest = argv.slice(1);
        if (name === "eval") return nested(rest.join(" "));
        if (SHELLS.has(name)) {
            const script = shellScript(rest);
            if (script === null) break;
            return script === undefined ? [] : nested(script);
        }
        if (name === "env") {
            const env = envOptions(rest, assign);
            if (env.split !== undefined) return nested(env.split);
            argv = rest.slice(env.k);
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
