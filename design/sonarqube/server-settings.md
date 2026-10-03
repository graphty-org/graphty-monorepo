# SonarQube server settings for graphty-monorepo

What is configured on the owner's SonarQube server (Community Build 26.3.0.120487; its address is
`SONAR_HOST_URL` in `.env`) for this repository, and how to reproduce it. Nothing here is set by
hand in the web UI: every setting below is applied by one idempotent command, so a rebuilt server,
or a server that drifted, is put back by running it again.

```bash
# The owner, on the owner's network, with an ADMINISTRATOR's token in the environment or .env:
node tools/sonar-baseline.mjs --setup
```

The pre-push gate (`tools/sonar-gate.mjs`) and the baseline loop (`tools/sonar-baseline.mjs
--watch`) change nothing on this list, with one exception: when `tools/sonar/graphty-way.xml`
changes on master, the baseline loop restores the profile (which needs a token allowed to
administer quality profiles; with the `graphty-scan` token it logs that `--setup` must be run).

Design: `design/sonarqube/design.md`.

## What `--setup` applies

Applied on 2026-10-02 and checked afterwards through the API (the "Check" column).

| Setting                                          | Value                                                                                                                                                                      | API calls                                                                                                                           | Check                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Project `graphty-monorepo`                       | Exists (it did already). Master's full analysis, written only by the baseline loop                                                                                         | `api/projects/search`, `api/projects/create` if missing                                                                             | `api/projects/search?projects=graphty-monorepo`             |
| Project `graphty-monorepo-local`                 | Created 2026-10-02, name "Graphty (pre-push scratch)". The gate's changed-files scans; every push overwrites it                                                            | same                                                                                                                                | `api/projects/search?projects=graphty-monorepo-local`       |
| Quality profile "Graphty way", TypeScript (`ts`) | Child of "Sonar way"; deactivates typescript:S2699, S4782, S7735, S4138 (391 of Sonar way's 395 rules active)                                                              | `api/qualityprofiles/create`, `change_parent`, `deactivate_rule`, `activate_rule` (to undo a deactivation the file no longer lists) | `api/qualityprofiles/search?language=ts`                    |
| Quality profile "Graphty way", JavaScript (`js`) | Child of "Sonar way"; deactivates javascript:S7735 (381 of 382 active)                                                                                                     | same                                                                                                                                | `api/qualityprofiles/search?language=js`                    |
| Profiles assigned                                | "Graphty way" (ts and js) on both projects; other languages keep the server default                                                                                        | `api/qualityprofiles/add_project`                                                                                                   | `api/qualityprofiles/search?project=graphty-monorepo-local` |
| Quality gate "Graphty"                           | Conditions: new issues (`new_violations`) greater than 0; security hotspots reviewed on new code (`new_security_hotspots_reviewed`) less than 100%                         | `api/qualitygates/create`, `create_condition`, `update_condition`, `delete_condition`                                               | `api/qualitygates/show?name=Graphty`                        |
| Gate assigned                                    | "Graphty" on both projects                                                                                                                                                 | `api/qualitygates/select`                                                                                                           | `api/qualitygates/get_by_project?project=graphty-monorepo`  |
| New-code period of `graphty-monorepo`            | 30 days (`NUMBER_OF_DAYS`, `30`). The server stores it on the project's only branch, `main`                                                                                | `api/new_code_periods/set`                                                                                                          | `api/new_code_periods/list?project=graphty-monorepo`        |
| Pinned server id                                 | The `id` from `api/system/status`, written to `<git common dir>/sonar/server-id` (a local file, not a server setting). The gate sends no token to a server with another id | `api/system/status`                                                                                                                 | `cat "$(git rev-parse --git-common-dir)/sonar/server-id"`   |

Where each value lives in the repository:

- the profile's deactivated rules, with the reason for each: `tools/sonar/graphty-way.xml`
- the gate's conditions: `GATE_CONDITIONS` in `tools/sonar-baseline.mjs`
- path-based false positives (S2245, S4036) and the exclusions: `sonar-project.properties`, which
  the scanner sends with every analysis (not a server setting)

The "Graphty" gate is not the pre-push verdict: the gate script decides from the diff
(`design/sonarqube/design.md`, section 1). The server's gate is what the dashboard shows for
master, and it is where each burn-down stage adds its ratchet (section 3, "Stages"): change
`GATE_CONDITIONS`, run `--setup`, and update the table above in the same pull request.

## Left for the owner

These need the owner's account or a server-wide change, which no script in this repository makes:

- **No separate scan user.** The gate uses the owner's own `SONAR_TOKEN`. A narrower scan-only
  token would limit what a leaked token can do, but the owner's admin token is already exported to
  every shell on this machine, so a second token would not reduce what an agent can reach. If the
  admin token ever moves out of the shell profile, create a user with "Browse" and "Execute
  Analysis" on `graphty-monorepo` and `graphty-monorepo-local` and put its token in `.env` as
  `SONAR_SCAN_TOKEN`; scans use it instead.
- **Delete the probe project** `graphty-monorepo-baseline-probe`, left from the backlog
  measurement (`backlog.md`).
- **TLS in front of the server**, then switch `SONAR_HOST_URL` to `https`.
- **Start the baseline loop** under servherd (see `tools/sonar-baseline.mjs`), with no token in
  its `env` or `command`.
