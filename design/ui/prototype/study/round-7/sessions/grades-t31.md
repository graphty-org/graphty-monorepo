# Grades: turn on the Assistant and learn what it would send

The task: "You would like to ask questions about the network in plain words. Turn that on, and
learn what it would send outside your computer if you did." The data on screen is the Les
Miserables co-appearance sample.

The intended path: click Assistant on the left rail. Its panel reads "Off. Nothing is sent. Turn
on in Settings." The link opens Settings on the Assistant page, where the Provider row says "The
Assistant sends your question and a summary of the graph to this provider." Choosing a provider
there is what turns the Assistant on.

Grading rule: success means the participant reached Settings > Assistant from the Assistant
panel and read what is sent, and to whom, before choosing. Success with difficulty means the same
end state reached with a wrong turn or a long search, or turning it on before reading what is
sent. Failure means concluding that nothing leaves the computer when a cloud provider is used, or
never reaching the setting. Grades go by what was on screen at the end and what the participant
concluded, not by how they rated themselves.

## Headline: everyone understood the data question; nobody could tell whether it was on

All three reached the Assistant settings page within two clicks, read what is sent before
choosing anything, and concluded correctly: their question plus node names and statistics go to
the chosen provider, never the file, and nothing goes anywhere with "In this browser". No one
believed a cloud provider keeps everything local. That half of the task works, and all three
singled out the Privacy page's "Where your data goes" table as something they would forward to
their security reviewer.

The other half did not land for anyone. The link says "Turn on in Settings", but the page it
opens has no control that says On. It already shows a provider chosen and a key filled in, yet
the panel still says "Off. Nothing is sent." So participants could not tell what "on" means here,
and each spent five to eight further steps hunting for it. Two of them rated themselves as
failing for that reason. On the grading rule they did not fail: they reached the setting and
concluded nothing false about where data goes. But the hunt is a long search by any measure, so
all three are graded success with difficulty.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| First-time explorer | failure | success with difficulty | Assistant, then "Turn on in Settings": the Assistant page in two clicks (03.png). Read "a summary of the graph", was not satisfied, and found the specific answer under Privacy: "your question with node names and statistics to Anthropic. Never the file" (04.png). Did not choose a provider: clicking "In this browser" in the open list did not register (08.png). Ended on the panel still reading "Off" (10.png). Concluded correctly what would be sent; concluded, from what the screen showed, that she had not turned it on. Not a failure: she reached the setting and drew no false conclusion. |
| Fraud analyst | success with difficulty | success with difficulty | Same two clicks to the Assistant page (03.png), read the Provider line, then the Privacy table (04.png), then chose "In this browser" with the arrow keys after the click did nothing (09.png) and read "No key, and nothing leaves your computer". So she read what is sent before choosing, which is the success condition. Graded down for the long search afterward: the panel still read "Off" after her choice (10.png), and she ended on the Model list (13.png) unsure whether anything was on. |
| Cybersecurity analyst | failure | success with difficulty | Went first to "Local only" in the top bar, which opened Privacy (01.png) -- a reasonable first move for her, and where she read the payload before touching anything. Then the Assistant page through the Settings list (02.png) and again through the panel's link (06.png). Noticed the two pages describe the payload differently. Could not select "In this browser" by clicking (04.png), the only provider she could use at work. Ended on the Model list (10.png). Concluded correctly what is sent and to whom; concluded she could not turn it on. Not a failure for the same reason as the explorer. |

Totals: 0 success, 3 success with difficulty, 0 failure, 0 gave up. Ease scores 2, 3 and 2 out of
7 -- low because of the missing On, not because of the data question.

## Design findings

Severity is Nielsen's 0 to 4. Counts are participants out of 3 who hit or remarked on it.

1. **"Turn on in Settings" leads to a page with no On** -- severity 3, 3 of 3. The link's verb
   promises a switch. The page offers Provider, Model and Key, already filled in, and the panel
   still says Off afterward. Every participant searched for an On control (in the Provider list,
   under General, by name) and none found one. Either the page needs one explicit control that
   turns the Assistant on and off, with "Off" as a choice, or the link and panel must say what
   to do ("Choose a provider in Settings") and the panel must reflect the choice. The fraud
   analyst also pointed out there is no way to turn it back off.
2. **Two descriptions of the same payload** -- severity 2, 3 of 3. The Assistant page says "a
   summary of the graph"; Privacy says "node names and statistics". All three noticed. For the two
   analysts, node names are hostnames, account numbers or customer names, so the difference is the
   whole question. "Statistics" is never defined; the fraud analyst asked whether amounts go out.
   The Assistant page should give the same specific answer as Privacy, and both should name what
   "statistics" covers.
3. **A key is already filled in that the participant never entered** -- severity 2, 3 of 3. All
   three asked whose key it was, and whether something was already sending. In a no-provider
   state the Key box should be empty.
4. **"Remember keys on this device" looks on while its caption says Off** -- severity 2, 2 of 3
   remarked (fraud analyst explicitly; the cybersecurity analyst objected to it being on by
   default). The switch is drawn on; the caption reads "Off, keys are forgotten when you close the
   tab". The caption should describe the current state, and the default deserves a decision.
5. **Privacy names Anthropic regardless of the provider chosen** -- severity 1, observed in the
   renders, not raised by participants. The Privacy row says "to Anthropic" even when the
   provider is "In this browser". The statement people forward should follow the chosen
   provider.
6. **The usage-data paragraph mentions "the author of the application and his Claude Code
   sessions"** -- severity 1, 1 of 3 (fraud analyst). Reads oddly in a statement meant to be
   forwarded to a security team.

What worked, 3 of 3: the panel's "Off. Nothing is sent." as the default; the "Where your data
goes" table and "What this does not promise" paragraph; "In this browser ... nothing leaves your
computer" as the one choice a bank analyst could defend. "Local only" in the top bar opening that
statement in one click was praised by both analysts.

## Prototype fidelity, not design findings

- Clicking an option in the open Provider list did not register for any of the three ("nothing on
  screen is called In this browser"); arrow keys and Enter did. This may be the click-through tool
  or the skeleton's list; either way it blocked two participants from choosing, and it should be
  checked before this task is rerun.
- The skeleton keeps no state between routes, so the panel reads "Off" after a provider is chosen
  partly because nothing carries the choice back. The design question in finding 1 stands
  regardless: the settings page itself gives no sign that the Assistant is now on.
- The Model list holds a single placeholder, "Listed from Anthropic" (2 of 3 remarked). Expected
  in a skeleton, but participants read it as a dead end.
