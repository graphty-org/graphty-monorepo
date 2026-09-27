# Visual review: technology choices

Date: 2026-09-27

This document picks the technology for each part of a self-hosted visual review system that
replaces Chromatic for the five Storybooks in this repository (graphty-element, compact-mantine,
graphty, algorithms, layout). It covers capture, settling, diffing, image format, baseline
storage, the review UI, approval, history and an MCP server. The companion document
`chromatic-alternatives.md` compares hosted services and explains why self-hosting was chosen;
this one assumes that choice and asks "built from what?"

Every number marked "measured" was measured on 2026-09-27 on the development server (Intel
i9-14900, 32 threads, Ubuntu 22.04, Node 20, Chromium from Playwright 1.57 with SwiftShader),
using the 1,198 captures of all five Storybooks built from master that day: 171 graphty-element
stories, 828 compact-mantine captures (414 stories, light and dark), 152 graphty captures, 30
algorithms and 17 layout. Each Storybook was captured twice.

## Summary of choices

| Part             | Choice                                                                                                | Main reason                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Capture          | A Playwright script over each built Storybook's `index.json`                                          | Works the same on Storybook 8 and 9, reuses CI's build artifacts, 1,198 captures in about 3 minutes |
| Settling         | Storybook's render phase, then the story's own play function; `?chromatic=true` in the URL            | The existing `graph-settled` play function and pre-steps already make 998 of 999 captures identical |
| Comparing        | SHA-256 of the PNG bytes first; pixelmatch only on the files that differ                              | Hashing all 1,198 files takes 30 ms; almost every capture is byte-identical                         |
| Image format     | PNG as Chromium writes it                                                                             | GitHub's pull request view diffs PNG (2-up, swipe, onion skin) and does not diff WebP               |
| Baseline storage | Plain git, next to each package                                                                       | 14 MB packed today, about 13 KB per accepted image; Git LFS is viable on our plan but buys nothing  |
| Review UI        | A static React single-page app, served locally through servherd, later also on GitHub Pages           | No server to run; flashing and pixel highlighting computed in the browser                           |
| Approval         | A WebAuthn (hardware security key) signature over a manifest of accepted image hashes, verified in CI | A GitHub Environment approval can be given through the API with the credentials agents already hold |
| History          | JSON approval records committed next to the baselines                                                 | Travels with the code, readable with `git log`, verifiable offline                                  |
| MCP              | A small stdio server over the same manifests and images                                               | No new data; Claude reads exactly what the owner reviews                                            |

## Capture

### Options

**Playwright directly over the built Storybook.** Serve `storybook-static/` on a local port, read
`index.json`, open `iframe.html?id=<story>&viewMode=story` for each story entry, wait, screenshot.
This is what `tools/diff-stories.mjs` already does for a handful of stories, and what the
measurement script did for all of them.

- It captures the artifact CI already builds and uploads (`build-storybook-element`, `-app`,
  `-compact-mantine`, `-algorithms`, `-layout` in `.github/workflows/ci.yml:288-317`), so capture
  needs no Storybook build of its own.
- It is indifferent to Storybook 8 (compact-mantine) versus 9 (the other four), because
  `index.json` and the iframe URL are the same in both.
- It is about 150 lines, with Playwright (already a dependency at 1.57) as the only requirement.

**The Storybook test-runner.** Jest plus Playwright; it can run against a static build with
`--index-json` and take screenshots in a `postVisit` hook. Storybook's own docs say it "has been
superseded by the Vitest addon" and recommend the addon for Vite-based Storybooks, which all five
are [1]. It would add Jest to a Vitest-only repository. Rejected.

**Vitest browser mode (`toMatchScreenshot`) through Storybook's Vitest addon.** Covered in
`chromatic-alternatives.md`: experimental in Vitest 4, open bugs when combined with the Storybook
addon, and the repository's storybook test project runs against the dev server with coverage on,
not against the build that ships. Revisit when the addon supports it officially. Rejected for now.

### Measured capture times

Workers are separate browser pages in one headless Chromium.

| Storybook       | Captures | Workers | Wall time  | Per capture                                       |
| --------------- | -------- | ------- | ---------- | ------------------------------------------------- |
| graphty-element | 171      | 4       | 80 s, 77 s | median 1.49 s, 95th percentile 4.8 s, worst 8.9 s |
| compact-mantine | 828      | 8       | 55 s, 49 s | median 0.53 s, 95th percentile 0.69 s             |
| graphty         | 152      | 8       | 12 s       |                                                   |
| algorithms      | 30       | 8       | 21 s       |                                                   |
| layout          | 17       | 8       | 3 s        |                                                   |

A standard GitHub-hosted runner for a public repository has 4 vCPUs, and SwiftShader renders on
the CPU, so expect two to four times these wall times per project in CI. Running one job per
project in parallel keeps the total at a few minutes.

### Recommendation

Grow `tools/diff-stories.mjs` into one capture tool that walks `index.json`, honours the
parameters stories already declare (`chromatic.modes` for light and dark in compact-mantine and
graphty, `chromatic.disableSnapshot` on three stories, `chromatic.delay` on two), and writes
`<story-id>[.<mode>].png`. The measurement script this document used is a working prototype of it.

## Deterministic settling

Canvas stories are the hard part: graphty-element renders with Babylon.js, and a force layout
that has not finished moving produces a different picture every time.

What already exists and works:

- `graphty-element/.storybook/preview.ts:88-99` pre-steps every physics layout 1,000 steps when
  `isChromatic()` is true, so the first frame is a settled graph.
- `graphty-element/.storybook/preview.ts:33-62` is a global play function that waits for the
  element's `graph-settled` event (10-second cap).
- `isChromatic()` returns true when the user agent contains "Chromatic" OR the URL contains
  `chromatic=true` (`node_modules/chromatic/isChromatic.js`). So the capture tool only has to add
  `&chromatic=true` to the iframe URL; no user-agent trick is needed. When Chromatic is removed,
  rename the signal (for example `?visual=1`) in one place.

What the capture tool adds:

1. Wait until `window.__STORYBOOK_PREVIEW__.currentRender.phase` is `completed` (or `errored`,
   which is recorded as a failure). That phase includes the play functions, so it includes
   `graph-settled`.
2. Wait two animation frames, so the last layout step is on screen.
3. Screenshot with `animations: "disabled"` and `caret: "hide"` [2].
4. Viewport and device scale factor fixed (1200 x 900 at scale 1 was used here).
5. Chromium flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, the same
   set graphty-element's Vitest config uses, so the GPU of the machine never matters.

Measured result: 170 of 171 graphty-element captures and all 828 compact-mantine captures were
byte-identical between two runs. The one exception, `ai-control--default`, settles into a
different layout each run (2.5% of its pixels differ). That is a defect in the story (it needs a
fixed seed), and any tool would report it.

Not recommended: a "capture until two consecutive screenshots match" loop, which is what Vitest's
`toMatchScreenshot` does. It hides a story that never settles, and the numbers above show it is
not needed here. A cheaper safeguard is to capture twice only when a capture differs from its
baseline, and to label the story "unstable" rather than "changed" when the two captures disagree.

Font caveat: captures depend on the fonts installed on the machine. Emoji rendered as empty boxes
on the development server. Baselines must come from one pinned environment (the CI runner image,
or the Playwright Docker image at the repository's Playwright version [3]). There is no Docker or
Podman on the development server, so a local capture cannot be assumed to match CI pixel for
pixel. The pre-push hook should therefore compare a local capture of HEAD with a local capture of
the merge base (same machine, so deterministic), and leave the baseline check to CI.

## Comparing images

### Measured

| What                                                                                                  | Time                                |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| SHA-256 of all 1,198 PNG files                                                                        | 30 ms total                         |
| Decode both PNGs with pngjs and run pixelmatch, 999 identical pairs                                   | 25.3 s, of which 24.6 s is decoding |
| Decode 1,198 PNGs with sharp (libvips)                                                                | 5.2 s                               |
| 100 fully changed pairs (compact-mantine light versus dark), pngjs + pixelmatch, writing a diff image | 5.4 s (54 ms per pair)              |
| The same 100 pairs, odiff (native binary, one process per pair)                                       | 2.4 s (24 ms per pair)              |
| The same 100 pairs, looks-same                                                                        | 8.4 s (84 ms per pair)              |

On the one unstable story (1,080,000 pixels):

| Engine and setting                                         | Pixels reported changed                    |
| ---------------------------------------------------------- | ------------------------------------------ |
| pixelmatch, threshold 0.1, anti-aliasing ignored (default) | 27,271                                     |
| pixelmatch, threshold 0, anti-aliasing ignored             | 30,693                                     |
| pixelmatch, threshold 0.1, anti-aliasing counted           | 41,590                                     |
| odiff, threshold 0.1, anti-aliasing ignored                | 26,719 (2.47%)                             |
| looks-same, tolerance 2.3                                  | not equal; bounding box 157,110 to 630,873 |

All three engines agree on what changed; they differ only at the edges.

### Recommendation

- **First pass: compare bytes.** Chromium's PNG encoder is deterministic, so a byte-identical file
  means an identical render. Hashing all captures takes 30 ms; in the measured runs 998 of 999
  pairs stopped here. The engine's speed is therefore irrelevant at our scale.
- **Second pass: pixelmatch** on the few files whose bytes differ. It is the engine Playwright and
  Vitest already use, has no dependencies, uses the OKLab HyAB colour metric, ignores anti-aliased
  pixels by default (Vysniauskas's anti-aliasing detector), and offers `diffMask`, `diffColorAlt`
  (added versus removed pixels in different colours) and a sliding `windowSize` for noise [4]. It
  runs in the browser too, so the review UI can compute the highlight itself with the same
  algorithm CI used. Decode with sharp rather than pngjs if decoding ever shows up in a profile
  (about 5 times faster, measured).
- **Pass/fail rule:** any pixel above threshold 0.1 fails. Do not add an allowed-mismatch ratio:
  with byte-identical reruns there is no noise to absorb, and a ratio would hide small real
  changes such as a one-pixel border.
- odiff (MIT, about 6 times faster than pixelmatch on large screenshots by its own benchmark,
  reads WebP [5]) is the upgrade if comparison ever becomes the slow step. It will not at 1,200
  images. looks-same is the slowest and its last release was 2025. reg-cli is a report generator
  on top of an engine; its report is useful to borrow ideas from, but the review UI below replaces it.

## Image format and compression

Measured on a sample of 200 captures (every sixth file, across all five projects):

| Format                                 | Bytes   | Relative | Encode time for 200 | Exact round trip     |
| -------------------------------------- | ------- | -------- | ------------------- | -------------------- |
| PNG as Chromium writes it              | 3.97 MB | 100%     | 0                   | yes                  |
| PNG through oxipng `-o 2 --strip safe` | 3.09 MB | 78%      | 27.9 s              | yes                  |
| WebP lossless (sharp, effort 4)        | 1.70 MB | 43%      | 7.3 s               | yes, pixel for pixel |
| AVIF lossless (sharp, effort 4)        | 4.08 MB | 103%     | 396 s               | yes                  |

All 1,198 PNGs together are 19.4 MB (about 22 MB on disk, counting block size).

Recommendation: **keep Chromium's PNG unchanged.**

- GitHub displays and diffs PNG in a pull request's file view with 2-up, swipe and onion-skin
  modes; it lists PNG, JPG, GIF, PSD and SVG, not WebP [6]. That gives the owner a free second
  review surface on the pull request itself, from day one.
- Re-encoding breaks the byte-equality fast path unless every capture is re-encoded the same way,
  and costs time on every run (oxipng: 140 ms per image).
- WebP lossless would halve storage. At our sizes (below) that saving is worth a few megabytes a
  year, so it is a later optimisation, not a starting point. AVIF lossless is larger and 50 times
  slower; never.

## Baseline storage

### Measured git growth

A throwaway repository was seeded with all 1,198 captures, then ten "accept" commits each changed
a 40 x 20 pixel region in 30 random images (300 accepted images), then `git gc --aggressive`:

| Stored as     | Packed size after seeding | After 300 accepted images | Growth per accepted image |
| ------------- | ------------------------- | ------------------------- | ------------------------- |
| PNG           | 14.0 MB                   | 18.0 MB                   | about 13.5 KB             |
| WebP lossless | 6.7 MB                    | 8.7 MB                    | about 6.6 KB              |

(The accepted PNGs in this test were re-encoded by sharp; Chromium's own PNGs would be a little
larger.) Git's delta compression recovers about half of a changed PNG's size, and none of a WebP's.

For scale: the repository is 77 MB on GitHub today (the `size` field of the repository API). At a
generous 200 accepted images a month, PNG baselines add about 2.7 MB a month, roughly 32 MB a
year, to every full clone.

### Options

| Option                                   | CI cost                                                        | Merge-base comparison                                              | Works offline                                                   | Verdict                                  |
| ---------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------- |
| Plain git, `<package>/visual-baselines/` | none; the checkout already has them                            | free: the PR's tree holds the baselines it branched from           | yes                                                             | **Choose**                               |
| Git LFS                                  | about 20 MB of LFS bandwidth per CI checkout that fetches them | same as plain git                                                  | needs `git lfs` installed (it is not on the development server) | viable, no benefit yet                   |
| Orphan baselines branch                  | a second fetch                                                 | lost; must be rebuilt by commit mapping                            | yes                                                             | only if clone size becomes a problem     |
| Separate repository                      | a second checkout, a second token                              | lost                                                               | yes                                                             | no                                       |
| GitHub release assets                    | API calls per file; no per-branch view                         | lost                                                               | no                                                              | no                                       |
| Actions artifacts or cache               | free                                                           | lost; artifacts expire after at most 90 days, unused cache after 7 | no                                                              | for review bundles only, never baselines |

Git LFS, verified against GitHub's current docs [7]: GitHub Free and Pro include 10 GiB of storage
and 10 GiB of bandwidth a month; **GitHub Team and Enterprise Cloud include 250 GiB of each**.
Actions downloads count against bandwidth. With a $0 budget, LFS "is blocked for the rest of the
calendar month" when the allowance runs out. The graphty-org organisation is on the Team plan
(`gh api orgs/graphty-org` reports plan "team"), so the earlier concern that LFS would break CI no
longer holds: 800 checkouts a month at about 20 MB is about 16 GB, 6% of the allowance. LFS still
buys nothing at 14 MB of packed baselines, adds a tool every contributor and agent must install,
makes a missing `git lfs pull` look like "every image changed", and turns the $0 LFS budget into a
way for CI to stop working mid-month. Revisit if baselines pass a few hundred megabytes.

Merge conflicts: two pull requests that accept the same story conflict on a binary file. The
resolution is to take either side and re-accept after rebasing; the review tool should offer
"re-accept what CI now captures" for exactly this case.

## Where the review bundle lives

CI produces, per pull request and project, the images that differ from the baseline plus a
manifest (story id, mode, old and new SHA-256, changed-pixel count, bounding box). For the
measured runs that is a few hundred kilobytes; a full rebaseline of compact-mantine is about 9 MB.

- **Actions artifact** (always): free, 90-day retention, but downloading needs an authenticated
  token, so a static web page cannot fetch it. The local review UI fetches it with
  `gh run download`.
- **An orphan `visual-review` branch** (for the hosted UI): CI commits `pr-<n>/<sha>/...` there.
  Files are then readable from `https://raw.githubusercontent.com/<org>/<repo>/<commit>/...`, which
  was checked to send `access-control-allow-origin: *` (and `cache-control: max-age=300`, which
  does not matter when the URL names a commit). The branch is pruned when a pull request closes,
  and can be force-rewritten to drop history since it holds nothing that must be kept.
- **GitHub Pages** hosts the UI's code only. A Pages site is one deployment of at most 1 GB, with a
  soft 100 GB a month bandwidth limit and a 10-minute deployment timeout [8], and this
  repository's Pages site is assembled from several packages in one job
  (`.github/workflows/deploy-pages.yml`). Putting per-PR images into it would mean redeploying the
  whole site on every PR push. So images go to the branch, and the UI on Pages reads them from
  raw URLs.
- **Live Storybooks per pull request** (the P1 "link to baseline and new Storybook"): the base
  Storybook is already on graphty.app for master. For the PR side, a Storybook is 7 to 19 MB, so
  all five are about 60 MB per PR. Two workable routes: the local UI serves the downloaded
  `build-storybook-*` artifacts through servherd (free, private, P1), or a separate repository with
  Pages built from a branch holds `pr-<n>/<project>/` and is pruned on close (public, uses the
  second repository's 1 GB). raw.githubusercontent.com cannot serve a Storybook because it answers
  HTML as `text/plain`.

## Review UI

- **Shape:** a static single-page app built with Vite and React, using the repository's
  compact-mantine components (the repository rule is to use the shared components, not bespoke
  ones). It reads a manifest and image URLs; it has no backend.
- **Where it runs:**
    - Locally through servherd (P0). A small companion script downloads the CI artifact for a pull
      request, serves UI plus images, and, on accept, writes the accepted PNGs into the working tree
      together with the signed approval record. The owner or an agent commits and pushes; that is
      safe because CI verifies the signature, not who pushed.
    - On GitHub Pages at a path under graphty.app (P1), reading the `visual-review` branch.
- **Views per changed story:** side by side, a slider, a diff overlay, and flashing.
    - Flashing: two stacked `<img>` elements with a CSS animation toggling the top one's opacity
      at 2 to 4 Hz, with a pause key. No JavaScript per frame.
    - Pixel-level highlighting: decode both images into canvases and run pixelmatch in the browser
      (about 20 to 50 ms for a 1200 x 900 pair) with `diffMask` and `diffColorAlt`, drawn on an
      overlay canvas. Group changed pixels into boxes and draw an outline around each so a
      three-pixel change is findable at full-page zoom (Chromatic's "spotlight"). Zoom with
      `image-rendering: pixelated`.
    - Because the highlight is computed client-side, CI does not need to store diff images at all.
- **Keyboard-first:** next/previous change, accept, reject, toggle flash. With about 1,200
  captures the realistic review is tens of changes, not hundreds; bulk "accept all in this
  project" is still needed for an intended rebaseline and must produce one signature over the
  whole list, not one touch per image.

## Approval that an agent cannot forge

The threat: AI agents run on the owner's machine with the owner's GitHub CLI credentials and
signing key. Checked on this machine, the `gh` token carries the scopes `gist, read:org, repo,
workflow`. Anything that token can do, an agent can do.

### What does NOT work

- **A GitHub Environment with the owner as required reviewer.** GitHub's REST API has "Review
  pending deployments for a workflow run", which will "approve or reject pending deployments that
  are waiting on approval by a required reviewer"; it needs the `repo` scope [9]. The agent's
  token has it, so the agent can press Approve by API. The "prevent self-reviews" setting [10]
  makes it worse, not better: every run an agent starts is started as the owner, so it would also
  stop the owner from approving. Administrators can also bypass protection rules unless that is
  switched off, and the owner's token is an administrator's.
- **A signed commit or tag.** The owner's commit-signing key is used by agents (commit scripts
  sign), so a signature from it proves nothing about who decided.
- **A pull request review, a comment, a label, or a workflow dispatch.** All are API calls.
- **Anything configured in repository or organisation settings** (rulesets, environments,
  variables, secrets) as the root of trust, because an administrator's `repo` token can change it.

### What does work: a signature from a hardware key that needs a touch

The approval is a record committed next to the baselines:

```json
{
    "manifest": {
        "repo": "graphty-org/graphty-monorepo",
        "pr": 123,
        "head": "<commit>",
        "accepted": [{ "story": "button--primary", "mode": "dark", "sha256": "<new png hash>" }]
    },
    "webauthn": { "credentialId": "...", "authenticatorData": "...", "clientDataJSON": "...", "signature": "..." }
}
```

- In the review UI, pressing Accept calls `navigator.credentials.get()` with the challenge set to
  the SHA-256 of the manifest. The browser asks for the security key; the owner touches it (and
  enters its PIN when user verification is required).
- CI verifies, for every baseline PNG a pull request adds or changes, that some approval record
  lists that file's exact SHA-256, that the record's `clientDataJSON` carries the manifest's hash
  as its challenge and the expected origin, that the authenticator data has the user-present and
  user-verified flags, and that the signature verifies against a public key in the trusted-keys
  file. CI then recaptures and requires the committed baseline to equal its own capture byte for
  byte, so an approved image is also a true render.
- The verifier is about 15 lines of `node:crypto` (ES256 over `authenticatorData ||
SHA-256(clientDataJSON)`), no library needed.

Proven locally, not just argued: a Playwright script created a WebAuthn credential on a Chromium
virtual authenticator, signed the SHA-256 of a sample manifest, and verified it offline with
`node:crypto`. Results: the owner's key over the same manifest verified ("valid"); the same
assertion checked against an edited manifest failed ("clientData mismatch"); and an assertion
from a second virtual authenticator -- exactly what an agent driving a browser could create --
failed against the pinned owner key ("bad signature").

A command-line equivalent needs no browser: an `ed25519-sk` SSH key on the same security key,
`ssh-keygen -Y sign -n visual-approval` over the manifest, verified in CI with `ssh-keygen -Y
verify` against an `allowed_signers` file. FIDO keys require a touch for each signature, and
`-O verify-required` adds the PIN [11]. OpenSSH 8.9 on the development server supports this. It
is the quickest path to a working approval today; the WebAuthn button replaces it in the UI.

WebAuthn details that constrain the design:

- A credential is bound to its relying-party id (the host name). One registered on `localhost`
  cannot sign on `graphty.app`. Register one credential per origin the UI runs on and list every
  public key in the trusted-keys file.
- The page must be a secure context: `http://localhost` qualifies; servherd's HTTPS certificate
  covers the host name.
- A platform authenticator (a laptop's fingerprint reader or a phone passkey) also works, but a
  synced passkey is only as safe as the account it syncs to. A roaming hardware key is the
  recommendation.

### What it guarantees, precisely

- **Guaranteed:** no baseline change can pass the CI check unless someone physically touched the
  owner's security key while a manifest listing that exact image was on screen. An agent can
  prepare everything, but it cannot produce the touch. The guarantee is also offline and
  retrospective: a script can walk master's history and flag any baseline blob not covered by a
  valid approval, independent of GitHub's settings.
- **Not guaranteed on its own:** an agent with administrator credentials can change the rules
  around the check -- edit the trusted-keys file or the verifier in a pull request and merge it,
  or remove the required status check from the ruleset. Two mitigations close most of that:
    1. The verifier accepts a change to the trusted-keys file or to itself only when that change is
       covered by a signature from a key trusted before the change. Run it from the base branch's
       definition (a `pull_request_target` job that only reads files and never runs the PR's code),
       so a pull request cannot swap in its own verifier.
    2. The retrospective audit above runs on every push to master and in the pre-push hook, so a
       bypass is discovered at the next run rather than never.
       What remains is an administrator removing the required check and merging anyway. That is
       visible in the ruleset history and the organisation audit log, and is detected by the audit,
       but not prevented. Fully preventing it needs agents to run with a token that is not an
       administrator's (for example a fine-grained token without administration permission), which is
       a change to how agents are set up, outside this system.
- Adding a new signing key to the owner's GitHub account needs the `write:ssh_signing_key` or
  GPG-key scopes [12], which the agents' token does not have. This matters only if GitHub's own
  "verified" badge is ever used; the design above does not rely on it.

## History

| Option                                                           | Where it lives | Visible on GitHub                             | Survives squash merge                              | Verdict                                              |
| ---------------------------------------------------------------- | -------------- | --------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| JSON approval records in `<package>/visual-baselines/approvals/` | the repository | yes, as files                                 | yes, they are files                                | **Choose**                                           |
| git notes                                                        | `refs/notes/*` | no; GitHub stopped showing notes in 2014 [13] | no; notes attach to commits that a squash discards | no                                                   |
| Pull request metadata (comments, reviews)                        | GitHub only    | yes                                           | yes                                                | not offline, and forgeable by the agent's token      |
| A log on the `visual-review` branch                              | the repository | yes                                           | yes                                                | for rejections and comments, which need no signature |

Each approval record already names the pull request, the head commit, and every accepted image
hash, so "who accepted this image and when" is `git log` on the baseline plus the record that
lists its hash. Rejections need no signature (rejecting can do no harm) and go to the
`visual-review` branch log with the story, the head commit and an optional comment.

Dirty working trees: a local review session can record `git describe --always --dirty` and a hash
of `git diff HEAD`, so a local comparison is tied to exactly what was on disk. Approvals are only
ever made for CI captures of a pushed commit, because only those are the pinned environment.

## Running only what changed

- **Per project:** already solved. CI's planning step asks Nx which projects a pull request
  affects (`nx show projects --affected`), and `tools/prepush.sh:74` does the same locally. The
  visual job per project uses the same gate.
- **Per story:** Storybook can emit `preview-stats.json` with `--stats-json` (measured: 2.6 MB for
  graphty-element), which maps modules to stories. But both big previews import their package's
  own source (`graphty-element/.storybook/preview.ts` imports `../src/graphty-element`,
  compact-mantine's imports `compactTheme` from `../src`), so almost any source change touches
  every story. Not worth building. The byte-hash pass already makes an unchanged story nearly free
  to compare; the cost is capturing, which the per-project gate already bounds.

## MCP server

A stdio server on `@modelcontextprotocol/sdk` (1.30.1 today) that reads the same manifests,
images and comment log the UI reads. Tools:

- `list_reviews` -- open pull requests with pending visual changes, per project.
- `get_changes(pr, project)` -- each changed story with pixel counts, bounding boxes and status.
- `get_images(pr, story, mode)` -- baseline, new and highlighted-diff images as MCP image content,
  so a multimodal model sees the pictures, not only the numbers.
- `get_comments(pr)` and `resolve_comment(id, note)` -- the owner's annotations, for Claude to act
  on.

It exposes no accept tool, on purpose: accepting needs the security key, and the server should
not pretend otherwise. About 150 lines; P2.

## Browsers other than Chromium

Playwright ships Firefox and WebKit, and the same capture script takes a browser name. WebGL in
headless Firefox and WebKit on Linux has no SwiftShader equivalent, so graphty-element's canvas
stories would need their own determinism work, and every added browser multiplies capture time
and baseline storage. Keep Chromium only; if another browser is added, start with compact-mantine
in WebKit, where there is no canvas.

## Sources

Read on 2026-09-27.

- [1] https://storybook.js.org/docs/writing-tests/integrations/test-runner
- [2] https://playwright.dev/docs/api/class-page#page-screenshot
- [3] https://playwright.dev/docs/docker
- [4] https://github.com/mapbox/pixelmatch
- [5] https://github.com/dmtrKovalenko/odiff
- [6] https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files
- [7] https://docs.github.com/en/billing/concepts/product-billing/git-lfs
- [8] https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- [9] https://docs.github.com/en/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run
- [10] https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- [11] https://developers.yubico.com/SSH/Securing_git_with_SSH_and_FIDO2.html
- [12] https://docs.github.com/en/rest/users/ssh-signing-keys#create-a-ssh-signing-key-for-the-authenticated-user
- [13] https://github.blog/news-insights/git-notes-display/
- [14] https://docs.github.com/en/actions/concepts/security/github_token (events made with
  `GITHUB_TOKEN` do not start new workflow runs, except `workflow_dispatch` and
  `repository_dispatch`; relevant if CI ever commits to a pull request branch)
- Repository files: `.github/workflows/ci.yml:288-317` (Storybook artifacts),
  `graphty-element/.storybook/preview.ts:33-99` (settle and pre-steps),
  `compact-mantine/.storybook/preview.tsx:110-115` (light and dark modes),
  `tools/diff-stories.mjs`, `tools/pixel-diff.mjs`, `tools/prepush.sh:68-77` (affected projects),
  `node_modules/chromatic/isChromatic.js` (the `chromatic=true` URL signal).
