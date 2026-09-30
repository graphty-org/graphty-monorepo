# Session: an account from an older case -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator at a mid-size bank (composite persona,
see ../../personas/fraud-analyst.md). Mode: voluntary, first look, one real task.

Task as given by the moderator: "An alert names an account you remember from an older case.
Find it."

Screens used: the Find mock (screens/find.html), in the states "Just opened", "An id not in this
project" and "Found in a recent project", as rendered in
../../../shots/record/r3-sarah-flagged-find-s1.png, ../../../shots/record/r3-sarah-flagged-find-s10.png and
../../../shots/record/r3-sarah-flagged-find-s11.png. Annotations were off. Clicks were simulated from
what the mock's markup does; where a control is drawn but leads nowhere, that is noted.

## Transcript

**1. The screen as it opens.**

> OK. Something's open -- "Les Miserables". Characters from a book. That's not my data, but
> fine, it's a demo. There's a search box already sitting there with the cursor in it: "Name,
> id or value". Good, that's where the account number goes. A big black tooltip popped up under
> it -- "Finds nodes, edges, sets, paths..." -- I'm not reading that, I know what a search box
> is.

> The alert says ACC-705989. I paste it.

Moderator note: the mock jumps from the sample project to the April transfers project here, as
if she had been working in April all along. Sarah was told to assume that.

**2. Pasted the id: nothing in this project.**

> "0 results in all 3,093 nodes." And under that, "0 matches in Transfers, April 2026 (3,093
> accounts)." Same thing twice, once with "nodes" and once with "accounts". Accounts is the
> right word. Nodes, whatever.

> OK, so it's not in April. That's actually what I expected -- I remember this account from a
> case, not from this month. At least it tells me WHAT it searched, April, 3,093 accounts. In
> the case system a blank search just says "no records" and you don't know if it looked at
> the right thing.

> Question though: does it match exactly? The alert might write it "705989" with no ACC in
> front, or with a space. If I type it slightly different, does it still find it? Nothing here
> tells me. I'd try the bare number next if I had to.

> There's a button: "Search recent projects". Recent. How recent? The case I'm thinking of
> was -- I don't know -- February? Last autumn? If "recent" means the last three things I
> opened on this laptop, it's not going to be in there. But it's the only button, so I click
> it.

> And -- before I click -- does "search" go anywhere? Left side says "Assistant: Off. Nothing is
> sent." That's about the assistant, not this. I'll assume it's local because nothing says
> otherwise, but I'd want that written on the button, not assumed.

**3. After Search recent projects.**

> "Recent projects -- found in 1 of 7." OK, it looked at seven. "ACC-705989, Found in
> Transfers, March 2026." And an "Open" on the right.

> So it's March. Right, fine -- that's the data month, not my case. I remember this account
> from a CASE. What I actually need to know is which case, what we decided, whether we filed.
> "Transfers, March 2026" is a file name. If I'd named my projects by case number it would
> tell me more, but nobody told me to do that when I made it.

> And I get nothing about the account from this row. Was it the one receiving, the one paying
> out, how much went through it? I'd want one line -- "12 transfers, 48,200 in, 47,900 out" --
> before I decide it's worth opening. Right now it's just "yes, it's in there somewhere".

> "Found in 1 of 7." Which 7? For my notes I'd write "checked prior projects, found in March".
> An examiner asks "which ones did you check?" and I can't answer from this screen.

**4. Open.**

> I click Open.

Moderator note: in the mock, Open is where the prototype ends; there is no screen showing March
with the account selected. The designers' note says April stays in the recent list and Find
opens in March with the same id typed in.

> So what happens to April? I've got April set up how I want it. Does Open throw me out of it?
> There's no "open next to this" or "bring this account into April". I'd honestly rather see
> the March account's links pulled into THIS picture, next to the alert, than swap back and
> forth between two files. Swapping is how I lose my place.

> And I can't see what happens after, so I can't tell you if I actually landed on the account.
> I'll believe it when it's highlighted on the chart with its transfers listed.

**5. Wrap-up.**

> Did I find it? I found WHICH FILE it's in. That's half. It took three steps and no wizard,
> which is better than i2, where I'd have to remember which chart it was and open them one by
> one. But the thing I actually remember is a case, and this only knows files I happened to
> open on this laptop lately. The account from a case eight months ago -- that's the real
> scenario -- this wouldn't find, and it would say "not in any of the 7" and I'd think it
> doesn't exist.

**Single Ease Question: 5 of 7.**

> Easy enough to click through. Would I use it instead of what I do now? No. For "have we seen
> this account before" I search the case management system -- it searches every case the team
> ever worked, with the disposition and the SAR number next to it. This searches seven files.
> Where it'd help: once I know it was the March case, getting that account and its links on
> the same chart as the new alert. That part it doesn't do yet.

## Problems observed

1. "Recent projects" is the only place it looks beyond the open file, and a remembered case is
   often months old. A miss reads as "the account does not exist" rather than "not in the files
   you opened lately". (Severity 3)
2. The hit names a data file ("Transfers, March 2026"), not the case, and gives no summary of the
   account -- no role, no totals, no dates -- so she cannot judge it without opening. (Severity 3)
3. Open appears to replace the April project; there is no way to bring the older account and its
   links into the current picture next to the alert. The prototype ends at Open, so she never
   confirms she landed on the account. (Severity 3)
4. "Found in 1 of 7" does not list which seven were searched, so the check cannot be written into
   the case notes. (Severity 2)
5. Nothing on screen says whether the id match is exact or tolerant of formatting (no prefix, a
   space). (Severity 2)
6. The result header says "nodes" while the message below says "accounts" for the same count.
   (Severity 1)
7. Nothing on the Search recent projects button says the search stays on this machine; the only
   such line is about the assistant. (Severity 2)
8. The mock starts on a novel-characters sample, not the analyst's project, and the long tooltip
   under the search box was skipped unread. (Severity 1)
