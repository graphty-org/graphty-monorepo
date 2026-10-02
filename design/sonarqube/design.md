# SonarQube as a local pre-push gate

How graphty-monorepo uses the owner's SonarQube server: a pre-push step that blocks only the
problems a push introduces, a background job that keeps master's analysis current, and a staged
plan that burns the existing backlog down without ever blocking feature work.

The server is the owner's local SonarQube Community Build 26.3.0.120487 (its address is
`SONAR_HOST_URL` in `.env`; the repository is public, so it is not written here). It is reachable
only from the owner's network, never from GitHub Actions, so nothing here runs in CI. The
Community Build has no branch and no pull request analysis: every scan sent to a project
replaces that project's one picture of the code.

See research-server.md (what the server can do, and timings) and backlog.md (what a full scan
of master finds today).

## 1. The gate

### Two projects on the server

| Project key              | Holds                                                  | Written by                   | Read by                                                                                                                  |
| ------------------------ | ------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `graphty-monorepo`       | A full analysis of `origin/master`, with CI's coverage | The baseline job (section 2) | People (the dashboard, the burn-down, the weekly review), and the gate, to recognize issues that already exist on master |
| `graphty-monorepo-local` | A scan of only the files the current push changed      | The gate                     | The gate, immediately after its own scan                                                                                 |

The local project is scratch space. Every push overwrites it, and nothing in it is kept or
reviewed. It exists because a scan of a few files sent to a project wipes every other file out
of that project (measured: 253,738 lines became 6,486), so a changed-files scan must never be
sent to `graphty-monorepo`.

Both projects use the same quality profile ("Graphty way", below) and the same scanner
settings, from one checked-in `sonar-project.properties` at the repository root. The key, host
and token are not in that file (section "Configuration and secrets").

### What the gate does on a push

The new step, "SonarQube (changed lines)", is `tools/sonar-gate.mjs`, run by `tools/prepush.sh`:

1. **Find the changed files.** `git diff -M --name-status --diff-filter=AMR <merge-base> HEAD`,
   where the merge base is the same `git merge-base origin/master HEAD` the gate already uses for
   nx. The push sends HEAD, so HEAD is what is judged, never the working tree. Keep the
   extensions SonarQube analyzes (`.ts .tsx .js .mjs .cjs .html .css .py`); the scanner applies
   the exclusions in `sonar-project.properties` itself, so the gate does not copy them. A file
   with uncommitted changes is left out of the scan and named in a warning ("not checked: has
   uncommitted changes; the next push checks it"), because the scanner reads the working tree
   and would judge code that is not being pushed. If nothing is left (a docs-only push), the
   step passes without contacting the server.
2. **Check the server and the setup** (section "When the gate cannot run").
3. **Scan them into `graphty-monorepo-local`.** Run the scanner with `sonar.inclusions` set to
   that list (source and test files both) and `sonar.working.directory` set to
   `<git common dir>/sonar/<worktree name>/`, outside the worktree, so the scan's files never
   meet knip, the link check or a `git status`. SonarJS still builds the TypeScript program from
   each package's tsconfig, so type-aware rules see the rest of the code as context.
4. **Wait for the server to process it.** Read `ceTaskId` from `report-task.txt` in the working
   directory and poll `api/ce/task` until it succeeds. `sonar.qualitygate.wait` is not used: the
   server's gate on this project is not the verdict (step 7 is).
5. **Read the results.** `api/issues/search` (open issues) and `api/hotspots/search` (hotspots
   to review) for `graphty-monorepo-local`. The project holds only the changed files, so the
   result is small.
6. **Read master's matching findings.** For each file that has a finding on a changed line, the
   same two calls for that file's path on master (its old path when `git diff -M` reports a
   rename) in `graphty-monorepo`, including hotspots reviewed as SAFE.
7. **Decide.** A finding is "on a changed line" when its primary line falls inside a hunk that
   `git diff -M -U0 <merge-base> HEAD` reports as added or changed. Such a finding blocks the
   push unless step 6 shows it already exists on master (next section). The script prints each
   blocking finding as `path:line  rule  message` with a link to the rule on the server, and
   exits 1.

What is "new" is decided by the diff, not by SonarQube's new-code period. That choice is the
core of the design:

- **It does not depend on git blame dates.** With the Community Build, "new code" means "a line
  whose blame date is after the period start". A commit made last week, rebased, or cherry-picked
  from an old branch would count as old code and slip through. The diff against the merge base
  judges every commit on the branch the same way, however old it is.
- **It needs no baseline to be correct.** The local project needs no new-code period, version
  bump or "specific analysis" pointer kept in step with each push. Master's analysis is used only
  to let a finding through (next section), never to block one, so a stale or missing baseline
  makes the gate stricter, never laxer.
- **The old backlog never blocks.** An existing issue on a line the push did not touch is not
  reported, and neither is one on a line the push did touch (next section).

### Touching a line does not inherit its backlog

Many edits mark a line as changed without changing what is wrong with it: a rename or codemod
across many files, `prettier --write` on a file someone edits, a file move, one more parameter on
a function that already breaks S107. Blocking every old issue on such a line would put hundreds
of findings in front of an author who wrote none of them, and teach the bypass trailer as a
habit. So a finding on a changed line does not block when master already has it:

- **Issues:** `graphty-monorepo` has an open issue in the same file (following the rename), with
  the same rule and the same line `hash`. The issues API returns `hash` on every issue; it is the
  MD5 of the line with all whitespace removed, so reformatting a line keeps it. Such issues are
  listed under "existing issues on lines you touched (not blocking)".
- **Issues reported on a function's signature, S3776 (cognitive complexity) and S107 (too many
  parameters):** the signature line usually changes with the edit, so its hash cannot match.
  Instead, match a master issue with the same rule in the same file whose line lies in the same
  diff hunk (or maps to the same line outside one), and block only when the number in the
  message went up ("from 17 to the 15 allowed" against master's 16, or 9 parameters against
  master's 8). Unchanged or lower passes.
- **Hotspots:** master has the hotspot in the same file, with the same rule and line hash, and it
  is either still to review (it is the backlog) or reviewed as SAFE. The hotspots API does not
  return a hash, so the gate computes it from the line at the revision master's analysis was made
  of (`git show <revision>:<path>`), with SonarQube's formula above (a test checks the computed
  hash against the issues API's `hash` on a sample of master's issues). A hotspot reviewed as
  FIXED or ACKNOWLEDGED does not match: it came back, and it blocks.

A wrapped line (prettier splitting one line into three) changes the hash and still blocks; the
author can fix the issue or use a `NOSONAR` comment. With no `graphty-monorepo` analysis, nothing
matches and every finding on a changed line blocks, as the strict reading of "a changed line is
new code" would.

### What blocks

| Finding                                                                                                                  | Effect                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| An open issue (bug, vulnerability, code smell) of any severity on a changed line, not on master                          | Blocks                                      |
| A security hotspot on a changed line, not on master                                                                      | Blocks                                      |
| A finding on a changed line that master already has (section above)                                                      | Listed, does not block                      |
| An issue on an unchanged line of a changed file whose rule and message do not appear for that file in `graphty-monorepo` | Warning, "possibly introduced by this push" |

The last row covers what the line rule cannot see. The main case is cognitive complexity
(S3776) when a branch is added deep inside an existing function: the score in the message goes
up without the reported line being touched. It stays a warning permanently. The baseline runs
30 minutes to 3 hours behind master (section 2), so a change that just landed on master would be
blamed on this push; that error cannot be designed out, so it never blocks.

Hotspots block from the first day, because the gate looks only at changed lines: a new hotspot
costs its author one review, not the backlog.

Coverage and duplication are not gate conditions locally:

- **Coverage:** the gate cannot afford to run the coverage suites, so any local coverage
  figure is stale or absent, and "Sonar way" would fail every change of 20 lines or more on a 0%
  reading. Coverage stays with the 80% / 75% thresholds the packages' Vitest configs enforce, and
  with CI's coverage job. `graphty-monorepo` imports CI's real coverage (section 2), so the
  dashboard shows it.
- **Duplication:** copy-paste detection within a handful of scanned files compares them only
  with each other, so the figure means nothing. Master's analysis measures it.

### Time budget

The scan costs about 48 s for an 8-file change; most of it is fixed startup cost. The last 60
merged branches changed a median of 4 analyzable files (90th percentile 23), so a typical push
pays 45-60 s.

The step costs the gate almost no wall-clock time, because it runs **in the background**. It
starts right after "Lint", not before it: Lint runs with `--skip-nx-cache`, so it rebuilds the
packages it depends on, and each build deletes its `dist/` first. A scan started earlier walked
into a folder that vanished mid-walk and died with `NoSuchFileException`. No step after Lint
rewrites a `dist/`. It writes to a log file, and `tools/prepush.sh` waits
for it and prints its log just before the summary, after the tests (several minutes). So the scan
finishes while the tests run.

Guards:

- **One deadline for the whole step: 900 s**, counted from the step's start and covering the wait
  for the lock, the scan, the server's processing queue and the reads. Past it, the step stops
  its scanner and passes with the boxed warning ("SonarQube did NOT check this push: deadline").
  The likely cause is the server's queue: the Community Build processes one analysis at a time,
  so a local scan can wait behind the baseline job's full master scan.
- **One scan at a time per machine.** Two worktrees pushing at once would overwrite each other's
  scan in `graphty-monorepo-local`, and one would read the other's results. The step holds
  `flock -w <seconds left before the deadline>` on `sonar-local.lock` in the git common directory
  from the scan to the read. A second push waits about a minute. A push from another machine at
  the same moment is not guarded; the owner works from one machine, so this is accepted.
- **No orphans.** `tools/prepush.sh` starts the step in its own process group (`setsid`) and
  installs `trap 'kill -- -$SONAR_PGID' EXIT`, so when the push ends early (a failed step, a
  Ctrl-C, an agent's tool timeout killing `prepush.sh`) the scanner and its JRE die with it and
  release the lock.

There is no full-scan mode in the gate. A full scan is about 4 minutes, adds nothing to what
the changed lines show, and is the baseline job's work.

### When the gate cannot run

The rule: **the gate fails open only when the server cannot be reached.** If the server answers,
every other problem is a misconfiguration and blocks the push, with the cause and the fix. A
silent pass on a broken setup would skip SonarQube on every push from that worktree, and nobody
would notice until the weekly review.

| Situation                                                                                                                         | Behavior                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Server unreachable: `api/system/status` does not answer UP within 3 s                                                             | Passes, with the boxed warning; no token is sent                                                 |
| Something answers, but its server id is not the pinned one (section "Configuration and secrets")                                  | Passes, with the boxed warning ("not the owner's server"); no token is sent                      |
| No `SONAR_HOST_URL` in the environment or in `.env` (a clone without the owner's `.env`)                                          | Passes, with the boxed warning; no token is sent                                                 |
| The step's 900 s deadline passes                                                                                                  | Passes, with the boxed warning                                                                   |
| No pinned server id (`--setup` never ran on this machine)                                                                         | Blocks, saying to run `tools/sonar-baseline.mjs --setup` once                                    |
| No `SONAR_SCAN_TOKEN` in the environment or in `.env`                                                                                  | Blocks, saying where to set it                                                                   |
| The token is rejected (401), or belongs to an administrator (`api/users/current`)                                                 | Blocks, saying how to create the `graphty-scan` token                                            |
| No Java at `SONAR_SCANNER_JAVA_EXE_PATH` or on `PATH`, scanner missing, scanner or server error, `graphty-monorepo-local` missing | Blocks, naming the cause and the fix (for the last: run `tools/sonar-baseline.mjs --setup` once) |
| Findings that block (section "What blocks")                                                                                       | Blocks                                                                                           |

**Fail-open on an unreachable server, and why.** The owner is sometimes off the network, and
SonarQube has no other place to run: it is not in CI. Failing closed there would make every
off-network push impossible, and the only way through would be `git push --no-verify`, which also
skips Git LFS, the secret scan, the build, lint and the tests. Nothing is lost:

- The gate judges the whole branch against its merge base, not the commits since the last push.
  The next push from the network re-checks everything a skipped push carried.
- A branch that merges before it is pushed again from the network lands on master, where the
  baseline job's next scan shows its issues as new code. The weekly review (section 3) lists
  them.

The warning is loud on purpose: a box in yellow, printed both when the step starts and again in
the final summary, saying "SonarQube did NOT check this push" and why.

**Every run is logged.** The step appends one line per run to `<git common dir>/sonar/gate.log`:
time, branch, HEAD, and the outcome (`passed`, `blocked`, `bypassed`, `skipped:<reason>`, plus
the count of files left out for uncommitted changes). The weekly comment reports the skip rate
from it, so a gate that has quietly stopped running shows up within a week.

### Configuration and secrets

**Where the values come from.** The gate and the baseline job read `SONAR_HOST_URL`,
`SONAR_PROJECT_KEY` and `SONAR_SCAN_TOKEN` (the scan token; `SONAR_TOKEN`, an admin token, only for `--setup`) from the environment first, then from the repository's
`.env`. They never source `.env`: they read those three keys (and `SONAR_SCANNER_JAVA_EXE_PATH`,
which is not a secret) line by line and ignore everything
else, so nothing else in the file (the Chromatic tokens and the rest) is run or exported. `.env`
is gitignored and symlinked into every worktree. Git hooks run without `~/.bashrc`, so `.env` is
the dependable place for the token; a token exported from `~/.bashrc` also reaches every process
the owner's shell starts, which this design cannot prevent. The local key is
`${SONAR_PROJECT_KEY}-local`.

**Where the token goes.** Only two places: the scanner's own process (`env` of that one child)
and the `Authorization` header that `tools/sonar/api.mjs` builds for each Web API call. Every
Web API call in the gate and in the baseline job goes through that one helper, so no `curl` ever
carries the token on a command line. `tools/prepush.sh` never reads or exports it. Every other
child process (git, pnpm, the build, `gh`) is started with both tokens removed from its
environment. The token is never an argument (arguments show in `ps`), never logged, and never
passed to servherd in `env` or `command` (servherd stores both and shows them in
`servherd_info`); the baseline loop reads it itself. The scanner never runs with `-X`,
`--debug` or `sonar.verbose`, because a debug log can print environment values. A test runs a
scan with a fake token and checks that it appears in none of the log, the scanner's working
directory, or `ps` output taken during the scan.

**A non-admin token is required.** The token in the environment today is the `admin` user's,
which can also create projects and change server settings. Before the gate is switched on, the
owner creates a dedicated user, `graphty-scan`, with "Browse" and "Execute Analysis" on the two
projects, and puts its token in `.env`. The gate refuses an administrator's token (see the table
above). `--setup`, which creates projects and restores the profile, is the only thing that takes
the admin token, from the owner's own shell, once.

**The server is not authenticated yet.** The server's host name resolves in public DNS to a
private address, and the server speaks plain `http`. Off the owner's network, any device that
holds that address and port on some other network could answer the reachability check, and
anyone on the owner's network can read the token in transit. Two measures:

- **Now: pin the server's id.** `--setup` records the id from `api/system/status` in
  `<git common dir>/sonar/server-id`. The gate compares the id before sending any token, and
  treats a mismatch as "unreachable" (passes with the warning, sends nothing). This stops an
  accidental device on another network from receiving the token. It does not stop a deliberate
  attacker, because the status endpoint is public and its answer can be copied.
- **The real fix: TLS.** A reverse proxy with a certificate in front of the server (the host
  name is in public DNS, so a DNS-challenge certificate works), and `SONAR_HOST_URL` switched to
  `https`. This is an owner action on the server, outside this repository. It is a stage 0 item
  (section 3), and issue #38 is not done until it lands.

**What the scanner downloads.** On first run the scanner downloads its engine, the analyzers and
SonarJS's Node.js runtime from the server, and would download a JRE too. The gate sets
`sonar.scanner.skipJreProvisioning=true` and requires `SONAR_SCANNER_JAVA_EXE_PATH` (the owner's
JRE 21 is at `~/.local/share/java/jdk-21.0.10+7-jre/bin/java`), so no Java comes from the server.
The engine and analyzers still do, cached in `~/.sonar/cache` and fetched again only when the
server's copy changes; over plain `http` that is code a spoofed server could hand over, which is
one more reason TLS is required.

**First run.**

- `tools/sonar-baseline.mjs --setup` (run once by the owner, with the admin token, on the
  owner's network) is idempotent. It creates both projects if they are missing, restores the
  "Graphty way" profile from the repository and assigns it to both, creates the "Graphty" quality
  gate and assigns it to both, sets `graphty-monorepo`'s new-code period to 30 days, and records
  the server id.
- The scanner is `@sonar/scan` 5.0.1, pinned as a root devDependency, so every worktree has it
  after `pnpm install`.

### Pushing past a false positive

Three ways, each written down where a reviewer sees it, in order of preference:

1. **One line: `// NOSONAR(<rule>): <reason>`.** SonarQube honors any comment containing
   `NOSONAR` and suppresses every issue on that line. The gate checks the format itself: a
   `NOSONAR` on a changed line without a rule key and a reason of at least 10 characters
   (`NOSONAR\((S\d+)\): .{10,}`) blocks the push. The gate also skips a hotspot on a line with a
   well-formed `NOSONAR` naming that hotspot's rule, whether or not the server honored the
   comment. The suppression is in the code, in the PR diff, and greppable
   (`git grep -n NOSONAR`).

    The limit: SonarQube ignores the rule key, so a `NOSONAR` also hides any other issue on that
    line, including a vulnerability, and neither the gate nor the server can show what it hid. So
    a `NOSONAR` naming a vulnerability rule blocks the push; a vulnerability false positive goes
    into a per-rule path entry (way 2). Every new `NOSONAR` is listed in the weekly review.

2. **A path pattern: an entry in `sonar.issue.ignore.multicriteria`** in
   `sonar-project.properties`, with a comment above it giving the reason. This is for a rule
   that is wrong for a whole file or area, such as `Math.random` (S2245) in a layout's seeded
   random number generator. Entries name exact files or narrow globs, never a whole package, so
   a new use elsewhere is still reported. It is checked in, reviewed in the PR, and applied to
   both projects alike.
3. **Whole push: a `Sonar-Bypass: <reason>` trailer on the HEAD commit.** Only HEAD counts, so
   an old bypass does not cover later pushes of new code on the branch; a pusher who needs it
   again adds it again. The gate still scans and prints every finding, then passes with a warning
   naming the commit, except that vulnerabilities and hotspots on changed lines still block. When
   the scan could not run at all (a server defect), the trailer lets the push through. It exists
   for a server defect or an emergency, not for a finding nobody wants to fix. The trailer is
   permanent in history, so every use can be counted:
   `git log --grep '^Sonar-Bypass:' origin/master`.

False positives are NOT marked on the server for issues. A status set on an issue in
`graphty-monorepo` never reaches `graphty-monorepo-local`, which is rebuilt on every push, and
the reason would sit where no PR reviewer sees it. Hotspots are the exception: a hotspot reviewed
as SAFE on `graphty-monorepo` is honored by the gate through the matching above, because the
review is what the security review rating counts.

The weekly review (section 3) counts all of them: new `NOSONAR` comments, new multicriteria
entries, new `Sonar-Bypass` trailers, and the gate's skips. A rising count means a rule or the
gate needs fixing, not more bypasses.

### Changes to `tools/prepush.sh` and the repository

- `sonar-project.properties`: sources and tests (`sonar.sources=.`, `sonar.tests=.`, the test
  inclusions from the research), the exclusions from the research plus
  `algorithms/benchmark-results/**`, `sonar.cpd.exclusions=graph-samples/src/datasets/**`, the
  multicriteria ignores, `sonar.scanner.skipJreProvisioning=true`, and
  `sonar.javascript.lcov.reportPaths=coverage/lcov.info` (used only by the baseline job; the gate
  passes no report).
- `tools/sonar/api.mjs`: reads the three settings, builds the `Authorization` header, makes every
  Web API call, and starts the scanner with the token in that child's environment only. Used by
  both scripts below.
- `tools/sonar-gate.mjs`: the gate (the steps above, the master matching, the `NOSONAR` format
  check, the trailer check, the reachability and identity check, the deadline, the run log).
  Node, because it parses JSON and diff hunks.
- `tools/sonar-baseline.mjs`: the baseline job and `--setup`. Node too, so it shares the helper
  and no shell script ever handles the token.
- `tools/sonar/graphty-way.xml`: the quality profile, with each deactivated rule's reason as an
  XML comment. Not SonarQube's own backup format, which flattens inheritance: it names the parent
  ("Sonar way") and the rules to deactivate for each language, and `--setup` and the baseline job
  make the server's profile match it (creating it, setting the parent, deactivating the listed
  rules and reactivating any other). The baseline job restores it when it changes.
- `tools/prepush.sh`: start `tools/sonar-gate.mjs` in the background (its own process group,
  killed by an `EXIT` trap) after "Lint", join it before the summary
  under its own flag (`SONAR_FAILED`), as the file's own rule about per-step flags requires. When
  no package is affected, the early exit runs the step in the foreground first, so a push that
  touches only `tools/` is still checked.
- `.husky/pre-push`: its header comment lists the new step and the bypass trailer.
- `.gitignore`: `.scannerwork/`, in the gate's own commit, for scans run by hand (the gate and the
  baseline job write outside the worktree).

## 2. Keeping master's analysis current

**Chosen: a polling loop run by servherd on the owner's machine,** `tools/sonar-baseline.mjs
--watch`, started once as `servherd_start({ name: "sonar-baseline", cwd: "<repo>", command:
"node tools/sonar-baseline.mjs --watch" })`, with no token in `env` or `command`.

Every 30 minutes it fetches `origin`. If `origin/master` is a commit `graphty-monorepo` has not
analyzed yet (the server's last analysis revision, from `api/project_analyses/search`), it:

1. moves its own detached worktree, `.worktrees/sonar-baseline`, to `origin/master` (never the
   main checkout);
2. runs `pnpm install --frozen-lockfile` and the nx build (cached), so type-aware rules resolve
   cross-package types the same way the gate's scans do, with both tokens removed from their
   environment;
3. downloads that commit's `coverage-*` artifacts from the CI run of the master push for that
   commit (`gh run list --workflow ci.yml --branch master --event push --commit <sha>`, then `gh
run download <run id>`; never a pull request run with the same head commit) and merges them
   with `tools/merge-coverage.sh --ci --artifacts`, which writes the repository-relative
   `coverage/lcov.info` the scanner imports. If CI has not finished yet, it waits for the next
   poll; after 3 hours it scans without coverage and says so in the log;
4. restores `tools/sonar/graphty-way.xml` to the server if the file changed since the last run;
5. takes `sonar-local.lock` with `flock -n`, and skips this poll if a push holds it; then runs a
   full scan into `graphty-monorepo` under `timeout 1800`, with `sonar.projectVersion` set to the
   root `package.json` version, `sonar.scm.revision` set to the commit, and
   `sonar.working.directory` under the git common directory;
6. once a week (the first run of each ISO week), posts the numbers to the burn-down tracking
   issue (section 3).

It runs one scan at a time, and a burst of merges costs one scan of the newest master, not one
per merge. Off the network, it logs a line and tries again at the next poll.

Why this and not the alternatives:

- **No CI.** GitHub Actions cannot reach the server.
- **No cron or systemd timer.** This machine has neither: `crontab` is not installed, and
  systemd is not PID 1.
- **Not a post-merge hook.** It fires only when someone runs `git merge` or `git pull` in a
  checkout. Merges happen on GitHub, and the main checkout rarely pulls master, so the baseline
  would go stale silently. It would also add a 4-minute scan to an ordinary pull.
- **Not the pre-push.** A push carries the branch, not master. Scanning master there would mean
  a second 4-minute scan per push, of code the pusher did not write.
- **servherd** already supervises every long-running process on this machine. `servherd_list`
  shows the loop, `servherd_logs` shows its scans, starting it again restarts it instead of
  adding a copy, and it is not a process nobody knows about. It assigns a port the loop does not
  use, which costs nothing.

The gate does not depend on this job (section 1). A stale baseline makes the gate stricter (fewer
findings match master), and affects the dashboard, the "possibly introduced" warnings and the
weekly numbers.

## 3. Burning down the backlog

### Where it starts

From backlog.md, a full scan of master at `f3786c38a` without test files:

- 3,477 open issues: 0 vulnerabilities, 383 reliability, 3,382 maintainability, 4 blockers
- 99 security hotspots, none reviewed
- duplication 5.0%
- ratings: security A, reliability D, maintainability A, security review E

A scan that also analyzes test files (the gate's configuration) found 9,684 issues, 5,977 of
them from one rule (S2699, below). The first baseline scan with the final configuration resets
the starting line. Expect about 3,600 issues once S2699, S4782, S7735 and S4138 are off, but the
real number is whatever that scan says.

### Rule-by-rule triage

Every rule with open issues gets exactly one of these decisions, recorded in the "Rule
decisions" table below:

| Decision       | When                                                              | Where it is recorded                                                                                      |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fix            | The rule finds something worth changing in this codebase          | Issues filed and fixed                                                                                    |
| False positive | The rule is right in general but wrong on specific lines or paths | `NOSONAR(<rule>): <reason>` in code, or a multicriteria entry with a reason in `sonar-project.properties` |
| Deactivate     | The rule does not fit this codebase at all                        | `tools/sonar/graphty-way.xml` with the reason as a comment, and the table below                           |

A rule whose decision is still open is deactivated until it has one, so a rule nobody has
agreed to never blocks a push. It is switched on in the PR that records "Fix" or "False
positive".

"Graphty way" is a quality profile that inherits from "Sonar way", so new rules SonarQube adds to
"Sonar way" in later releases reach it automatically. The profile lives in the repository and the
baseline job restores it to the server, so a rule change is reviewed in a PR like any other.

### Rule decisions

The decisions known at the start. Each later decision is a new row in this table, in the PR that
changes the profile.

| Rule                                                                 |              Issues | Decision                                        | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------: | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| typescript:S2699 (test has no assertion)                             |               5,977 | Deactivate                                      | The tests assert through Vitest's chai-style `assert.*` and through helpers the rule does not follow. The sampled tests all assert.                                                                                                                                                                                                                                                                                                                                                                                                |
| typescript:S4782 (`?` with `\| undefined`)                           |                 624 | Deactivate                                      | graph-format, graph-io, webgpu-graph-algorithms and graphty-element typecheck their published types under `exactOptionalPropertyTypes` (`tsconfig.strict-consumer.json`). There, `prop?: T \| undefined` and `prop?: T` differ, and the `\| undefined` is deliberate. "Fixing" it breaks strict consumers who pass `undefined`.                                                                                                                                                                                                    |
| S2245 (`Math.random`)                                                |         22 hotspots | False positive for exact files; review the rest | Path entries only for the seeded random number generators and test-data generators where randomness is the point: `layout/src/simulation/seed.ts`, `layout/src/utils/random.ts`, `webgpu-graph-algorithms/src/layouts/seed.ts`, `graphty-element/src/simple/defineLayout.ts`, `algorithms/benchmarks/**`. Uses that make an id (`graphty-element/src/session/runs/RunsApi.ts`, `graphty-element/src/meshes/RichTextLabel.ts`, `remote-logger/src/client/RemoteLogClient.ts`) and any other use are reviewed one by one in stage 1. |
| S4036 (command found through `PATH`) in `tools/`, package `scripts/` |         32 hotspots | False positive (path)                           | Developer tooling that runs `git`, `pnpm` and `node` from the developer's own `PATH`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| javascript:S7735, typescript:S7735 (negated condition with `else`)   |                  71 | Deactivated until decided in stage 3            | Taste. Stays off unless a sample shows readability gains.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| typescript:S4138 (`for...of` over an index loop)                     |                  34 | Deactivated until decided in stage 3            | Index loops over typed arrays are deliberate in the hot paths. Likely a path-scoped false positive for `graph-format`, `algorithms` and `webgpu-graph-algorithms`.                                                                                                                                                                                                                                                                                                                                                                 |
| typescript:S3776 (cognitive complexity)                              |         411 + 47 js | Fix, threshold stays 15                         | No package-wide exemption. Complex kernels that cannot be split take a `NOSONAR(S3776)` with the reason. The gate blocks only a rising score (section 1).                                                                                                                                                                                                                                                                                                                                                                          |
| S5852 (regex with super-linear backtracking) in graph-io's importers | part of 26 hotspots | Fix now, outside the stages                     | graph-io is published and parses user files, so a crafted file can hang an importer. Filed at stage 0 as a `bug` with `priority:high`, fixed in graph-io's next release.                                                                                                                                                                                                                                                                                                                                                           |

### Stages

The stages run in order, but each is broken into small PRs, one rule (or one rule in one
package), that ship alongside feature work and never block it: the gate judges only the lines a
PR adds or changes and lets through what master already has, so a feature branch never needs a
backlog fix to push.

| Stage                                                  | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Done when                                                                                                                          | Ratchet when done                                                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Setup (first week)                                  | The owner creates the `graphty-scan` user and token and puts it in `.env`, then runs `--setup`. Land the gate, `sonar-project.properties`, the "Graphty way" profile with S2699, S4782, S7735 and S4138 off, the exclusions and the S2245 / S4036 path entries. Start the baseline loop. Delete the probe projects. File the S5852 graph-io bug. Record the starting numbers on the tracking issue. The owner puts TLS in front of the server.                         | The gate runs on every push with the non-admin token; master has a fresh analysis with CI coverage; the server answers on `https`. | Gate: new issues and new hotspots on changed lines block.                                                                                |
| 1. Security (deadline: two weeks after the gate lands) | Review every hotspot left on `graphty-monorepo` by hand and set its status on the server. Fix the S5852 regexes (if the graph-io bug has not already). Add integrity hashes for the 3 CDN scripts (S5725). Check the S2068 "password".                                                                                                                                                                                                                                 | 0 hotspots to review; security review rating A.                                                                                    | Server gate: security review rating A.                                                                                                   |
| 2. Reliability                                         | The 4 blockers (S3516). Then the 34 S2871 sorts, each read by hand: a numeric sort without a comparator is a real bug. Then S4335, S7767, S7059, S7739 (the rest of the 63 high). Then the medium and low reliability issues, rule by rule.                                                                                                                                                                                                                            | Reliability rating A (no open reliability issue).                                                                                  | Server gate: reliability rating C as soon as the high ones are gone, then A.                                                             |
| 3. Mechanical maintainability                          | The rules a codemod or ESLint autofix can change with no change in behavior, one rule per PR, largest first: S1444, S7748, S6353, S6582, S7764, S7763, S7755, S7772, S7781, S7778, S1940 (about 1,100 after S4782 is off). Then the behavior-sensitive ones with the tests running: S2933, S7758, S6759, S7773. Decide S7735 and S4138, and switch them on if the decision is not "Deactivate".                                                                        | Every rule in this list has 0 open issues or a decision in the table.                                                              | Server gate: maintainability rating A held; duplication on new code at most 3%.                                                          |
| 4. Judgment                                            | Cognitive complexity (S3776, 458), S107 (more than 7 parameters), S3358 (nested ternaries), S4624 (nested templates), S2310 (loop counter reassigned). The duplicated `stories/utils/graph-generators.ts` in algorithms and layout. These need a person to read the code, so they are fixed mostly when someone is already changing the function ("touch it, fix it"), plus a few chosen hotspots per week, starting with the files with the most effort (backlog.md). | The open-issue count holds at or below 300 for four weekly reviews.                                                                | Server gate: the "AI Hardened" conditions (all ratings A, all hotspots reviewed, duplication at most 3%, coverage at least 80% overall). |

A burn-down PR is judged by the same gate. A codemod touches many lines, but the issues already
on them match master and do not block; only what the codemod itself introduces does. Keep such
PRs to one package at a time when they get large.

### Ownership, budget and tracking

- **Owner:** the repository owner is the single owner of every stage. A session that works on a
  package picks up that package's open burn-down issues first.
- **Package order** within each stage follows the size of the backlog: graphty-element (1,208
  issues, 156 h), graph-io (597, 75 h), algorithms, webgpu-graph-algorithms, graph-format,
  graphty, graph-samples, layout, visual-review, remote-logger, compact-mantine, tools.
- **Weekly budget:** about half a day a week, as one or two burn-down PRs, more in stage 1 to meet
  its two-week deadline. Feature work never waits on it. SonarQube's estimate for the whole
  backlog is 383 h, but that counts mechanical rules at their per-issue estimate; a codemod clears
  hundreds in an hour. At this budget, stages 1-3 take roughly two months, and stage 4 runs on for
  as long as the code keeps changing.
- **Issues:** one GitHub issue per stage per package, created at the start of the stage with
  the label `sonarqube` plus the repository's usual type, `priority:*` and `effort:*` labels.
  Stage 1 and 2 issues are `priority:high` (a real bug or exposure may be in them), and stage 3
  and 4 are `priority:low`. Each issue lists its rules and counts, and closes when the package
  meets the stage's exit condition.
- **One tracking issue,** "SonarQube burn-down", pinned. Once a week the baseline job comments
  the week's numbers: open issues by quality and severity, hotspots to review, ratings,
  duplication, coverage, and the gate's runs and skips from its run log. It also lists issues that
  are new on master this week (gate escapes from fail-open pushes or from `--no-verify`), new
  `NOSONAR` comments, new multicriteria entries and `Sonar-Bypass` trailers. The comments and the
  issues say "the owner's local SonarQube server", never its host name or port, because the
  repository is public. The trend is the server's own project activity graph for
  `graphty-monorepo`, which records every baseline scan. No separate dashboard is built.
- **Weekly review:** read that comment. Issues new on master get fixed or triaged that week.
  A rule that keeps attracting `NOSONAR` gets a decision in the table. A skip rate above a few
  percent from on-network pushes means a setup problem to fix.

### Exit criteria

The burn-down is finished when, for four weekly reviews in a row:

- `graphty-monorepo` passes the "AI Hardened" gate conditions, and the server gate holds them;
- every rule with open issues has a decision in the table;
- no `Sonar-Bypass` trailer landed, and no issue appeared new on master without being dealt
  with that week.

After that, the weekly comment and review continue and the stages are closed. The "possibly
introduced" check stays a warning (section 1).

## 4. Issue #38: new text

Title: **Set up SonarQube as a local pre-push quality gate (no CI/CD analysis)**

Labels: drop `needs-decision` and `blocked`; keep `infrastructure`, `priority:medium` and
`effort:high`.

> ## Task
>
> Run SonarQube on every push as part of the local pre-push gate (`tools/prepush.sh`), keep an
> analysis of master on the server for the dashboard, and burn the existing backlog down
> without blocking feature work. Design: `design/sonarqube/design.md`.
>
> ## Why there is no CI/CD analysis
>
> The SonarQube server is the owner's local SonarQube Community Build. It is reachable only from
> the owner's network, so GitHub Actions cannot send it a scan or read its quality gate.
> SonarQube is therefore not a CI step and not a required check on pull requests. CI's own
> coverage job and Coveralls are unchanged.
>
> ## What runs instead
>
> - **Pre-push:** `tools/prepush.sh` scans only the files the push changed, into a scratch
>   project (`graphty-monorepo-local`), and fails the push when SonarQube reports a new issue or
>   security hotspot on a line the push added or changed. Issues master already has never block,
>   even on a line the push touched. The scan takes about a minute and runs in the background
>   while the tests run.
> - **Off the network:** the step passes with a loud warning, and the next push from the network
>   re-checks the whole branch. Any other problem (no token, a rejected token, no Java) fails the
>   push with the fix.
> - **False positives:** `// NOSONAR(<rule>): <reason>` on the line, a reasoned path entry in
>   `sonar-project.properties`, or, for emergencies only, a `Sonar-Bypass: <reason>` trailer on
>   the pushed commit. All three are visible in the PR and counted weekly.
> - **Master's analysis:** a loop run by servherd on the owner's machine scans `origin/master`
>   after each merge, with the coverage from that commit's CI run, into `graphty-monorepo`.
> - **The backlog** (about 3,500 issues and 99 unreviewed security hotspots on 2026-10-02) is
>   burned down in stages: security hotspots (within two weeks), reliability bugs, mechanical
>   rules, then complexity. Tracked by one pinned issue, "SonarQube burn-down", and per-package
>   issues labeled `sonarqube`.
>
> ## What would make CI possible later
>
> - **SonarQube Cloud:** free for public repositories, reachable from Actions, and it has branch
>   and pull request analysis, so the gate could be a required check with decoration on the PR.
>   The project and profile would move there.
> - **Exposing the server:** a reverse proxy with TLS, or a tunnel (for example Cloudflare
>   Tunnel or Tailscale Funnel), so Actions can reach it. The Community Build still has no
>   branch or pull request analysis, so CI could only scan master after a merge, or use the same
>   changed-lines check as the pre-push.
> - **A self-hosted runner on the owner's network:** it could reach the server, but it runs
>   untrusted pull request code inside that network, so it is not recommended for a public
>   repository.
>
> ## Done when
>
> - [ ] a non-admin `graphty-scan` token is in `.env` (the gate refuses an admin token)
> - [ ] `sonar-project.properties`, `tools/sonar-gate.mjs`, `tools/sonar-baseline.mjs`,
>       `tools/sonar/api.mjs` and the "Graphty way" profile are merged, and `tools/prepush.sh`
>       runs the step
> - [ ] the baseline loop runs under servherd, and `graphty-monorepo` shows a current analysis
>       with CI coverage
> - [ ] the server answers over TLS and the scripts use its `https` address
> - [ ] the graph-io regex denial-of-service bug (S5852) is filed with `priority:high`
> - [ ] the "SonarQube burn-down" tracking issue is open and pinned, with the starting numbers

## Review changes

- The gate fails open only when the server cannot be reached, is not the pinned server, or the
  900 s deadline passes. A missing or rejected token, an admin token, missing Java or a scanner
  error now block. `SONAR_REQUIRED` is gone. Every run is logged, and the weekly comment reports
  the skip rate.
- A finding on a changed line that master already has (same rule and line hash, following
  renames) no longer blocks. S3776 and S107 block only when the score rises. A missing baseline
  falls back to blocking everything on changed lines.
- Hotspots block from stage 0. A hotspot master has (to review or SAFE) or one on a line with a
  `NOSONAR` naming its rule is skipped.
- The step runs under one 900 s deadline, including the lock wait, in its own process group
  killed by an `EXIT` trap. The baseline job skips a poll rather than make a push wait.
- S7735 and S4138 are off until decided; any undecided rule is off.
- `Sonar-Bypass` counts only on HEAD, and never covers vulnerabilities or hotspots once the scan
  ran.
- Changed lines come from `git diff <base> HEAD`; files with uncommitted changes are left out with
  a warning.
- The scan starts after the webgpu-graph-algorithms bundle step, its working directory is under
  the git common directory, and `.gitignore` gets `.scannerwork/` in the gate's commit.
- The gate filters by extension only; the scanner applies the exclusions.
- The "possibly introduced" check stays a warning permanently.
- `.env` is parsed for the three `SONAR_*` keys, not sourced. The token goes only to the scanner
  and to one Node API helper; other children get an environment without it; it is never given to
  servherd; the scanner never runs in debug mode, and a test checks for leaks. The baseline job
  is Node, so no shell `curl` handles the token.
- Security: a non-admin token is required before the gate is switched on; the server id is
  pinned until TLS is in front of the server; the scanner uses the local JRE and never downloads
  one; `NOSONAR` naming a vulnerability rule blocks; the S5852 graph-io regexes are filed now as a
  `priority:high` bug; stage 1 has a two-week deadline; the S2245 path entries name exact files
  (the earlier `graph-samples/src/generators/` entry matched no `Math.random` use); CI artifacts
  come only from the master push run; neither this design nor the issue text names the host.
