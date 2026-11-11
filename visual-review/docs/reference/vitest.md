# Vitest entry points

visual-review can take its screenshots inside your Storybook's story tests (Vitest's browser mode)
instead of a separate capture run. Two entry points make that work; the guide's section
[Taking the screenshots inside the story tests](../guide/github-actions#taking-the-screenshots-inside-the-story-tests)
shows them in a complete Vitest config. Both ship their own TypeScript declarations.

## `@graphty/visual-review/vitest`

Used in the Vitest config (Node).

### `visualStoryTest(options)`

Everything one Storybook project's story-test Vitest project needs to shoot its stories.

| Option    | Type     | Meaning                                                           |
| --------- | -------- | ----------------------------------------------------------------- |
| `project` | `string` | the project's id in `visual-review.config.json`                   |
| `out`     | `string` | the directory this run's partial result is written to             |
| `root`    | `string` | the repository root; by default, found from the current directory |

Returns `{ viewport, providerOptions, commands, reporter }`, for the Vitest project's
`browser.viewport`, the options of `playwright(...)`, `browser.commands`, and the root config's
`reporters`.

### `PRODUCTION`

Production settings for a story-test Vitest project, to spread into its config:
`{ mode: "production", define, appType: "mpa" }`. They make the stories run as `build-storybook`
builds them and as the capture server serves them: in particular, a request for a file that does
not exist is answered with a 404, not with the page's HTML.

## `@graphty/visual-review/vitest/setup`

Used in the story tests' setup file (the browser).

### `installVisualStoryTest(options)`

Installs the screenshot step in the test page. Pass the setup file's Vitest hooks and `commands`
from `vitest/browser`: `installVisualStoryTest({ afterEach, beforeEach, commands })`. A `vi` option
is accepted and not used.

### `modeGlobals(globals, forced, mode)`

The Storybook globals a story is drawn with in one capture mode, by the rule Storybook itself
applies: the mode's globals over the story's defaults, and the globals the story sets itself
(`forced`) over the mode's. Returns the merged record.

### `shotsDisagreed(result)`

Whether a story's two shots drew different pictures: `true` when `result.status` is `"unstable"`
or `result.flaky` is `true`. Either fails the test, so its retry judges it like any flaky test.
