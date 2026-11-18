# Usage analytics: Umami for everyone, PostHog after consent, Sentry for errors only

Issue #8818. Branch feat/usage-analytics.

## 1. What this is

The graphty app (graphty.app) gets three data paths. Each has one job.

| Service                             | Who it covers                            | What it answers                                                                                                                                                                       | Identifier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Umami Cloud (free plan, cookieless) | every visitor, no consent needed         | How many people come, which channel sent them (`?ref=hn`), do they come back, do they load a sample or their own file, run a measure, export, and how many choose to share usage data | nothing is stored in the browser. Umami Cloud receives the IP address and User-Agent with each request and derives a pseudonymous session id from them, the website id and a salt that rotates monthly by default. It keeps that id on its side and does not store the IP, but it does store what it derives from the request: an approximate location from the IP (country, region and city) and the browser, operating system and device type from the User-Agent. The sender ignores the id Umami sends back |
| PostHog Cloud EU                    | only readers who said "Share usage data" | What people are trying to do (survey), how far they get (funnels and paths), where they struggle (masked replays, rage and dead clicks, failure codes)                                | a random id in this browser, deleted when sharing is turned off                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Sentry                              | only readers who said "Share usage data" | What broke: errors, a masked replay of the moments before an error, and user feedback                                                                                                 | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

The pitch of the app is "your files never leave your computer". Three rules follow from it, and tests enforce each one:

- No event property carries the reader's data. That means no file names, URLs, labels, column names, note text, project names or journal command payloads. Every property value comes from an allowlist: catalog ids, command ids, the app's own ids, fixed enums or buckets. Anything else is sent as `"other"`. The one exception is the survey's optional "Other" text box, which sends what the reader types there, disclosed next to the box and on the privacy page.
- Before or without "Share", only the Umami counts in section 4.1 leave the page. They carry no identifier from the page. PostHog's code is not even downloaded.
- Every URL sent to any vendor, at any depth of any payload, Sentry included, is cut: a same-origin URL to its path plus a sanitized channel parameter, any other URL to the fixed token `"external"` (not even its origin: the origin of a server the reader opens is that server's address). Referrers are cut to their origin. PostHog's stored first referrer and first URL (`$initial_person_info`) are turned off, because posthog-js sends them in its feature-flags request, which never passes `before_send`. Before either recorder (Sentry's error replay or PostHog's session replay) starts, the address bar's query string and hash are removed, so a replay never records them.

Architecture rule: facts about the graph come from graphty-element's public events. Umami and PostHog live only in the graphty app, and graphty-element never imports either. graphty-element gains additive, neutral API (section 8): one session event `source:loaded`, one optional load option `callerKey`, a `trigger` on journal entries, a `trigger` on run changes, a `via` on selection changes and one camera event.

## 2. Decisions

All of these are two-way doors unless marked otherwise.

1. **Vendor ids live in `site.json`, not `VITE_*` env vars.** One build serves canary, nightly and production byte for byte. Without an id nothing loads, so dev, Storybook, vitest and the acceptance dry run (whose site is `unknown`) send nothing, with no extra code. No CI, nx-input or `.env` change is needed.
2. **Only `graphty/sites/production.json` gets ids at first.** That keeps launch numbers clean. Copying the block into `nightly.json` turns it on there.
3. **Umami is sent by our own small sender to Umami's documented collection endpoint, not by `script.js`.** This avoids running unpinned third-party code on a page whose pitch is privacy. It also gives full control of the payload: no title, no query string, a referrer origin only. The fallback is in risk R1.
4. **Do Not Track and Global Privacy Control stop the visit record, not the counts.** With either set, nothing is written to `graphty.visits.v1` and no `first_visit` or `return_visit` is sent. The page view and the action counts, which touch no storage, are still sent, because the agreed goal is that Umami counts everyone. This is flagged for the owner (section 12, step 5): honoring DNT and GPC fully would undercount by an unmeasured share, likely larger than usual for a Hacker News audience because Brave sends GPC by default.
5. **One consent switch covers both PostHog and Sentry.** It is the same disclosure and the same reader decision. Making "Report a problem" work without consent is launch-plan item 1, a separate issue.
6. **PostHog is a dynamic `import("posthog-js/full/no-external")` inside the consent sender, with `disable_external_dependency_loading`.** It never enters the landing bundle, and no PostHog script is fetched from its CDN.
7. **PostHog keeps its anonymous id in `localStorage`, and `identify()` is never called.** This lets the sample-to-own-data funnel and retention work across visits for readers who opted in. It is disclosed, and turning sharing off deletes it in every open tab.
8. **PostHog masks everything.** All text in autocapture and replay is masked. In autocapture every element attribute is masked except one allowlisted control id (decision 15). In replay every attribute is masked except a short allowlist that carries no reader text (section 6). Sentry's error replay accepts only a list of attribute names to mask, so it masks a named list that also covers `name`, `href`, `download`, `label`, `for` and `id` (section 7). Inputs are masked, and the graph element, canvas, images, video and file inputs are blocked. Menus, tables, the inspector, notices and `aria-label`/`title` attributes all carry project, file and column names, and a selective mask would leak through whichever surface was missed. A replay shows a blank rectangle where the graph is, so the canvas events in section 4.2 are the only signal of what happens on the canvas.
9. **PostHog region is EU (`eu.i.posthog.com`).** One-way door: data cannot move between regions later. The owner confirms this when creating the project.
10. **The survey is a PostHog "API" survey drawn by the app with existing Mantine components.** PostHog's popover brings its own styling into a UI locked to Figma. PostHog still stores the questions and the targeting.
11. **Load facts come from a new graphty-element session event, `source:loaded`.** Each load door publishes it after its load commits, and it sends a kind and ids, never a name. Opening a project, undo, redo and restore publish none. It is a different event from the existing forwarded graph event `data-loaded`, which fires whenever data arrives for any cause (section 8.1). Without it the app would have to read `sources()` and work out the facts itself, which the architecture rules forbid.
12. **Exports and layout choices are recorded by the app, not by element events.** The element cannot tell an export from a preview: `DataOutput.tsx:471` calls `exportGraph` on every option change to preview losses. Likewise `layout.set` journal entries also come from the app's own `layout` attribute at boot, project and sample setup and the assistant. "The reader pressed Export and it finished" and "the reader applied a layout" are the app's own actions. The app reads the format or layout id from its own choice and computes nothing about the graph.
13. **Sentry keeps errors, replay-on-error and feedback.** It drops full-session replay, dead tracing config, release-health session pings, client reports, console breadcrumbs and the integrations listed in section 7. Its URL cleaning is tightened to the same rule as the analytics (cross-origin URLs become `"external"`), an error's message is treated as the reader's data (a graphty-element error is sent as its code, any other message with its quoted runs replaced), the error replay is sent once per error and never turns into a session recording, and its replay masks the same attributes as PostHog's.
14. **Each Umami event name is sent at most once per page view.** There are nine names (the page view, one visit event, six actions and `usage_data_shared`), so a page view sends at most nine Umami events and every funnel step always has room. PostHog receives every occurrence.
15. **Clickable controls carry a safe id that survives masking.** Controls that run a registered command render `data-ph-capture-attribute-control="<command id>"`. posthog-js copies that attribute into `$autocapture`, `$rageclick` and `$dead_click` properties as `control`, and `cleanPostHogEvent` keeps it only when the value is a registered command id or one of the app's fixed control ids. This is what makes clicks, rage clicks and paths readable with everything else masked.

## 3. Consent and data flow

```
boot (main.tsx): bootQuery = snapshot of location.search (before anything strips it)
                 loadSiteConfig().then(startAnalyticsAtBoot)
  startAnalyticsAtBoot(config):
  |-- readChannel()                   keep the cleaned channel params and the path in a module value
  |-- startUsageDataIfShared()        if stored answer is "share":
  |                                     stripQueryForRecorders()  remove every query param, synchronously
  |                                     initSentry()              errors, error replay buffer, feedback
  |                                     startPostHog()            sets wanted = true synchronously, then import(), init
  '-- startPageCounts(config)         Umami: always (if id + allowed host)
                                      page view built from readChannel's saved path and params
                                      first_visit or return_visit unless DNT/GPC (buffered for PostHog when wanted)
                                      then remove the four channel params from the address bar

Workspace (project element and session only, never the start screen's HeroGraph)
  useUsageEvents(element, session, store)
     element events --> count(name, props)   Umami (once per name per page) + PostHog (every time)
                    --> detail(name, props)  PostHog only (when on)
  app's own actions (export, layout, project open, command run) --> count() or detail()

answerUsageData("share")    -> count("usage_data_shared"); stripQueryForRecorders(); initSentry(); startPostHog()
answerUsageData("declined") -> stopSentry(); stopPostHog()   (opt out, delete id, keep opt-out marker)
storage event: graphty.usageData.v1 became "declined" or was removed in another tab
                            -> the same stop in this tab
```

`usageData.ts` keeps its single `{ start, stop }` sender and its `setUsageSenderForTests` seam. Only the default sender changes:

```ts
const live = {
    start: () => {
        stripQueryForRecorders();
        initSentry();
        startPostHog();
    },
    stop: () => {
        stopSentry();
        stopPostHog();
    },
};
```

`stripQueryForRecorders()` (in `analytics.ts`) calls `history.replaceState` to drop every query param and the hash, keeping the path, but only when a recorder will actually start (a PostHog key in `site.json`, or a Sentry DSN as reported by `sentryConfigured()` in `sentry.ts`, which reads the same default config that `initSentry()` reads and which tests feed through the Sentry seam, section 10 item 16); otherwise it does nothing, so dev, vitest and Storybook keep their query. It runs synchronously before either recorder initializes, so neither Sentry's replay Meta event nor PostHog's records `?url=`, `?graphty-element-logging=` (which can carry a `remoteLogUrl`), `?features=` or anything else. Nothing in the app reads `location.hash`, so dropping it costs nothing. Readers of the query that run after boot read `bootQuery()` instead of `location.search`: `App.tsx:22` (`?demo`, read on every render) and `main.tsx` `logPageStart` (`?features`). `siteConfig.ts` and `parseLoggingURLParams` read before any strip. A consenting reader who reloads loses those params; they are developer and demo switches, and the shared-link case keeps working because the params are read before they are removed.

`usageData.ts` also listens for `storage` events on `graphty.usageData.v1`. When another tab writes "declined" or removes the key, this tab runs the live sender's stop. Without it, a second open tab would keep recording and PostHog's persistence would write `ph_<token>_posthog` back after the first tab deleted it.

Every existing test that installs a stand-in sender keeps working unchanged.

**PostHog before it loads.** `count()` and `detail()` calls made while PostHog is wanted but not yet initialized are kept in a page-lifetime buffer of at most 20 entries. They are sent on init if `wanted` is still true and dropped on stop. `startPostHog()` sets `wanted` synchronously, and boot calls `startUsageDataIfShared()` before `startPageCounts()`, so `first_visit`, `return_visit` and an early `sample_loaded` reach PostHog for a reader who already shared.

**Counts stream.** `analytics.ts` also exposes `onUsageEvent(listener)`, called with every `count()` and `detail()` (name and allowlisted props). `SurveyCard` uses it to pick its moment (section 4.4), so it never subscribes to the session itself.

**What `analytics.ts` may import.** `main.tsx` imports it statically, so it is part of the landing page. It imports only types and modules that are already on the landing page (the element's session entry already is, through `start/library.ts` `DEFAULT_LIMITS`), and never the workspace command registry, the frame or an element catalog. What only the workspace knows reaches it at runtime: `WorkspaceContext` calls `setCommandAllowlist(ids)` with the registered command ids once its registry is built, and the catalog checks (algorithm keys, `FormatId`, `LayoutId`, error codes) are applied by `useUsageEvents`, the export and layout handlers and `WorkspaceContext` before they call `count()` or `detail()`, all of which load with the workspace chunk. Until `setCommandAllowlist` has run (on the start screen), `cleanPostHogEvent` keeps `control` only for the fixed control ids and drops any other value.

## 4. Event taxonomy

### 4.1 Umami (everyone) and PostHog (when on)

These are the same names in both. `count()` sends to Umami at most once per name per page view, and to PostHog on every occurrence while PostHog is on (buffered as in section 3 while it loads).

| Event               | Properties (exact)                                                                                                                                                                                                                                                               | Source                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page view           | `url`: path plus kept channel params; `referrer`: origin                                                                                                                                                                                                                         | `startPageCounts()` at boot (PostHog: its own `$pageview`; the channel is merged into every PostHog event by `cleanPostHogEvent`, section 6)                                                                                                                                                                                                                                      |
| `first_visit`       | none                                                                                                                                                                                                                                                                             | no `graphty.visits.v1` record in localStorage                                                                                                                                                                                                                                                                                                                                     |
| `return_visit`      | `days`: `"1"` \| `"2-7"` \| `"8-30"` \| `"30+"`                                                                                                                                                                                                                                  | record exists and its `last` is not today                                                                                                                                                                                                                                                                                                                                         |
| `usage_data_shared` | none                                                                                                                                                                                                                                                                             | `answerUsageData("share")`, sent before PostHog starts. Nothing is sent for "No thanks". Its count over `first_visit` is the opt-in rate, which says how far PostHog's funnels and survey answers can be scaled to the whole audience                                                                                                                                             |
| `sample_loaded`     | `sample`: a catalog dataset, generator or network-example id, or one of the app's own start-screen sample ids; else `"other"`                                                                                                                                                    | `source:loaded` with `kind: "sample"` or a `sample` field, unless its `callerKey` is `"reopen"`                                                                                                                                                                                                                                                                                   |
| `own_file_opened`   | `format`: a `FormatId` from the catalog, else `"other"`; `"graphty"` for a project file. `via`: `"file"` \| `"url"` \| `"server"` \| `"join"`                                                                                                                                    | `source:loaded` with kind file, url, server or join and no `sample` field, unless its `callerKey` is `"reopen"`. A project file is reported from the app's own `openProjectFile` when `ProjectOpenReport.opened === "project"` and the file was picked or dropped by the reader (no `storedId`, not a Recent entry); opening a project publishes no `source:loaded` (section 8.1) |
| `layout_changed`    | `layout`: a `LayoutId` from the catalog, else `"other"`; `outcome`: `"applied"` \| `"failed"`                                                                                                                                                                                    | `graphty/src/workspace/layout/LayoutForm.tsx` `apply()` (line 420) after the call resolves or rejects; the map pick that applies at once (`LayoutForm.tsx:439`); the `layout.reshuffle` command (`layout/commands.ts:38`). The canvas map source change (`CanvasOverlays.tsx:204`) is not a layout choice and is not counted                                                      |
| `algorithm_run`     | `algorithm`: catalog algorithm key, else `"other"`; `outcome`: `"succeeded"` \| `"failed"` \| `"canceled"`                                                                                                                                                                       | `run:changed`, `phase === "end"`, `cause === "command"`, no `trigger`                                                                                                                                                                                                                                                                                                             |
| `export_done`       | `kind`: `"graph"` \| `"project"` \| `"styles"` \| `"recipe"` \| `"image"` \| `"video"`; `format`: the chosen format id for graph, image and video, absent for project, styles and recipe (they have no format choice); `destination`: `"download"` \| `"clipboard"` (image only) | the app's export handlers, after the awaited call succeeds                                                                                                                                                                                                                                                                                                                        |

Mapping rules for `source:loaded`: the event's `kind` is always the `LoadedSource.kind` that `session.data.sources()` records for that source (section 8.1). A load counts as a sample when its kind is `"sample"` (catalog datasets and generators, and the app's own sample loads, which pass `origin: "sample"`) or when it carries a `sample` field (a network example from `loadExample`, whose recorded kind stays `"server"`). A sample maps to `sample_loaded`. Its `sample` is the event's `sample.datasetId`, `generatorId` or `exampleId`, each checked against its own allowlist; when the load was a start-screen tile, the app's own id from `callerKey` (`"sample:<StartSample.id>"`) checked against the app's sample list. Any other load maps to `own_file_opened`: kinds file and url with `format`; kind server as `{format: "other", via: "server"}` (the source id is not sent); kind join as `via: "join"`. The event's `source` key and `sourceId` are never forwarded to any vendor.

A Recent-project reopen is not `own_file_opened`. It is sent to PostHog only, as `project_reopened` (section 4.2).

**Visit bucket.** The localStorage key `graphty.visits.v1` holds `{ "first": "YYYY-MM-DD", "last": "YYYY-MM-DD" }` in local calendar dates. Every access is wrapped in try/catch. `startPageCounts` never reads or writes it when there is no Umami id, the host is not allowed (section 5), or DNT or GPC is set.

- No record: send `first_visit` and store first = last = today.
- A record whose `last` is not today: send `return_visit` with `days = visitBucket(first, today)`, then store last = today. This sends at most one per day.
- A record whose `last` is today: send nothing.
- Storage blocked: send the page view only.
- A record whose last visit is older than 395 days, or that does not parse, is reset.
- A record whose last visit is dated after today (a clock moved back, a trip west across time zones) was already counted: nothing is sent and the record keeps its dates.

Only the bucket leaves the machine. The dates never do.

**Channel.** `cleanUrl(href)` turns a same-origin URL into its path plus only the `ref`, `utm_source`, `utm_medium` and `utm_campaign` params. A value is kept only when it is in the app's short channel list (`KNOWN_CHANNELS` in `analytics.ts`: `hn`, `reddit`, `x`, `bluesky`, `mastodon`, `linkedin`, `github`, `newsletter`, `email`, `producthunt`, extended by editing the list); any other non-empty value is sent as `"other"`, so a per-recipient tracking value such as `utm_campaign=u_8f3k2q9` never leaves the page. It drops every other param and the hash. Any other URL becomes `"external"`. `readChannel()` stores the path and the four cleaned params in a module value at boot. After the Umami page view is sent, `history.replaceState` removes those four params from the address bar (keeping the path, the hash and every other param), so a reader who shares a link does not pass their channel on. PostHog never sees them in the address bar; `cleanPostHogEvent` adds them to every event as `channel_ref`, `utm_source`, `utm_medium` and `utm_campaign`.

**Budget.** The free plan allows 100k events a month. A front-page Hacker News day (about 50k visitors at 3-6 events each) exceeds it in one day. This is an owner choice (section 12).

### 4.2 PostHog only (after consent)

| Event                                                   | Properties (exact)                                                                                                                                                                                       | Source                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| autocapture `$autocapture`, `$rageclick`, `$dead_click` | element chain with text and attributes masked; `control`: the allowlisted id from decision 15                                                                                                            | PostHog. The graphty-element host carries `ph-no-capture`, and `cleanPostHogEvent` drops any of these three whose element chain contains `graphty-element` or `canvas`: a canvas click changes no DOM, which PostHog would read as a dead click, and repeated canvas clicks look like rage clicks                                       |
| `$web_vitals`                                           | vitals numbers; URLs cleaned                                                                                                                                                                             | PostHog (`network_timing` off)                                                                                                                                                                                                                                                                                                          |
| `$$heatmap`                                             | click positions keyed by cleaned URL                                                                                                                                                                     | PostHog (canvas clicks kept: they show where on the page people click)                                                                                                                                                                                                                                                                  |
| `command_run`                                           | `command`: the registered command id, never its label                                                                                                                                                    | `WorkspaceContext.tsx` `run(id)`, next to the existing log line                                                                                                                                                                                                                                                                         |
| `command_failed`                                        | `command`: the id; `code`: the `GraphtyError` code when the error is one and the code is in the element's exported error-code catalog, else absent                                                       | the existing catch in `WorkspaceContext.tsx` `run(id)` (:113-119), beside its notice                                                                                                                                                                                                                                                    |
| `graph_action`                                          | `kind`: `JournalEntry.kind`; `op`: `entry.command.op` from the op allowlist below; `action`: `"mark"` \| `"highlight"` for `style.patch` only; `suggested`: `true` when `entry.trigger === "suggestion"` | `journal:appended`, filtered as below. It never sends the command object, because `data.import` can hold raw file text and `note.add` holds note text                                                                                                                                                                                   |
| `canvas_selected`                                       | `target`: `"node"` \| `"edge"` \| `"both"` \| `"none"`; `count`: `"1"` \| `"2-10"` \| `"11+"` \| `"0"`; `via`: `"click"` \| `"box"` \| `"keys"` \| `"other"`                                             | `selection:changed` with `cause === "user"`; target and count from its `nodes` and `edges` totals, `via` from its new `via` field                                                                                                                                                                                                       |
| `camera_used`                                           | `kind`: `"orbit"` \| `"pan"` \| `"zoom"`                                                                                                                                                                 | the new `camera:gesture-end` event (once per gesture). Fit is counted as `command_run {command: "view.fit"}`, because the app's Fit calls `applyCameraView` and journals nothing                                                                                                                                                        |
| `nodes_dragged`                                         | none                                                                                                                                                                                                     | `journal:appended` with op `positions.set` and no `trigger`. A canvas drag dispatches exactly one `positions.set` on drop (`NodeBehavior.ts:845`). Group collapse and restore (`session/groups.ts:243, 487`) and the assistant's layout tool (`ai/tools/families/layout.ts:214`) also dispatch it; this overcount is accepted (risk R7) |
| `source_expanded`                                       | `outcome`: `"expanded"` \| `"failed"`                                                                                                                                                                    | the existing `source:expanded` and `source:expand-failed` events                                                                                                                                                                                                                                                                        |
| `panel_opened`                                          | `panel`: an id from the panel allowlist below                                                                                                                                                            | one `store.subscribe` that compares only `dialog`, `place` and `page`                                                                                                                                                                                                                                                                   |
| `project_reopened`                                      | none                                                                                                                                                                                                     | `openRecent` / stored-project open in `project/actions.ts`                                                                                                                                                                                                                                                                              |
| `load_failed`                                           | `code`: the error code when it is in the element's exported error-code catalog, else `"other"`; `task`: `"load"` \| `"prepare"`                                                                          | `progress:changed` with task `"load"` or `"prepare"`, phase `"end"` and `outcome` `"failed"` (`ProgressChange` spells the other ending `"cancelled"`, which is not sent): `error.code` only, never `source`                                                                                                                             |
| `algorithm_run` (failed)                                | adds `code`: checked against the same catalog, else `"other"`                                                                                                                                            | `session.runs` run `.error.code` (`RUN_STATUSES` spells the ending `"canceled"`, which is what `outcome` sends)                                                                                                                                                                                                                         |
| `survey shown`, `survey sent`, `survey dismissed`       | `$survey_id`, `$survey_name`, `$survey_response`, and keys starting `$survey_response_` (the choice id, or the reader's typed "Other" text)                                                              | `SurveyCard`                                                                                                                                                                                                                                                                                                                            |

**graph_action filter.** Only entries with no `trigger`, or with `trigger: "suggestion"`, are sent; an entry with `trigger: "project"` (a member of a project-open transaction, section 8.3) is never sent. Every journal op the element dispatches is listed here as sent or excluded; a new op is excluded until it is added to the op allowlist.

- Sent: `style.encode`, `style.patch`, `style.template`, `shader.set`, `view.dimension`, `view.immersive`, `view.save`, `view.remove`, every `data.*` op but the two that read a source in, every `set.*` op, `note.add`, `note.update`, `note.remove`, `note.merge`, `annotations.set`, `annotations.patch`, `config.set`, `algo.rename`, `algo.remove`, `algo.move`, `layout.scope`, `layout.rerun`, `positions.pin`, `visibility.set`, `visibility.hide`, `visibility.conditions`, `visibility.context`, `visibility.steps`.
- Excluded: `data.import` and `data.import-source` (a load is counted once, as `sample_loaded` or `own_file_opened` from `source:loaded`); every entry that carries a `callerKey`: the app runs its own writes (its starting choices for every project and the project's name) as `session.transaction(label, fn, { callerKey: APP_CALLER_KEY })`, graphty-element's own way to mark a caller's setup work, and `watchSession` drops any entry with a `callerKey`, so a reader's own change made while one of the app's writes is under way is still counted; `algo.run` and `algo.legacy` (a run is counted as `algorithm_run` from `run:changed`); `layout.set` and `layout.transport` (layout choices are counted by the app as `layout_changed`, decision 12, and `layout.set` also comes from the app's own attribute at boot); `positions.set` (counted as `nodes_dragged`); `view.camera` (camera use is counted by `camera_used` and the Fit command); `visibility.window` and `visibility.playback` (timeline playback dispatches one per step).

An entry that has a `coalesceKey` is sent only when its key differs from the key of the last entry sent, so one slider drag sends one event at its start.

**algorithm_run filter.** A `run:changed` end that carries `trigger` (section 8.4: the element re-ran it because the timeline window moved or the results policy changed to re-run) is not counted. The app infers nothing about playback.

**Panel allowlist.** The dialog ids in the `dialog` field of `store.ts`, the `place` values and the `page` values, written out as `PANEL_IDS` in `workspace/privacy/useUsageEvents.ts` (the workspace chunk, so the dialogs that have a constant, such as `NETWORK_DIALOG` and `SAVE_AS_DIALOG`, are named by it). Only a change the reader makes is sent: a change made in the same store write that opens or closes a project, or while a project's open or restore is still running (its `opened` has not settled), is the app's own and is not sent. A dialog id of the form `settings:<id>` is sent as `settings`. Anything else is `"other"`.

**Super properties** added to every PostHog event by `cleanPostHogEvent`: `site`; `channel_ref`, `utm_source`, `utm_medium`, `utm_campaign` when present (from `readChannel()`); `visit`: `"first"` or the `return_visit` bucket (absent under DNT or GPC); `use_case` once the reader has answered the survey, on this visit or an earlier one (section 4.4); and `$geoip_disable: true`, so PostHog stores no location derived from the IP.

Some events are never sent anywhere because they fire at pointer or frame rate or carry ids: hover, per-frame camera motion, `layout:motion-changed`, progress ticks, timeline steps, node or edge ids, labels.

Not instrumented as `command_run`: commands that bypass `run(id)` (Quick actions algorithm rows, Sources row, column header menu, style-tree rows). Their clicks are autocaptured with a `control` id where the control knows its command, and their effect arrives as `graph_action` or `algorithm_run`.

### 4.3 Funnels, paths and insights (owner builds them in PostHog, no code)

An algorithm's suggested styles paint inside the run's own journal entry (`algo.run`), so after a single Analyze run the only style entry is the reader's own re-coloring. `suggested: true` appears only on the separate style entries of a batch release and of an explicit `applySuggestedStyles()` call (section 8.3).

1. Core analysis: (`sample_loaded` or `own_file_opened`) -> `algorithm_run` (succeeded) -> `graph_action` (op `style.encode`, `suggested` not set) -> `export_done`. A second version without the third step measures load -> result -> export.
2. Own data straight in: `own_file_opened` -> `algorithm_run` -> `export_done`.
3. Sample to own data: `sample_loaded` -> `own_file_opened`, within 7 days.
4. Layout exploration: `own_file_opened` -> `layout_changed` -> `graph_action` with op `view.dimension`.
5. Canvas use: `own_file_opened` -> `canvas_selected` -> (`algorithm_run` or `export_done`).
6. Struggle board:
    - `load_failed` by `code`
    - `algorithm_run` failed by `code`
    - `command_failed` by `command` and `code`
    - `$rageclick` and `$dead_click` by `control`
    - `command_run` with `command` `history.undo`
    - a saved replay filter: sessions with a load but no `algorithm_run`
7. Paths: a PostHog Paths insight over custom events only (`sample_loaded`, `own_file_opened`, `command_run`, `panel_opened`, `graph_action`, `algorithm_run`, `layout_changed`, `export_done`), with `command_run` broken down by `command` and `panel_opened` by `panel`. Page-view paths are meaningless here: the app has no router, so there is one `$pageview` per load.

Break funnels down by `channel_ref` and by `use_case`, with PostHog's breakdown attribution set to "last touch". `use_case` is on every event after the answer and on every event of later visits. A funnel whose last step comes after the answer gets the reader's use case; a reader who never answers shows as "none". Person profiles stay off (`identified_only` with no `identify()`), so no cohort or person property is used. Scale any PostHog rate by the opt-in rate from Umami (`usage_data_shared` over `first_visit`) before reading it as the whole audience's.

### 4.4 Surveys

Surveys are created in PostHog as type "API". The app draws them with `SurveyCard.tsx`.

- "What are you trying to do?"
    - Single choice: Explore my own network data / Analyze a network for research or work / Make a figure for a paper or talk / Teach or learn about graphs / Journalism or investigation / Just looking around / Other (optional text).
    - When the reader answers, the app stores the choice id in localStorage `graphty.surveys.v1`, and `cleanPostHogEvent` adds it as `use_case` from then on, on this and later visits. The "Other" text is sent only as the survey response, never as `use_case` (which is `"other"`).
- "How easy was it to get this export?", a 1-5 rating, asked only at the first `export_done` of a page view.

Each survey is found by a fixed name kept in `analytics.ts` (`SURVEY_NAMES`: `use_case` for the first, `export_ease` for the second); the owner gives the PostHog surveys exactly these names (section 12).

`SurveyCard` is mounted in `Workspace.tsx`.

- It renders nothing unless `postHog()` returns a client. `postHog()` returns undefined whenever sharing is off, including after a stop on the same page, so the card never asks PostHog for surveys after the reader withdrew.
- It listens on `onUsageEvent` (section 3). Each moment belongs to one survey:
    - `use_case`: the first of the first succeeded `algorithm_run`; a `load_failed` or a failed `algorithm_run`; or three minutes (a `setTimeout` started by a `sample_loaded` or `own_file_opened`, cleared by an `algorithm_run`) after a load with no `algorithm_run` since.
    - `export_ease`: the first `export_done`.
- At a moment it calls `posthog.getActiveMatchingSurveys(cb)` and shows only the survey with that moment's name, and only if its id is not in `graphty.surveys.v1`. It never falls back to another active survey. At most one survey is shown per page view, so a reader asked `use_case` is asked `export_ease` at an export on a later visit.
- A shown, answered or dismissed survey id is stored in `graphty.surveys.v1` and never shown again. The answered `use_case` choice is stored there too; turning sharing off deletes the stored choice and keeps the ids, so a reader who shares again is not asked again and no old answer returns as `use_case`.
- It uses the same pinned `<aside>` pattern as `UsageDataCard`, built from existing components.
- Next to the text box it shows: "Do not paste data from your graph. What you type here is sent."

## 5. Umami sender (exact)

The sender is `POST https://gateway.umami.is/api/send` with `fetch(url, { method: "POST", keepalive: true, credentials: "omit", headers: { "Content-Type": "application/json", "x-umami-website-id": <umamiWebsiteId>, "x-umami-hostname": <location.hostname> }, body })`, the same endpoint and headers Umami's own tracker uses. It never sends `x-umami-cache`. Failures, synchronous or rejected, are swallowed. Nothing retries and nothing queues. Of the response body only the boolean `disabled` is read: when it is true (Umami reports the site disabled, for example over the plan's quota), the sender sends nothing more for the rest of the page view, as Umami's own tracker does. The `cache` token, `sessionId` and `visitId` Umami returns are not stored and not echoed on any later request.

```json
{
    "type": "event",
    "payload": {
        "website": "<umamiWebsiteId>",
        "hostname": "<location.hostname>",
        "title": "graphty",
        "url": "<cleanUrl of the saved boot path and channel>",
        "referrer": "<origin of document.referrer, or empty>",
        "name": "<event name, absent for a page view>",
        "data": { "<allowlisted props>": "..." }
    }
}
```

`title` is the constant "graphty", because the document title can hold a project name. `language` and `screen` are left out, so Umami's language and screen reports stay empty; Umami still reads browser, operating system and device type from the User-Agent header and location from the IP, on its side.

It sends only when both hold:

- `siteConfig().analytics?.umamiWebsiteId` is set
- `location.hostname` equals the host for `siteConfig().site` (`production` maps to `graphty.app`, `nightly` to `nightly.graphty.app`, `canary` to `canary.graphty.app`)

The same host check (`onOwnHost` in `analytics.ts`) gates Share: off the site's own host, the live sender starts neither PostHog nor Sentry, and `startPostHog` loads nothing. A local build or a studio server that answers with a real site's `site.json` therefore never sends into that site's projects.

DNT and GPC affect only the visit record (decision 4).

The hostname and the DNT/GPC reads go through the test seam (section 10, graphty app item 3), so tests on `localhost` can reach the positive cases.

## 6. PostHog setup (exact)

Loading uses `import("posthog-js/full/no-external")`, the documented entry (its `package.json` points at `dist/module.full.no-external.js`; types come from `dist/module.d.ts`). It inlines the recorder, surveys, web vitals and dead clicks and loads nothing external. It is one lazy chunk of about 821 KB raw and 240 KB gzip at posthog-js 1.450.1. PostHog contacts two hosts: the ingest host (`eu.i.posthog.com`) and the assets host (`eu-assets.i.posthog.com`) for the remote config JSON.

```ts
posthog.init(key, {
    api_host: host, // https://eu.i.posthog.com
    defaults: "<an explicit dated defaults string, pinned with the version>",
    persistence: "localStorage", // no cookies
    person_profiles: "identified_only", // identify() is never called: no person profiles
    opt_out_capturing_by_default: true, // a missing opt-in marker means "out"
    disable_external_dependency_loading: true,
    advanced_disable_flags: false, // surveys need the remote config call
    capture_pageview: true, // no router: one per load
    capture_pageleave: true,
    autocapture: { dom_event_allowlist: ["click", "change", "submit"], capture_copied_text: false },
    mask_all_text: true,
    mask_all_element_attributes: true, // autocapture only; data-ph-capture-attribute-* still collected
    rageclick: true,
    capture_dead_clicks: true,
    enable_heatmaps: true,
    capture_exceptions: false, // Sentry owns errors
    capture_performance: { web_vitals: true, network_timing: false },
    enable_recording_console_log: false, // log lines can hold graph values
    save_referrer: false,
    save_campaign_params: false, // else $initial_person_info (full referrer, boot URL) rides in every /flags body
    opt_out_persistence_by_default: true, // opted out = persistence disabled and ph_<token>_posthog removed
    session_recording: {
        captureJsonLd: false, // a recorder option; on by default from the 2026-08-30 defaults
        maskAllInputs: true,
        maskTextSelector: "*",
        maskAttributeFn: maskEveryAttribute, // replay: attributes are NOT masked by default
        blockSelector: 'graphty-element, canvas, img, video, input[type="file"]',
        recordHeaders: false,
        recordBody: false,
        maskCapturedNetworkRequestFn: (request) => ({ ...request, name: cleanUrl(request.name) }),
    },
    disable_surveys: false,
    before_send: cleanPostHogEvent,
});
posthog.opt_in_capturing(); // only if `wanted` is still true
```

`input[type="file"]` is blocked because `maskAllInputs` masks every input value except file inputs. `compact-mantine/src/components/inputs/pickFiles.ts:41-66` appends a file input to `document.body` and its change listener fires while it is still in the DOM, so without the block the recorder would capture `C:\fakepath\<file name>`. Both `start/open.ts:7` and `project/files.ts:83` open files through it.

Both graphty-element hosts in the app get `className="ph-no-capture"`: the project's in `frame/ElementHost.tsx` and the start screen's in `start/HeroGraph.tsx`. Autocapture then ignores clicks on the canvas, and because `ph-no-capture` is also PostHog's default replay `blockClass`, both hosts are blank in replay.

There is no `register()` call. Super properties (section 4.2) are merged into every event inside `cleanPostHogEvent`, because posthog-js captures `$pageview` and `$opt_in` synchronously inside `init` and `opt_in_capturing()`, before any `register()` could run.

`maskEveryAttribute(key, value)` is an allowlist. It returns the value unchanged only for `class`, `role`, `type`, `tabindex`, `disabled`, `style`, the `aria-*` state attributes (`aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`, `aria-disabled`, `aria-hidden`, `aria-current`, `aria-haspopup`) and `data-ph-capture-attribute-control`, and returns `"*"` for every other attribute. An attribute that starts carrying reader text later is therefore masked without anyone listing it; `name` already does (`Fields.tsx:695` builds it from a field name). `style` is kept because masking it breaks the replay's layout, and it holds only CSS. The app has over 100 interpolated `aria-label` and `title` attributes carrying project, source, column and label names (for example `RecentProjects.tsx:30`, `CanvasOverlays.tsx:318`, `SourceRow.tsx:274`, `LabelCard.tsx:292`), so this mask is required.

`cleanPostHogEvent(event)` runs these steps in order and returns the event or `null`:

1. If `wanted` is false, return `null`. This guard does not depend on PostHog's own consent state.
2. Drop the event unless its name is allowlisted. `$` names allowed: `$pageview`, `$pageleave`, `$autocapture`, `$rageclick`, `$dead_click`, `$web_vitals`, `$$heatmap`, `$snapshot`, `$opt_in` and the survey events. Own names: those in section 4. Any other name, including one a later defaults date turns on, is dropped.
3. Drop `$autocapture`, `$rageclick` and `$dead_click` whose element chain contains `graphty-element` or `canvas`.
4. Delete `$set`, `$set_once`, `title` and `$title` (the document title can hold a project name). Merge the super properties from section 4.2.
5. For every event except `$snapshot`, clean by value at any depth of `properties`: every string that parses as an `http:` or `https:` URL is replaced by `cleanUrl` of it. Every key of `$heatmap_data` is replaced by `cleanUrl` of it. `$referrer`, `$initial_referrer` and `$referring_domain` become origins. This covers `$current_url`, `$pathname`, `$initial_current_url`, `$session_entry_url`, `$prev_pageview_pathname`, `$external_click_url` and the `$current_url` inside each `$web_vitals_*_event`, and any key a later posthog-js version adds. `$snapshot` is skipped: walking every recording batch costs CPU on each flush, and rewriting stylesheet and font URLs to bare origins breaks replay styling. The replay's own URLs are protected by the address-bar strip (section 3) and `maskCapturedNetworkRequestFn`.
6. For every event, `$` events included, drop every non-`$` property key that is neither in that event's allowlist nor one of `token`, `distinct_id`, `site`, `channel_ref`, `utm_source`, `utm_medium`, `utm_campaign`, `visit`, `use_case`. For `$` events the allowlist is empty except `control` on the autocapture events, so keys posthog-js adds on its own, such as `ph_keyword` (search terms parsed from the referrer on every capture), are dropped. Keep `control` only when it is in the command allowlist injected by `setCommandAllowlist` (section 3) or a fixed control id, and drop it otherwise. `$`-prefixed keys are kept, because `$session_id`, `$window_id`, `$lib` and the rest link events to sessions and replays. For the survey events, the allowlist is `$survey_id`, `$survey_name`, `$survey_response` and any key starting `$survey_response_`.

The lifecycle mirrors Sentry's page singleton:

- `startPostHog()` does nothing without a key, then sets `wanted = true` synchronously.
    - If PostHog was already initialized on this page, it calls `reset(true)`, then `opt_in_capturing()`, then `startSessionRecording()`. `reset(true)` makes a new device id as well as a new distinct id: opt-out removed the stored ids but posthog-js still holds them in memory, and a plain `reset()` keeps `$device_id` and saves it again, linking the reader to what was recorded before they said No. The flags request that `reset()` makes is fine here: the reader has just shared.
    - Otherwise it awaits one memoized import promise (a second start while the import is in flight reuses it). It sets an `initialized` flag synchronously when it calls `init`, so two starts give exactly one `init`. It calls `init` only if `wanted` is still true, so a No that arrives before the chunk loads wins. After `init` it calls `opt_in_capturing()` and flushes the buffer from section 3. The query was already stripped by the sender (section 3).
- `stopPostHog()` sets `wanted = false` and clears the buffer; from then on `postHog()` returns undefined. If PostHog was initialized, it calls `stopSessionRecording()` and `opt_out_capturing()`. It never calls `reset()`: in posthog-js 1.450.1 `reset()` always ends with `reloadFeatureFlags()`, which posts a new `distinct_id`, `$device_id`, person properties and the time zone to `/flags`, and that request is not a capture, so neither the opt-out nor `before_send` stops it. Deleting the id is persistence's job: with `opt_out_persistence_by_default: true`, `opt_out_capturing()` disables persistence and removes `ph_<token>_posthog` itself, and every later save (a debounced save, a session-id touch, a survey cache write) writes nothing. As a backstop it then removes every other `ph_`-prefixed key in localStorage and sessionStorage, keeping the `__ph_opt_in_out_<token>` marker, which says "out". It also deletes the stored `use_case` choice from `graphty.surveys.v1` (section 4.4). Every step is best effort, inside try/catch.

**Events captured before No.** An event captured while consent held may still be sent after the reader withdraws. posthog-js batches captures in a request queue that flushes every few seconds, and a failed send waits in a retry queue; `opt_out_capturing()` stops new captures but drains neither, and posthog-js offers no public call that drops them. So the last few seconds of events captured before the stop, the `$autocapture` of the No click itself included, can still go out, under the id that was just deleted from storage. They were captured with consent, nothing captured after the stop is sent, and the privacy page says so ("How to turn it off"). Sentry is disabled at once instead of closed (section 7), so it sends nothing captured after the stop either.

Three independent layers keep a withdrawn reader's events from being captured in every tab: PostHog's own opt-out marker, `opt_out_capturing_by_default` (a lost marker still means out), and step 1 of `cleanPostHogEvent`, which the `storage` listener (section 3) flips in each other open tab. Requests that are not captures (feature flags, surveys) are kept off by never calling `reset()` or `reloadFeatureFlags()` after a stop and by `postHog()` returning undefined, so no app code asks the client for anything; the real-chunk test pins this (section 11).

## 7. Sentry before and after (`graphty/src/lib/sentry.ts`, `sentryPrivacy.ts`)

| Setting                                                                                                                           | Before                                                                                    | After                                                                                                                                                                                                                                                                                                                                                                                                                                              | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `replaysSessionSampleRate`                                                                                                        | 1 (every session recorded)                                                                | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                  | PostHog records consenting sessions; two full recorders double CPU and bandwidth                                                                                                                                                                                                                                                                                                                                                                                                              |
| `replaysOnErrorSampleRate`                                                                                                        | 1                                                                                         | 1                                                                                                                                                                                                                                                                                                                                                                                                                                                  | the moments before an error make a report actionable                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `replayIntegration({maskAllText, maskAllInputs, blockAllMedia})`                                                                  | one per page                                                                              | kept, now buffer only. Adds `maskAttributes: sentryMaskedAttributes()`: Sentry asks the list only `includes(name)`, and this list answers true for every attribute but the few PostHog's replay keeps (`REPLAY_KEPT_ATTRIBUTES`), so it is the same allowlist; it also holds the known reader-text names (`data-notes`, `data-shader` among them) as a floor should a later SDK copy it. The real-SDK replay test masks an attribute nobody listed | Sentry's default `maskAttributes` is only `title`, `placeholder`, `aria-label`, and `Fields.tsx:289` and `OptionsForm.tsx:553` put reader text in `aria-description`. Replay recordings bypass `beforeSend` and `beforeBreadcrumb`, so console text and URLs inside the error replay were unfiltered. `beforeAddRecordingEvent` receives only custom events, never the rrweb Meta event, so the Meta event's `href` is protected by the query strip that runs before `initSentry` (section 3) |
| restart on re-consent                                                                                                             | `replay.start()`                                                                          | one client for the page: No disables it (`getClient().getOptions().enabled = false`, at once, no flush) and stops the replay; a later Share enables it and calls `replay.startBuffering()`, never `Sentry.init` again, because the replay's send-on-error and breadcrumb hooks are bound once per page to the first client                                                                                                                         | `start()` would begin full-session recording again                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `cleanUrl` in `sentryPrivacy.ts` (fetch/xhr and navigation breadcrumbs, `event.request.url`, every URL in message and stack text) | strips query and hash only, so `https://private.example/secret-PATIENT.csv` is sent whole | replaced by the `cleanUrl` exported from `analytics.ts`: same-origin URL to its path plus kept channel params, any other URL to `"external"`; secret redaction still runs on the result                                                                                                                                                                                                                                                            | the privacy page promises that file names and URLs you open are never sent                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `tracesSampleRate`                                                                                                                | 0.1 prod / 1 dev                                                                          | removed                                                                                                                                                                                                                                                                                                                                                                                                                                            | no tracing integration exists, so it produced nothing                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `traceLifecycle: "static"`                                                                                                        | set                                                                                       | removed                                                                                                                                                                                                                                                                                                                                                                                                                                            | only meaningful with tracing                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `integrations`                                                                                                                    | `[replay]` (all defaults on)                                                              | `(defaults) => [...defaults.filter((i) => !DROPPED.has(i.name)), replay]` with `DROPPED = {BrowserSession, Console, ConversationId}`                                                                                                                                                                                                                                                                                                               | see the default-integration list below                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `sendClientReports`                                                                                                               | default true                                                                              | false                                                                                                                                                                                                                                                                                                                                                                                                                                              | dropped-event statistics nobody reads                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| console breadcrumbs                                                                                                               | sent with text stripped                                                                   | dropped: the `Console` integration is removed and `beforeBreadcrumb` still returns null for `category === "console"` as a guard                                                                                                                                                                                                                                                                                                                    | they carried nothing after stripping, and the integration wrapped every console call                                                                                                                                                                                                                                                                                                                                                                                                          |
| ui.click, fetch/xhr, navigation breadcrumbs                                                                                       | sent, stripped                                                                            | kept, with the new `cleanUrl`                                                                                                                                                                                                                                                                                                                                                                                                                      | error context                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `captureFeedback`, both error boundaries, `privacyFilters`, `dataCollection`                                                      | on                                                                                        | kept                                                                                                                                                                                                                                                                                                                                                                                                                                               | error reporting and feedback are Sentry's job                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `beforeSendTransaction` in `privacyFilters`                                                                                       | set                                                                                       | removed                                                                                                                                                                                                                                                                                                                                                                                                                                            | with `traceLifecycle` at Sentry 11's default (streamed spans) the hook is ignored and logs a warning on every init; a return of tracing adds `beforeSendSpan` instead                                                                                                                                                                                                                                                                                                                         |
| `.storybook/preview.tsx:27-31` unconditional `initSentry()`                                                                       | sends with no consent when a DSN is built in                                              | deleted                                                                                                                                                                                                                                                                                                                                                                                                                                            | nothing is sent without consent, Storybook included                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Default integrations of `@sentry/browser` 11.12, keep or drop:

| Integration      | Decision | Why                                                                                   |
| ---------------- | -------- | ------------------------------------------------------------------------------------- |
| EventFilters     | keep     | drops known-noise errors                                                              |
| FunctionToString | keep     | readable stack frames                                                                 |
| ConversationId   | drop     | gen-AI conversation tagging; the app sends none                                       |
| BrowserApiErrors | keep     | errors inside timers and listeners                                                    |
| Breadcrumbs      | keep     | click, fetch and navigation context                                                   |
| Console          | drop     | console breadcrumbs are dropped anyway                                                |
| GlobalHandlers   | keep     | uncaught errors and rejections                                                        |
| LinkedErrors     | keep     | error causes                                                                          |
| Dedupe           | keep     | repeated errors                                                                       |
| HttpContext      | keep     | browser and URL context (URL cleaned by `privacyFilters` with the new `cleanUrl`)     |
| CultureContext   | keep     | locale and time zone help reproduce number and date bugs; the privacy page lists them |
| BrowserSession   | drop     | release-health session pings; Umami and PostHog count visits                          |

## 8. graphty-element API addition (additive, no owner approval needed)

All of the following are additive: one new session event and its DOM mirror, one optional `ImportOptions` field, one optional `JournalEntry` field, one optional `RunChange` field, one optional `SelectionDelta` field and one new session event for the camera.

### 8.1 `source:loaded`

```ts
/**
 * A load added a source to the graph: one event per source added.
 * Published by every load method after its load commits.
 * Not published by opening a project, by undo, redo or restore, or by
 * `runPendingSourceLoad`, which fills a source a project already listed.
 * Carries no contents; `source` is whatever key the load was given.
 * Unlike the graph event `data-loaded`, which fires whenever data arrives for any cause,
 * this fires only for a load a caller asked for.
 * Mirrored to the DOM as `graphty-source-loaded`.
 * @since <next minor>
 */
"source:loaded": SourceLoaded;

export interface SourceLoaded {
    /** The source's key in `session.data.sources()`. */
    readonly source: SourceKey;
    /** The source's `LoadedSource.kind`, exactly as `session.data.sources()` records it. */
    readonly kind: LoadedSourceKind;          // "file" | "url" | "server" | "sample" | "join"
    /** For kinds "file" and "url": the format read, named or detected; absent when none was settled. */
    readonly format?: FormatId;
    /** For kind "server", and for a sample read from a network source: the source id. */
    readonly sourceId?: string;
    /** Whether the load replaced the graph or merged into it. */
    readonly mode: "replace" | "merge";
    /** Present when the load was a catalog sample: a dataset, a generator or a network example (whose kind stays "server"). */
    readonly sample?:
        | { readonly datasetId: string }
        | { readonly generatorId: string }
        | { readonly exampleId: string };
    /** The caller's own `ImportOptions.callerKey`, echoed unchanged. */
    readonly callerKey?: string;
}
```

**Where it is emitted.** By each load door itself, after its command resolves as committed: `import` (inline and through `importVia`), the draft load, `loadDataset`, `generate`, `loadExample`, and `import` of a network source (`sources/load` `importSource` through `hostInTurn`). Each door already holds its own facts in its closure: the format it read, `mode: modeOf(command)`, `{ dataset }` (data.ts:1360) as `datasetId`, `{ generator }` (data.ts:1309) as `generatorId`, never `baseUrl` or `params`. It calls one private `SessionData` helper, `publishLoaded(record, facts)`, through the publish handle the class's other events use; the `sources/load` doors reach it through the host that `hostInTurn` hands them. `loadExample`, and an `import` of a `readExample` result, keep the kind the source records (`"server"`, unless the caller passed `origin`) and add `sample: { exampleId }` and `sourceId`. A consumer can tell a network example from the reader's own data, and the event never disagrees with `sources()`. Nothing changes in what `sources()` returns.

Nothing new goes on any command: the facts never enter the journal or a saved project, and `callerKey` is not saved.

Why not the sources slice: a project open is an ordinary `session.transaction("Open project", ...)` whose `importInto` runs `data.setSource` with the whole saved source list (`projectFile.ts:1644-1649, 2970-2990`; `commands/data.ts:1305-1307`), and its cause is `"command"`, not `"restore"`. Emitting on writes to the slice would publish one `source:loaded` per saved source on every Recent reopen, picked project file and autosave restore. The project path never calls a load door, so it publishes none.

**Relation to `data-loaded`.** The element already forwards a graph event `data-loaded` (`GraphDataLoadedEvent`, `events.ts:172-189`, emitted at `DataManager.ts:1394`). It says data arrived in the graph, for any cause including undo, redo and restore (its `cause` field). `source:loaded` says a load method a caller invoked added a source, and never fires for history or a project open. Extending `data-loaded` instead would put caller facts (`callerKey`, sample ids) on an event that also fires for undo, and every listener would have to filter by cause. `docs/guide/events.md` gets one line on each: use `source:loaded` to react to a load you or the reader asked for, `data-loaded` to react to the graph's data changing for any reason. `data-loaded` is not deprecated.

**Failures** stay on the existing `progress:changed` (task `"load"` or `"prepare"`, phase `"end"`, `error.code`).

### 8.2 `ImportOptions.callerKey`

```ts
/** An opaque value the caller chooses; the load does nothing with it but echo it as `SourceLoaded.callerKey`. */
readonly callerKey?: string;
```

It is declared on `ImportOptions`, the options base that `LoadChoices` and `DatasetLoadOptions` extend and that `generate` takes directly, so `import`, the draft load, `loadExample`, `loadDataset` and `generate` all accept and echo it. One generic echo field rather than analytics-shaped inputs: any consumer can tag a load and recognize it on the event. The app's start-screen sample tiles load by URL (`openSample`, `open.ts:391-396`), so the element has no catalog id for them; the app passes `callerKey: "sample:<StartSample.id>"`. The app's `openAgain` (`open.ts:236-263`, a reload that came before autosave wrote anything) passes `callerKey: "reopen"` to every load door it re-runs, so a reload is not counted as a new load. The name ends in `Key`, which the api-report plain-string rule accepts.

### 8.3 `JournalEntry.trigger`

```ts
/**
 * Why the session ran this command, when it was not a direct call.
 * "suggestion": an algorithm's suggested styles, applied as their own entry.
 * "project": one of the commands that opening a project ran.
 * OPEN UNION: triggers may be added in a minor release.
 */
readonly trigger?: "suggestion" | "project";
```

It is named `trigger`, like `RunChange.trigger` (section 8.4), because `cause` elsewhere in the public API means what moved the state (command, undo, redo, restore, user, api).

`"suggestion"` is set only where suggestion commands become separate journal entries: the batch hold release (`RunsApi.ts:3099`, `await via(suggestionCommand(...))` inside a transaction) and the public `Graph.applySuggestedStyles(algorithmKey)` method (`Graph.ts:4476-4497`), which a caller invokes to apply an algorithm's suggestions after the fact. A single run with `applySuggestedStyles: true` (the app's `analyze/run.ts:99` and `data-place/Runs.tsx:192`) paints inside the run's own draft (`RunsApi.ts:2265, 2505`; one step, one undo, per `autoApply.ts`), so its paint rides in the `algo.run` entry and needs no cause; the reader's own re-coloring after it is already the only style entry.

`"project"` is set on every member entry of the `project.open` transaction (`projectFile.ts:2970-2990`). Today those reach `journal:appended` as ordinary entries, so a project open would look like a burst of reader actions (`style.encode`, `data.apply` and others).

### 8.4 `RunChange.trigger`

```ts
/**
 * Present when the session re-ran this algorithm by itself rather than on a caller's request:
 * "timeline" when the time window moved or the results policy changed to re-run.
 * OPEN UNION: triggers may be added in a minor release.
 */
readonly trigger?: "timeline";
```

Set by `TimeApi.ts` `rerunAll` (2368-2376), which runs for every window move under the `results: "rerun"` policy (3254-3256, whether from playback, a manual step or a window drag) and when the setting flips to re-run (2933-2935). Those re-runs publish `run:changed` with `cause: "command"` today, because `RunChange.cause` (`runs/types.ts:134`) has no value for them.

### 8.5 `SelectionDelta.via`

```ts
/** How the canvas input that caused this change was made; absent for API calls. */
readonly via?: "click" | "box" | "keys";
```

Set by the canvas controllers that already call the selection with `cause: "user"`.

### 8.6 `camera:gesture-end`

```ts
/** A reader's camera gesture on the canvas ended: once per gesture, never per frame. */
"camera:gesture-end": { readonly kind: "orbit" | "pan" | "zoom" };
```

Published by the camera input controllers. A gesture's end is defined by input, never by time:

- Pointer (orbit, pan, pinch): the pointer up that ends the drag.
- Wheel: a run of wheel events ends when the zoom's inertia reaches rest (velocity damped to zero). A wheel event that arrives before rest belongs to the same run. Wheel events dispatched in one task always form one gesture, because no frame runs between them, so the count does not depend on frame rate.
- Keys: the key up of the last held camera key, followed by inertia reaching rest; a key down before rest continues the gesture.

No DOM mirror is needed; the app listens on the session.

### 8.7 Type notes

- `datasetId`, `generatorId`, `exampleId`, `sourceId` and `callerKey` end in `Id` or `Key`, which the no-plain-string rule in `tools/api-report.mjs` (`allowedPlainString`, the `/[a-z](Id|Key)$/` rule) accepts. No allowlist entry is needed.
- There is no exported `DatasetId` or `GeneratorId` type today. Adding them is out of scope.
- `SourceLoaded` has no counts field; nothing in this design reads one.

### 8.8 Same pull request

- `src/session/types.ts`: the `SessionEventMap` entries `"source:loaded"` and `"camera:gesture-end"`, the exported `SourceLoaded` type, `ImportOptions.callerKey` (on the base, so `LoadChoices` and `DatasetLoadOptions` inherit it).
- `src/session/journal.ts`: `JournalEntry.trigger`. `src/session/runs/types.ts`: `RunChange.trigger`. `src/session/selection/SelectionApi.ts`: `SelectionDelta.via`.
- The DOM mirror for `graphty-source-loaded`: a `#mirrorSourceLoaded` dispatcher beside `#mirrorShaderEvents` and `#mirrorSourceEvents` (about lines 615-685 of `src/graphty-element.ts`), subscribed where the others are, plus entries in both `HTMLElementEventMap` (about line 7601) and `DocumentEventMap` (about line 7628).
- A rebuilt and committed `jsx.ts`.
- `npm run build`, then `npm run api:report`, with the updated `api/session.api.md` and `api/index.api.md` committed.
- Docs: `docs/guide/journal.md` (the `trigger` field), the runs guide page (`trigger`), the load guide (`callerKey`), the session events guide page that lists `progress:changed` and `source:expanded` (the new events and the `graphty-source-loaded` DOM event), `docs/guide/events.md` (the selection section's new `via`, and the one line on `source:loaded` versus `data-loaded`), and `docs/guide/camera.md` (`camera:gesture-end` and how a gesture's end is defined).
- Tests (section 11).
- A commit message that says "adds session events source:loaded and camera:gesture-end, ImportOptions.callerKey, JournalEntry.trigger, RunChange.trigger, SelectionDelta.via (additive)".

**Not added.**

- An export event or a layout-choice event (decision 12).
- A 2D/3D event: journal op `view.dimension` carries it.
- A camera-view event for `applyCameraView`: the app counts its own Fit command.
- Run failure codes on `run:changed`: they are read from `session.runs`.

## 9. Configuration

`graphty/src/siteConfig.ts` gains one optional field, validated in `parse()` separately from the rest of the file. An invalid `analytics` block is dropped on its own, with one console line, and the rest of the file (`site`, `features`, `datasets`, `sentryEnvironment`) is kept, so a typo turns off analytics and nothing else.

```ts
/** Analytics ids for this site; absent means nothing is sent. All are public client ids. */
readonly analytics?: {
    /** Umami website id (a UUID). */
    readonly umamiWebsiteId?: string;
    /** PostHog project key ("phc_..."). */
    readonly posthogKey?: string;
    /** PostHog ingest host: exactly "https://eu.i.posthog.com" or "https://us.i.posthog.com". */
    readonly posthogHost?: string;
};
```

The validation rules are:

- `umamiWebsiteId` must match a UUID regex.
- `posthogKey` must match `/^phc_[A-Za-z0-9]+$/`.
- `posthogHost` must be one of the two hosts.

Tests never point PostHog at another host through `site.json`; they use the test seam (section 10, graphty app item 3).

`graphty/sites/production.json` gains the block once the owner supplies the ids. Because an invalid block fails silently on the site, the `siteConfig` test runs every committed `graphty/sites/*.json` through `parse()` and fails when an `analytics` block is present but dropped (section 11).

## 10. File-by-file plan

**graphty-element**

1. `src/session/types.ts`: `SourceLoaded`, the `"source:loaded"` and `"camera:gesture-end"` entries in `SessionEventMap`, and `ImportOptions.callerKey`, which every load door's options inherit.
2. `src/session/data.ts` and `src/session/sources/load.ts`: the private `publishLoaded` helper, called by each load door after its command commits (section 8.1). `kind` is the recorded `LoadedSource.kind`; `loadExample` and imports of `readExample` results add `sample: { exampleId }` and `sourceId`. Echo `callerKey` from every door, `loadDataset` and `generate` included. `runPendingSourceLoad` and the project-open path do not call it.
3. `src/session/journal.ts`: `JournalEntry.trigger`. Set `"suggestion"` at `RunsApi.ts:3099` and in `Graph.applySuggestedStyles` (`Graph.ts:4476-4497`); set `"project"` on member entries of the `project.open` transaction (`projectFile.ts:2970-2990`).
4. `src/session/runs/types.ts` and `src/session/time/TimeApi.ts`: `RunChange.trigger`, set by `rerunAll`.
5. `src/session/selection/SelectionApi.ts` and the canvas selection controllers: `via`.
6. The camera input controllers: publish `camera:gesture-end` at the input-defined end of section 8.6.
7. `src/graphty-element.ts`: `#mirrorSourceLoaded` and both event-map entries (section 8.8).
8. `jsx.ts`, `api/session.api.md`, `api/index.api.md`: regenerate them. Docs as in section 8.8.
9. Tests (section 11).

**graphty app**

1. `src/siteConfig.ts`: add the `analytics` field and its separate validation (section 9).
2. `sites/production.json`: add the ids (owner input).
3. `src/lib/analytics.ts` (new; no React). It has the same shape as `lib/sentry.ts`:
    - `startAnalyticsAtBoot(config)` (section 3), `startPageCounts(config)`, `readChannel()`, `bootQuery()`, `stripQueryForRecorders()`, `count(name, props)`, `detail(name, props)`, `onUsageEvent(listener)`
    - `startPostHog()`, `stopPostHog()`, `postHog()` (the live client while sharing is wanted, else undefined, for `SurveyCard`)
    - `setCommandAllowlist(ids)` (section 3), `SURVEY_NAMES`, `KNOWN_CHANNELS`
    - `cleanUrl` (also used by `sentryPrivacy.ts`), `visitBucket`, `cleanPostHogEvent`, `maskEveryAttribute` (an allowlist, for PostHog replay) and `sentryMaskedAttributes()` (Sentry replay's list, answering `includes` with the same allowlist)
    - the allowlist table of event names to keys, the `$` event allowlist, the op allowlist, the panel allowlist, the fixed control ids. Catalog checks (algorithm, format, layout, error code) live with their callers in the workspace chunk (section 3)
    - the once-per-name set for Umami and the PostHog pre-init buffer
    - the test seams:
        - `setAnalyticsCallsForTests({ send(body), importPostHog(), hostname(), privacySignals(), posthogHost })`. `send` and `importPostHog` are the only two network edges, so no `vi.mock` is needed (#3416). `hostname` and `privacySignals` let tests on `localhost` reach the positive Umami cases. `posthogHost` overrides `api_host` for tests only; with it set, the init also gets `disable_compression: true` and `session_recording.compress_events: false`, so request bodies and `$snapshot_data` are plain JSON.
        - `setPostHogClientForTests(client)`: marks PostHog as on with a stand-in client, touching neither the address bar nor `site.json`, and returns an undo function. Every `capture()` on the stand-in passes through `cleanPostHogEvent`, and the seam records what that returns (nothing when it returns `null`), so super properties and property filtering are exercised through it. Autocapture never runs on a stand-in. Used by `SurveyCard` tests and stories and by the real-element hook tests.
        - `resetAnalyticsForTests()`: clears the once-per-name set, the buffer, `wanted`, `initialized`, the memoized import promise, the channel value, the boot query, the command allowlist, the Umami `disabled` flag and the listeners. Every analytics test file calls it in `beforeEach`, as `sentry.ts`'s `resetSentryState()` is used.
4. `src/main.tsx`: take the `bootQuery` snapshot first, then `loadSiteConfig().then(startAnalyticsAtBoot)`. `logPageStart` reads `bootQuery()`. Rewrite the comment at lines 18-21. All boot logic lives in `startAnalyticsAtBoot`, which is tested, because `main.tsx` is outside coverage.
5. `src/App.tsx:22`: read `?demo` from `bootQuery()`.
6. `src/workspace/privacy/usageData.ts`: the default sender strips the query, then starts and stops both Sentry and PostHog; `answerUsageData("share")` also sends `count("usage_data_shared")`; a `storage` listener on `graphty.usageData.v1` runs the stop sender when another tab declines or removes the answer. Rewrite the header comment.
7. `src/workspace/privacy/useUsageEvents.ts` (new): `useUsageEvents(element, session, store)` subscribes on the project session for `source:loaded`, `run:changed`, `journal:appended`, `selection:changed`, `progress:changed`, `camera:gesture-end`, `source:expanded` and `source:expand-failed`, plus a `store.subscribe` for `panel_opened`. It maps them as in section 4, applies the catalog allowlists, the graph_action and algorithm_run filters, and returns its unsubscribers.
8. `src/workspace/Workspace.tsx`: mount `useUsageEvents` beside `useCommandKeys(value)` and `<SurveyCard />` beside `UsageDataCard`. `src/workspace/frame/ElementHost.tsx` and `src/workspace/start/HeroGraph.tsx`: `className="ph-no-capture"` on the graphty-element each renders.
9. `src/workspace/state/WorkspaceContext.tsx`: call `setCommandAllowlist` with the registered command ids once the registry is built; add `detail("command_run", { command: id })` next to the log line at :113, and `detail("command_failed", { command: id, code })` in the catch at :113-119.
10. Controls bound to a registered command (toolbar buttons, menu items, command palette rows, in the graphty app's own wrappers, not in compact-mantine) render `data-ph-capture-attribute-control={commandId}`.
11. Export handlers each call `count("export_done", ...)` after their awaited call succeeds:
    - `export/DataOutput.tsx` `save()`, after `downloadGraph`: kind `graph`, format `choices.format`
    - `export/ImageOutput.tsx` `capture(destination)`: kind `image`, format `choices.format`, destination `download` or `clipboard`
    - `export/VideoOutput.tsx`: kind `video`, `result.metadata.format`
    - `export/DocumentOutput.tsx`: kind `project`, `styles` or `recipe`, by the document kind being saved, with no `format`
    - `project/actions.ts` Save a copy: kind `project`, no `format`
12. `workspace/layout/LayoutForm.tsx` `apply()` (line 420) and the immediate map pick (line 439), and the `layout.reshuffle` command (`layout/commands.ts:38`): `count("layout_changed", { layout, outcome })` after the call resolves (`"applied"`) or rejects (`"failed"`).
13. `project/actions.ts` `openProjectFile`: when `report.opened === "project"` and there is no `storedId` (a picked or dropped file), call `count("own_file_opened", { format: "graphty", via: "file" })`. `openRecent` and stored-project opens call `detail("project_reopened", {})` instead.
14. `workspace/start/open.ts`: `openSample` passes `callerKey: "sample:" + sample.id` with `origin: "sample"`; `openNetworkSample` passes `origin: "sample"`; `openAgain` passes `callerKey: "reopen"` to every door it re-runs.
15. `src/workspace/privacy/SurveyCard.tsx` (new), as described in section 4.4, and `SurveyCard.stories.tsx` with play functions that answer and dismiss by real clicks. Each story's loader removes `graphty.surveys.v1` and calls `resetAnalyticsForTests()`, then installs a stand-in client through `setPostHogClientForTests` whose `getActiveMatchingSurveys` returns the fixture surveys; the undo function it returns runs in the story's cleanup, so no other story inherits a stand-in. The moment is fired after the card has mounted and subscribed: the play function calls `count("algorithm_run", ...)` (or `count("export_done", ...)` for the export story) before it looks for the card. The pictures therefore do not depend on story order.
16. `src/lib/sentry.ts` and `src/lib/sentryPrivacy.ts`: make the section 7 changes and rewrite their comments. Export `sentryConfigured()`, true when the default config has a DSN. `setSentryCallsForTests` gains an optional `defaultConfig` (DSN and replay options, including `useCompression`), which both `getDefaultConfig()` and `sentryConfigured()` read, so tests on the live `usageData` sender reach `Sentry.init` and `stripQueryForRecorders` sees a DSN.
17. `.storybook/preview.tsx`: delete the unconditional `initSentry()`. `src/stories/Sentry.stories.tsx` has no play functions and never calls `initSentry`; its `SourceMapTest` reads `isSentryEnabled()` and will now always show its existing "Set VITE_SENTRY_DSN environment variable to enable Sentry." alert with a disabled button. Give that story a loader that calls `initSentry()` when a DSN is built in, so it still demonstrates source maps; its text is unchanged.
18. Copy changes. They change what "No thanks" means, so the owner approves them (section 12, step 4); the wording below is proposed:
    - `UsageDataCard.tsx:84`: change "Nothing is collected until you answer." to "Anonymous counts are sent whatever you answer: visits, the site that sent you, which sample, file format, layout, measure and export you use, and whether you share. No cookies, no names or contents."
    - `UsageDataCard.tsx:11` declined line: change "Usage data stays off." to "Usage data stays off. Anonymous counts are still sent."
    - `UsageDataText.tsx` COLLECTED (what Share adds) becomes:
        1. "A replay of some sessions, with all text, typing, labels, file names and the graph hidden (PostHog)."
        2. "Which buttons, panels, commands and steps you use, by name only, and how you use the canvas: selecting, dragging, zooming (PostHog)."
        3. "Page speed."
        4. "Your answers to a short survey, if you answer it, including any text you type in its Other box."
        5. "Error reports, with a masked replay of the moments before the error (Sentry)."
        6. "Feedback you send."
        - Then add: "PostHog keeps a random id in this browser while sharing is on." The footer "No file contents ever leave your computer." is unchanged.
    - `PrivacyChip.tsx`: the label "Local only" is unchanged, because the reader's files are still local. The tooltip becomes "Your files stay on this computer. Anonymous counts are sent. Opens Settings > Privacy".
    - `SettingsDialog.tsx:190`: its two strings stay two. With no assistant provider saved, "Usage data: off. Nothing is sent." becomes "Usage data: off. Anonymous counts are still sent: visits, the site that sent you, and which sample, file format, layout, measure and export you use." With a provider saved, "Usage data: off." becomes "Usage data: off. Anonymous counts are still sent." The "Where your data goes" section gains "Anonymous counts: for everyone, with no cookies (Umami)." and a "Privacy details" link to `/privacy.html`.
    - `StartScreen.tsx` footer: add a "Privacy" link.
    - `OWNER_HEADLINE` and `OWNER_TEXT` are unchanged. Flag for the owner: two more processors now hold the data.
19. `public/privacy.html` (new): a static page with inline CSS and no JavaScript, served at `/privacy.html` on every site. Its sections:
    - Always sent, whatever you answer: the section 4.1 events with their exact properties (`usage_data_shared` included), the page path with the channel (`ref` and `utm_*` values from a fixed list, anything else as "other"), the referring site's origin, the days bucket and how it is computed, and a note that Do Not Track and GPC stop the visit record. It says that Umami Cloud receives your IP address and browser with each count; that it stores the approximate location it derives from your IP (country, region and city) and your browser, operating system and device type, but not the IP; that it derives a pseudonymous session from them, reset monthly; and that nothing is stored in your browser for it.
    - Sent only with Share: the section 4.2 events, masked replay of some sessions (the graph area and file pickers are blank), survey answers including any typed Other text, a survey choice kept in this browser while sharing is on, and errors with replay-on-error. Error reports include your browser's language and time zone.
    - Problem reports: what one contains (your message, an optional name and email, and any attachments you add), and that today it requires Share (pending launch-plan item 1).
    - Never sent: file contents, file names, URLs you open, labels, attribute values, project names, and a PostHog id before Share. PostHog and Sentry store no location: PostHog's IP location lookup is off and its client IP is discarded. (Umami's approximate location is listed under Always sent.)
    - Where it goes: Umami Cloud (`gateway.umami.is`), PostHog EU (`eu.i.posthog.com` and `eu-assets.i.posthog.com`), Sentry.
    - How to turn it off.
20. `README.md:38-39`: one paragraph matching the privacy page.
21. `package.json`: add `posthog-js` as a devDependency (all app dependencies are), at an exact version at least two weeks old.
22. `size-budgets.json`: the posthog chunk is about 240 KB gzip and lazy. The "all JavaScript" budget (8,515,084 bytes, which includes 10% headroom) may absorb it; if not, only that figure grows, via `node scripts/check-size.mjs --update` with the commit reason "posthog-js lazy chunk, loaded only after consent". If the landing budget moves, something imports posthog-js statically, and that is a bug.
    The size budget is only a hint. The proof that PostHog is not on the landing page is `scripts/check-posthog-chunks.mjs` (new, a sibling of `check-assistant-chunks.mjs`, appended to the graphty `build` script): it walks `landingFiles(dist)` and fails if any of them contains `i.posthog.com` or `__ph_opt_in_out_`, and fails as vacuous unless some file in `dist` contains both markers.
23. `design/ui/tier1-real-app/tier1-design.md:465-493`: update the disclosure text to match.

## 11. Test plan

All tests go through seams and never `vi.mock`. Assertions count recorded calls and check state; they never wait on flush timers or assert that nothing arrives after a delay (`local/no-test-timing`). UI tests drive real input. Every analytics test file calls `resetAnalyticsForTests()` in `beforeEach`. Every test that rewrites the page URL saves `location.href` in `beforeEach` and restores it with `history.replaceState` in `afterEach`, because vitest's browser tester keeps its `sessionId` and `iframeId` in that URL and later cases would otherwise read an earlier case's query.

**Negative assertions need a barrier.** An assertion that something was not sent ("sends none", "no second", "nothing new") is checked only after waiting on the event that proves the guarded work finished. The barrier for each case is named below. A reopen or no-double-count case asserts on the PostHog stand-in, which records every occurrence, never on Umami alone, whose once-per-name rule would hide a double count.

**`graphty/src/lib/analytics.test.ts`** (the `hostname` and `privacySignals` seams make `graphty.app` and no-DNT the default)

1. No Umami id or a foreign hostname: zero sends and `graphty.visits.v1` untouched. DNT `"1"` or GPC `true`: the page view is sent, no visit event is sent and `graphty.visits.v1` is untouched.
2. Payload pinned: `url` keeps only `ref` and the utm params (`/?ref=hn&url=https://x/y.csv&features=a#h` becomes `/?ref=hn`); a value not in `KNOWN_CHANNELS` (`utm_campaign=u_8f3k2q9`, `ref=<script>`) is sent as `other`; no `language` or `screen` key; `referrer` is an origin; `title` is "graphty"; a cross-origin URL becomes its origin.
3. Address bar: start at `?ref=hn&utm_source=x&features=a#h`, with the stored answer unset, call `startAnalyticsAtBoot`. Exactly one page view was sent with url `/?ref=hn&utm_source=x`; afterwards `location.search` is `?features=a` and the hash is kept; `bootQuery()` still holds `features=a`. With the stored answer "share" and a DSN supplied through `setSentryCallsForTests({ defaultConfig })`, the page view still carries `/?ref=hn&utm_source=x`, and `location.search` and `location.hash` were already empty when the Sentry stand-in's `init` and `importPostHog` were called. With a DSN and no PostHog key, the strip still runs; with neither, it does nothing.
4. `visitBucket` at 0, 1, 2, 7, 8, 30, 31 and 400 days gives null, `"1"`, `"2-7"`, `"2-7"`, `"8-30"`, `"8-30"`, `"30+"`, and a reset.
5. Visit events:
    - empty storage sends `first_visit`
    - a seeded earlier `last` sends one `return_visit`
    - a second start on the same day sends nothing
    - throwing storage sends the page view only
6. Once per name: ten `algorithm_run` counts with different algorithms, two `layout_changed`, then `export_done` send one `algorithm_run`, one `layout_changed` and one `export_done` to Umami, and all thirteen to a recording PostHog stand-in.
7. (The mapping helpers that `useUsageEvents.ts` exports.) An algorithm name not in the allowlist becomes `"other"`; a network example (`kind: "server"` with `sample.exampleId`) maps to `sample_loaded`; a `source:loaded` `source` or `sourceId` value never appears in any send; a `load_failed` code not in the catalog becomes `"other"`.
8. Default sender: with `globalThis.fetch` spied, the URL is exactly `https://gateway.umami.is/api/send` and the options are exactly `method: "POST"`, `keepalive: true`, `credentials: "omit"`, with the two `x-umami-*` headers and no `x-umami-cache`. A fetch resolving with a body holding `cache`, `sessionId` and `visitId`, followed by a second send: the second request carries none of those values, and no storage key holds them. A rejected and a throwing fetch are both swallowed. A response with `disabled: true` stops every later send on the page: after it, three more counts record no fetch call.
9. `startAnalyticsAtBoot`: with the stored answer "declined", Umami starts and `importPostHog` is never called; with "share", both start, and `first_visit` reaches the PostHog stand-in after init.
10. `answerUsageData("share")` sends one `usage_data_shared` to Umami; `answerUsageData("declined")` sends nothing to Umami.
11. Two tabs: a `storage` event with `graphty.usageData.v1` set to "declined" (dispatched as the browser does for another tab) calls the Sentry stand-in's stop and PostHog's `opt_out_capturing`, and no `ph_` persistence key remains. This synthetic `StorageEvent` is the only two-tab proof: the repository's vitest browser setup has no command that opens a second page, and loading the app's entry in one would reload the test page (#3762).
12. PostHog (stand-in client through `setAnalyticsCallsForTests`):
    - no key: `importPostHog` is never called
    - with a key: `init` receives exactly the section 6 options (deep equal), including `opt_out_capturing_by_default: true`, `opt_out_persistence_by_default: true`, `save_referrer: false`, `save_campaign_params: false`, `session_recording.captureJsonLd: false`, the file-input block and `maskEveryAttribute`; `opt_in_capturing` follows; no `register` call
    - two starts before the import resolves: one import, one `init`
    - stop before the import resolves: no `init`
    - stop: `opt_out_capturing` is called, `reset` is not, `postHog()` is undefined, no `ph_` persistence key remains, the `__ph_opt_in_out_<token>` key remains, and the stored `use_case` choice is gone while the shown survey ids remain
    - stop then start: `opt_in_capturing`, then `reset`, then `startSessionRecording`, with no second `init`
    - counts made before init are sent after init, and dropped if stop came first
13. `cleanPostHogEvent`:
    - returns `null` for any event while `wanted` is false
    - the first `$pageview` it sees carries `channel_ref`, `site`, `visit` and `$geoip_disable: true`
    - a sentinel URL with a query in a nested property, in `$external_click_url`, in a `$heatmap_data` key and in a `$web_vitals_LCP_event.$current_url` comes out with no sentinel; a `$snapshot` is returned with its data untouched
    - drops `$set`, `$set_once`, `title`, `$title`
    - drops any `$` name not on the allowlist, and an unknown own event name
    - drops `ph_keyword` and any other non-`$` key from a `$pageview` and an `$autocapture`
    - drops `$autocapture`, `$rageclick` and `$dead_click` whose element chain has `graphty-element` or `canvas`; keeps `$$heatmap`
    - before `setCommandAllowlist`, keeps `control` only for a fixed control id; after it, keeps a registered command id and drops anything else
    - keeps `token`, `distinct_id`, `$session_id`, `$window_id`, `$lib` and the super properties on an own event; drops a non-allowlisted non-`$` key
    - keeps `$survey_id`, `$survey_response` and `$survey_response_abc` on `survey sent`
14. `maskEveryAttribute`: keeps `class`, `role`, `style`, `aria-expanded` and `data-ph-capture-attribute-control`; masks `name`, `href`, `id`, `title`, `aria-label`, `data-x` and an invented `foo`.

**`graphty/src/lib/analytics.posthog.test.ts`** (new; browser mode; the real posthog-js chunk through the default `importPostHog`, with the seam's `posthogHost` set to a sentinel same-origin prefix). No request reaches the test server: the test's `window.fetch`, `XMLHttpRequest.prototype.send` and `navigator.sendBeacon` wrappers answer every request to that prefix themselves. They return a canned remote-config and flags body with session recording enabled and an empty survey list (a fixture pinned next to the posthog-js version), answer 200 to the `/e/`, `/i/` and `/s/` posts, and record every body. The test also records what reaches `before_send` through the seam. Run it again whenever the posthog-js pin changes.

1. Not vacuous: after `startPostHog`, the import ran, `init` ran, `before_send` received `$pageview`, and recording started (`sessionRecordingStarted()` is true and a `$snapshot` was seen).
2. Start at `?url=SECRET_URL&graphty-element-logging=SECRET_LOG`, then run the share path. Render a button whose text is `SECRET_TEXT`, whose `aria-label` is `SECRET_PROJECT`, whose `class` is `POSITIVE_MARKER` and whose `data-ph-capture-attribute-control` is `history.undo`. Click it, and wait (on the recorded calls, not on time) for `before_send` to see `$autocapture` and a `$snapshot`. No recorded `before_send` input after cleaning, and no recorded request body, contains `SECRET_URL`, `SECRET_LOG`, `SECRET_TEXT` or `SECRET_PROJECT`; `$current_url` and the replay Meta event `href` carry neither sentinel query. No `$snapshot` body contains a `$json_ld` custom event. Positive controls: `POSITIVE_MARKER` is found in a recorded `$snapshot` body, and the `$autocapture` event carries `control: "history.undo"` (the test calls `setCommandAllowlist(["history.undo"])` first), so the search is shown to work.
3. File picker: open a file through `pickFiles` with a file named `SECRET_FILE.csv` set by the browser's file chooser, wait for the pick to resolve and for the next `$snapshot`, and assert `SECRET_FILE` appears in no recorded snapshot or body.
4. Canvas: a real `<graphty-element>` carrying `ph-no-capture`, as `ElementHost.tsx` renders it, is clicked five times in place on its canvas; after a following button click's `$autocapture` arrives (the barrier), no `$dead_click` or `$rageclick` was recorded. This case lives here, not in the hook tests, because only the real chunk runs autocapture.
5. Stop: after init, the test wraps the live client's `reset` and `reloadFeatureFlags` in counting spies (posthog-js calls both through `this`, so internal calls are counted too; `reloadFeatureFlags` is the only path to a `/flags` request). After `stopPostHog`: `has_opted_out_capturing()` is true, both spy counts are 0, `postHog()` is undefined and no `ph_<token>_posthog` key exists. Then the test calls `posthog.capture("x")`, which runs `before_send` synchronously, and clicks a button: `before_send` received nothing new, and still no `ph_<token>_posthog` key exists, because persistence is disabled and a save writes nothing. Nothing here asserts that no request arrives later; the spy counts are the proof.
6. Referrer: before init, the test defines `document.referrer` as `https://intranet.example/SECRET_REF?q=SECRET_REFQ` (an own getter on `document`, removed in `afterEach`). After init, a capture and a flags reload that the test asks for while sharing is on (waited on through `onFeatureFlags`), no recorded request body, the `/flags` body included, contains `SECRET_REF`, and no `before_send` input contains it after cleaning.

**`graphty/src/lib/sentry.test.ts`** and **`sentryPrivacy.test.ts`**

- `:91` asserts session rate 0.
- The replay test is renamed "buffers for replay-on-error only", and checks that `maskAttributes.includes` is true for the named `data-*` attributes and one nobody listed, and false for the kept ones.
- The trace-rate tests at `:124-150` are replaced by "sets no tracesSampleRate".
- New: `BrowserSession`, `Console` and `ConversationId` are absent from the integrations and the other defaults are present; re-init calls `startBuffering` and not `start`; `sendClientReports` is false; `beforeBreadcrumb` drops console crumbs; `beforeAddRecordingEvent` drops a console event.
- Cross-origin URLs: `https://private.example/SECRET-PATIENT.csv?x=1` sent through a fetch breadcrumb, an exception message, a stack frame, `event.request.url`, and a replay performance span of each kind (`navigation.navigate`, `resource.fetch`, `resource.script`) comes out as `external` with no `SECRET` and no `private.example`.
- Error messages: a graphty-element `E_UNKNOWN_ATTRIBUTE` error naming `SECRET_COLUMN`, caused by a real `JSON.parse` `SyntaxError` over `SECRET_FILE_START`, thrown under a `PanelBoundary`, reaches the recording transport as `"value":"E_UNKNOWN_ATTRIBUTE"` with neither sentinel; a later error's message has its quoted run replaced, and the first error's message does not ride along in the later one's `sentry.event` breadcrumb.
- Error replay one-shot and stop (`sentryReplay.test.ts`): after an error's replay is sent, the replay is buffering again under a new replay id, never recording the session; with the replay recording a session, `stopSentry()` sends no pending segment.
- Error-replay attributes: in browser mode, with a recording transport and `useCompression: false` supplied through `setSentryCallsForTests({ defaultConfig })`, an element with `aria-description="SECRET_NOTE"`, `data-part="SECRET_PART"` and `name="SECRET_NAME"` and a sibling with `class="POSITIVE_MARKER"` are on the page when an error is captured. Wait until the transport has recorded the error event and a `replay_recording` item. Then `POSITIVE_MARKER` is found in the recording (so the search works), and no sentinel is.

**`graphty/src/siteConfig` test**

- `analytics` with valid strings is accepted.
- A numeric `posthogKey` or a non-allowlisted host drops `analytics` only: `site`, `features` and `datasets` are intact and `analytics` is absent.
- Every committed `graphty/sites/*.json` (read with `import.meta.glob`) parses, and any file whose raw JSON has an `analytics` block still has it after `parse()`.

**`graphty/src/workspace/privacy/__tests__/useUsageEvents.real-element.test.tsx`** (new). It uses the real element, a recording `setAnalyticsCallsForTests` with the `hostname` seam set to `graphty.app`, PostHog turned on through `setPostHogClientForTests` with a recording stand-in (whose captures pass through `cleanPostHogEvent`, section 10 item 3), and real input. Each case asserts on both the Umami sends and the PostHog stand-in, and ends with `JSON.stringify` of every recorded payload containing none of the case's sentinels.

1. Click a start-screen sample tile. Barrier: `source:loaded`. Expect exactly one `sample_loaded {sample: <StartSample.id>}` and no `own_file_opened`. The start screen's HeroGraph produced zero events.
2. Open a network example from the start screen. Barrier: `source:loaded`. Expect `sample_loaded {sample: <exampleId>}` on the PostHog stand-in and no `own_file_opened`.
3. Drop a fixture named `secret-PATIENT-ids.graphml` (node labels include `SECRET_LABEL`) with the existing file-drop helper. Expect `own_file_opened {format: "graphml", via: "file"}`. No payload contains `secret`, `PATIENT` or `SECRET_LABEL`.
4. Drop a malformed file named `SECRET_BAD.csv`. Expect one `load_failed {code, task}` and no payload containing `SECRET_BAD`.
5. Open a project file by picking it. Barrier: `project:status` reporting the project open. Expect one `own_file_opened {format: "graphty", via: "file"}`, no `sample_loaded`, no other `own_file_opened` and no `graph_action`. Reopen it from Recent; same barrier: one `project_reopened`, no second `own_file_opened`, no `sample_loaded` and no `graph_action`.
6. Run an algorithm by clicking through the Analyze popover. Expect `algorithm_run {algorithm, outcome: "succeeded"}`; after its `run:changed` end (the barrier), no `graph_action` with op `style.encode`. Re-color by the result with real clicks: one `graph_action {op: "style.encode"}` with no `suggested`. Undo with a real key press; barrier `history:changed`: no new `algorithm_run`. Run one that fails: `algorithm_run {outcome: "failed", code}`.
7. Change the layout in the form. Expect one `layout_changed {layout, outcome: "applied"}`. Press undo and redo with real keys; barrier: the second `history:changed`. Still exactly one on the PostHog stand-in. Opening a sample alone (barrier `source:loaded`) sends no `layout_changed`.
8. Drag a filter slider across several values; barrier: the last `journal:appended` for that op. Exactly one `graph_action` for that op. With an algorithm run and results set to re-run, play a timeline for several steps and also move the window by hand; barrier `time:end` and the last `run:changed` end. No `graph_action` with op `visibility.window` and no `algorithm_run` beyond the first.
9. Click a node on the canvas with graphty-element's real-input helpers: one `canvas_selected {target: "node", count: "1", via: "click"}`. Drag a node: one `nodes_dragged`. Orbit with a pointer drag: one `camera_used {kind: "orbit"}` (barrier: `camera:gesture-end`). Send five wheel events in one task: one `camera_used {kind: "zoom"}` (barrier: the `camera:gesture-end` itself). Dead and rage clicks are not tested here, because a stand-in runs no autocapture (see `analytics.posthog.test.ts` case 4). Press Fit: one `command_run {command: "view.fit"}`.
10. Add a note whose text is `SECRET_NOTE` with real typing: one `graph_action {op: "note.add"}` and no payload containing `SECRET_NOTE`.
11. Run a command from the command palette: one `command_run {command}`. Open Settings and a dialog by clicks: `panel_opened` with allowlisted ids only, and no project or page name in any payload.
12. Export a graph by clicks. Expect one `export_done {kind: "graph", format}`. Change export options; barrier: the export form's loss summary re-rendered for the new options. No new `export_done`. Copy an image to the clipboard: `export_done {kind: "image", destination: "clipboard"}`.
13. Reload with the autosaved project restored (unmount and remount); barrier: `project:status` reporting the restore complete. No `own_file_opened`, no `sample_loaded` and no `graph_action` on the PostHog stand-in. Reload after opening a sample but before autosave wrote anything (the `openAgain` path); barrier: `source:loaded` with `callerKey: "reopen"`. No second `sample_loaded` on the PostHog stand-in.
14. Super properties: `site` on the first event; `use_case` only after the survey is answered.

**`graphty/src/workspace/privacy/__tests__/SurveyCard.test.tsx`** (new; plain browser project; real clicks and typing; `setPostHogClientForTests` with a stand-in client returning a fixture survey; moments driven by calling `count()` and `detail()`)

- Renders nothing while PostHog is off.
- Appears after `count("algorithm_run", {outcome: "succeeded"})`, after `detail("load_failed", ...)`, and not before either.
- With `vi.useFakeTimers()`: after `count("sample_loaded", ...)`, `advanceTimersByTime(180000)` shows the survey; when an `algorithm_run` came first, the survey triggered by it is the only one shown, and advancing the timers shows nothing more.
- Moments map to surveys: with both fixture surveys active, a succeeded `algorithm_run` shows `use_case` and never `export_ease`; an `export_done` (with `use_case` already seen) shows `export_ease`; with only `export_ease` active, an `algorithm_run` shows nothing; a second moment on the same page view shows nothing.
- After `stopPostHog()`, a moment shows nothing and the stand-in's `getActiveMatchingSurveys` is not called.
- Answering by click stores the choice id (the id, not the label), and the next event `cleanPostHogEvent` sees carries it as `use_case`; a new mount on a later visit adds the stored id again.
- Dismissed or answered, it never shows again.
- The Other text is sent only as `$survey_response_<questionId>`, and the "Do not paste data" hint is shown next to the box.

**Network proof** (in `workspace/privacy/__tests__/UsageNetwork.real-element.test.tsx`; the off-origin listener is the existing `watchOffOriginRequests` browser command, which leaves the HTTP cache alone, so no `watchRequestsMatching` was added). It uses the live `usageData` sender (no `setUsageSenderForTests` stand-in in these cases), the real `importPostHog` with the canned-response wrappers from `analytics.posthog.test.ts`, and `setSentryCallsForTests` with a recording stand-in and a fake DSN in its `defaultConfig`, which the live sender's argument-free `initSentry()` reads. "Downloaded" is proved by a same-origin Playwright request listener, `watchRequestsMatching(/posthog/)` (a sibling of `watchOffOriginRequests` in `vitest.config.ts`), not by resource timing, whose 250-entry buffer fills with dev-mode modules. "Stopped" is proved by state, not by waiting.

- Unanswered, then "No thanks": load a sample, run an algorithm and export (barrier: `export_done` on the Umami recorder). The import count is 0, the request listener saw no posthog URL, and the Sentry stand-in's `init` was never called. The off-origin listener seeing no Sentry host is kept as a second check.
- Click "Share usage data": the import count is 1, the request listener saw exactly one posthog chunk request, the Sentry stand-in's `init` was called once, `init` ran and `before_send` received an event (so the next checks are not vacuous). Turn the Settings switch off with a real click. Then click buttons, open a panel and run an algorithm (barrier: that run's `algorithm_run` on the Umami recorder). `has_opted_out_capturing()` is true, no `ph_` persistence key remains, and `before_send` received nothing new.

**Copy tests to update.** Before implementation, grep the app's tests for every literal being changed (`Nothing is sent`, `Nothing is collected`, `stays off`, `Local only`). Known sites:

- `StartScreen.test.tsx:155,184,223`
- `AssistantOff.real-element.test.tsx:79,134`
- `AssistantOn.real-element.test.tsx:103` (an exact `findByText("Usage data: off.")`, which the provider branch's new string breaks) and `:105` (the regex must still pass)
- `frame/__tests__/SpokenMessages.test.tsx:38` (the declined line)
- `Workspace.test.tsx:75-79,235-236`, only if the chip text changes; it does not

**graphty-element**

- Session data tests: `source:loaded` fires once per added source with the right `kind`, `format`, `sourceId`, `mode` and `sample` for `import` of a file, `import` of a network source, `loadExample`, `loadDataset` and `generate`; `callerKey` is echoed by every one of them, `loadDataset` and `generate` included; for each, the event's `kind` equals the `kind` that `sources()` lists for its `source` (a `loadExample` load is `"server"` with `sample.exampleId`).
- It carries no `fileName`, `url`, `baseUrl` or `params`.
- It does not fire on undo, redo or restore, on a project open (a project with two saved sources, opened by `openProject`; barrier: the open's promise), on an autosave restore, or on `runPendingSourceLoad`.
- Journal tests: a batch release journals its suggestion entries with `trigger: "suggestion"`; `applySuggestedStyles()` does too; a single run with `applySuggestedStyles: true` journals no separate style entry; a direct `styles.encode()` has no `cause`; every member entry of a project open has `trigger: "project"`.
- Run tests: a re-run from a moved window under `results: "rerun"`, and from flipping the setting to re-run, publishes `run:changed` with `trigger: "timeline"`; a direct run has none.
- Selection and camera tests with real input: a canvas click gives `via: "click"`, a box selection `via: "box"`; one orbit gesture gives one `camera:gesture-end`; five wheel events dispatched in one task give exactly one `camera:gesture-end {kind: "zoom"}`, waited on through the event itself, with no frame count or timer in the test.
- `test/browser/element-mirror-events.test.ts`: a `graphty-source-loaded` case that checks the event arrives with a serializable detail and no `fileName`, `url`, `baseUrl` or `params`.
- `test/types/consumer/dom-events.ts`: a typed `graphty-source-loaded` listener.
- `test/packaging/jsx-types.test.ts` and the API report check pass.

**Storybook.** The StartScreen "Answered" story's real Share click runs the real sender. With no site.json in Storybook there is no key, so `startPostHog` does nothing, and the query strip does nothing in the preview iframe because no recorder is configured (section 3). The new `SurveyCard` stories run their play functions. Pictures expected to change: `StartScreen.stories.tsx` (card line and footer link), the new `SurveyCard` stories, and any story in `Frame.stories.tsx` or `Project.stories.tsx` that shows Settings > Privacy or the start screen footer. `Sentry.stories.tsx` is unchanged in a build without a DSN. A changed picture in any other story is a defect.

## 12. Owner setup

1. **Umami Cloud.** Create the free account and add the website `graphty.app`. Give its website id (public). Confirm the account's session-salt rotation (monthly by default), which the privacy page states. Check whether Umami Cloud offers a per-site setting that turns off location; if it does, turn it on and the privacy page drops the location line.
2. **PostHog Cloud, EU region.** The region is a one-way door. Create a project and give its project API key (`phc_...`, public). In project settings:
    - discard client IP data. Required before `posthogKey` is added to `graphty/sites/production.json`; the pull request that adds the ids states that it is on. The privacy page claims only what the code enforces (no location lookup) and does not depend on it.
    - session replay on, with network and console recording off and a sampling rate that fits 5k recordings a month
    - Logs (console log capture) off: posthog-js 1.445's bundle turns console capture on whenever the project's remote config says so, whatever the app sets, and those lines go to `/i/v1/logs` past `before_send`. The real-chunk test fails on any request to that endpoint.
    - autocapture and heatmaps on
    - authorized URL `https://graphty.app`
3. **In PostHog,** create the two API surveys (section 4.4), named exactly `use_case` and `export_ease`, and the insights and paths (section 4.3). An agent can do this instead, using a PostHog personal API key put in the root `.env`.
4. **Approve the copy** in section 10 item 18 and the privacy page. The copy now says that "No thanks" still sends anonymous counts, which changes what declining means. Check that `OWNER_TEXT` still says what he means now that Umami and PostHog process data.
5. **Decide DNT and GPC.** The design sends the anonymous counts anyway and skips only the visit record (decision 4). The alternative is to send nothing to Umami for those readers, at the cost of an unmeasured undercount of the launch audience.
6. **Decide the launch-month Umami budget.** On the free plan, counts are lost past 100k events a month. A paid plan covers a launch spike.
7. **Sentry:** nothing to change. Optionally lower the replay quota, since only error replays remain.

## 13. Open risks

- **R1. Umami's `/api/send` from a browser without the tracker.** The endpoint and headers match Umami's own tracker, and `gateway.umami.is` answers CORS for any origin, but bot filtering by User-Agent must be checked on the first production build. Fallback: inject `script.js` with these attributes, setting `url`, `referrer` and `title` through the before-send hook:
    - `data-auto-track="false"`
    - `data-domains=<site host>`
    - `data-before-send`
- **R2. Replay Meta events record `location.href`.** Neither PostHog's `before_send` (which skips `$snapshot`) nor Sentry's `beforeAddRecordingEvent` (which never sees the Meta event) cleans it. The defense is the address bar: `stripQueryForRecorders()` runs synchronously before either recorder initializes (section 3). The real-chunk test in section 11 and analytics test 3 pin it. A future query param read after boot must use `bootQuery()`.
- **R3. Two DOM recorders run at once for consenting readers:** Sentry's error buffer and PostHog's session recording. Sentry's buffer is one-shot: an error sends the recording of the moments before it once, through `beforeErrorSampling`, then buffering restarts under a new replay, and `stickySession` is off, so Sentry never becomes a second session recorder. `minReplayDuration` is 0: Sentry's default holds a replay shorter than 5 s back for a later flush, which the restart would cancel, so an error in a buffer's first seconds would send no replay. Measure on a 10k-node graph before shipping. If the cost shows, set Sentry `replaysOnErrorSampleRate` to 0 and link the PostHog session id on Sentry errors instead.
- **R4. Masked attributes make autocapture element names and replays coarse.** The `control` id (decision 15), command ids, `panel_opened` and the canvas events cover the gap; controls with no command get a fixed control id only when a funnel needs one.
- **R5. API surveys and `getActiveMatchingSurveys` need PostHog's remote config call.** Verify it works with `disable_external_dependency_loading` in the first build.
- **R6. The camera gesture end.** Section 8.6 defines it by input (pointer up, inertia at rest after a wheel or key run). If a controller has no inertia state to read, the element adds one inside the controller; the app never debounces camera input. Key gestures are tested only through the element's own tests.
- **R7. Assistant-started actions count as the reader's.** Runs carry cause `"command"`, and the assistant's and group collapse's `positions.set` count as `nodes_dragged`. Accepted for now. The path when a funnel needs the split is an `"assistant"` value on `JournalEntry.trigger` and `RunChange.trigger`, set by the element's AI tool dispatch, and a drag marker on `positions.set`; both are additive.
- **R8. The Umami free-plan overflow on a launch day** is the owner's choice (section 12, step 6).
- **R9. Report a problem still needs consent.** That is launch-plan item 1, tracked separately.
