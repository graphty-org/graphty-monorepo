# Feature flags

Appendix of `design/ci/channels-pipeline.md`; where the two disagree, the main document wins.

How unfinished features land on master in small pieces without reaching readers or third-party
consumers before they are ready, how one build of the graphty app serves three sites with
different features switched on, how both configurations are tested, and how a flag is removed.

## 1. Why this exists

The record says big work reached master late and all at once:

- The tier 3 branch lived 17 days and 1,386 commits before anyone tried to land it, then took
  49.6 hours and 82 gate runs to reach master and froze every other landing meanwhile.
- A census on 2026-10-17 found 574 product commits on 70 branches that never reached master.
- Today three unfinished features sit on long branches: the location map (`feat/location-map-prototype`,
  148 files changed against golden, a new `babylonjs-map/` package plus about 30 files in
  `graphty-element/src`), the timeline (`feat/timeline-data`, `feat/timeline-prototype`,
  `feat/timeline-samples`, design in `design/data/timeline-attribute.md` on `design/timeline-attribute`)
  and data management (the Data place of `design/ui/app-shell-progressive-disclosure-design.md`).

With pull requests that auto-merge to master in minutes, and master deployed to
canary.graphty.app, an unfinished feature needs a switch that is off unless someone turns it on.
The switch must not cost a second build (the same artifacts are promoted canary -> nightly ->
production), must not leak test settings into product code (a past failure: `GRAPHTY_*`
environment from the gate changed what its own tests did), and must leave graphty-element
self-sufficient and neutral.

## 2. The rules

1. **An experiment only adds.** With its flag off, graphty-element and the app behave exactly as
   they did before the experiment's code landed: no new catalog entry, no new event, no new error,
   no changed picture. Proof is mechanical: the first pull request of an experiment must show zero
   changed screenshots of existing stories and pass the existing suite unchanged (section 7).
2. **A change to existing behavior is never a flag.** It is an option with today's value as its
   default (the "choices with neutral defaults" principle). Changing a default is breaking and
   needs the owner.
3. **The element never reads the host page's URL, storage or environment to decide features.**
   The consumer passes them. The element exports a helper that parses a URL, so the consumer does
   not have to write the parser.
4. **One build for every site.** The app decides features per site at run time from a small
   configuration file the site serves. No `import.meta.env` branch, no build-time stripping.
5. **Removing a flag is an ordinary pull request** when the feature ships (section 8).
6. **Feature state never comes from the environment.** No `GRAPHTY_FEATURES` variable exists
   anywhere, in product code or tests. Tests set features explicitly (section 7).

## 3. The features module in graphty-element

### 3.1 Files

- **`graphty-element/src/features/registry.ts` (new)** -- The frozen tables `FEATURES` and `GRADUATED_FEATURES`, the `FeatureId` union.
- **`graphty-element/src/features/resolve.ts` (new)** -- `resolveFeatures()`, `featuresFromUrl()`, `setDefaultFeatures()`.
- **`graphty-element/src/catalog/index.ts`** -- Re-exports the descriptors and `featuresFromUrl` (the `./catalog` entry stays free of Babylon.js, Lit and the DOM, so Node consumers can parse a URL).
- **`graphty-element/src/extend/` entry** -- Re-exports `setDefaultFeatures` (page-wide state, beside `Algorithm.register` and the other global registrations).
- **`graphty-element/src/errors/codes.ts`** -- Two new codes, below.

The tables, as data (`plainName` is catalog data, which the principles allow; everything else is
codes and values):

```ts
export type FeatureId = "data-management" | "timeline" | "location-map";

export interface FeatureDescriptor {
    readonly id: FeatureId;
    readonly plainName: string; // "Timeline"
    readonly issue: number; // the tracking issue, open until graduation
    readonly since: string; // ISO date the flag was declared
}

export const FEATURES: readonly FeatureDescriptor[] = Object.freeze([/* one row per experiment */]);
export const GRADUATED_FEATURES: readonly string[] = Object.freeze([/* ids that shipped */]);
```

`FeatureId` is a string-literal union, so the "Public API report" check in `tools/api-report.mjs`
(no plain `string` on result types) is satisfied without an allowlist entry.

### 3.2 The public surface (all additive, so no owner approval is needed)

- **Attribute `features`** -- space-separated ids, `features="timeline location-map"`; the word `all` turns on every declared experiment. HTML token-list convention, like `class`.
- **Property `features`** -- `readonly string[]`. The same, for frameworks.
- **Property `enabledFeatures` (read-only)** -- `{ enabled: readonly FeatureId[]; unknown: readonly string[] }`. What the element actually honored; the app renders a status chip from it.
- **Event `graphty-features`** -- `detail` is the same object. Dispatched once per session creation.
- **`createSession({ features })` in `./session`** -- same strings. For Node and worker consumers with no element.
- **`featuresFromUrl(url, param = "features")` in `./catalog`** -- `(url: string | URL, param?: string) => string[]`. Parses `?features=timeline,location-map` (comma separated, trimmed, lowercased, duplicates dropped); returns raw ids, unknown ones included.
- **`setDefaultFeatures(ids)` in `./extend`** -- `(ids: readonly string[]) => void`. Page-wide default for every element and session that sets none; a page with many graphs sets it once.
- **`FEATURES`, `GRADUATED_FEATURES` in `./catalog`** -- descriptors. So a consumer can list what exists.
- **Error `E_FEATURE_OFF`** -- params `{ feature, key }`. A command, saved document or attribute asked for something whose feature is off.
- **Event code `features.unknown`** -- params `{ id }` in the `unknown` list. An id that is neither declared nor graduated.

**Resolution.** `resolveFeatures(requested)` returns the enabled set and the unknown list.
Graduated ids are accepted silently and change nothing (a nightly link pasted into production
after the feature shipped must not warn). Unknown ids never throw: a link built for nightly can be
opened on an older production build. Decided: the element neither warns on the console nor
dispatches an error for unknown ids; it lists them in `enabledFeatures.unknown` and the consumer
decides whether to show them.

**When it takes effect.** Features are read when the element creates its session (the same moment
`data-source` and `layout` are first read, in `firstUpdated`). A later change to the attribute is
applied at the next session creation and reported in the next `graphty-features` event. Live
switching inside a session is not built: it would need every experiment to undo itself, which
nothing has asked for. Decided; a later additive change can add it.

**Third-party plugins** are not gated by this module. A plugin is already opt-in by import; a
plugin author who wants their own switch writes one. Decided (not needed by any consumer).

### 3.3 Registration gating

The catalog module registers globally and its header (`graphty-element/src/catalog/registry.ts`)
states the invariant that matters: two sessions asking what the element can do get the same
answer, checked by object identity, and nothing is ever unregistered. Flags keep both:

- Every experimental built-in is registered as usual, always, with one new optional descriptor
  field `feature?: FeatureId` on the layout, algorithm, data source, format, camera and palette
  descriptors in `graphty-element/src/catalog/types.ts`. Nothing is unregistered or registered
  late, so import order cannot change the answer.
- The session's composed catalog (`graphty-element/src/session/catalog.ts`, which already caches
  each composed table on the identity of its registered half) adds the enabled-feature set to the
  cache key, as a sorted, joined string. Two sessions with the same features get the identical
  arrays, as today; a session with the feature off sees exactly today's arrays, because an entry
  whose `feature` is off is filtered out before composition and an empty filter returns the
  built-in array itself.
- Every command that resolves a key already goes through the session catalog (layout set,
  algorithm run, data source load, format read and write, camera, palette). A key whose feature is
  off is refused there with `E_FEATURE_OFF { feature, key }`, in one place, so no experimental code
  path can be reached through a key the catalog does not offer.
- An attribute that exists only for an experiment (the location map's `basemap`, in
  `graphty-element/src/config/Basemap.ts` on the prototype branch) is declared on the class like any
  other (Lit cannot declare properties conditionally). With the feature off its setter records
  `E_FEATURE_OFF { feature: "location-map", key: "basemap" }` in the element's error list and does
  nothing else.
- Events and session commands an experiment adds are dispatched or accepted only when its feature
  is on. Inside the element, code asks `session.features.has("timeline")`; there is no other way to
  read the state.

### 3.4 Saved documents

A project file that uses an experimental key (a timeline filter, the location-map layout) records
the features it needs in a new optional field `requires: FeatureId[]` (additive to the project
format in `graphty-element/src/session/projectFile.ts`). Opening it with a feature off loads
everything else and refuses that part with `E_FEATURE_OFF`, never a silent substitution. That
follows the WebGPU rule: detecting the absence and saying so is right, quietly doing something
else is not.

### 3.5 Existing "experimental" code

Network sources and click-to-expand (`session/commands/doors.ts`, `session/sources/`) are
described as experimental in comments but are shipped behavior today. They are not put behind a
flag: switching them off by default would change today's behavior, which is breaking. Their
comments are changed to say "stable"; whether they later get an `@experimental` tag with no flag
waits on the owner's answer about what the tag promises (section 11).

## 4. The API report

graphty-element's public API is committed as `graphty-element/api/<entry>.api.md` by
api-extractor, which already understands the TSDoc `@experimental` modifier (it treats it like
`@beta` and prints `// @beta` beside the item in the report). The rule:

- Every export, property, event detail type or descriptor field that exists only for an
  experiment carries `@experimental <feature-id>` in its doc comment, for example
  `@experimental timeline`. The API diff of a pull request then shows which additions are
  experimental.
- `tools/check-features.mjs` (new, about 150 lines, run in ci.yml's Checks job beside
  `tools/api-report.mjs`) fails when:
    1. an `@experimental <id>` tag, a `feature: "<id>"` descriptor field, a `features.has("<id>")`
       call, a story's `features` parameter or a site configuration (section 5) names an id that is
       not in `FEATURES`;
    2. a graduated id still appears anywhere in `graphty-element/src`, `graphty/src` or the site
       configurations;
    3. a `FEATURES` row's issue is missing (checked offline: a number is present; the issue's state is
       not fetched, to keep the check deterministic and off the GitHub API budget);
    4. a flagged descriptor field or attribute lacks its `@experimental` tag.
- `node tools/check-features.mjs --list` prints every flag with its age, issue and the number of
  places that reference it, so flag debt is visible. Nothing expires on a timer: graduation is the
  owner's judgment, and the owner rules say states end on events.

What `@experimental` promises a third party is the one open question for the owner (section 11).
**Until he answers, no experiment adds a public export or type**: `tools/check-features.mjs` fails on
any `@experimental` tag in the API report, experiments are reached only through catalog keys and
attributes gated at run time (whose shapes are data, so changing them breaks no type), and a piece
that needs typed public API waits for the answer before it merges.

## 5. The app: one build, per-site runtime configuration

### 5.1 The configuration file

Each site serves `site.json` at its root. The app fetches it before it loads graphty-element:

```json
{
    "site": "nightly",
    "features": ["timeline", "location-map"],
    "datasets": "https://nightly.graphty.app/data/graph-samples/v1/",
    "sentryEnvironment": "nightly"
}
```

- `site`: `"canary" | "nightly" | "production"`; shown in the app's header chip and sent to Sentry.
- `features`: element and app feature ids switched on for every reader of that site.
- `datasets`: where this site's datasets live (each site hosts its own, per the owner's decision).
  Replaces the build-time branch in `graphty/src/workspace/start/open.ts` for built sites;
  `VITE_LOCAL_SAMPLE_DATA` stays for the dev server and Storybook, which never read the network.
- `sentryEnvironment`: replaces `import.meta.env.MODE` in `graphty/src/lib/sentry.ts`, which is
  `production` on every site today and would label canary errors as production ones.

The sources live in the monorepo, so a change is an ordinary reviewed pull request:
`graphty/sites/canary.json`, `graphty/sites/nightly.json`, `graphty/sites/production.json`.
`.github/CODEOWNERS` names the owner for `graphty/sites/production.json` and
`graphty/sites/nightly.json`, so an agent cannot switch on an experiment for readers of those
sites. Canary's file is not owner-gated: canary is what master holds.

**How a site gets its file.** The build artifact never contains `site.json`. The step that deploys
a site (canary: `deploy-pages.yml`; nightly and production: the site repositories' `deploy.yml`,
started by the promotion, channels section 3) copies `graphty/sites/<site>.json` in as `site.json`,
read from master's tip at the moment the promotion is dispatched, not from the promoted nightly
commit: the file is reviewed configuration, not code, and the owner-owned version on master is the
one he approved. Its blob id is recorded in `channel.json`. The site repositories are
graphty-org/graphty-nightly and graphty-org/graphty-site. Changing production's features without new code is
a configuration-only promotion: the same build, a new `site.json`, one workflow run the owner
triggers.

### 5.2 Boot

New file `graphty/src/siteConfig.ts` (about 60 lines), called from `graphty/src/main.tsx` in the
same `requestAnimationFrame` that calls `loadGraphtyElement()`:

1. `fetch("./site.json", { cache: "no-cache" })` -- GitHub Pages serves `max-age=600`, and
   `no-cache` revalidates so a flipped flag reaches readers on their next load, not ten minutes later.
2. Validate with the schema the app already uses for its own settings (zod). A missing, unreadable
   or invalid file gives `{ site: "unknown", features: [] }`: **every experiment off**. A broken
   configuration can only make a site look more like production, never less.
3. Combine `config.features` with `featuresFromUrl(location.href)` from
   `@graphty/graphty-element/catalog`. The URL parameter works on every site, production included:
   it lets the owner or a tester try an experiment on graphty.app without a new build, and an
   experiment only adds. Decided; one line in `siteConfig.ts` turns it off for production if
   that is ever regretted.
4. Set the `features` attribute on every `<graphty-element>` the app renders (one place: the
   workspace's element wrapper), and keep the list for the app's own gates.

This is consuming the element: reading the URL is the app's job by rule 3 and the parsing is the
element's helper. Nothing about features is persisted between visits (a reader's preference store
is the app's, but nobody has asked for it).

### 5.3 The app's own experimental UI

The app's half of an experiment (the Data place in the nav rail, a timeline scrubber panel) is
shown when the element's `enabledFeatures.enabled` contains the id, read from the element, never
computed in the app. An app-only experiment with no element part (none today) would be declared
in `graphty/src/features.ts` and checked against the combined raw list; `tools/check-features.mjs`
reads that file too, so its ids get the same checks.

## 6. Which work starts behind a flag

- **`location-map`** -- Element part: the location-map layout (`src/layout/locationMap/`), its catalog entry in `catalog/layouts.ts`, the basemap catalog (`catalog/basemaps.ts`), `basemap` attribute and `BasemapManager`; App part: the layout's picker entry, the location column control; Branches to restructure: `feat/location-map-prototype`, `fix/3317-locationmap-load`, `fix/location-map-applies`, design on `design/location-map-layout`.
- **`timeline`** -- Element part: the time attribute and the visibility filter it drives (`src/session/visibility/`), its commands and events; App part: the scrubber; Branches to restructure: `feat/timeline-data`, `feat/timeline-prototype`, `feat/timeline-samples`, design `design/data/timeline-attribute.md`.
- **`data-management`** -- Element part: versioned, refreshed and joined data commands as they are built; App part: the Data place.

The new `babylonjs-map` package itself is not flagged: a package is opt-in by install, and
graphty-element loads it as an optional peer the way it loads webgpu-graph-algorithms.

**The first pull request of each flag** declares the `FEATURES` row and the tracking issue, adds
the `feature` field and the gates, and carries none of the feature's behavior. It must merge with
zero changed screenshots and zero changed existing tests. Each later piece is its own pull
request of the size the merging section sets, landing on canary with the flag off for
everyone except canary's `site.json` and URL testers. That is what turns a 1,386-commit branch into
a stream of reviewable pieces.

The existing branches are not rebased or cherry-picked (never copy, always merge): each branch
merges master, adds the gates on top, and is then split by opening pull requests from it in
order, each from a branch that holds the previous one.

## 7. Testing in two configurations

### 7.1 What each configuration means

- **Off** (every experiment off): the normal suite, unchanged. Proves rule 1.
- **On** (every declared experiment on, `setDefaultFeatures(["all"])`): the same suite again.
  Proves that switching an experiment on breaks nothing that does not use it, and that the
  experiments do not break each other. Pairs and other combinations are not run: with three
  flags, "all on" plus each feature's own tests covers what matters. Decided; revisit at six
  flags.

An experiment's own tests set their feature themselves (`features: ["timeline"]` on the element
or the session, or a story's `parameters.features`), so they run and are covered in the Off
configuration too. Coverage thresholds (80/75) are judged on the Off run, which already includes
those tests.

### 7.2 How the On configuration is switched on

No environment variable and no build-time constant, by rule 6. A setup file
`graphty-element/test/setup-features-on.ts` (three lines) calls `setDefaultFeatures(["all"])`, the
same public API a consumer uses. `graphty-element/vitest.config.ts` gains one helper,
`featuresOn(project)`, that copies a project with `name: "<name>-features-on"` and the setup file
appended; it is applied to `default`, `browser`, `interactions` and `storybook`. The graphty app's
`graphty/vitest.config.ts` does the same for `browser`, `real-element` and `storybook` with a
fixture `site.json` of `{ "features": ["all"] }` served by the test's existing sample-data server
(`graphty/vite.sample-data.ts`).

Test records written to the Cloudflare store (the test-history section) carry
`config: "features-off" | "features-on"` as part of the inputs, so a test that passes Off and fails
On is never called flaky: flaky means passed and failed on the same commit and the same inputs.

### 7.3 Where each configuration runs

- **Pull request (light checks)** -- Off: affected tests and affected story screenshots, as the merging section sets; On: affected test files of graphty-element and graphty only, tests without screenshot comparison, in the same jobs.
- **Every 6 hours (full run on master's tip)** -- Off: every shard and the full capture; On: every graphty-element and graphty shard, element story screenshots compared against the Off baselines.
- **Local `pnpm run test:changed`** -- Off: yes; On: yes, for the same two packages.

`tools/ci-test-matrix.mjs` gains the On shards: `graphty-element-default-features-on`,
`graphty-element-browser-features-on-1` to `-5`, `graphty-element-storybook-features-on-1` to `-5`,
`graphty-features-on-1` to `-5`, the same commands as their Off twins with
`--project=<name>-features-on`. While `FEATURES` is empty the matrix plans none of them (On would
equal Off).

**Cost.** A full run today is 25 test jobs of about 15 minutes or less (31 to 64 minutes wall
time). The On shards add 16 jobs, about 3.5 job-hours per full run and 14 a day at four runs a
day, free on GitHub's standard runners because the repository is public. The limit is concurrency:
a full run is already 51 to 59 jobs, and with the On shards and the stories migration's double
capture it reaches 70 to 75 against Team's 60 concurrent Linux jobs. So the full run's test matrix
has `max-parallel: 40` (about 20 runners stay free for pull requests and bisects) and the On shards
start after the Off shards finish; the run has 6 hours. On a pull request the On pass reruns only
the affected files of two packages, typically one to three minutes.

### 7.4 The screenshot invariant

In the 6-hour On run, graphty-element's stories are compared with the same baselines the Off run
uses. A story that does not use an experiment must render the same picture with every experiment
on; a difference fails the run and names the story and the configuration. Stories whose subject
is an experiment declare `parameters.features` and have their own baselines taken with that
feature on. The app's stories run their play functions On but are not compared, because an app
experiment legitimately adds visible chrome (a nav rail entry). No baseline is ever approved for
the On configuration, so the owner reviews no extra images. Different results between
configurations are bugs to fix, like differences between environments.

### 7.5 Nightly promotion

A canary commit is promoted to nightly only when both configurations are green in its full run.
Nightly's `site.json` switches experiments on, so the On run is the one that tests what nightly
readers get.

## 8. Graduation and flag removal

When the owner judges a feature finished (usually after it has run on nightly), one pull request:

1. removes the row from `FEATURES` and appends the id to `GRADUATED_FEATURES`;
2. deletes every `features.has("<id>")` branch, keeping the On side, and the `feature` field on
   its descriptors;
3. removes `@experimental <id>` tags and refreshes the API report (`npm run api:report`);
4. removes the id from `graphty/sites/*.json` and the app's gates;
5. turns the feature's tests and stories from `features: ["<id>"]` to plain;
6. closes the tracking issue (`Fixes #N`).

`tools/check-features.mjs` fails until every reference is gone, so a half-removed flag cannot
merge. Graduation makes the feature available by default, which is additive (rule 1 guarantees it
changed nothing for readers who do not use it), so it is a minor release, not a major. The newly
changed screenshots are the On pictures the owner already approved for the feature's own stories.

An abandoned experiment is removed the same way, deleting the On side instead, without a
graduated entry; its id then reports as unknown, which is harmless.

## 9. Failure modes

- **An experiment changes behavior with its flag off.** The Off suite and zero changed screenshots on its first pull request; any later piece that changes an Off screenshot is a visible diff the owner must approve and the reviewer must reject.
- **An experiment breaks something it does not touch when on.** The On run, including the screenshot invariant (7.4); nightly promotion waits for it.
- **`site.json` missing, unreadable, invalid or slow.** Every experiment off and the app continues; the fetch has no timer of its own (it ends when the request does, and the element loads only after it), and the configuration-off case logs one console line with the site and the error.
- **An agent switches an experiment on for nightly or production readers.** CODEOWNERS on `graphty/sites/nightly.json` and `production.json`; the owner reviews.
- **An experimental API leaks into stable use.** `@experimental <id>` tags show in the API report; check 4 in `tools/check-features.mjs`.
- **A saved project needs a feature that is off.** `requires` field and `E_FEATURE_OFF` for that part; the rest loads.
- **A flag is never removed.** `--list` shows its age and references; the tracking issue stays open; graduation is an ordinary pull request.

## 10. What is reused, what is new, what is deleted

Reused: the composed catalog and its identity cache (`graphty-element/src/session/catalog.ts`),
the global registries and their duplicate policy (`catalog/registry.ts`, `catalog/pluginRegistry.ts`),
error codes (`errors/codes.ts`), the API report and its check (`tools/api-report.mjs`), the test
matrix (`tools/ci-test-matrix.mjs`), the import-graph selector for the pull-request On pass
(`tools/test-select.mjs`, or its successor in the testing section), the site assembly
(`tools/assemble-pages-site.sh`), the sample-data test server (`graphty/vite.sample-data.ts`).

Deleted: the build-time per-site branches the configuration replaces (`import.meta.env.MODE` as
Sentry's environment in `graphty/src/lib/sentry.ts`, and the dataset-base branch for built sites in
`graphty/src/workspace/start/open.ts`).

## 11. Open question for the owner

**What `@experimental` promises third parties (a published contract, so a one-way door).** The
recommended answer: an export, attribute, event or catalog entry tagged `@experimental` may change
or disappear in a minor release of graphty-element, said so on the docs site's API pages and in
the README, and the "breaking changes need the owner" rule applies only to untagged API. Without
this, every shape change during an experiment's life is a major release, which would either hold
the experiments or produce majors the grouped-major rule forbids. The alternative is to give
experiments no public types at all until graduation, which fits catalog entries and attributes
but not the timeline's commands and result types.

The design does not decide this by default: it is in the owner's action list (main section 14,
the remaining owner decisions). Until he answers, the alternative applies (section 4).

Everything else in this section is decided above and reversible by an ordinary pull request:
attribute syntax, `all`, the URL parameter on production, no live switching, no pair testing,
the shard plan, CODEOWNERS on two site files, no persistence of URL features.
