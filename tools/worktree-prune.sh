#!/usr/bin/env bash
#
# List, and on confirmation remove, worktrees whose work is finished.
#
# A worktree is a candidate when its branch is merged into origin/master, or when its upstream
# branch has been deleted on origin ("gone"). Master merges pull requests with merge commits, so
# a merged branch's tip is an ancestor of origin/master that is NOT on master's first-parent
# line; a new branch with no commits of its own sits on that line and is therefore not "merged".
#
# For each candidate it prints the branch, why it qualifies, its size, its uncommitted changes and
# every process whose working directory is inside it (a dev server left running, for example), and
# the online servherd servers whose working directory is inside it. It then asks before removing each
# one with `git worktree remove`, without --force: git refuses a worktree with uncommitted or
# untracked changes. On a yes it first stops and removes those servherd servers (the servherd CLI;
# without it, it prints the servherd_stop/servherd_remove calls and skips), and it skips a worktree
# that still has a live process. A live tool's worktree (tools/live-tools.json) is never a candidate.
# The branch itself is kept. It never stashes, checks out or resets anything, and never touches
# the main checkout or the worktree it runs from.
#
# Usage:
#   ./tools/worktree-prune.sh [--dry-run]
#     --dry-run  list the candidates and remove nothing

set -euo pipefail

DRY=0
case "${1:-}" in
    "") ;;
    --dry-run | -n) DRY=1 ;;
    *) echo "usage: worktree-prune.sh [--dry-run]" >&2; exit 2 ;;
esac

MAIN="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
HERE="$(git rev-parse --show-toplevel)"
git -C "$MAIN" fetch --quiet --prune origin

FIRST_PARENT="$(mktemp)"
trap 'rm -f "$FIRST_PARENT"' EXIT
git -C "$MAIN" rev-list --first-parent origin/master >"$FIRST_PARENT"

# processes whose cwd is the directory or below it
procs_in() {
    local dir="$1" p cwd
    for p in /proc/[0-9]*; do
        cwd="$(readlink "$p/cwd" 2>/dev/null)" || continue
        case "$cwd/" in
            "$dir"/*) echo "        pid ${p#/proc/}: $(tr '\0\n' '  ' <"$p/cmdline" 2>/dev/null | cut -c1-100)" ;;
        esac
    done
}

# names of the online servherd servers (a live pid in servherd's pm2 pid files) whose cwd is the directory or below it.
# servherd keys a server by name plus directory but `servherd stop` takes only the name, so a name that another
# directory also registers is left out (with a note on stderr): stopping it could stop the other directory's server.
servers_in() {
    node -e '
        const fs = require("fs"), path = require("path"), home = require("os").homedir();
        const dir = process.argv[1], pids = path.join(home, ".servherd/pm2/pids");
        const alive = (f) => { try { process.kill(Number(fs.readFileSync(path.join(pids, f), "utf8")), 0); return true; } catch (e) { return e.code === "EPERM"; } };
        let running = [], reg = [];
        try { running = fs.readdirSync(pids).filter(alive); } catch {}
        try { reg = JSON.parse(fs.readFileSync(path.join(home, ".servherd/registry.json"), "utf8")).servers ?? []; } catch {}
        for (const s of reg) {
            const online = running.some((f) => f.startsWith(s.pm2Name + "-") && /^\d+\.pid$/.test(f.slice(s.pm2Name.length + 1)));
            if (!online || !(s.cwd + "/").startsWith(dir + "/")) continue;
            const elsewhere = reg.filter((o) => o.name === s.name && !(o.cwd + "/").startsWith(dir + "/"));
            if (elsewhere.length) console.error(`    server ${s.name} not stopped: the same name is registered in ${elsewhere.map((o) => o.cwd).join(", ")}`);
            else console.log(s.name);
        }' "$1"
}

# worktrees of the live tools, which run from them on purpose
live_tool_dirs() {
    node -e 'for (const t of Object.values(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")))) if (t?.worktree) console.log(require("path").resolve(process.argv[2], t.worktree))' \
        "$MAIN/tools/live-tools.json" "$MAIN" 2>/dev/null || true
}
LIVE_TOOLS="$(live_tool_dirs)"

consider() {
    local path="$1" branch="$2" reason="" tip dirty live servers s
    [ "$path" = "$MAIN" ] || [ "$path" = "$HERE" ] && return 0
    grep -qxF "$path" <<<"$LIVE_TOOLS" && return 0
    [ -n "$branch" ] || return 0 # detached HEAD: nothing to judge it by
    tip="$(git -C "$MAIN" rev-parse "refs/heads/$branch")"
    if [ "$(git -C "$MAIN" for-each-ref --format='%(upstream:track)' "refs/heads/$branch")" = "[gone]" ]; then
        reason="upstream deleted"
    elif git -C "$MAIN" merge-base --is-ancestor "$tip" origin/master && ! grep -qx "$tip" "$FIRST_PARENT"; then
        reason="merged into origin/master"
    fi
    [ -n "$reason" ] || return 0

    dirty="$(git -C "$path" status --porcelain 2>/dev/null | wc -l)"
    live="$(procs_in "$path")"
    servers="$(servers_in "$path")"
    echo "$branch ($reason)"
    echo "    path:   $path"
    echo "    size:   $(du -sh "$path" 2>/dev/null | cut -f1)"
    echo "    dirty:  $dirty uncommitted or untracked file(s)"
    if [ -n "$servers" ]; then
        echo "    servherd servers: $(tr '\n' ' ' <<<"$servers")"
    fi
    if [ -n "$live" ]; then
        echo "    processes:"
        echo "$live"
    fi

    [ "$DRY" = 1 ] && return 0
    local answer=""
    read -r -p "    remove this worktree${servers:+ and stop its servers}? [y/N] " answer </dev/tty || answer=""
    [ "$answer" = y ] || [ "$answer" = Y ] || return 0
    if [ -n "$servers" ]; then
        if ! command -v servherd >/dev/null 2>&1; then
            while IFS= read -r s; do echo "    no servherd CLI here: servherd_stop({ name: \"$s\" }) then servherd_remove({ name: \"$s\" })"; done <<<"$servers"
            echo "    skipped: stop its servers first"
            return 0
        fi
        servers="$(servers_in "$path")" # read the cwds again just before stopping
        [ -n "$servers" ] && while IFS= read -r s; do
            servherd stop "$s" >/dev/null && servherd remove "$s" --force >/dev/null && echo "    stopped server $s" || echo "    could not stop server $s"
        done <<<"$servers"
        live="$(procs_in "$path")"
    fi
    if [ -n "$live" ]; then
        echo "    skipped: stop the processes above first"
        return 0
    fi
    git -C "$MAIN" worktree remove "$path" && echo "    removed" || echo "    not removed (see git's message)"
}

path="" branch=""
while IFS= read -r line; do
    case "$line" in
        "worktree "*) path="${line#worktree }"; branch="" ;;
        "branch refs/heads/"*) branch="${line#branch refs/heads/}" ;;
        "") [ -n "$path" ] && consider "$path" "$branch"; path="" ;;
    esac
done < <(git -C "$MAIN" worktree list --porcelain; echo)
