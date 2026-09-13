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

STEPS=(deps lib theme layers shell removal design prepush knip tooling)

declare -A SUBJECTS=(
    [deps]="build(deps): give graphty a direct dependency on @graphty/compact-mantine"
    [lib]="feat(compact-mantine): pop-out regions, section technical names, a disabled action row"
    [theme]="fix(graphty): restore the compact sizing the app theme was replacing wholesale"
    [layers]="fix(graphty): re-seed the layer rename box and let a section embed the layer list"
    [shell]="feat(graphty): build the progressive-disclosure app shell"
    [removal]="refactor(graphty): delete the superseded AppLayout shell and its dead exports"
    [design]="docs(graphty): app shell revision 1.11, three changes from the product owner"
    [prepush]="fix(tools): report the fast-test verdict from the tests, not from the whole run"
    [knip]="chore(workspace): keep knip strict and mark the public surface per symbol"
    [tooling]="chore(tools): commit through a hooks path that skips the Commitizen prompt"
)

declare -A PATHS=(
    [deps]="graphty/package.json pnpm-lock.yaml"
    [lib]="compact-mantine"
    [theme]="graphty/src/theme.ts
             graphty/src/__tests__/theme-merge.test.ts
             graphty/src/components/__tests__/compact-css-regression.test.tsx
             graphty/src/components/__tests__/theme-compliance.test.tsx
             graphty/src/components/__tests__/modal-styles.test.tsx
             graphty/src/components/sidebar/__tests__/CompactPhase3Regression.test.tsx"
    [layers]="graphty/src/components/layout/LeftSidebar.tsx
              graphty/src/components/layout/__tests__/LeftSidebar.test.tsx"
    [shell]="graphty/src/components/shell
             graphty/src/components/ai/AiProviderSettings.tsx
             graphty/src/components/ai/AiSettingsModal.tsx
             graphty/src/components/ai/__tests__/AiProviderSettings.test.tsx
             graphty/src/components/ai/__tests__/AiSettingsModal.test.tsx
             graphty/src/data/sampleGraphs.ts
             graphty/src/App.tsx
             graphty/src/App.test.tsx
             graphty/vitest.config.ts"
    [removal]="graphty/src/components/layout/AppLayout.tsx
               graphty/src/components/layout/BottomToolbar.tsx
               graphty/src/components/layout/RightSidebar.tsx
               graphty/src/components/layout/TopMenuBar.tsx
               graphty/src/components/layout/TopMenuBar.test.tsx
               graphty/src/components/layout/__tests__/TopMenuBar.test.tsx
               graphty/src/components/ai/AiActionButton.tsx
               graphty/src/components/ai/AiChatDialog.tsx
               graphty/src/components/ai/__tests__/AiActionButton.test.tsx
               graphty/src/components/ai/__tests__/AiChatDialog.test.tsx
               graphty/src/components/ai/index.ts
               graphty/src/components/data-view/ViewDataModal.tsx
               graphty/src/components/data-view/ViewDataModal.stories.tsx
               graphty/src/components/data-view/__tests__/ViewDataModal.test.tsx
               graphty/src/components/data-view/index.ts
               graphty/src/components/sidebar/panels/GraphPropertiesPanel.tsx
               graphty/src/components/sidebar/panels/__tests__/GraphPropertiesPanel.test.tsx
               graphty/src/components/sidebar/controls/StatRow.tsx
               graphty/src/components/sidebar/controls/__tests__/StatRow.test.tsx
               graphty/src/components/sidebar/__tests__/RightSidebar.test.tsx
               graphty/src/components/sidebar/__tests__/accessibility.test.tsx
               graphty/src/components/sidebar/__tests__/CompactStyleRegression.test.tsx
               graphty/src/constants/layout.ts
               graphty/src/types/selection.ts
               graphty/src/hooks/useAiManager.ts
               graphty/src/utils/ai-storage.ts
               graphty/src/utils/layerConversion.ts
               graphty/CLAUDE.md"
    [design]="design"
    [prepush]="tools/prepush.sh"
    [knip]="knip.config.ts"
    [tooling]="tools/commit-changes.sh CLAUDE.md"
)

# ---------------------------------------------------------------------------
# The message bodies. One function each, a quoted heredoc so backticks, `$` and
# `${...}` in the prose stay literal. Keep every line at or under 100 characters:
# that is commitlint's body-max-line-length, and it is checked before staging.
# ---------------------------------------------------------------------------

body_deps() {
    cat <<'MSGEOF'
The app shell imports FieldRow, ControlSection, PopoutRegion and the panel inks
from @graphty/compact-mantine, and nothing in graphty/ declared it: the import
resolved only because pnpm hoists the workspace package into the root
node_modules. A `pnpm install --filter graphty` in a clean checkout would not
have it, and Nx had no edge from graphty to compact-mantine, so a change to the
library did not mark the app as affected.

One line in graphty/package.json (`workspace:*`, like the graphty-element entry
beside it) and the link entry pnpm writes for it into the lockfile. No version
decision to argue: the workspace protocol resolves to whatever the monorepo
builds.
MSGEOF
}

body_lib() {
    cat <<'MSGEOF'
Three things the app shell needs from the library, and one register entry.

PopoutRegion. Root-level pop-outs competed for a single open slot across the
whole page, so opening one in the inspector closed the one the activity panel
had open -- right for two pop-outs describing the same object, wrong for two
regions a reader has side by side. A pop-out now carries the region it was
OPENED in (which is where its trigger sits, not where its panel lands on
screen), and `register`, `findSiblings` and `closeSiblings` decide siblinghood
through one predicate: same parent, and for root-level pop-outs the same region.
`closeSiblings` reads the region from the registry rather than from its caller,
because it is the one public entry point that could otherwise reach across
regions and close a pop-out that never competed with this one. With no
PopoutRegion in the tree every root-level pop-out shares one group, which is the
whole-page rule this layer had before regions existed -- so nothing published
changes behaviour.

ControlSection technicalName. Design 6.3 pairs a plain name with the technical
one -- "Arrangement (Layout)" -- and it is ONE label, so the pair reaches the
header tooltip and the group's accessible name too instead of being something
only a pointer can read. The technical half is drawn at 400 weight in
PANEL_INK.CHROME inside the same span.

ActionRow disabled. Where three or more contiguous rows are not built yet the
"coming" tag rises to the group header and the rows below are dimmed and
disabled instead of tagged one by one, so the row needs that state: the reading
takes PANEL_INK.DISABLED (a different token from the ordinary muted ink), the
row announces itself as unavailable through aria-disabled, and activation is
dropped. Nothing about the state depends on telling two greys apart.

UI_GLYPH_NAMES gains `keepOpen`, a padlock -- the first entry added since that
module was transcribed from the register. It is deliberately NOT the pushpin:
the pushpin already carries three pin verbs, and one of them (`Pin as A`) is
drawn in the same inspector title row as this control. REGISTER-1.5 section 18
records the addition with its date; exports.test.ts moves 15 -> 16 to match.
MSGEOF
}

body_theme() {
    cat <<'MSGEOF'
The app's theme extended fifteen Mantine components with a `vars`/`styles`
FUNCTION whose non-compact branch returned `{ root: {}, wrapper: {} }`.
mergeThemeOverrides deep-merges plain objects only -- its `isObject()` is false
for a function -- so each of those functions REPLACED the same extension in
@graphty/compact-mantine rather than composing with it. The library's
`defaultProps` is a plain object and did merge, so all fifteen components went
on asking for the library's `size="sm"` while the thing that defined what that
size means had been overwritten: TextInput, NumberInput, SegmentedControl,
Checkbox, Switch, Slider, Button, ActionIcon, Select, Textarea, PasswordInput,
Autocomplete, Radio, Badge and Pill silently reverted to Mantine's stock 36px
box. That is what drew the Style panel's layout picker at 224x36 inside a 32px
row instead of VOCAB RT-1's 224x24.

The fix is subtraction. The app override now extends only NativeSelect and
ColorInput -- the two inputs the library publishes no extension for -- and the
theme is mergeThemeOverrides(compactThemeOverride, appThemeOverride). The app's
`size="compact"` values were identical field for field to the library's, so the
duplicates are simply gone, and the library applies the same treatment
unconditionally, which is why call sites that still pass `size="compact"` keep
working. A size-gated branch is what let the default drift back to 36px, so the
two remaining extensions are unconditional as well.

Two changes a reader could mistake for regressions, and are not. `--input-bd` is
`transparent` rather than `none`, because Mantine paints the border as `1px
solid var(--input-bd)` and shows focus by swapping that one variable: `none`
invalidated the whole declaration, so not one compact field could draw a focus
indicator. And a compact label takes PANEL_INK.CHROME (#a3a8b1) rather than
dimmed (#7a828e), which at 11px measures 4.03:1 on the panel and 3.44:1 on a
field -- under the 4.5:1 WCAG AA asks of text.

The tests assert the new truth rather than being relaxed to fit: the border
cases now expect a 1px transparent border (and on PasswordInput 24px on the
field with 22px inside it, since the field carries the border), the label case
expects the AA-passing ink, and the dark-only-colour guards strip
`light-dark(...)` pairs before checking, because a dark-N inside a pair is how
both schemes are written and is not the dark-only usage they exist to catch. A
new test covers the merge itself, which is the defect's actual cause. The
ViewDataModal block leaves modal-styles.test.tsx in this commit rather than the
next one, so no commit leaves a test importing a module already deleted.
MSGEOF
}

body_layers() {
    cat <<'MSGEOF'
Two defects in the style layer list, which is the surviving half of the old
shell and is what the new Style panel draws.

The rename box could show text the app never accepted. `editName` is state on a
row whose React key is `layer.id`, and a rename does not change the id, so a
seed taken once at mount outlived the commit: double-click a second time and the
rejected text was still in the box. It is re-seeded whenever the editor is
closed, so the only text it can open on is the committed one. That also stops a
stale name riding across a deletion -- layer ids are index-derived
(`layer-${index}`, layerConversion.ts), so removing a layer makes the same id,
and therefore this same row instance, name a DIFFERENT layer.

The drag handle printed two VERTICAL ELLIPSIS characters as literal text: a
non-ASCII glyph in a source file, which this repository does not allow, and a
dependency on a font the reader may not have. It is drawn now -- a six-dot grip
in SVG at the register's 1.5 stroke weight -- with "Reorder this layer" as its
accessible name, because the control is a grip with no word beside it and the
name has to come from the markup (spec 04 section 8.2).

Plus the `embedded` prop the panel mounts it with: no header of its own, since
ControlSection draws the real RT-8 32px one; no second "Add layer" beside the
section's own plus; no nested `aside` landmark inside the panel's region; and no
16px band doubling the padding the section's band already has.
MSGEOF
}

body_shell() {
    cat <<'MSGEOF'
134 files and about 35,700 lines under src/components/shell, 48 of them tests,
implementing
design/ui/app-shell-progressive-disclosure-design.md: the activity rail, the six
activity panels, the canvas and its overlays, the inspector, the top bar, the
status bar, the command palette, the keyboard bindings table, the data table
drawer and the panel and inspector pop-out regions.

Three things in it came from the product owner during the build, and each is a
frame rule rather than a detail:

- The top bar spans the FULL shell width above the rail, and the rail begins
  below it. Nothing measured moved: the rail keeps its 48px column beside panel,
  canvas and inspector, so the body row, the canvas rect and the toolbar's
  centring are identical to the pixel. What did move is where the dataset name
  starts -- the window's own 12px padding rather than 12px inside the rail --
  and what the centre group centres on.
- A "Keep open" latch on the activity panel and on the inspector, drawn with the
  library's new padlock. It vetoes every close the shell performs on its own:
  Escape, a canvas tap, a click on the active rail icon, and the
  one-overlay-at-a-time rule below 1280px. Only its own close control still
  closes it. It is not the `Pin as A` two slots away in the same row: the pin
  freezes the content, the latch holds the surface.
- A tap that SELECTS a node or an edge no longer dismisses the inspector. That
  tap is the one that fills it, so dismissing on it made a selection impossible
  to explore. A selecting tap is told from a tap on empty space by what the pick
  produced, which the element reports before the tap is handled; a tap that
  clears the selection is a canvas tap and still dismisses.

The AI composer sends on Cmd/Ctrl+Enter and opens a new line on Enter. The field
is one line that grows to four, and a field whose Enter sends cannot be typed
into; the gesture is now the one inspector notes already use.

Settings > AI providers is the app's ONE key-entry surface. AiProviderSettings is
new and holds the provider list, the key form behind each row and the key-storage
block; AiSettingsModal keeps its name but becomes a thin dialog around that same
component, for a caller with no Settings overlay to open. It had a second, fuller
copy of the form -- its own provider dropdown, key field, persistence block and
Save/Cancel pair, and a commit model opposite to the overlay's "Changes save
automatically" -- which is gone rather than kept in step, because two key forms
are two places for one secret to be masked, autocompleted and cleared
differently. Its lucide-react imports go with it.

`?test` loads the cat social network from src/data/sampleGraphs.ts, which is the
fixture's single source of truth -- the object FIXTURES.md and the artboards are
measured against -- rather than a copy living inside a shell file. App.tsx routes
`?demo` to the compact component gallery and everything else to the shell.

vitest.config.ts exempts exactly two modules from coverage, both declaring
interfaces and no runtime code: shell/types.ts and statusbar/statusBarModel.ts.
shell/constants.ts is deliberately not among them -- it has its own test.
MSGEOF
}

body_removal() {
    cat <<'MSGEOF'
22 files and 3,517 lines: AppLayout, TopMenuBar, BottomToolbar, the old
RightSidebar, ViewDataModal with its story, GraphPropertiesPanel, StatRow, and
the tests that covered them. The shell added in the previous commit supersedes
all of it, and the product owner asked for the second shell to be deleted rather
than left reachable.

There is no `?legacy` route any more. The parameter is not special-cased on the
way out, so it falls through to the shell -- and the App test asserts that
fall-through, in place of its old "keeps the superseded shell reachable at
?legacy" case.

What survives, because the shell uses it: LeftSidebar as the Style panel's layer
list, components/sidebar/ as the style layer controls, and DataGrid,
DataAccordion and pathUtils as what the inspector's attributes table is built
on. graphty/CLAUDE.md is corrected to say so: its directory table described ai/,
layout/ and sidebar/ by the shell that is now gone.

Four exports that only the deleted files used go with them --
RIGHT_SIDEBAR_WIDTH, DIALOG_MIN_HEIGHT, layerItemToStyleLayer and the
ExecutionResult re-export in useAiManager -- and one doc comment in
types/selection.ts that named GraphPropertiesPanel as its reader.

No `!` and no BREAKING CHANGE footer, on purpose: @graphty/graphty is private
and publishes no API, so nothing outside this repository can import what this
deletes, and a major bump would be a claim about a package nobody installs.
MSGEOF
}

body_design() {
    cat <<'MSGEOF'
Revision 1.9 -> 1.11. Three changes taken directly from the product owner,
written into the sections that own them rather than appended as notes:

- The frame diagram and 5.1: the top bar spans the full shell width above the
  rail, which until now ran from the top of the window with the bar to its
  right. The 59 artboards drawing shell chrome still show the old frame and were
  deliberately left alone in this pass, so the section says which of the two
  wins and which is the thing to correct.
- 5.1 gains the panel's own open/close switch, so the two region switches are a
  pair, drawn and lit the same, in the order the regions sit on screen.
  REGISTER-1.5 section 18 registers `toggle panel` as the exact mirror of
  `toggle inspector`. Before it the panel closed from its own X and reopened
  only from the rail, whose icons choose an activity rather than show or hide a
  column.
- 6.12 "The latch" is new, and is the first decision 6.12 moves rather than
  collects: a user-controlled veto on the closes 5.2 performs. 5.2 is amended to
  say so, and to carve out the tap that selects a node -- which until now
  dismissed the inspector that tap had just filled.

5.6 gains an AI row, Cmd/Ctrl+Enter to send with Enter opening a new line, which
is the table the composer's Send tooltip should have been reading its chip from;
it had none, which is how both AI artboards came to draw `Send (Enter)`. Both are
amended to `Send (Cmd+Enter)`.

INSPECTOR-TITLE-1.9 records the fourth slot in the inspector title row as a
dated override of its own "nothing else is ever in this row", with the cost
measured rather than asserted: the always-drawn cluster takes the 80/167 numbers
the three-icon state already had, and the pinned state takes 108/139, so in that
one state a name longer than 139px ellipsizes into its title.

FIXTURES.md and section 2's sample-data row now cite
graphty/src/data/sampleGraphs.ts rather than AppLayout.tsx, and section 2's
existing-shell bullets record what was deleted instead of describing it as
present.
MSGEOF
}

body_prepush() {
    cat <<'MSGEOF'
`FAILED` is the run's overall verdict and every step ORs into it, so grading the
fast-test block with it reported an earlier step's failure against the tests:
knip failing printed "Some tests failed" on a run where every test passed. The
block gets its own TESTS_FAILED flag, and the comment beside the two flags says
which is for which. The summary still reads FAILED, because a knip-only failure
must still fail the push.

The step markers become ASCII -- [PASS], [FAIL] and ">" in place of U+2713,
U+2717 and U+25B6 -- which is this repository's plain-ASCII rule, and which also
stops a terminal without the font drawing them as boxes.

And the line that skips the graphty tests now says why: graphty/vitest.config.ts
defines no non-browser project, so the whole app shell suite is unreachable from
prepush until one exists. That is a separate piece of work, named here so the
skip is not read as "graphty has no fast tests".
MSGEOF
}

body_knip() {
    cat <<'MSGEOF'
Two shapes in this codebase export a symbol that is consumed at its own
declaration site and nowhere else: a component's `*Props` interface, referenced
by the `function X(props: XProps)` immediately below it, and a spec constant --
a string or a number quoted from a design document -- read by the one drawing in
its own module. Both are named on purpose, because the name is what ties the
value to the spec line it came from, and the app shell alone has over 150 of
them. knip reported all of them as unused exports.

`ignoreExportsUsedInFile: true` would silence them in one line, and was tried.
It is not what landed, because knip accepts that key only at the root: switching
it on applies it to all six workspaces, and from then on an export that IS dead
but happens to be referenced once inside its own file is never reported again,
anywhere.

What landed instead is per symbol. knip skips any export whose JSDoc block
carries a `@public` tag, with no `tags` entry needed, so the deliberate public
surface states that intent where it is declared and everything else stays under
detection. The tags themselves ride with the code they annotate, in the commits
that introduce it; this commit is the configuration and the comment explaining
why the blanket setting is deliberately absent.

Genuinely dead exports were deleted rather than tagged. A `@public` tag on dead
code is a lie that hides it permanently, which is the failure mode the blanket
setting was rejected for.
MSGEOF
}

body_tooling() {
    cat <<'MSGEOF'
`git commit -m` does not land in this repository. .husky/prepare-commit-msg is
`exec < /dev/tty && npx cz --hook`, Commitizen's interactive wizard, so a
scripted commit either has its message replaced by whatever the wizard collects
or hangs waiting for a prompt nobody is watching.

So this script commits through a temporary hooks directory holding a copy of
.husky/commit-msg and nothing else: commitlint still validates every message,
and prepare-commit-msg is not there to run. Messages are fed in with `commit -F
-` from a heredoc, never `-m`. The directory goes away in an EXIT trap, and
GPG_TTY is exported on a tty so the signing pinentry can prompt.

It makes the ten commits this change set is grouped into rather than one, with
each message written from the diff it covers, because semantic-release reads the
subject and one commit would name one of ten changes.

The safety is the part worth reviewing. --dry-run STAGES NOTHING: it previews
with `git diff --stat HEAD -- <paths>` and `git status --porcelain`, so the plan
can be read with an untouched index, and the usage text says to do that first.
The script refuses on a merge, rebase or cherry-pick in progress, on unresolved
conflicts, and on an index that is already dirty. Every subject is checked
against the conventional-commit grammar, against commitlint.config.js's
scope-enum and against the 100-character limit, and every body line against
body-max-line-length, BEFORE anything is staged -- so a bad message fails the
run at step zero rather than through a commit-msg rejection halfway through. A
step whose paths have nothing left to commit is skipped with a note instead of
failing, so a re-run after an interruption resumes. And any changed file no step
claims is listed at the end rather than being swept into a commit.
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
        "body_$step"
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
