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

STEPS=(repaint meshes shapes lines theme metrics loaddata results legend panels inspector canvas spec tooling)

declare -A SUBJECTS=(
    [repaint]="fix(graphty-element): make load mean load, so a removed layer stops painting"
    [meshes]="fix(graphty-element): reattach edges on a shape change and dispose what a dataset leaves"
    [shapes]="feat(graphty-element): export the shape enum, add the torus it already builds, paint gradients"
    [lines]="perf(graphty-element): bound the patterned-line mesh count and restore culling"
    [theme]="feat(compact-mantine): disabled reasons, bound toggles, and one colour change per gesture"
    [metrics]="feat(graphty): rank nodes by degree, PageRank and betweenness, and read the result back"
    [loaddata]="fix(graphty): surface a load that failed instead of reporting success"
    [results]="feat(graphty): give the Analyze Results tab a body"
    [legend]="fix(graphty): stop offering a legend that cannot draw"
    [panels]="feat(graphty): one sidebar switch, no latch, no autohide, no narrow layout"
    [inspector]="feat(graphty): rebuild the style inspector and show computed channels"
    [canvas]="fix(graphty): inset the canvas overlays so the data table and legend are visible"
    [spec]="docs(workspace): record the panel model that replaced the latch"
    [tooling]="chore(tools): re-point the commit script at this change set"
)

declare -A PATHS=(
    [repaint]="graphty-element/src/ChangeManager.ts graphty-element/src/Styles.ts graphty-element/test/change-manager.test.ts graphty-element/test/calculated-style.test.ts graphty-element/test/style-helpers/edge-calculated-styles.test.ts"
    [meshes]="graphty-element/src/Node.ts graphty-element/src/Edge.ts graphty-element/src/managers/DataManager.ts graphty-element/src/meshes/NodeEffects.ts graphty-element/test/node-shape-edge-reattach.test.ts graphty-element/test/browser/scene-teardown.test.ts"
    [shapes]="graphty-element/src/config/NodeStyle.ts graphty-element/src/config/index.ts graphty-element/index.ts graphty-element/src/meshes/NodeMesh.ts graphty-element/test/node-mesh-gradient.test.ts graphty-element/test/browser/node-mesh-gradient.test.ts graphty/src/constants/style-options.ts graphty/src/constants/__tests__/style-options.test.ts graphty/src/utils/styleBridge.ts graphty/src/utils/__tests__/styleBridge.test.ts"
    [lines]="graphty-element/src/meshes/PatternedLineMesh.ts graphty-element/src/meshes/PatternedLineRenderer.ts graphty-element/src/meshes/FilledArrowRenderer.ts graphty-element/src/constants/meshConstants.ts graphty-element/test/patterned-line-mesh-count.test.ts graphty-element/test/meshes/FilledArrowRenderer.test.ts"
    [theme]="compact-mantine/src compact-mantine/tests"
    [metrics]="graphty/src/components/shell/insights graphty/src/components/shell/analysis graphty/src/components/shell/readings/nodeMetricReading.ts graphty/src/components/shell/readings/__tests__/nodeMetricReading.test.ts graphty/src/components/shell/defaults/nodeMetricStyle.ts graphty/src/components/shell/defaults/__tests__/nodeMetricStyle.test.ts graphty/src/components/shell/inspector/ResultInspector.tsx graphty/src/components/shell/inspector/__tests__/ResultInspector.test.tsx"
    [loaddata]="graphty/src/components/LoadDataModal.tsx graphty/src/components/__tests__/LoadDataModal.test.tsx"
    [results]="graphty/src/components/shell/panel/AnalyzePanel.tsx graphty/src/components/shell/panel/AnalyzeResultCard.tsx graphty/src/components/shell/panel/__tests__/AnalyzePanel.test.tsx graphty/src/components/shell/readings"
    [legend]="graphty/src/components/shell/canvas/legendAvailability.ts graphty/src/components/shell/canvas/__tests__/legendAvailability.test.ts graphty/src/components/shell/toolbar graphty/src/components/shell/panel/StylePanel.tsx graphty/src/components/shell/panel/__tests__/StylePanel.test.tsx"
    [panels]="graphty/src/components/shell/AppShell.tsx graphty/src/components/shell/__tests__/ShellContext.test.tsx graphty/src/components/shell/ShellContext.tsx graphty/src/components/shell/types.ts graphty/src/components/shell/constants.ts graphty/src/components/shell/bindings.ts graphty/src/components/shell/useShellKeyBindings.ts graphty/src/components/shell/graphCommands.ts graphty/src/components/shell/CommandPalette.tsx graphty/src/components/shell/topbar graphty/src/components/shell/rail graphty/src/components/shell/statusbar graphty/src/components/shell/panel graphty/src/components/shell/__tests__ graphty/src/components/shell/defaults graphty/src/App.tsx graphty/src/App.test.tsx"
    [inspector]="graphty/src/components/sidebar graphty/src/components/layout graphty/src/hooks graphty/src/components/__tests__ graphty/src/components/shell/inspector"
    [canvas]="graphty/src/components/shell/canvas"
    [spec]="design/ui"
    [tooling]="tools/commit-changes.sh design/graph-format"
)

# ---------------------------------------------------------------------------
# The message bodies. One function each, a quoted heredoc so backticks, `$` and
# `${...}` in the prose stay literal. Keep every line at or under 100 characters:
# that is commitlint's body-max-line-length, and it is checked before staging.
# ---------------------------------------------------------------------------

body_repaint() {
    cat <<'BODY'
loadCalculatedValues cleared watchedInputs and not calculatedValues, so the set
only ever grew. A layer removed from the StyleManager kept its calculated value
registered, runAllCalculatedValues re-ran it on every repaint, and Node.update
merges styleUpdates OVER the base style -- so a deleted layer's colour beat the
layer that replaced it, for the life of the loaded graph.

Running Groups after Most connected was the visible case: the layer list, the
reading and the legend all switched to groups while every node pixel stayed the
degree ramp's viridis. Measured against the built app, 10 of 10 sampled node
pixels were byte-identical across the two runs; 187 of 187 now change.

Styles pushes calculated values in layer order rather than unshifting, so the
last to run is the top layer -- the precedence the static merge already had.
BODY
}

body_meshes() {
    cat <<'BODY'
Edge.update kept a position dirty check and returned before re-shooting its ray,
so an edge only reattached when an endpoint MOVED. A shape change at constant
size moved nothing, and the edge stayed anchored to geometry that was gone.

This was a regression, not a gap: 973f1d96 (2025-11-11) added the check, and
before it update() called transformArrowCap unconditionally every frame. The one
invalidation hook that existed, a2cb98c5, keys off size, because it was written
for selection.

Glow was never drawn: inclusion has to name the instance's SOURCE mesh, because
Babylon's effect layer asks hasMesh(subMesh.getRenderingMesh()). The layer is
created with excludeByDefault, since an empty inclusion list means every mesh.

Arrowheads, patterned-line segments and labels are parented to graph-root, which
outlives a dataset, so a replacing load left orphans where old edges converged.
BODY
}

body_shapes() {
    cat <<'BODY'
The editor offered Plane and Disc, which the element cannot build, and hid
twelve shapes it can. Selecting Plane silently drew a box.

Plane and Disc are removed rather than implemented: CreatePlane makes a
zero-thickness single-sided quad, so half the graph would face away and vanish,
it disappears edge-on, and edge attachment is ray-vs-bounding-sphere, so every
edge touching one would detach.

Torus is added to the enum instead of removed from the editor, because NodeMesh
already registers a working CreateTorus and only the zod enum omitted it.

The editor's option list is DERIVED from the element's exported enum, with a
round-trip assertion, so the next drift is a build failure rather than a control
that lies about what it will draw.
BODY
}

body_lines() {
    cat <<'BODY'
A dotted line built one mesh per dash with no cap, so the segment count scaled
with edge length over dash pitch: narrowing the width to 1 shrank the pitch and
the mesh count went UP. Each dash also took its own ShaderMaterial, and culling
was switched off wholesale with alwaysSelectAsActiveMesh.

The count is bounded, materials are released with the meshes that own them, and
culling stays on -- the arrowhead path sizes its bounding volume to what the
shader actually draws instead of opting out of the frustum test.
BODY
}

body_theme() {
    cat <<'BODY'
The style inspector needs three things no compact control could express: a
disabled control that states its reason, a control bound to a computed value
that says so rather than showing an editable default, and a colour change that
arrives as one gesture instead of a stream of partial values.

They land in the library rather than at the call site, so every caller gets them
and the app can delete its forked colour input.
BODY
}

body_metrics() {
    cat <<'BODY'
Three capabilities the Analyze panel drew but could not run: Most connected
(degree), Influence (PageRank) and Bridges (betweenness). Each now runs, ranks
every node, writes a plain-language reading and a one-line run record, and
applies a viridis colour layer once on first completion.

The ranking carries the element's own node id rather than a printed copy.
Karate Club and College football are GML, whose ids are numbers, so comparing a
printed id against a real one selected nothing at all on two of three samples.

Betweenness ships exact-only behind a size gate: the algorithms package exposes
no k-source parameter, so a sampled caveat would claim a sample never taken.
BODY
}

body_loaddata() {
    cat <<'BODY'
handleLoad ended its promise chain in console.error, so a malformed file, a 404
or unparsable pasted text produced nothing visible on any route.

Fixing the catch alone would not have been enough: graphty-element reports a
parse failure out of band through data-loading-error and does not reject, so the
promise had already resolved and the dialog had already closed and cleared the
reader's input. The shell now waits for the element's own report before
settling.

The failure names the file, keeps the dialog open with its input, and clears the
element -- without which the retry the message invites loaded nothing and then
reported success.
BODY
}

body_results() {
    cat <<'BODY'
The Results tab was a real tab with a real count that switched real state, and
the panel body never branched on it -- so selecting Results kept rendering the
Run tab's Suggested list, and a completed analysis became unreachable the moment
anything else was selected.

It now draws the result as a card collapsed to title, headline and primary
action while the same result is open in the inspector, which is the
one-body-on-screen rule the result shapes already ask for.
BODY
}

body_legend() {
    cat <<'BODY'
The Legend control reported a state the legend was not in: it could be checked
while nothing was encoded, and a legend with no encoded channel draws nothing,
so the reader ticked a box and nothing appeared.

The control is disabled with its reason when there is nothing to draw, rather
than the legend rendering an empty box.
BODY
}

body_panels() {
    cat <<'BODY'
Five mechanisms decided whether a sidebar was on screen: a per-surface latch, a
per-surface close control, a rail click that closed the active panel, a
width-aware first-visit default, and a narrow layout in which only one overlay
could be open and a canvas tap dismissed it.

All five are gone. There is one persisted boolean and one control that hides and
shows both sidebars together. Nothing else opens or closes them.

Below 1280 the shell no longer lays out -- it says the screen is too small and
names the width it needs. The old narrow layout put 109px of the Welcome sheet
under each overlay at 1024, leaving the heading reading "aph to get started".

The too-small state is drawn as an overlay OVER the still-mounted shell rather
than instead of it. Returning early unmounted graphty-element, and widening back
past 1280 remounted a fresh scene with no data while the shell still believed a
graph was loaded: measured against the built app, a resize to 1100 and back left
the canvas empty under a status bar still reading 20 nodes 29 edges.

Also here: the node inspector reported 0 neighbours for a node the result card
said had 17 links, because it read an edge endpoint spelling getData never
writes.
BODY
}

body_inspector() {
    cat <<'BODY'
The style inspector was the old left-sidebar panel re-homed whole. It drew its
own local controls, so it was the one inspector surface with no left margin, and
it read only the static style -- so a layer whose whole encoding is a calculated
value showed the element's defaults as though the layer had set them. "Top
degree labels", whose only job is drawing labels, showed Label as disabled.

It is rebuilt on the shared controls, and a computed channel is drawn in its own
row: what it encodes, what it reads, the expression behind a disclosure, and one
explicit verb to convert it to a fixed value. The control it would otherwise
contradict is disabled with that reason, because a calculated value is applied
after the static style and merged over it -- an editable control there would
silently lose the reader's edit on the next repaint.
BODY
}

body_canvas() {
    cat <<'BODY'
The data table, the legend, the minimap and the time slider positioned against
the canvas element's rect, which spans the full width under the sidebars, so all
four were drawn partly or wholly behind them.

They now inset against the live canvas strip. Insetting rather than raising the
z-order, because the drawer is specified never to cover the panel or the
inspector -- raising it would trade one contradiction for another.
BODY
}

body_spec() {
    cat <<'BODY'
Section 6.12's latch is deleted, with the dismissal guarantee's latch clauses,
the memory rule's two latch entries, the narrow-screen section, and the rail
click that closed the active panel. What replaces them is one switch and one
remembered boolean.

Below 1280 is stated as unsupported rather than specified as a second layout.
The acceptance scenario that tested the width-aware default is rewritten for the
model that shipped.
BODY
}

body_tooling() {
    cat <<'BODY'
The step list, the subjects and the paths describe this change set rather than
the one before it. The machinery is unchanged.
BODY
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
