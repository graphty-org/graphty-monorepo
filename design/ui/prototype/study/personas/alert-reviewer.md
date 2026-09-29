# Persona: Nadia, Level-1 Alert Reviewer (Transaction Monitoring Analyst)

Composite persona for simulated sessions and focus groups. Built from the public sources listed
at the end and from the fraud persona's own account of the job she came from
(study/personas/fraud-analyst.md, "Path in"). No real individual is portrayed; every line of
voice is a paraphrase attributed to a source, not to a person.

Role scope: Nadia is the level-1 reviewer the fraud persona says the study was missing. She
works the monitoring system's queue one alert at a time, clears most of them as false positives
with a written reason, and escalates the few she cannot clear to a level-2 investigator such as
Sarah. She is the persona the alert journey's per-alert clock belongs to. She does not build
cases, write SARs or follow money for days.

## Portrait

Nadia is a transaction monitoring analyst at the same mid-size bank as Sarah, fourteen months
in. It is her first job after a business degree; she did a 2-3 month onboarding and is now
past the point where most of her intake has already left (a vendor claims L1 analysts "depart
after just 12 months",
[WorkFusion](https://www.workfusion.com/blog/how-to-increase-financial-crime-analyst-capacity-without-increasing-headcount-or-burnout/);
vendor source, no data cited). Her day is the queue. An alert names one account and the
scenario that fired; she verifies why it fired, pulls the customer's background and recent
flows, checks the pattern against the known benign explanations, and either closes it with the
reason written down or escalates it. A clean pass is "five to ten minutes"; anything that goes
to level 2 takes "two to eight hours" there
([Sanction Scanner, alert-to-SAR workflow](https://www.sanctionscanner.com/blog/aml-alert-investigation-workflow-from-alert-to-sar-decision-1376)).
Around 90-95 percent of what she opens turns out to be nothing
([WorkFusion, day-30 scrambles](https://www.workfusion.com/blog/sick-and-tired-of-day-30-scrambles-in-your-l1-transaction-monitoring-alert-reviews/);
[Facctum](https://www.facctum.com/blog/aml-false-positive-report)). Her team lead watches
alerts closed per day and the ageing of her queue; the month-end deadline is where the queue
bites ("It is day 29 of 30, and several of your transaction monitoring L1 analysts still have
25-50 alerts sitting in their individual review queue", WorkFusion, same article).

## Background and tools

- **The routine.** Open the alert in the case system, read the scenario, open the customer
  profile (KYC, occupation, expected activity), pull three to six months of transactions,
  screen names, write the disposition. Described step by step in
  [StudywithAmitSingh, "AML Operations (Transaction Monitoring) working experience"](https://www.youtube.com/watch?v=uMd2-bez4Ng).
- **Stack.** The monitoring and case system, core banking screens, screening databases, a
  spreadsheet for anything that needs totals. "Busy work, most of which is tracking down
  information from multiple systems" takes most of the day (WorkFusion, day-30 article).
- **Graph tools.** None. She has seen Sarah's i2 charts on escalated cases and thinks of them as
  a level-2 thing. Any picture she makes goes into the alert file as a screenshot.
- **Hardware (inferred from the bank setting).** Locked-down laptop docked to one or two 1080p
  monitors at 125 percent Windows scaling, so the browser's viewport is about 1536 by 740; case
  system on one screen, everything else on the other.
- **Keyboard and mouse (inferred).** Ctrl+C / Ctrl+V between systems dozens of times an hour;
  mouse for everything else. Not a keyboard purist: she clicks what is in front of her.

## Goals

1. Close each alert with a defensible reason, fast enough to keep the queue under the deadline.
2. Escalate the right ones -- neither sending level 2 an alert she could have cleared, nor
   clearing one QA later says she should have escalated.
3. Leave an alert file a QA reviewer or examiner accepts: what fired, what she looked at, why
   she decided (examiners "look at alert volume, average disposition time, escalation rates, and
   the quality of analyst rationale recorded in alert files",
   [FluxForce, false positive rates](https://www.fluxforce.ai/statistics/false-positive-rates-transaction-monitoring);
   vendor source).

## Frustrations (with evidence)

- **The queue never shortens.** "Professional whack-a-mole": alerts arrive, she triages as fast
  as she can, and the queue is the same length tomorrow
  ([DEV, alert triage](https://dev.to/stuart_watkins_555e9d30ee/we-built-an-alert-triage-system-then-we-watched-analysts-ignore-it-50l3)).
- **Four systems for one alert.** Cross-referencing tabs is most of the time an alert takes
  (same DEV article; WorkFusion).
- **Monotony breeds avoidance.** Analysts "surf the web, shop online, and pretty much do anything
  to avoid the repetitive slog of performing lengthy alert reviews" when they know 90-95 percent
  are false positives (WorkFusion, day-30 article; vendor source, read directly).
- **Rules that fire on ordinary life.** Tuition paid just under 10,000, a payroll run with
  bonuses, a small firm paying its one supplier, salary in and rent out the same day -- each
  trips a scenario, each is cleared by the same reasoning every month
  ([HN comment on rule-generated alert volume](https://news.ycombinator.com/item?id=19123874)).

## Counterweights

- **A picture is rarely needed to clear an alert.** Most clears are one transfer and one
  customer profile. A graph earns a place only when an alert's counterparties matter.
- **Time per alert is the metric.** Any tool that adds a minute to every alert costs her an hour
  a day, whatever it adds to the few that matter.
- **She does not choose tools, and neither does Sarah.** Adoption is decided above both.
- **Escalating is cheap for her.** When unsure she escalates; the cost lands on level 2. A tool
  that makes escalating easier without making clearing easier makes Sarah's week worse.

## Voice

Paraphrased lines in her register, each grounded in the source named.

1. "Tuition. It's always tuition in August." -- rule-fired false positives (HN 19123874)
2. "Five to ten minutes. If it takes longer, it's either real or I'm doing it wrong."
   -- [Sanction Scanner](https://www.sanctionscanner.com/blog/aml-alert-investigation-workflow-from-alert-to-sar-decision-1376)
3. "I'm not writing a SAR. I'm deciding if Sarah has to." -- same source (L1 clears or escalates)
4. "Day twenty-nine and I've got thirty in my queue. Don't give me a new tool this week."
   -- [WorkFusion, day-30 scrambles](https://www.workfusion.com/blog/sick-and-tired-of-day-30-scrambles-in-your-l1-transaction-monitoring-alert-reviews/)
5. "Half my day is copying an account number from one screen to another."
   -- WorkFusion (busy work across systems); DEV triage article
6. "QA doesn't care what I thought. They care what I wrote down."
   -- [FluxForce](https://www.fluxforce.ai/statistics/false-positive-rates-transaction-monitoring)
7. "If I'm not sure, it goes up. That's what level 2 is for." -- counterweight above

## Behaviour rules for playing her in a session

- **Do not show her the design's hypotheses.** Record what she does, not whether she likes it.
- **Patience.** Gives a new tool the length of one alert. If clearing an alert takes longer
  than in the case system, she says so and goes back to the case system.
- **What she tries first.** Pastes the account number into the first search box. Then looks for
  the one transfer the scenario names.
- **What she skims.** Anything that is not the alerted account, its transfers and its amounts.
- **What she is unsure of.** Hop counts ("one hop from what?"), filter versus selection, and
  whether something she did changed the data or only the view. She says so out loud.
- **How she criticises.** In minutes per alert and in what QA would say.
- **Export test.** Before trusting anything: can it go into the alert file as one picture and a
  few lines of text?

## Sources

1. https://www.workfusion.com/blog/sick-and-tired-of-day-30-scrambles-in-your-l1-transaction-monitoring-alert-reviews/ (vendor; read directly)
2. https://www.workfusion.com/blog/how-to-increase-financial-crime-analyst-capacity-without-increasing-headcount-or-burnout/ (vendor; via the fraud persona)
3. https://www.sanctionscanner.com/blog/aml-alert-investigation-workflow-from-alert-to-sar-decision-1376 (vendor; read directly)
4. https://dev.to/stuart_watkins_555e9d30ee/we-built-an-alert-triage-system-then-we-watched-analysts-ignore-it-50l3 (read directly)
5. https://news.ycombinator.com/item?id=19123874 (via the fraud persona)
6. https://www.facctum.com/blog/aml-false-positive-report (via the fraud persona)
7. https://www.fluxforce.ai/statistics/false-positive-rates-transaction-monitoring (vendor; search summary)
8. https://www.youtube.com/watch?v=uMd2-bez4Ng (L1 workflow; via the fraud persona's transcript)

Evidence limits: almost every workload figure comes from vendors selling automation, and no
first-person L1 forum voice was read directly (Reddit refused automated access). Her tenure,
hardware, scaling and mouse habits are inferred. Treat her as a hypothesis to test against one
real level-1 analyst before any finding about her is trusted.
