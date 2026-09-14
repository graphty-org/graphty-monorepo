#!/usr/bin/env bash
#
# commit-changes.sh -- land the working tree as a sequence of conventional commits.
#
# Start here:
#
#   ./tools/commit-changes.sh --dry-run     # read the plan; STAGES NOTHING
#   ./tools/commit-changes.sh               # make the commits
#   ./tools/commit-changes.sh --check       # run prepush:fast first, abort if it fails
#
# WHY THIS SCRIPT EXISTS, and why it does not use `git commit -m`.
#
# .husky/prepare-commit-msg is:
#
#     exec < /dev/tty && npx cz --hook || true
#
# That is Commitizen's INTERACTIVE prompt. A scripted `git commit -m "..."` hands
# control to the wizard, which either replaces the message it was given or hangs
# waiting for an answer nobody is watching -- so the commit never lands. The fix,
# taken from tmp/commit-hardening.sh, is to commit with core.hooksPath pointed at a
# temporary directory holding a copy of .husky/commit-msg and NOTHING else:
# commitlint still validates every message, and prepare-commit-msg is not there to
# run. The directory is removed in an EXIT trap. (.husky currently has no pre-commit
# hook; if one is added, it has to be copied in here too or it will be skipped.)
#
# It does NOT push. Pushing stays a separate, deliberate step -- and the pre-push
# hook (.husky/pre-push -> pnpm run prepush:fast -> tools/prepush.sh) runs the
# validation then.
#
# The plan below is tailored to one specific change set: the app shell work of
# 2026-09. It is data, not machinery -- STEPS, SUBJECTS, PATHS and one body_*
# function each. Re-point it at the next change set rather than reusing the
# messages, and read the diff before you write a message, not a summary of it.
#
# The repository releases with semantic-release, so every subject has to be a
# conventional commit: <type>(<scope>): <subject>, where type is one of
# feat / fix / perf / refactor / docs / test / build / ci / chore / style / revert
# and scope comes from commitlint.config.js's scope-enum. Subjects, scopes and body
# line lengths are all checked here, before anything is staged, rather than being
# discovered by a commit-msg failure halfway through the run.

set -euo pipefail

# Associative arrays, so bash 4 or newer. macOS ships bash 3.2 as /bin/bash; the
# shebang finds a newer one on PATH, and this says so rather than failing obscurely
# on an unbound variable.
if [ -z "${BASH_VERSINFO:-}" ] || [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
    echo "commit-changes: needs bash 4 or newer (found ${BASH_VERSION:-unknown})." >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DRY_RUN=0
CHECK=0

usage() {
    cat <<'USAGE'
commit-changes.sh -- land the working tree as a sequence of conventional commits.

  ./tools/commit-changes.sh --check     Validate every message against commitlint
                                        and STOP. Stages nothing, commits nothing.

  ./tools/commit-changes.sh --dry-run   Print the plan: every commit, its subject,
                                       its message and its diffstat. STAGES NOTHING
                                       and touches neither the index nor HEAD. Do
                                       this first, every time.
  ./tools/commit-changes.sh             Make the commits. One signing passphrase
                                       prompt per commit; no Commitizen wizard.
  ./tools/commit-changes.sh --check     Run `pnpm run prepush:fast` first and abort
                                       if it fails. Slow (minutes), thorough.
  ./tools/commit-changes.sh --help      This text.

Options: -n/--dry-run, -c/--check, -h/--help.

A commit whose paths have nothing left to commit is skipped with a note, so a
re-run after an interruption picks up where it stopped. Nothing is pushed.
USAGE
}

while [ $# -gt 0 ]; do
    case "$1" in
        -n|--dry-run)
            DRY_RUN=1
            shift
            ;;
        -c|--check)
            CHECK=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            echo "commit-changes: unexpected argument '$1'" >&2
            echo "This script carries its own messages; it takes no message argument." >&2
            echo "Try './tools/commit-changes.sh --help'." >&2
            exit 2
            ;;
    esac
done

# ---------------------------------------------------------------------------
# THE PLAN.
#
# One entry per commit, in the order they are made. The order is a build order:
# the dependency before the code that imports it, the library before the app, the
# shell before the deletion of the shell it supersedes, tooling last.
#
# PATHS entries are space-separated pathspecs (no path in this repository has a
# space in it, so the word splitting below is deliberate). A directory pathspec
# takes everything under it, which is what makes the 134-file shell one entry --
# ignored files under it (the __screenshots__ directories) are not added, because
# `git add` without -f leaves ignored paths alone and the preview below uses
# `git ls-files --others --exclude-standard`, which counts the same set.
# ---------------------------------------------------------------------------

STEPS=(element theme rules inputs bridge styling labels spec tooling)

declare -A SUBJECTS=(
    [element]="fix(graphty-element): let a calculated style reach a wrapped schema branch"
    [theme]="fix(compact-mantine): give the active icon button a state boundary that meets 3:1"
    [rules]="docs(workspace): require default components and style-layer-only graph styling"
    [inputs]="fix(graphty): let the Explore search take typing and the palette open focused"
    [bridge]="fix(graphty): write every style branch in the shape graphty-element interns"
    [styling]="fix(graphty): carry a style edit to the layer without clobbering the rest"
    [labels]="feat(graphty): draw the top-degree labels from a calculated style, with a switch"
    [spec]="docs(graphty): design the interactions the shell kept getting wrong"
    [tooling]="chore(tools): make --check stop, and ignore Python bytecode caches"
)

declare -A PATHS=(
    [element]="graphty-element/src/ChangeManager.ts
               graphty-element/test/change-manager.test.ts"
    [theme]="compact-mantine/src/theme/components/buttons.ts
             compact-mantine/src/theme/styles/buttons.ts
             compact-mantine/tests/theme/buttons.test.ts
             compact-mantine/tests/theme/buttons-integration.test.tsx"
    [rules]="CLAUDE.md"
    [inputs]="graphty/src/components/shell/panel/ExplorePanel.tsx
              graphty/src/components/shell/panel/__tests__/ExplorePanel.test.tsx
              graphty/src/components/shell/CommandPalette.tsx
              graphty/src/components/shell/__tests__/CommandPalette.test.tsx"
    [bridge]="graphty/src/utils/styleBridge.ts
              graphty/src/utils/__tests__/styleBridge.test.ts
              graphty/src/utils/richTextStyleBridge.ts
              graphty/src/utils/__tests__/richTextStyleBridge.test.ts
              graphty/src/types/style-layer.ts
              graphty/src/components/Graphty.tsx
              graphty/src/components/__tests__/Graphty.test.tsx"
    [styling]="graphty/src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx
               graphty/src/components/sidebar/panels/__tests__/StyleLayerPropertiesPanel.test.tsx
               graphty/src/components/shell/panel/PanelHeader.tsx
               graphty/src/components/shell/panel/__tests__/PanelHeader.test.tsx
               graphty/src/components/shell/inspector/InspectorHeader.tsx
               graphty/src/components/shell/inspector/__tests__/InspectorHeader.test.tsx"
    [labels]="graphty/src/components/shell/defaults
              graphty/src/components/shell/panel/SettingsOverlay.tsx
              graphty/src/components/shell/panel/__tests__/SettingsOverlay.test.tsx
              graphty/src/components/shell/AppShell.tsx
              graphty/src/components/shell/__tests__/AppShell.test.tsx"
    [spec]="design/ui/app-shell-progressive-disclosure-design.md
            design/ui/mockups/system/REGISTER-1.5.md"
    [tooling]="tools/commit-changes.sh .gitignore"
)

# ---------------------------------------------------------------------------
# The message bodies. One function each, a quoted heredoc so backticks, `$` and
# `${...}` in the prose stay literal. Keep every line at or under 100 characters:
# that is commitlint's body-max-line-length, and it is checked before staging.
# ---------------------------------------------------------------------------

body_element() {
    cat <<'MSGEOF'
A calculatedStyle whose output path pointed into a wrapped branch of the node schema threw
rather than resolving. `NodeStyle.label` is a `ZodOptional<ZodPrefault<...>>` and the path
walker stopped at the wrapper instead of descending its inner type, so `style.label.enabled`
-- a path the schema really has -- was rejected as though it did not exist.

The walker unwraps the wrappers it used to stop at. General, not special-cased to `label`:
every other wrapped branch had the same defect and nobody had reached one yet.

What is allowed as an output path is unchanged. A path the schema does not have is still
rejected, and there is a board for that beside the one that covers the wrapped branch.

This is what let the shell stop drawing its labels from a hardcoded list of five node ids.
MSGEOF
}

body_theme() {
    cat <<'MSGEOF'
Mantine's `light` variant is what an icon button wears when it is active, and its tint
measured 1.21:1 against the panel header ground. WCAG 1.4.11 asks 3:1 for the boundary of a
non-text control state, so a toggle in this app announced itself with a difference a reader
could miss entirely.

The app shell had worked around it with a local ring drawn in the panel header and imported
by the inspector. That was the wrong answer -- it left one control behaving unlike every
other toggle in the application -- and it is deleted in the same change that lands this one.
The fix belongs here, once, where every caller inherits it.

Measured in both colour schemes on the real header ground rather than against a nominal
background, because the tint composites over whatever is behind it.
MSGEOF
}

body_rules() {
    cat <<'MSGEOF'
Two rules, both written from an episode in this repository rather than from principle.

Use the default components; never write a bespoke control to work around one; fix the shared
component so every caller gets the fix. The lock button is the worked example and it is
named in the file.

Graph styling goes through a style layer and never anywhere else. This one is about the
canvas: node and edge appearance reaches graphty-element as layers through the StyleManager,
never by mutating a mesh, a material or a node object. The failure mode is stated, because
the rule is easy to break by accident and the damage is invisible until later -- styling
applied outside the layer system does not appear in the layer list, cannot be reordered,
removed or persisted, and is silently lost at a dataset boundary.
MSGEOF
}

body_inputs() {
    cat <<'MSGEOF'
Two reports, one shape between them: a control that looks ready and is not.

The Explore search field could not be typed in. It was a controlled input -- `value={query}`
with `query` defaulted to the empty string and its handler optional -- and the shell rendered
the panel without passing either, so the value was pinned and every keystroke was discarded.
The query and the scope now have state, held where the panel's other remembered values are
held rather than inside the panel: the body is rebuilt per activity, so state kept inside it
would not survive a switch to Style and back. The panel also keeps its own fallback, so an
unclaimed field can no longer silently eat input.

The command palette opened unfocused, so it had to be clicked before it would take a
keystroke. React's `autoFocus` does not survive Mantine's focus trap, which queries
`[data-autofocus]` in a timeout that runs after React has done its part -- the close button
was taking focus back one macrotask after open. The attribute is the mechanism, and no timer
of ours is involved.

The rest of the shell was swept for both shapes. One more controlled-value site is reported
and not fixed here: PresentPanel is rendered with no props at all.
MSGEOF
}

body_bridge() {
    cat <<'MSGEOF'
graphty-element interns a style by DEEP VALUE EQUALITY and keys its mesh cache on the id
that interning hands back. `Styles.styleToId` scans every style it has ever seen and reuses
an id only for a style that is `isEqual` to one already there; `NodeMesh` then builds its
cache key as `node-style-${id}-3d`. So two nodes share a mesh only when their merged styles
are deep equal, and a style written in a shape the element does not declare is never equal
to the canonical one that looks the same.

The inspector was writing the EDITOR's shapes straight into layers. `color: {mode, color,
opacity}` where NodeStyle has no `color` key at all and the colour lives at `texture.color`.
`effects` where the element's key is `effect`, singular, and enables glow and outline by
PRESENCE rather than by a flag. The editor's shape names -- torusKnot, disc, plane -- where
the element wants torus-knot, geodesic, box. Edge opacity as 0-100 where the element wants
0-1. Each of those makes a look that already exists intern as a second style and build a
second mesh.

Measured before the change, on a 115-node graph with exactly two distinct looks: three
colour edits took the interned styles 2 -> 4 -> 6 -> 8 and the cached meshes 3 -> 5 -> 7 -> 9,
leaving six dead styles and six dead meshes. In isolation the leak is exact -- a style and
the same style plus the editor's `color` key intern as two ids for one picture. And the scan
is linear in the map, about 0.95 ms per interned style per 115-node repaint, so at a
thousand styles a repaint costs the better part of a second.

What this does NOT fix, and the measurement is the reason to say so plainly: the growth is
not caused by the leak. A perfectly canonical colour edit grows both counters the same way,
because neither the intern map nor the mesh cache ever evicts. This removes a multiplier and
stops a control lying about its shape; bounding the growth needs eviction inside
graphty-element, which is not this change.

The conversions were not rewritten while being moved. A different canonical shape is still a
different style id, so the mappings are the ones Graphty.tsx already had, lifted into
`utils/styleBridge.ts` beside the rich-text pair and used from both sides. The private
`_convert*` family it duplicated is deleted, after proving it dead rather than assuming it.

Two decisions went the other way from the interning argument, on purpose. An arrow set to
"none" is WRITTEN rather than omitted: an absent branch and `{type: "none"}` look identical
on a lone layer, but the element merges matching layers with `defaultsDeep`, so an absent
arrow lets a LOWER layer's arrow through and a reader who picks "none" keeps seeing arrows.
And an enabled label with no text yet is kept: requiring text made the Enabled checkbox
unusable -- ticking it wrote undefined, the branch was dropped, and the box sprang back off --
and the element draws a label from `textPath` as readily as from `text`.
MSGEOF
}

body_styling() {
    cat <<'MSGEOF'
Changing a colour in the style inspector changed nothing, and fixing that exposed two more
faults behind it.

The layer-list channel carried a rename and dropped everything else: the same-ids-same-order
branch read the live layer back, spread it, and overrode only the name, so a style edit was
spread away. It now asks what actually changed -- name, node half, edge half -- and writes
only that.

Every write then repaints. `updateLayerByIndex` and `reorderLayers` re-evaluate selectors
through the element's own style-changed handler, which runs WITHOUT algorithmResults and
never runs calculated values, so any edit to the list -- a bare rename included -- silently
deleted every algorithmResults-driven encoding from the canvas and the labels never came
back.

And the inspector's twelve write handlers restated the whole style from the editor's models
instead of patching the branch each one owns. That mattered most for the rich-text branches,
because two different shapes share the name `RichTextStyle`: graphty-element's is flat with
about 47 keys, the editor's is nested with six, and the element's schema is a strict object,
so one foreign key makes the whole label fail to parse and rebuild as a blank texture.
Editing a colour wrote the editor's label over the element's. Each handler now patches its
own branch and leaves the others exactly as the element had them, and the two rich-text
branches are written in element shape through the bridge -- whose editor-to-element half
this adds, as the exact inverse of the half already there, with the round trip checking the
two against each other.

The shell's local contrast ring goes with this, now that compact-mantine's own active state
meets 3:1. The inspector stops importing a helper from the panel, and `Pin as A` takes the
same treatment as the latch it sits beside.
MSGEOF
}

body_labels() {
    cat <<'MSGEOF'
The top-degree labels were drawn by naming five node ids in a selector. That is a list, not
a rule: it had to be rebuilt on every load and could not survive a change of data.

They are drawn by a calculated node style now, which reads each node's degree and decides --
possible only because graphty-element stopped rejecting a calculated output into a wrapped
schema branch, which is the commit before this one.

The layer says WHETHER a label is drawn and nothing about how it looks. It names no colour:
the element's own #000000 default measures 19.26:1 against its #F5F5F5 canvas, and the panel
ink the layer used to set measured about 1.1:1 -- the glyph fill vanished and what stayed
legible was the alpha fringing around it, which is why the labels looked like grey text with
a dark outline when no outline was ever enabled.

Settings > Performance carries a switch that turns the feature off, and it persists the way
the shell's other settings do.

One case the rule could not serve: a near-regular graph, where the degrees are too alike for
a top-N cut to mean anything. The College football sample is one, and it drew no labels at
all while the switch still read ON. That is handled rather than left to be discovered.
MSGEOF
}

body_spec() {
    cat <<'MSGEOF'
The spec was strong on what each surface CONTAINS and quiet on how surfaces BEHAVE together,
and that asymmetry is where this shell kept failing. The classes are not hypothetical; each
one below is a defect that reached the product owner, several more than once.

Stacking: which surface is above which, for every pair that can be open at once. Named, not
left to whoever picks a z-index next.

Surface lifecycle, beyond the latch: what opens a surface, what may close it, what may never
close it, and what a reader is always guaranteed to be able to dismiss. A first visit could
put two latched overlays over the canvas with no gesture that dismissed either, and no rule
forbade it.

Control state: every control that has state must show it, with the contrast floor written
down -- a state shown only by a 1.21:1 tint shipped twice.

Reachability, beyond "every capability has a home": a capability that is BUILT must be
reachable, by pointer and by key. A whole inspector surface was drawn and routed and never
constructible from application state, so it was dead and nothing said so.

Text entry: which field takes focus when a surface opens, what Escape does while typing, and
that a field which accepts input must be wired to state that changes when it does.

Every rule states the failure it prevents, as this document does elsewhere. The amendments
were written, attacked by a reviewer, and rewritten: a rule nobody could turn into a test
was either made checkable or removed, and the gaps that needed a decision rather than a rule
went to section 12 as open questions instead of being answered by invention.
MSGEOF
}

body_tooling() {
    cat <<'MSGEOF'
`--check` was a flag that lied. It parsed, set a variable, and nothing in the script ever
read it -- so a run asking only to validate the messages fell through into the commit loop
and committed. It validates and exits now.

Also: tools/uat-contrast.py leaves a __pycache__ directory beside itself the first time it
runs, which was showing up as untracked noise in every status.
MSGEOF
}

# ---------------------------------------------------------------------------
# Preflight: refuse anywhere the result would be a surprise.
# ---------------------------------------------------------------------------

if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "commit-changes: not inside a git repository." >&2
    exit 1
fi

if [ -d "$(git rev-parse --git-path rebase-merge)" ] ||
   [ -d "$(git rev-parse --git-path rebase-apply)" ] ||
   [ -f "$(git rev-parse --git-path MERGE_HEAD)" ] ||
   [ -f "$(git rev-parse --git-path CHERRY_PICK_HEAD)" ]; then
    echo "commit-changes: a merge, rebase or cherry-pick is in progress. Finish it first." >&2
    exit 1
fi

if [ -n "$(git ls-files --unmerged)" ]; then
    echo "commit-changes: the tree has unresolved conflicts:" >&2
    git diff --name-only --diff-filter=U >&2
    exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
    echo "commit-changes: nothing to commit -- the working tree is clean."
    exit 0
fi

# A dirty index would be swept into the first commit whose `git add` ran after it,
# and the owner would not see it in that commit's preview. In a dry run it is only
# worth a warning, since nothing is staged either way.
if ! git diff --cached --quiet; then
    if [ "$DRY_RUN" = "1" ]; then
        echo "commit-changes: NOTE -- the index already holds staged changes:"
        git diff --cached --name-only | sed 's/^/  /'
        echo "  A real run refuses until they are unstaged ('git reset')."
        echo
    else
        echo "commit-changes: the index already holds staged changes:" >&2
        git diff --cached --name-only | sed 's/^/  /' >&2
        echo >&2
        echo "They would be swept into the first commit below without appearing in its" >&2
        echo "preview. Unstage them first: git reset" >&2
        exit 1
    fi
fi

if ! [ -f .husky/commit-msg ]; then
    echo "commit-changes: .husky/commit-msg is missing." >&2
    echo "That hook is the commitlint check this script deliberately keeps. Restore it" >&2
    echo "before committing, or the messages go unvalidated." >&2
    exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# ---------------------------------------------------------------------------
# Temporary state: the rendered messages, and the hooks directory that holds
# commit-msg without prepare-commit-msg.
# ---------------------------------------------------------------------------

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/commit-changes.XXXXXX")"
HOOKS_DIR="$WORK_DIR/githooks"

cleanup() {
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$HOOKS_DIR"
cp .husky/commit-msg "$HOOKS_DIR/commit-msg"
chmod +x "$HOOKS_DIR/commit-msg"

# Let gpg-agent find the terminal, so pinentry can prompt for the signing
# passphrase here instead of failing invisibly.
if tty -s; then
    GPG_TTY="$(tty)"
    export GPG_TTY
fi

# ---------------------------------------------------------------------------
# Validation, in full, before a single file is staged.
# ---------------------------------------------------------------------------

# The types semantic-release and commitlint's conventional preset accept.
CONVENTIONAL_TYPES='feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert'
# Kept in step with commitlint.config.js's scope-enum, which is enforced at level 2:
# a scope outside this list is rejected by the commit-msg hook, mid-run.
VALID_SCOPES="algorithms layout graphty-element compact-mantine remote-logger graphty
              gpu-3d-force-layout deps release ci docs tools workspace"
# commitlint's body-max-line-length, from @commitlint/config-conventional.
BODY_MAX_LINE=100
SUBJECT_MAX=100

# Renders one step's message -- subject, blank line, body -- to $WORK_DIR/<step>.msg.
# The rendered file is what `git commit -F -` later reads, so what is validated here
# is byte for byte what commitlint sees.
render_message() {
    local step="$1"
    {
        printf '%s\n\n' "${SUBJECTS[$step]}"
        # A step id may carry a hyphen; a shell function name may not.
        "body_${step//-/_}"
    } > "$WORK_DIR/$step.msg"
}

validate_step() {
    local step="$1"
    local subject="${SUBJECTS[$step]}"
    local ok=0

    if ! printf '%s' "$subject" | grep -Eq "^($CONVENTIONAL_TYPES)(\([a-z0-9._-]+\))?!?: .+"; then
        echo "commit-changes: [$step] subject is not a conventional commit." >&2
        echo "  got:      $subject" >&2
        echo "  expected: <type>(<scope>): <subject>" >&2
        echo "  types:    ${CONVENTIONAL_TYPES//|/ }" >&2
        ok=1
    fi

    case "$subject" in
        *.)
            echo "commit-changes: [$step] subject ends in a full stop; commitlint refuses one." >&2
            ok=1
            ;;
    esac

    if [ "${#subject}" -gt "$SUBJECT_MAX" ]; then
        echo "commit-changes: [$step] subject is ${#subject} characters; the limit is $SUBJECT_MAX." >&2
        ok=1
    fi

    # The scope, when there is one, has to be in commitlint's enum.
    local scope
    scope="$(printf '%s' "$subject" | sed -n 's/^[a-z]*(\([^)]*\)).*/\1/p')"
    if [ -n "$scope" ]; then
        local found=0 candidate
        for candidate in $VALID_SCOPES; do
            if [ "$scope" = "$candidate" ]; then
                found=1
                break
            fi
        done
        if [ "$found" = "0" ]; then
            echo "commit-changes: [$step] scope '$scope' is not in commitlint.config.js's scope-enum." >&2
            echo "  allowed: $(echo "$VALID_SCOPES" | tr -s ' \n' ' ')" >&2
            ok=1
        fi
    fi

    # Body lines, which commitlint caps as well. A long line there fails the commit
    # after the files are staged, which is the worst moment to find out.
    local line_no=0 line
    while IFS= read -r line; do
        line_no=$((line_no + 1))
        if [ "${#line}" -gt "$BODY_MAX_LINE" ]; then
            echo "commit-changes: [$step] message line $line_no is ${#line} characters (limit $BODY_MAX_LINE):" >&2
            echo "  $line" >&2
            ok=1
        fi
    done < "$WORK_DIR/$step.msg"

    return "$ok"
}

VALIDATION_FAILED=0
for step in "${STEPS[@]}"; do
    if [ -z "${SUBJECTS[$step]:-}" ] || [ -z "${PATHS[$step]:-}" ]; then
        echo "commit-changes: [$step] has no subject or no paths. Fix the plan." >&2
        VALIDATION_FAILED=1
        continue
    fi
    render_message "$step"
    validate_step "$step" || VALIDATION_FAILED=1
done

if [ "$VALIDATION_FAILED" != "0" ]; then
    echo >&2
    echo "commit-changes: nothing was staged and nothing was committed." >&2
    exit 1
fi

# --check means CHECK, and stops here. It used to set a variable nothing read, so
# the run fell through into the commit loop below and committed -- a flag that
# lied by its name, which is worse than no flag. (2026-09-13.)
if [ "$CHECK" = "1" ]; then
    echo
    echo "All ${#STEPS[@]} messages pass commitlint. Nothing was staged or committed."
    echo "To preview what each commit would take: ./tools/commit-changes.sh --dry-run"
    exit 0
fi

# ---------------------------------------------------------------------------
# Helpers that read the tree without touching the index.
# ---------------------------------------------------------------------------

# Echoes the subset of a step's pathspecs that still have something to commit.
# `git status --porcelain -- <pathspec>` is empty for a path that is clean, gone or
# never existed, and unlike `git add` it does not fail on a pathspec that matches
# nothing -- which is what makes a re-run after a partial run safe.
pending_paths() {
    local path
    for path in $1; do
        if [ -n "$(git status --porcelain -- "$path")" ]; then
            printf '%s\n' "$path"
        fi
    done
}

# True when a changed path belongs to some step, so the leftover report at the end
# can name what the plan does not cover.
claimed_by_plan() {
    local changed="${1%/}"
    local step path
    for step in "${STEPS[@]}"; do
        for path in ${PATHS[$step]}; do
            case "$changed" in
                "$path"|"$path"/*)
                    return 0
                    ;;
            esac
        done
    done
    return 1
}

report_leftovers() {
    local leftovers=()
    local line path
    # -uall so an untracked directory is reported file by file and a leftover inside
    # one cannot hide behind a directory the plan claims.
    while IFS= read -r line; do
        [ -n "$line" ] || continue
        # Porcelain: two status columns, a space, then the path -- or "old -> new"
        # for a rename, where the new name is the one to test.
        path="${line:3}"
        case "$path" in
            *" -> "*)
                path="${path##* -> }"
                ;;
        esac
        path="${path%\"}"
        path="${path#\"}"
        if ! claimed_by_plan "$path"; then
            leftovers+=("$path")
        fi
    done < <(git status --porcelain -uall)

    if [ "${#leftovers[@]}" != "0" ]; then
        echo "Changed files no commit in this plan claims (${#leftovers[@]}):"
        printf '  %s\n' "${leftovers[@]}"
        echo
        echo "They are still in the working tree, uncommitted and unstaged. Either add them"
        echo "to a step in this script or commit them yourself."
        echo
    fi
}

# ---------------------------------------------------------------------------
# Optional full validation, before anything is committed.
# ---------------------------------------------------------------------------

if [ "$CHECK" = "1" ]; then
    echo "Running prepush:fast before committing (lint, build and the fast tests)..."
    if ! pnpm run prepush:fast; then
        echo >&2
        echo "commit-changes: prepush:fast failed. Nothing staged, nothing committed." >&2
        exit 1
    fi
    echo
fi

# ---------------------------------------------------------------------------
# The run.
# ---------------------------------------------------------------------------

echo "Branch:  $BRANCH"
echo "Commits: ${#STEPS[@]}"
if [ "$DRY_RUN" = "1" ]; then
    echo "Mode:    DRY RUN -- nothing is staged, nothing is committed, the index is untouched"
else
    echo "Mode:    committing. One signing passphrase prompt per commit; no Commitizen wizard"
fi
echo

MADE=0
SKIPPED=0

for step in "${STEPS[@]}"; do
    subject="${SUBJECTS[$step]}"
    pending="$(pending_paths "${PATHS[$step]}")"

    echo "-----------------------------------------------------------------------"
    echo "[$step] $subject"
    echo

    if [ -z "$pending" ]; then
        echo "  Nothing left to commit under this step's paths -- already committed. Skipping."
        echo
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # What this commit will contain, read from the tree rather than from the index.
    # shellcheck disable=SC2086 # deliberate word splitting: pathspecs, no spaces
    tracked_stat="$(git diff --stat HEAD -- $pending)"
    # shellcheck disable=SC2086
    untracked="$(git ls-files --others --exclude-standard -- $pending)"

    if [ -n "$tracked_stat" ]; then
        echo "  Tracked changes:"
        printf '%s\n' "$tracked_stat" | sed 's/^/  /'
    fi

    if [ -n "$untracked" ]; then
        untracked_count="$(printf '%s\n' "$untracked" | wc -l | tr -d ' ')"
        echo "  New files ($untracked_count):"
        printf '%s\n' "$untracked" | head -n 10 | sed 's/^/    /'
        if [ "$untracked_count" -gt 10 ]; then
            echo "    ... and $((untracked_count - 10)) more"
        fi
    fi
    echo

    if [ "$DRY_RUN" = "1" ]; then
        echo "  Message:"
        sed 's/^/  | /' "$WORK_DIR/$step.msg"
        echo
        continue
    fi

    # shellcheck disable=SC2086
    git add -- $pending

    if git diff --cached --quiet; then
        echo "  Staged nothing after all -- skipping rather than making an empty commit."
        echo
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # core.hooksPath is the whole trick: commit-msg (commitlint) runs from the
    # temporary directory, and Commitizen's prepare-commit-msg is not in it.
    git -c core.hooksPath="$HOOKS_DIR" commit -F - < "$WORK_DIR/$step.msg"

    echo
    echo "  $(git log -1 --format='%h %G? %s')"
    echo
    MADE=$((MADE + 1))
done

echo "-----------------------------------------------------------------------"
echo

report_leftovers

if [ "$DRY_RUN" = "1" ]; then
    echo "Dry run. Nothing was staged and nothing was committed; the index is untouched."
    echo "To make these commits: ./tools/commit-changes.sh"
    exit 0
fi

echo "Made $MADE commit(s) on '$BRANCH'; skipped $SKIPPED."
echo
git log --oneline -n "${#STEPS[@]}" | cat
echo
echo "Not pushed. Next:"
echo "  git push origin $BRANCH"
echo
echo "The pre-push hook runs tools/prepush.sh -- lint, knip, build and the fast tests"
echo "across every package, not just the ones touched here. Expect a few minutes."
