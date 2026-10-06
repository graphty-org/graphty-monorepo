# SonarQube for the pre-push gate: what the server can do, and what a scan costs

Research for running SonarQube as a local pre-push gate on graphty-monorepo. Measured on
2026-10-02 against the owner's server and the `feat/sonarqube-prepush` worktree (master at
f3786c38a).

## The server

- SonarQube Community Build 26.3.0.120487 (its address is `SONAR_HOST_URL` in `.env`), reachable only from the
  owner's network. GitHub Actions cannot reach it, so SonarQube cannot be a CI step.
- Project `graphty-monorepo` ("Graphty") exists. It has exactly one branch, `main`, last analyzed
  2026-09-20 (revision 5ba15bb7), project version 1.0.0. Quality gate: the default "Sonar way".
  New-code definition: "previous version", inherited from the server default.
- "Sonar way" fails on any of: `new_violations > 0`, `new_coverage < 80`,
  `new_duplicated_lines_density > 3`, `new_security_hotspots_reviewed < 100`. The server ignores
  the coverage and duplication conditions when the new code is small (under 20 lines): the
  probe below reported `"ignoredConditions": true` for a 7-line change.
- "AI Hardened" adds overall (not new-code) conditions: security and reliability rating A,
  all hotspots reviewed, duplication <= 3%, coverage >= 80%. The tree fails every one of those
  today, so that gate cannot be used until the backlog is gone.
- Analyzers installed include JavaScript/TypeScript (SonarJS 11.8), web (HTML), CSS (inside
  SonarJS), Python, XML, IaC, text and secrets. There is no WGSL analyzer; `.wgsl` files are
  simply not indexed.
- The token in `SONAR_TOKEN` is a user token of `admin`, so it can create and delete projects.
  A pre-push gate needs only a project analysis token; a narrower token is worth creating for it.

## What the Community Build can and cannot do for a pre-push gate

**No branch or pull request analysis.** Branch analysis starts in the Developer Edition; the
Community Build analyzes one branch per project, and `sonar.branch.name` is not supported. Every analysis
sent to a project key replaces that project's single picture of the code.
([Sonar Community: sonar.branch on Community](https://community.sonarsource.com/t/sonar-branch-usage-on-community-edition/16131),
[editions comparison](https://www.sonarsource.com/blog/sonarqube-compare-editions/),
[branch analysis, Server 10.8](https://docs.sonarsource.com/sonarqube-server/10.8/analyzing-source-code/branch-analysis/introduction))

**New-code definitions**
([about new code](https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code),
[configuring new code](https://docs.sonarsource.com/sonarqube-community-build/project-administration/adjusting-analysis/configuring-new-code-calculation)):

| Definition        | Meaning                                                             | Without branches                                                                                           |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Previous version  | Code changed since the most recent change of `sonar.projectVersion` | Works. The period starts at the first analysis carrying the current version.                               |
| Number of days    | Code changed in the last N days (default 30, max 90)                | Works, but counts everyone's recent commits, not only this push's.                                         |
| Reference branch  | Code that differs from a named branch                               | Useless: the only branch is the project's own main branch, so it compares with itself.                     |
| Specific analysis | Code changed since a chosen analysis                                | Settable only through the Web API (`api/new_code_periods/set`). Works, but someone must move the baseline. |

A line counts as new code when its SCM (git blame) date is after the period start. Uncommitted
lines count as changed now. Issues found on a file for the first time are backdated to the
line's commit date, so an old line in a file that enters the analysis is old code, not new.
([issue backdating](https://docs.sonarsource.com/sonarqube-server/2025.6/user-guide/issues/solution-overview))
Consequence: a commit made before the period started is old code, even if it was never pushed.

**`sonar.qualitygate.wait=true`** makes the scanner poll the server and exit non-zero when the
gate fails; `sonar.qualitygate.timeout` (default 300 s) bounds the wait. Verified: the probe
returned exit 1 on a failing gate.
([parameters not settable in the UI](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui))

**Scanning only changed files (`sonar.inclusions`) into the main key is destructive.** Measured:
a full scan gave the probe project 253,738 lines and 9,684 issues; a following scan with
`sonar.inclusions` set to one branch's 8 changed files left it with 6,486 lines and 89 issues.
Every file outside the list was treated as deleted and its issues closed. Issues therefore do
not "compare correctly" against a full baseline in the same project: a limited scan is only
meaningful in a project key of its own.

**A second project key is sound.** A key such as `graphty-monorepo-local` holds the analysis of
unpushed code and leaves `graphty-monorepo` (master's analysis) untouched. Each developer
machine overwrites it, so it is a scratch area, not a history. It doubles as the place where a
changed-files scan can land without harming master's picture.

**No incremental cache for this mode.** The scanner loads an analysis cache, but reported
"Miss the cache for 3010 out of 3010: ANALYSIS_MODE_INELIGIBLE": the cache only serves pull
request analysis, which the Community Build lacks. A repeated full scan costs the same as the
first.

## The scanner

- npm `@sonar/scan` 5.0.1 (binary `sonar-scanner-npm`), installed outside the workspace for the
  probe. It reads `sonar-project.properties`, `SONAR_TOKEN` and `SONAR_HOST_URL` from the
  environment, and `-Dkey=value` arguments.
  ([npm scanner configuration](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/npm/configuring))
- Java: with `SONAR_SCANNER_JAVA_EXE_PATH=~/.local/share/java/jdk-21.0.10+7-jre/bin/java`
  and `sonar.scanner.skipJreProvisioning=true` it uses the existing JRE 21 and downloads none.
  SonarJS downloads its own Node.js runtime once into `~/.sonar/js/node-runtime`.
- The scanner writes `.scannerwork/` at the repository root, which is not gitignored; either add
  it to `.gitignore` or set `sonar.working.directory` under a gitignored path.
- `.env` is a symlink outside the project, so the scanner ignores it (a warning, not an error).

### Configuration used for the probe

```
sonar.sources=.
sonar.tests=.
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx,**/*.test-d.ts,**/test/**,**/tests/**,**/stories/**,**/*.stories.ts,**/*.stories.tsx
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/storybook-static/**,visual-baselines/**,design/**,tmp/**,**/tmp/**,.claudehistory/**,**/*.d.ts,graph-samples/src/datasets/**,visual-review/trusted/vendor/**,docs/**
sonar.javascript.lcov.reportPaths=<merged lcov>
```

Gitignored files are skipped through git anyway; the explicit exclusions cover tracked
generated or vendored files: the graph-samples dataset modules (written by
`graph-samples/scripts/convert-datasets.mjs`), the vendored pixelmatch, and design documents.
`algorithms/benchmark-results/` (27 tracked JSON and HTML result files, 211 issues) should be
excluded too. Three JSONTestSuite fixtures in graph-io are deliberately invalid UTF-8 and only
produce warnings.

Languages found: TypeScript 210,928 lines, HTML 24,962, JavaScript 16,282, CSS 1,503, Python 63.

### Coverage

`sonar.javascript.lcov.reportPaths` takes a comma-separated list of LCOV files, absolute or
relative to the project root
([coverage parameters](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/test-coverage/test-coverage-parameters)).
Each package's Vitest LCOV (`<pkg>/coverage/lcov.info`) uses package-relative paths
(`SF:src/index.ts`), which are ambiguous at the repository root. `tools/merge-coverage.sh`
already rewrites them with the package prefix into `coverage/lcov.info`; that merged file
imports cleanly. With a 10-day-old merged report the probe reached 58.3% coverage, with 52
unresolved paths and 3,058 line inconsistencies, both from the report being older than the code.
A pre-push gate cannot afford to run coverage (the packages' coverage runs take far longer than
the gate's budget), so coverage in a local scan is either stale or absent. Without it,
`new_coverage` reads 0% and fails "Sonar way" on any change of 20 lines or more.

## Measurements

All on the worktree at f3786c38a, server on the LAN, into the scratch key
`graphty-monorepo-probe` (deleted afterwards).

| Scan                                      | Files                              | Wall clock | Where the time goes                                                                                  |
| ----------------------------------------- | ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| Full, first run                           | 3,072 sources+tests, 5,344 indexed | 251 s      | JS/TS analysis 126 s, language detection 82 s, SCM blame 7 s, upload and server processing the rest  |
| Full, second run (one new file)           | same                               | 222 s      | no cache reuse (see above)                                                                           |
| Changed files only (8 files from PR #689) | 8                                  | 48 s       | language detection 17 s, JS/TS analysis 17 s (mostly building the TypeScript program), fixed startup |

Typical branch size, from the last 60 first-parent merges on master: median 4 analyzable files
(`.ts .tsx .js .mjs .cjs .css .html`), 90th percentile 23, maximum 578. A changed-files scan is
dominated by fixed cost, so a typical push should land near 45-60 s; a full scan adds about
4 minutes to a gate that already takes about 16.

The new-code probe: with "previous version" and a fixed `sonar.projectVersion`, an uncommitted
7-line file with an empty block and a dead store produced `new_violations = 2`, the gate went
to ERROR, and the scanner exited 1. Coverage and duplication conditions were ignored for the
small change.

## The existing backlog

The full probe found 9,684 issues (270 bugs, 9,414 code smells, 0 vulnerabilities, 103
security hotspots; duplication 2.3%). The server's own 2026-09-20 analysis of master shows
2,992, measured with a narrower file set.

- `typescript:S2699` "Add at least one assertion to this test case" is 5,977 of them (62%) and
  all 5,998 blockers but 21. The flagged tests do assert, through Vitest's chai-style
  `assert.*`, and in many cases through helpers the rule does not follow. This rule is noise
  for this repository and is the first candidate to deactivate in a project quality profile.
- Next: `S4782` (optional property declared with `| undefined`, 621), `S3776` (cognitive
  complexity, 407), `S1444` (public static should be readonly, 214), `S2933` (readonly
  members, 196).
- By directory the backlog is concentrated in `graphty-element/test/`.

Because the gate looks at new code only, none of this blocks a push by itself; it matters for
any gate condition on overall metrics and for how noisy the issue list is.

## Options for the pre-push gate

1. **Full scan into `graphty-monorepo-local`, gate on new code.** About 4 minutes. New code is
   defined by a period, so the script must move the baseline (a `sonar.projectVersion` set to
   the merge base with `origin/master`, or a "specific analysis" set through the API) and accept
   that commits older than the period start are invisible.
2. **Changed-files scan into `graphty-monorepo-local`, gate computed by the script.** About
   45-60 s for a typical branch. Scan the files that differ from the merge base, then read
   `api/issues/search?componentKeys=graphty-monorepo-local&files=...` and fail when an issue
   sits on a line that `git diff -U0 <merge-base>` reports as added or changed. This needs no
   new-code period and no blame dates, so rebased or long-lived commits are judged the same as
   fresh ones. Coverage is left out of the local gate.
3. **Changed-files scan with `sonar.qualitygate.wait`.** Simplest wiring, but the "Sonar way"
   new-code verdict then depends on blame dates against the local key's period, and the
   coverage condition fails any change of 20 lines or more when no fresh coverage is imported.

`graphty-monorepo` itself should be refreshed by a full scan of master (by hand or on a
schedule on the owner's network), so its dashboard tracks the backlog over time.
