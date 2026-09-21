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
# One entry per commit, in the order they are made. This change set is the
# graphty-element 2.0 major: the extension points, the edge model, weighted
# layouts, pin state, the entry-point split and the application that consumes
# all of it. The register every BREAKING CHANGE footer below answers to is
# design/element-api/element-api-migration.md.
#
# ORDER IS LOAD-BEARING HERE, in a way it was not for the change set before.
# Several steps claim a directory that an earlier step has already emptied --
# [importers] takes graphty-element/src/data after [edges] has committed the
# four files in it that belong to the edge model, and [element] takes
# src/config after [edges] and [styles] have taken three files out of it.
# `git add` on a directory adds whatever is still dirty under it, so an earlier
# step having already committed a file makes the later `git add` a no-op for
# that file. Reordering these steps silently changes which commit a file lands
# in. The per-step preview in --dry-run is the check: read it.
#
# WHAT THESE COMMITS ARE NOT. This is one long-lived branch whose five or six
# threads of work interleave in the same files -- DataManager.ts alone carries
# endpoint resolution, edge identity, repeat policy and incident-edge removal.
# The commits are therefore coherent by SUBJECT and are not individually
# bisectable: the tree is green at the end of the sequence, not necessarily in
# the middle of it. Splitting them further would mean splitting files, which
# means `git add -p` and a human deciding hunk by hunk. Say so rather than
# implying a bisect that does not work.
#
# PATHS entries are space-separated pathspecs (no path in this repository has a
# space in it, so the word splitting below is deliberate). A directory pathspec
# takes everything under it -- ignored files are not added, because `git add`
# without -f leaves ignored paths alone and the preview uses
# `git ls-files --others --exclude-standard`, which counts the same set.
# ---------------------------------------------------------------------------

STEPS=(errors catalog extend logging camera styles edges importers layout session element packaging tests app docs tooling)

declare -A SUBJECTS=(
    [errors]="feat(graphty-element): add the error codes the new refusals report"
    [catalog]="feat(graphty-element)!: register palettes, formats, cameras, layouts and log sinks"
    [extend]="feat(graphty-element)!: publish the algorithm base classes a plugin needs"
    [logging]="feat(graphty-element)!: move the logger to its own entry point"
    [camera]="feat(graphty-element)!: make a named camera view something a third party can add"
    [styles]="feat(graphty-element)!: scope what an algorithm's layer paints, and register palettes"
    [edges]="feat(graphty-element)!: name edge endpoints source and target, and give every edge its own id"
    [importers]="feat(graphty-element)!: let a file declare its own direction"
    [layout]="feat(graphty-element)!: give the layouts edge weights and keep a reader's pins"
    [session]="feat(graphty-element)!: answer from the session what a consumer was computing itself"
    [element]="feat(graphty-element)!: settle the custom element's attributes and events"
    [packaging]="build(graphty-element)!: publish an exports map without sourcemaps or a CommonJS entry"
    [tests]="test(graphty-element): drive a dummy extension through everything a built-in does"
    [app]="refactor(graphty): read the element's answers instead of recomputing them"
    [docs]="docs(graphty-element): document the extension points, the edge model and the entry points"
    [tooling]="chore(tools): re-point the commit script at the 2.0 change set"
)

declare -A PATHS=(
    [errors]="graphty-element/src/errors/codes.ts graphty-element/test/errors"
    [catalog]="graphty-element/src/catalog graphty-element/catalog.ts graphty-element/test/catalog"
    [extend]="graphty-element/extend.ts graphty-element/src/algorithms graphty-element/test/algorithms graphty-element/test/browser/algorithm-extension.test.ts graphty-element/test/browser/plugin-algorithm.test.ts"
    [logging]="graphty-element/logging.ts graphty-element/src/logging graphty-element/test/logging graphty-element/test/browser/logging-extension.test.ts"
    [camera]="graphty-element/src/camera graphty-element/src/screenshot graphty-element/test/browser/camera-extension.test.ts graphty-element/test/browser/camera-presets-2d.test.ts graphty-element/test/browser/camera-presets-3d.test.ts graphty-element/test/browser/camera-presets-user-defined.test.ts graphty-element/test/browser/camera-animation-2d.test.ts graphty-element/test/browser/2d-camera-controls.test.ts graphty-element/test/browser/3d-camera-controls.test.ts"
    [styles]="graphty-element/src/session/styles graphty-element/src/Styles.ts graphty-element/src/config/GraphStyle.ts graphty-element/src/config/StyleTemplate.ts graphty-element/test/styles.test.ts graphty-element/test/browser/style-layers.test.ts graphty-element/test/browser/style-paint-pixels.test.ts graphty-element/test/browser/session-style-paint.test.ts graphty-element/test/browser/palette-extension.test.ts"
    [edges]="graphty-element/src/Edge.ts graphty-element/src/data/endpoints.ts graphty-element/src/data/edgeIdentity.ts graphty-element/src/data/report.ts graphty-element/src/config/DataConfig.ts graphty-element/src/managers/DataManager.ts graphty-element/test/data/endpoints.test.ts graphty-element/test/managers/DataManager.test.ts graphty-element/test/browser/edge-endpoints.test.ts graphty-element/test/browser/edge-id-space.test.ts graphty-element/test/browser/parallel-edges.test.ts graphty-element/test/browser/incident-edge-removal.test.ts graphty-element/test/integration/Edge.integration.test.ts"
    [importers]="graphty-element/src/data graphty-element/test/data graphty-element/test/helpers/corpus graphty-element/test/browser/declared-direction.test.ts graphty-element/test/browser/format-extension.test.ts graphty-element/test/browser/graph-load-from-file.test.ts graphty-element/test/browser/graph-load-from-url.test.ts graphty-element/test/browser/seeded-node-count.test.ts"
    [layout]="graphty-element/src/layout graphty-element/src/managers/LayoutManager.ts graphty-element/src/Node.ts graphty-element/src/NodeBehavior.ts graphty-element/test/layout graphty-element/test/interactions graphty-element/test/browser/element-pin.test.ts graphty-element/test/browser/node-behavior.test.ts graphty-element/test/browser/NodeBehavior-unified-drag.test.ts graphty-element/test/browser/layout-extension.test.ts"
    [session]="graphty-element/src/session graphty-element/session.ts graphty-element/test/session"
    [element]="graphty-element/src/Graph.ts graphty-element/src/graphty-element.ts graphty-element/src/events.ts graphty-element/index.ts graphty-element/schema.ts graphty-element/ai.ts graphty-element/src/ai graphty-element/src/managers graphty-element/src/meshes graphty-element/src/config graphty-element/test/ai graphty-element/test/graphty-element graphty-element/test/browser/element-ignores-url-params.test.ts graphty-element/test/browser/data-attributes.test.ts graphty-element/test/browser/event-forwarding.test.ts graphty-element/test/browser/node-events-reach-consumers.test.ts graphty-element/test/browser/background-attribute.test.ts"
    [packaging]="graphty-element/package.json graphty-element/scripts graphty-element/vite.config.ts graphty-element/tsconfig.build.json graphty-element/typedoc.json graphty-element/test/packaging knip.config.ts"
    [tests]="graphty-element/test graphty-element/stories graphty-element/.storybook"
    [app]="graphty/src graphty/vite.config.ts graphty/tsconfig.json"
    [docs]="graphty-element/docs graphty-element/README.md graphty-element/AGENTS.md graphty-element/CLAUDE.md design"
    [tooling]="tools/commit-changes.sh"
)

# ---------------------------------------------------------------------------
# One body per step. Written for someone reading `git log` a year from now with
# none of this conversation: say what changed and why it had to, not what the
# work was like. A BREAKING CHANGE footer is what semantic-release reads to cut
# the major, and for the behaviour changes it is the ONLY place the change is
# announced -- those commits otherwise look like ordinary fixes.
# ---------------------------------------------------------------------------

body_errors() {
    cat <<'BODY'
Codes for the refusals the element had no way to report: an unresolvable edge
endpoint pair, an unknown palette, camera view, log sink or format, a duplicate
plugin registration, an unknown option and an option out of range.

The code is the contract a consumer switches on; the message is for people and
may be reworded in any release. Every refusal added in this release reports one
of these rather than a plain Error whose text a caller would have to match on.
BODY
}

body_catalog() {
    cat <<'BODY'
Six things can now be brought to the element from outside: a palette, a file
format, a camera view, a layout, an algorithm and a log destination. Each
registers globally, appears in session.catalog beside the element's own, and is
addressable by the key a consumer types and a saved document records.

Every catalogue table composes the built-ins with whatever registered, and
returns the built-in array itself while nothing has -- so two sessions that
agree about what the element can do still compare equal.

One option mechanism replaces three. An extension declares OptionDescriptor[],
the plain-JSON type the catalogue already published, and the element validates
against it. An algorithm used to declare its options twice, in two vocabularies
that did not correspond and that nothing cross-checked.

BREAKING CHANGE: session.catalog tables are composed rather than frozen
built-in arrays, and the descriptor lookups search registrations as well as
built-ins. OptionsSchema and resolveOptions are deprecated in favour of
OptionDescriptor[] and resolveOptionValues.
BODY
}

body_extend() {
    cat <<'BODY'
./extend publishes DeclaredAlgorithm, the base class the element's own
centralities use, with the result vocabulary a plugin needs to publish a typed
result: AlgorithmOutput, AlgorithmRunContext, ResultFieldSpec and the field-spec
builders.

A third party's algorithm now gets what a built-in gets -- progress,
cancellation, a cost estimate before the click, a ranking, a histogram, a
plain-language reading and a picture derived from its shape. Before this a
plugin could be registered and called but could not be started as a run at all,
because the run machinery resolves a key through the catalogue and the
catalogue was a frozen table of the element's own twenty.

BREAKING CHANGE: edgeResultId is not published. An endpoint pair is a lookup
key and not an identity -- it cannot name one of two parallel edges -- so a
per-edge result row carries the id the element minted for that edge.
BODY
}

body_logging() {
    cat <<'BODY'
@graphty/graphty-element/logging is the one address for the logger, the levels,
the record, both shipped destinations and the lazy helper. It resolves with no
Babylon, no Lit and no DOM in its import graph, so a consumer can route the
element's logs to their own collector from Node, a worker or a test without
loading a renderer.

A log destination is also registered under a name, so a configuration object
can say which one to use and stored settings round-trip it. A destination
reachable only by holding a live object has no key, no config field and nothing
a settings panel could write down.

BREAKING CHANGE: the root barrel no longer exports the 23 logging symbols;
import them from @graphty/graphty-element/logging. The seven colour-vision
helpers move to @graphty/graphty-element/schema, beside the palettes whose
colorblindSafe flag is computed from them.
BODY
}

body_camera() {
    cat <<'BODY'
A camera view is a descriptor plus a pure function from the graph's bounds, the
drawing mode and the viewport to a camera state. The element's own five are
five registrations of that shape, so a third party's view is applied,
catalogued, animated and queued by exactly the same path.

A view declares which drawing modes it supports, so a picker never offers one
that cannot work in the current mode and the element refuses before calling it
rather than throwing from inside a switch.

BREAKING CHANGE: BUILTIN_PRESETS is no longer exported; camera views are
catalogue data reached through session.catalog. Three ScreenshotErrorCode
members are removed -- CAMERA_PRESET_NOT_FOUND, CAMERA_PRESET_NOT_AVAILABLE_IN_2D
and CANNOT_OVERWRITE_BUILTIN_PRESET -- because camera failures are now
GraphtyErrors carrying E_UNKNOWN_CAMERA, E_UNSUPPORTED and E_PROTECTED.
BODY
}

body_styles() {
    cat <<'BODY'
An algorithm's suggested layer writes only to the nodes and edges its own
result carries a value for. A layer with an empty selector ran its calculated
value over every element, and calculated values are last-writer-wins, so one
algorithm erased every algorithm beneath it -- which defeats the point of
stacking layers at all.

A palette can be registered, and a layer naming one nobody registered is
refused at the edit with the known palettes listed, rather than accepted,
written onto the layer and silently painting nothing one repaint later. A saved
document carries the descriptor of every non-built-in palette its layers name,
so a look is self-describing.

BREAKING CHANGE: the 1.x style template is removed; a look is a StyleDocument
applied through the style layer API. A layer or document naming an unknown
palette reports E_UNKNOWN_PALETTE.
BODY
}

body_edges() {
    cat <<'BODY'
An edge record names its endpoints source and target. The element works the
spelling out once for a whole batch -- source/target, then src/dst, then
from/to -- and a batch that answers none of them stops the load with
E_EDGE_ENDPOINTS_UNRESOLVED naming the columns the records do carry.

Following the element's own documentation used to produce a graph with nodes,
no edges and no error: the runtime default was src/dst while every guide taught
source/target. It shipped as a bug -- the node inspector reported zero
neighbours for every node of karate.gml while the same node's card said 17
links -- and it was format-dependent, so it passed on JSON and failed on GML.

An edge's id is the element's own counter. The old id joined the two endpoint
ids with a colon, which could not tell a:b -> c from a -> b:c and could not
name two edges between one pair at all -- which is why a second edge between
the same pair was silently dropped. Two such records are two edges now, each
with its own id, weight and attributes; choose otherwise with first, last, sum,
min, max or error.

Removing a node removes the edges attached to it. An edge could outlive an
endpoint and go on ray-casting against the removed node's mesh.

BREAKING CHANGE: edge records carry source and target, not src and dst. Edge
ids are element-minted strings, so a selection or scope saved by 1.x matches
nothing, and there is no translation because the old id was ambiguous. Edge
counts rise on any multigraph and density, degree and every derived figure rise
with them. Removing a node emits elements-removed naming the edges that went.
BODY
}

body_importers() {
    cat <<'BODY'
Every importer reports the direction its file states: GEXF's defaultedgetype,
GraphML's edgedefault, GML's directed key, DOT's graph or digraph keyword,
Pajek's arcs and edges sections, a Gephi CSV's Type column and a node-link
JSON's directed flag. A format that states nothing says nothing, and the
element's own configuration stands.

Every loadable file was read as directed, including karate.gml and football.gml,
which ship with the element and declare themselves undirected. Density printed
half its true figure, the node inspector split every node's neighbours into
incoming and outgoing on every graph, and the catalogue refused kruskal, prim
and bipartite-matching everywhere.

statistics() now also says where the direction came from and quotes the text
that settled it, so a reader can tell a file's own claim from the element's
default.

BREAKING CHANGE: an undirected file loads one edge per file edge rather than a
mirrored pair, so edge counts halve and every degree, density and centrality
moves with them.
BODY
}

body_layout() {
    cat <<'BODY'
Kamada-Kawai and ForceAtlas2 read edge weights, and read them the same way: a
heavier edge is drawn shorter. Both accepted a weight option and ignored it,
under two different names, neither of which reached the layout catalogue. There
is one option now, weighted, and a descriptor says whether a layout honours it
so a settings panel does not hard-code the list of two.

A node the reader drags stays where they dropped it through a layout change, a
2D/3D switch and a template apply. Pin state lived inside whichever engine was
current and a layout change constructs a new one, so every pin was lost. The
element owns the pin now and an engine's copy is a projection of it, which is
also what makes a third-party engine that has never heard of pinning honour one.

BREAKING CHANGE: every Kamada-Kawai and ForceAtlas2 arrangement of a graph with
real weights moves. Node.isPinned() answers the element's own field, so code
that branched on it and never took the pinned path now can.
BODY
}

body_session() {
    cat <<'BODY'
The session reports the graph's shape as maintained data rather than as
something a consumer walks the graph for: counts, density, directedness and
where that came from, degree range and mean, self loops, repeated edges and the
connected-component summary.

A run publishes a typed result the element can rank, summarise, histogram, read
back in plain language and derive a picture from, so a consumer who asked for
numbers is not also writing the style layer that draws them.

BREAKING CHANGE: GraphStatistics gains directednessSource and meanDegree. A
run's per-edge answers are keyed by the element's edge id. Every run, layout
and export is scoped to what is visible by default, so a run under an active
filter measures fewer elements than 1.x measured on the same dataset.
BODY
}

body_element() {
    cat <<'BODY'
The element stops reading the host page's query string. Mounting the component
made it reconfigure logging and profiling globally for the whole application
because of a URL parameter, which is the application's decision to make and not
a component's.

The two load events stop using one field name for two different numbers.
data-loading-progress carries nodeRecordsLoaded and edgeRecordsLoaded -- records
handed over, the only honest mid-load count -- and data-loading-complete carries
nodesLoaded and edgesLoaded, both meaning what the graph holds and agreeing with
the session's counts. They legitimately differ: an edge naming a node the file
never declared creates that node.

The repeat policy and the edge id path are real attributes, reachable without
reaching into the element's own configuration object.

BREAKING CHANGE: the graphty-element-logging, graphty-element-log-level and
profiling URL parameters are ignored; call configureLogging instead.
data-loading-progress.nodesLoaded and .edgesLoaded are renamed to
nodeRecordsLoaded and edgeRecordsLoaded.
BODY
}

body_packaging() {
    cat <<'BODY'
Fourteen entry points, five of which resolve in Node with no renderer anywhere
in their import graph -- enforced by a test that walks what each one reaches,
rather than by convention.

Installing the package was a 39 MB download, 26 MB of it sourcemaps. It is
2.9 MB packed now, with no map files in the tarball.

BREAKING CHANGE: the package is ESM-only. There is no require condition and no
main field; the UMD build is replaced by ./bundle, one self-contained file for
a script tag.
BODY
}

body_tests() {
    cat <<'BODY'
One file per extension point, each registering an extension a third party would
plausibly write and driving it through every capability its built-in equivalent
has, plus one suite that registers all six against a single graph. A capability
not exercised there is not promised, and the gaps that remain are written down
rather than left to be discovered.

The corpus gains a guard in both directions -- every file on disk named by a
manifest, every manifest entry present on disk. The tests walked the manifest,
so a file nothing listed was parsed by nothing: a GraphML fixture whose entire
content was the words 404: Not Found sat there unread for nine months.
BODY
}

body_app() {
    cat <<'BODY'
The application deletes its own disjoint-set forest, its directedness vote over
every edge record, its cost model, its copy of the element's viridis anchors,
and the defensive reader that tried both endpoint spellings because the element
emitted two that disagreed. Each existed because the element did not publish
the answer; each is a property read now.

A comment in the application explaining why the element could not be used is a
bug report that was never filed. The ones that were still true became element
changes in this release; the ones this release makes false are deleted, along
with a hook, a component and a loader that nothing rendered.
BODY
}

body_docs() {
    cat <<'BODY'
Seven pages on extending the element, one per supported extension point. The
three that existed taught interfaces the element does not have -- a layout
engine with initialize and getPosition, a data source with an abstract load,
a graph.loadFromDataSource that exists nowhere -- so following any of them
produced a class that did not compile. Every complete example in all six was
extracted into one file and type-checked against the published declarations.

The getting-started guide, the web-component attribute table and the
data-sources guide agree with the runtime about endpoint spelling for the first
time.

The breaking-change register records what landed, what was refused and what has
to happen outside a working tree before the release can be cut.
BODY
}

body_tooling() {
    cat <<'BODY'
The step list, the subjects and the paths describe this change set. The
machinery -- the commitlint pre-validation, the temporary hooks directory that
keeps commit-msg while leaving Commitizen's interactive prompt out of the run,
and the leftover report -- is unchanged.
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
