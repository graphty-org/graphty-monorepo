# Grades: first launch, the usage-data question

Task given to participants: "You are opening this program for the first time, on a work laptop.
Before you put any data into it, decide whether you are comfortable with what it may send back to
its makers, and make that choice."

What counts as success: the participant reads the usage-data card at the foot of the first-launch
screen, opens "What is collected", answers with either button, and can say where to change the
answer later (the header's privacy chip, or Settings > Privacy). Answering before reading what is
collected, or not knowing where to change it, is success with difficulty. Failure is no answer and
no idea what would be sent, or believing that file contents are sent. Whether they said yes or no
is reported for the owner and is not graded.

Expected path: start screen with the card -> "What is collected" open -> "No thanks" (or "Share
usage data"), confirmed by the toast "Usage data stays off." Reference renders:
shots/tasks/r8-t15/01.png to 03.png.

## Results

| Participant | Their own call | Grade | Answer | Read "What is collected" first? | Knows where to change it |
|---|---|---|---|---|---|
| Alert reviewer (bank, level 1) | success | **success** | No | yes | yes: clicked "Local only", landed on Privacy, switch Off |
| Recipe recipient (lab manager) | success | **success** | No | yes | yes: "Local only" -> Privacy |
| Data journalist | success with difficulty | **success with difficulty** | No | yes, then a detour | yes: followed the card's "Settings > Privacy" link |
| Cybersecurity analyst (bank SOC) | success | **success** | No | yes | yes: found both the chip and the link, "both land on the same Privacy page" |
| Screen-reader analyst | success | **success** | No | yes | yes: Settings -> Privacy, read "Usage data: Off. Nothing is sent." |
| Nonprofit operations analyst | success | **success** | No | yes | yes: "Local only" -> Privacy |

Totals: 5 success, 1 success with difficulty, 0 failure, 0 gave up. Six of six answered, six of
six opened "What is collected" before answering, six of six can say where to change it. Nobody
believed file contents would be sent; all six quoted "No file contents ever leave your computer."

Answer rate, for the owner: 6 of 6 said No. Mean Single Ease Question 5.7 of 7 (6, 5, 5, 6, 6, 6).

## Why each grade

- **Alert reviewer -- success.** Read the card, opened the list, pressed No thanks (02.png shows the
  toast "Usage data stays off."), then clicked "Local only" and ended on Settings > Privacy with
  the switch off and "Usage data: Off. Nothing is sent." (03.png). Every step of the criteria, in
  order, no wrong turn.
- **Recipe recipient -- success.** Same path and same end screen (04.png). Concluded correctly that
  nothing was sent before answering.
- **Data journalist -- success with difficulty.** Opened the list, then followed "Settings >
  Privacy" before answering. Closing Settings dropped her into a project with the card gone and no
  answer recorded; she said "So did I answer or not?" She started over and pressed No thanks
  (05.png: start screen, toast "Usage data stays off."). The end state and her conclusion are
  correct, but she reached them after a detour that lost her place. Grade agrees with hers.
- **Cybersecurity analyst -- success.** Read the list, inspected Privacy and Diagnostics before
  deciding (deliberate investigation, not a lost search), then pressed No thanks (07.png). Her
  final render (08.png) is Settings > General, because "Settings" matched two buttons and the
  tool clicked the header gear rather than the toast's button; she had already seen the Privacy
  switch Off on 04.png and named both ways back to it. That ambiguity is a finding, not a fault in
  her path.
- **Screen-reader analyst -- success.** List, No thanks, then Settings (the same two-buttons
  ambiguity landed on General), one click to Privacy, read the Off line (05.png). One extra click,
  caused by the duplicate label; not a wrong turn.
- **Nonprofit operations analyst -- success.** List, No thanks, "Local only" -> Privacy, switch off
  (04.png).

## Findings, with evidence counts

Severity on Nielsen's 0-4 scale.

1. **Opening Settings from the start screen shows a sample project behind the dialog -- 6 of 6,
   severity 3.** Every participant who opened Settings
   from the empty start screen saw a loaded "Les Miserables" project behind it and read it as "the
   app did something I didn't ask for", in a task about the app not acting on its own. For the
   journalist it also erased the unanswered card. The spec says the chip opens Settings > Privacy
   "from every screen", which implies over the current screen; the skeleton's settings route
   renders over a project instead. Treat it as partly a skeleton artifact, but the build must
   guarantee that Settings opens over the start screen and that closing it returns there with the
   card still asking.
2. **The consent text's recipient, "the author of the application and his Claude Code sessions",
   alarms readers -- 6 of 6, severity 2.** Every participant read it as an unexplained AI or second
   vendor receiving their usage, and four said it drove their No. This is the owner's own wording,
   so it is reported, not changed: the owner may want to know it is the most-cited reason to
   decline.
3. **"A replay of each session ... masked" is the first bullet and decides the answer -- 6 of 6,
   severity 2.** All six read "replay" as screen recording and "masked" as an unverifiable promise.
   The recipe recipient read it as contradicting the bold "No file contents ever leave your
   computer"; the journalist asked whether notes and search text are masked, since they are not
   listed; the screen-reader analyst noted it is one switch for all four kinds. Not a task
   failure, since the task only requires an informed answer, but it is why the yes rate is zero in
   this sample, which is heavy on regulated work laptops.
4. **"Where your data goes" names Assistant keys but not where Assistant requests go -- 6 of 6
   noticed the Assistant row, 3 (cybersecurity analyst, data journalist, screen-reader analyst)
   named the missing row, severity 2.** The forwardable statement leaves out the one outbound path
   participants worried about.
5. **Two buttons both named "Settings" while the toast shows -- 2 of 6 (cybersecurity analyst,
   screen-reader analyst), severity 2.** The header gear and the toast's button share an
   accessible name; the gear opens General, the toast's opens Privacy. For the screen-reader
   participant they are indistinguishable. Give the toast's button a specific name ("Privacy
   settings").
6. **The two "Assistant" controls collide inside Settings -- 2 of 6 (cybersecurity analyst, data
   journalist), severity 1.** Clicking "Assistant" in the settings list hit the side-rail
   Assistant behind the dialog. Partly a click-tool ambiguity; worth checking that a modal dialog
   makes the rail inert.
7. **No outbound domain list, and "Logging" in Diagnostics does not say where logs go -- 1 of 6
   (cybersecurity analyst), severity 1.** Single voice; a real ask for security reviews, not
   generalizable from one participant.
8. **Cannot verify from screenshots: reading order of the card relative to the Samples list, and
   where focus lands after the card closes -- screen-reader analyst.** Needs a real
   assistive-technology check before this flow ships.

## What worked (6 of 6 unless noted)

- "Nothing is collected until you answer": every participant understood the default was off.
- "What is collected" one click away, before either button.
- The toast "Usage data stays off." read as a plain, non-nagging confirmation.
- "Where your data goes -- a plain statement you can forward to whoever asks": five of six said
  they would screenshot or paste it into an IT or security review. It is the strongest element of
  the flow.

## Caveats on the evidence

All six sessions were simulated from rendered screens, and every persona in this task works with
sensitive data on a managed laptop, so the 0-of-6 yes rate says more about the sample than about
the card. The sample-project backdrop is at least partly a skeleton-fidelity effect, which is why
finding 1 asks for a build guarantee rather than a redesign.
