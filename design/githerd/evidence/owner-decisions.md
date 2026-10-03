# githerd: what the owner has decided

This lists every requirement, preference, constraint, decision and rejected idea that the owner
of graphty-org/graphty-monorepo has stated and that bears on githerd or on how the pipeline runs.
Each entry quotes the owner's own words, gives the date (UTC), and says what the words rule in
or out.

Sources:

- the owner's typed messages in Claude Code session edf07b88 (2026-09-19 to 2026-10-03, 448
  messages; extracted to `owner-messages.txt` beside this file);
- the standing rules in the auto-memory folder
  `~/.claude/projects/-home-apowers-Projects-graphty-monorepo/memory/`;
- the repository CLAUDE.md on branch feat/githerd;
- the owner's global CLAUDE.md.

Where a quote answers a proposal, the proposal is summarized first in one clause, because the
quote does not make sense without it.

---

## 1. What githerd is for

**The original problem (2026-10-02 15:21).** "I have a large number of pending issues, some of
which may be out dated or may need updating based on other changes. I also have pending PRs that
need shepherding through the process. Yesterday my master branch turned red and I didn't realize,
which stopped all my pending releases. I generally have a large pipeline of issues that I need to
manage efficiently. My entire workflow is driven by Claude Code and GitHub Actions. Claude opens,
implements, pushes, merges, etc."

githerd has to cover five jobs:

- find out-of-date issues and refresh them;
- shepherd PRs to merge;
- notice a red master;
- unblock releases;
- manage a large issue pipeline.

The trigger was a red master that nobody noticed. The memory note on watching master records the
owner's diagnosis: "the problem wasn't the security update, it was not recognizing that master
was failing and allowing PRs to back up."

**One command that does everything (2026-10-02 16:04).** "can we build a skill that i type once
(or run from cli) and have it do all the things?" The owner wants one entry point, not a set of
tools to remember.

**Re-triage the backlog now and then (2026-10-02 16:24).** "it should occasionally re-triage all
the github issues to see if they are still relevant, duplicates, etc." Rules in a periodic full
pass over the backlog for relevance and duplicates. "Occasionally" sets no exact period.

**The name (2026-10-02 16:24).** "the shepherd name is too generic, let's call it githerd
(similar to servherd)". It is named after servherd and is meant to feel like it.

**Order of work (2026-10-02 16:24).** "start by building a complete design and plan, then
implement it." Design first, then the plan, then the code.

**Anticipate failures; no more guessing (2026-10-03 04:56).** "you're just guessing and throwing
darts. take the context of this conversation and create an entirely new design for githerd.
look around corners and try to anticipate different kinds of errors and tasks and figure out how
to solve them."

This rules out:

- patching the previous design point by point;
- adding a mechanism each time the owner finds a hole.

The new design must list the failure classes up front and solve each one.

The same demand appears earlier:

- 2026-10-01 03:47: "what's a good process for finding all the errors and edge cases before they
  happen?"
- 2026-09-23 03:20: "step back and look at the big picture. what are the recurring themes of
  problems?"

---

## 2. Process model: how githerd runs

**No cron in the container (2026-10-02 16:04).** "this is a docker container without cron".
Nothing can be scheduled by cron.

**No GitHub Actions safety net (2026-10-02 16:06).** The proposal was a GitHub Actions workflow
that detects a red master and pages the owner. Owner: "can we do it without the github action?"
The answer accepted was "yes". The owner has not asked for the Actions half back.

This rules out building githerd's detection as new GitHub Actions workflows.

**Polling, started once, running forever (2026-10-02 16:09).** "I just want the skill to poll,
including polling master. It will be my responsibility to make sure the skill starts, but it
should run forever after I start it. Maybe it should just be a cli tool I start in a tmux window,
like cswap? It should run Claude so that it can handle issues intelligently".

This rules in:

- polling, of master too;
- the owner starting it, after which it is long-lived;
- Claude doing the judgment.

Liveness is the owner's job only at start: githerd must not depend on the owner restarting it.

**An MCP server, because it starts by itself (2026-10-02 16:15).** "MCPs start automatically when
I start claude, that might be a better mechanism than a cli tool". An MCP server registered for
sessions is the preferred entry point, because opening Claude is enough to start it.

**Sessions coordinate with each other (2026-10-02 16:13).** "can it use Claude's inter-session
communication to see what other agents are working on and tell them what it's working on?" Then
(16:14): "what about a MCP?" githerd must know what every session is doing and tell them what it
is doing.

**REJECTED: headless workers (2026-10-03 04:36 to 04:39).** The proposal: githerd's daemon runs
the work itself with headless `claude -p` runs, and the MCP server only reports status. Owner:

- "what's the point of the MCP if githerd is the one running the work?"
- "but then it's not an interactive session"
- "the idea was for githerd to dish out work to agents through the MCP, having githerd run on
  its own makes it impossible to interact, monitor, and control. create a new design where the
  MCP is handing out the work"

This rules out githerd doing work in sessions the owner cannot attach to, talk to or stop. The
design on branch feat/githerd (headless runs, a command guard, run-only tools) is rejected for
this reason.

This rules in:

- work done by interactive Claude sessions;
- githerd handing out jobs through the MCP;
- the owner able to interact with, monitor and control every worker.

**REJECTED: paging the owner for unclaimed urgent work (2026-10-03 04:41).** The proposal: if
master is red and no agent claims it, page the owner. Owner: "there's no guarantee that I will
respond. come up with a better mechanism that only relies on claude".

No step of the pipeline may depend on the owner answering. Urgent work must be picked up by
Claude on its own. The phone may inform; it may not be what makes work happen.

**Agents must keep pulling work (2026-10-03 04:35 and 04:42).**

- "how will agents know to get a new job from the githerd queue? how will they know how many
  jobs to run concurrently?"
- "how do you ensure that the agents keep pulling work from githerd?"

The design must answer both mechanically. "The agent remembers to ask" is not enough. An idle
interactive session does nothing, so something has to keep workers fed.

**Choice of runner (2026-10-02 16:09).** "maybe there are pros and cons of it being a skill? Let
me know what you think". The owner asked for advice and set no requirement: skill, CLI and MCP
are all open, within the rules above.

---

## 3. Judgment by Claude, enforcement by code

**Overlap and grouping are Claude's call (2026-10-03 04:34).** "just use claude to determine if
there is potential overlap or potential conflict, don't try to do it programmatically. that's
using the best tool for the job." The memory note on using Claude for judgment generalizes it:
anything that needs understanding is judged by Claude from the real inputs, and code only
validates and enforces the answer.

**REJECTED: footprints guessed from issue text (2026-10-03 04:31).** The proposal: before any
work starts, guess which files an issue touches by parsing paths and package names from its text.
Owner: "stage 1 sounds like magic, there's no way that would work in practice".

This rules out heuristics, regexes and path guessing standing in for understanding.

**Conflicts must be found before work starts (2026-10-03 04:33).** The proposal: no conflict
detection; let collisions happen and clean them up at merge time. Owner: "the problem with
conflicts happening is then you can't group things together".

Overlap has to be known before work begins, so related work can be done together as one job.

**Grouping and conflicts were raised by the owner (2026-10-02 23:33).** "what if the next item in
a queue conflicts with ongoing work? or some work should be grouped?" Both have to be handled.

---

## 4. Order of work

**The owner's rule for ordering (2026-10-02 20:28).** "githerd needs a prioritization strategy for
which work it does first. PRs should be the oldest PR first; github issues need some consideration
of fixing bugs / highest priority / age."

- PRs: oldest first.
- Issues: weigh bug versus feature, the priority label and age.
- The owner wants a recommendation for the rest.

**REJECTED: asking the owner to split big jobs (2026-10-02 23:32).** The proposal: send
high-effort issues to the owner as "split this?". Owner: "no thanks, I don't want to make all
those decisions. also Opus 5.5 seems to be doing great with large tasks and workflows".

- Effort never routes work to the owner.
- Big jobs go to agents.
- If a job really is several pieces, the agent splits it itself.

**The label scheme githerd ranks by (memory, set 2026-09-24/25).** Every issue carries one label
of each kind:

- type: bug, enhancement, research or infrastructure;
- priority: critical, high, medium or low;
- effort: low, medium or high.

The owner gives batch orders by label ("fix all critical bugs").

**Red master comes first (memory, 2026-10-01).** "A red master is top priority: fix it or hand it
off at once; open no new PRs behind it meanwhile."

---

## 5. Merging, auto-merge and majors

**Do not wait for the owner to merge (2026-09-30 23:45).** "you don't need to ask me to run
pre-push checks. don't wait for me to merge, it's just slowing us down -- merge what you think is
ready, as long as it is passing our quality bar."

- Agents merge.
- Pre-push checks never need the owner's permission.

Earlier (2026-09-29 00:01): "why do I need to merge PRs? why can't you do that?"

**Auto-merge on, except for breaking PRs (2026-10-01 14:34).** "turn on auto-merge for your
non-breaking PRs. as a policy breaking PRs shouldn't auto-merge".

- Non-breaking PRs get auto-merge.
- A PR with a `!` commit or a `BREAKING CHANGE` footer never does.

**Hold majors and group them (2026-10-02 02:28).** "hold the major version bumps and group them
together". Breaking PRs are held and grouped per package, one major per group. Repository
CLAUDE.md: release runs on every merge, so a group has to land as one merge.

**Never merge known errors (2026-10-01 04:28).** "why would we want to merge something that we
know has errors?" A merge needs a known-good state, not just a gate that happens to pass.

**Stacked PRs and auto-merge (memory, 2026-10-02).** Never turn on auto-merge for a PR whose base
is another PR's branch: it merges at once with no checks. Turn it on only after GitHub retargets
the PR to master.

**Release-day checks (memory, after a collision on 2026-09-29).** Before publishing a major or
re-enabling releases:

- check every open PR from every session for breaking changes to the same package;
- before starting a fix for a red master, check whether another session already owns it.

**Open PRs as soon as work is done (2026-09-29 19:58).** "open the PRs where you are waiting on me,
don't wait to open PRs anymore".

- Finished work becomes a PR at once.
- A PR that depends on another is opened stacked on it.
- PRs given to the owner are full URLs.

**The owner asks about stuck PRs.**

- 2026-10-01 14:53: "we have 19 open pull requests, when will they get merged?"
- 2026-10-02 03:59: "down to 11 PRs, how do I merge the rest?"

A growing open-PR count is a symptom githerd must notice and explain without being asked.

---

## 6. The visual review gate

**Every package with images is checked (2026-09-30 19:42).** The finding was that
graphty-element was merging with no visual drift detection. Owner: "that is a CRITICAL error. we
don't know if we have broken things unless we are verifying visual outputs. all packages with
visual output MUST check their images before a merge can be allowed."

**Nothing merges with unapproved stories (2026-10-01 02:00).** "we MUST NOT merge a PR until ALL
the stories have been confirmed accurate and approved."

**Master stays known-good (2026-10-01 04:29).** "never ever let anything get committed to master
unless all the storybook images are approved and in a known-good state".

**How diffs work (2026-10-01 02:02).** "The way Chromatic worked is if there was a diff (including
new stories or any change) it had to be approved before it was merged." Any diff, new stories
included, needs approval.

**Only the owner approves (memory).** Agents and scripts never accept, never press Finish, never
edit baselines or the gate. Practical consequences:

- visual review is the one gate a human must pass;
- githerd queues it and never does it;
- a PR waiting on visual review is waiting on the owner.

**Get the owner's eyes early (2026-09-26 16:06).** "if you are changing meshes or other aspects
that may change visual outputs, get human review early to ensure the visualization is acceptable
-- this is a key aspect since only the human can tell you if it looks acceptable or not and it is
better to fail fast."

**Review links in the order to review (2026-10-02 13:05).** "give me the review links for 695,
697, 519 and 365 in the order of fewest diffs first". The owner wants direct review links,
ordered so the easiest come first.

**Agents run the review server (2026-10-02 03:47).** "I don't want to use my own server since it
has a password protected signing key, it will slow everything down. running my own server doesn't
protect us from anything anyway". githerd or its agents start and keep the review server, through
servherd. The owner never runs a server by hand.

**Fix the review tool, don't work around it (2026-10-02 19:22).**

- "is this functionality that should be built into the visual review tool?"
- Then: "open the issue(s) to fix this in the visual review tool".

A manual workaround that keeps recurring (a baseline merge conflict, updating from master) becomes
a tool fix, tracked as an issue.

**Chromatic spend stopped approvals (2026-09-27 19:16).** "I have $3k worth of overage usage on
Chromatic. I'm not going to approve anything on chromatic until that is resolved."

- A paid service running out can block the gate for days.
- The pipeline needs other useful work to do while blocked ("Do we have other work we can do
  while that is getting sorted out?").

---

## 7. Red master, shared failures and outside drift

**Status should not have to be asked for.**

- 2026-10-02 19:26: "is master still red? or did we fix that?"
- 2026-10-01 07:44: "is the visual diff slowing down our ci/cd?"

The owner keeps asking for the state of the pipeline. It should be visible without asking.

**A red master issue was questioned, not approved (2026-10-02 16:02).** "why open a 'master is
red' issue?" The owner asked and was answered. Neither an issue nor its absence is decided.

**Would the design have caught the failure? (2026-10-03 04:51).** The case:

- a new security advisory made every PR's audit step fail;
- master stayed green, because master had not run CI since the advisory appeared;
- 23 PRs backed up.

Owner: "would githerd have caught that problem?" githerd must detect a failure shared across PRs
that master does not show yet. The memory note on watching master records the lesson: watch for
the same check failing on 3 or more PRs, not only master.

**REJECTED: running master CI on a timer (2026-10-03 04:53).** The proposal: a master canary run
every 12 hours. Owner: "careful, I don't think we want to run master every 12 hours if the entire
system is idle". Rules out spending CI, GPU or Claude on an idle system.

**REJECTED: a daily local audit (2026-10-03 04:54).** "daily local audit check is still a weak
mechanism (12 hours to catch an error on average) and expensive (always runs, even when not
needed)". Rules out fixed-interval checks that are both slow to detect and always running. A check
should run when something changed, and detect within minutes.

**Dependabot polling questioned (2026-10-03 04:54).** "would polling dependabot have caught the
problem in this case?" This was the last question before the "throwing darts" message. Every
detection mechanism must be checked against the real incident before it is proposed.

**No nightly builds (2026-09-23 23:57).** "Don't bring back nightly builds." Rules out
time-scheduled CI runs.

**Never blame timing (memory, 2026-09-23).** A failure is never dismissed as a flake or as load
until its mechanism is found. A githerd retry policy can't treat "rerun until green" as a fix.

**Watchers must fail loudly (memory, 2026-10-03).** The stuck-PR watcher crashed silently for a
day on a syntax error. A watcher:

- exits loudly when it can't run, and never loops on an error;
- is tested by hand once before anyone trusts it.

---

## 8. Telling the owner things

**Phone alerts only for real actions (owner's global CLAUDE.md).** The phone is alerted only by a
reply ending in an `ACTION NEEDED:` line. No false alarms: "A false alarm trains me to ignore it."

**Only when the owner can act now (2026-09-29 15:42).** "don't tell me 'ACTION NEEDED' until it is
actually needed. there is nothing I can do for that last ACTION NEEDED". An alert must be
something the owner can do right now, not something waiting on CI.

In this session the same `ACTION NEEDED` line was repeated after many "nothing new" updates. The
owner ignored it and asked "what's the githerd prioritization? I missed it before" (2026-10-02
23:27). Repeating an alert hides it, and the owner can miss the single question that mattered.

**Never ask whether to continue (2026-09-29 03:10).** "never ask me if you should continue, just
keep going". Also: "you don't need my permission to fix problems" (2026-09-23 19:38).

**Ask only about one-way doors (owner's global CLAUDE.md and memory).** Everything reversible is
decided by Claude with a one-line reason. The owner's decision queue holds only:

- one-way doors;
- visual approvals;
- credentials, payments and logins.

**"Is anything waiting on me?"** Asked over and over (2026-09-29 15:42, 2026-10-01 04:09,
2026-10-02 19:07, and others). The owner needs one accurate list of what waits on them, and an
empty list when nothing does.

**"How's it going?"** Asked dozens of times. The owner needs progress visible without asking:
what is running, what is stuck, and for how long.

**Report dropped work (2026-09-29 19:19).** "go back over the work I asked you to do over the last
two days. what has been delivered, what is still in progress? is there anything that was only
partially delivered or silently dropped?" Work the owner asked for must be tracked to the end.
Dropped or partial work has to show.

**Questions are not orders.**

- "just asking, don't implement anything yet" (2026-09-20)
- "answer my questions before you start any work" (2026-09-23)
- "stop. answer my question before you carry on" (2026-09-29)
- "don't build yet, just answer" (2026-10-02)

A worker the owner talks to must answer a question and not treat it as a go-ahead.

---

## 9. Trust and security

**Only the owner's issues and PRs (2026-10-02 20:24).** The proposal: protect against hostile
issue text with a sandbox (bubblewrap and socat). Owner: "that won't protect us from maliciously
modifying code. let's filter to only address issues from the currently authenticated github
account."

- githerd works only on issues and PRs written by the logged-in account.
- Other people's text, comments included, does not reach agents.
- The sandbox is not the answer to hostile input.

**The owner's view of signing (2026-10-02 13:51).** "The threat model isn't key to our success --
signing is just a simple mechanism to ensure mistakes aren't made." The owner prefers a simple
guard against mistakes over defense against a hostile agent.

**The permission classifier is a known blocker (2026-10-02 13:46 to 14:04).**

- "what do I need to do to work around the autoclassifier? I don't want to revert any public
  commits"
- "this is stupid. one last chance for the autoclassifier to get out of our way and then I will
  add those annoying permissions"
- "added"

The classifier also blocked an ordinary `git push` as "irreversible local destruction". Agents
will hit classifier refusals, and githerd must treat a refusal as a blocker to report, not as
success. The owner's fix is to add permission rules. Don't solve it by reverting public commits.

**Never comment on Cytoscape (2026-10-02 13:28).** "do not, under any conditions, comment in that
issue or any cytoscapejs issue". No writes to any Cytoscape.js repository, and the rule goes into
every agent prompt that touches Cytoscape.

**Agents may push and merge (2026-09-20 02:13 and 2026-09-23 05:00).**

- "I've modified your permissions so that you can push and carry on from here"
- "I've updated git permissions so that you can do everything. carry on"

**Never push master directly (memory).** Master is protected by a ruleset:

- PRs only, merged with merge commits;
- required checks "All Checks Pass" and "Lint PR Title";
- the release pushes with a deploy key.

**Signed commits (memory).** Commits are GPG-signed. Scripts never disable signing.

**No sudo, no settings edits (global CLAUDE.md and this task).** Never run sudo. Never edit
`~/.claude` settings or hooks.

---

## 10. Models, tokens and cost

**Opus 5.5 or Fable only (2026-10-02 23:32).** "everything should run on Opus 5.5 or Fable". No
Sonnet or Haiku for any githerd job.

**Frugal, but quality first (2026-10-02 17:07).** "it's okay, I have a Claude Max 20x
subscription. I'm not concerned about the tokens. We should be frugal without risking quality or
the outcomes we are trying to get." Dollar caps guard against runaways; they are not budgets.
Avoid waste:

- no idle Claude turns;
- no runs when nothing changed;
- no fixed-interval work.

**Usage limits stop everything.**

- 2026-09-21: "my limit just reset, carry on".
- 2026-09-28 03:24: "we hit our claude usage limit, make sure we have recovered all our workflows,
  processes and watchers".
- 2026-09-22: "continuing after a Claude API Error, pick up all our work where it left off",
  three times.

Hitting a limit or an API error stops every session. Afterwards, githerd and its agents must
resume on their own and recover their state. The account is switched with cswap.

**Paid CI capacity runs out.**

- GPU runner, 2026-09-22: "I think we should upgrade from the free runner to something that can
  run for more than 30 minutes", then "I purchased $20 worth of credits", then "I subscribed to
  machine.dev".
- Later: "finished 365, topped up machine.dev" (2026-10-02 04:13) and "topped off" (2026-10-02
  23:49).
- Chromatic's $3k overage paused approvals (section 6).

githerd must recognize "out of credits" as a cause, report it to the owner as a payment action,
and not have agents debug it as a code failure.

**CI cost of checks (2026-10-01 23:42).** "yes, do the import-based selection with a weekly full
run". This is the owner's chosen policy for expensive suites: select by what changed, plus one
weekly full run. A weekly run is acceptable here because it is CI test coverage on a schedule the
owner chose. That does not license githerd to schedule master runs (section 7).

---

## 11. Several sessions, one machine

**Other sessions share the tree.**

- 2026-09-19 22:34: "don't make any changes to this repo -- there is another session working in
  it right now."
- 2026-09-21 23:35: "are you modifying ~/Projects/graphty-monorepo? I have another Claude Code
  session editing that project".
- 2026-09-21: "don't make modifications to ~/Projects/graphty-monorepo without talking to me about
  it first". He then added: "that wasn't a standing rule, just a temporary rule".

The rule that stays: work in your own worktree, never in another session's tree.

**The owner sends messages to the wrong session.**

- 2026-09-25: "whoops. wrong window. don't address 748 here."
- 2026-09-26: "oops, this was the wrong window again".
- 2026-09-29: "wrong window again, nevermind :P".

With several worker windows this will happen more often. Workers need clear names, and a worker
must notice when a message does not belong to its job.

**One memory alert, two sessions (2026-10-01 12:14).** "I just got a grafana alert that this host
is running out of memory and swap is filling up, can you identify the root cause?" Then "I will
talk to the other session about it". Another session's workflow had 23 headless Chromium running
at once.

- Concurrency has to count every session.
- Browser-driving agents share a cap of 4 browsers.
- The owner's global CLAUDE.md says resource exhaustion is unlikely unless it is measured: check
  before assuming it.

**How do sessions talk to each other? (2026-10-01 19:52).** "how are you communicating with the
other agent that's working in this workspace?" Coordination should be visible to the owner.

**Long-running agents get stuck.**

- 2026-09-21 03:45: "still going? you've been on the same step for 50 minutes".
- Recorded in memory: workflow subagents hang forever on a permission prompt nobody answers (git
  stash, checkout and reset).

A stuck worker has to be detected and recovered without the owner noticing it first.

**Finished tasks stay in the task list (2026-09-24 19:04 and 2026-09-26 13:43).** "the following
are no longer running but show up in the task list". Finished work must leave the list.

**Run servers through servherd (global CLAUDE.md).**

- Ports come from servherd.
- The same name restarts the server instead of adding a copy.
- Abandoned servers once held 30 GB.

githerd and its workers start servers only this way and stop them.

**No git stash, reset, checkout of a file or clean in shared trees (memory and this task).**
Agents share one stash stack, and these commands hang subagents on a permission prompt.

---

## 12. Quality and how work is judged

**Fix root causes; never loosen thresholds (memory and repeated instructions).** "solve the
problem for our customers, don't just solve it in ci/cd" (2026-09-23).

**No silent degradation (2026-09-23 16:40 and 2026-10-02 18:51).**

- "silently falling back to CPU might be acceptable for the graphty algorithms package, but the
  webgpu package should create a mechanism to solve the problem or throw an error".
- "that's the exact pattern I'm trying to avoid: someone forgets to add import and wonders why
  the package is so slow".

The same principle applies to githerd: a broken or disabled part must be loud, never silently
skipped.

**Look around corners (2026-10-03, and the do-not-blame-timing memory).** Consider shared code,
races, outside drift and carried-over state before naming a cause.

**Test on fakes before trusting (2026-10-01 03:47).** "it seems like our visual diff viewer tool
needs a lot more robustness verification. what's a good process for finding all the errors and
edge cases before they happen?" Then (03:49): "use a workflow". Tools the pipeline depends on get
adversarial edge-case testing before they are relied on.

**Reliability over a single browser session (2026-10-01 02:26).** "I suspect the error handling
in the visual diff webpage is weak and I have to stay in the browser window the whole time". The
owner expects pipeline tools to survive network errors and page reloads.

**Pre-flight expensive runs (memory, 2026-09-29).** "these user studies are really expensive in
terms of both time and tokens, you need to make sure they are correct before they launch."

---

## 13. Accepted, and not to be reopened

These answers settled a question about githerd, or about the pipeline it will run.

| Topic | Owner's position |
|---|---|
| Name | githerd, after servherd |
| Runs where | in the cron-less Docker container; started once by the owner, then forever |
| Auto-start | MCP preferred, because it starts with Claude |
| Who does the work | interactive Claude sessions handed jobs through the MCP, never headless runs the owner cannot control |
| Urgent work | must be picked up by Claude alone; never waits on the owner |
| Judgment | Claude decides overlap, conflict, relatedness and grouping; code enforces |
| Ordering | PRs oldest first; issues by priority, then bug before feature, then age |
| Large jobs | go to agents; the agent splits them itself; the owner is never asked |
| Models | Opus 5.5 or Fable only |
| Tokens | Max 20x subscription; frugal but never at quality's cost |
| Trust | only issues and PRs written by the authenticated account |
| Merging | agents merge when the quality bar passes; non-breaking PRs auto-merge |
| Majors | held and grouped, never auto-merged |
| Visual gate | every story owner-approved before any merge; only the owner approves |
| Alerts | ACTION NEEDED only when the owner can act right now |
| Re-triage | an occasional full pass for relevance and duplicates |
| Cytoscape | never write to any Cytoscape.js repository |
| Scheduled CI | no nightlies, no idle master canary, no fixed-interval audits |

## 14. Rejected ideas, in one list

1. githerd runs headless `claude -p` workers itself. The owner can't interact with, monitor or
   control them.
2. The MCP server reduced to status and claims while githerd does the work. "what's the point of
   the MCP".
3. Paging the owner when urgent work goes unclaimed. "there's no guarantee that I will respond".
4. Sending high-effort issues to the owner as "split this?". "I don't want to make all those
   decisions".
5. Footprints guessed from issue text. "sounds like magic".
6. No conflict detection, cleaning up at merge time. It makes grouping impossible.
7. Overlap and conflict worked out in code. "just use claude".
8. A GitHub Actions safety net for red master. "can we do it without the github action?"
9. A timed master canary run every 12 hours. "if the entire system is idle".
10. A daily local audit. "weak ... and expensive".
11. Sonnet for cheaper jobs. "everything should run on Opus 5.5 or Fable".
12. A sandbox as the defense against hostile issue text. "that won't protect us from maliciously
    modifying code".
13. An owner-run review server. "running my own server doesn't protect us from anything anyway".
14. Nightly builds. "Don't bring back nightly builds."
15. Mechanisms proposed one at a time in reaction to the latest hole. "you're just guessing and
    throwing darts".

## 15. Still open

The owner has not decided these.

- How often re-triage runs ("occasionally").
- Whether a red master gets a GitHub issue. Questioned, not decided.
- How many workers run at once, and how that number adapts. The owner asked how it would be
  decided, and nothing was settled.
- Whether githerd may open worker sessions itself. This follows from "only relies on claude", but
  was never explicitly confirmed.
- Skill versus CLI versus MCP for each part. The owner asked for the pros and cons.
- What happens while the container is down. The owner chose the container and accepted that it is
  the single host; no outside heartbeat was approved.
