# Builds storyboards/alert-triage.html (plain ASCII). Run after build.py and shots.sh:
#   python3 board.py
# Each frame shows the state's PNG from shots/alert-triage/ and, beside it, the region the caption is
# about at readable size (the same PNG, cropped by CSS).
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.abspath(os.path.join(HERE, "../../.."))
AL = json.load(open(os.path.join(PROTO, "kit/alerts.json")))
A, BANK = AL["august"], AL["bank"]
def n(x): return f"{x:,}"
SCR = "../screens/alert-triage.html"
FLOW = "../flows/alert-triage.html"
H2 = A["seed"]["hops"]["both"][1]["nodes"]
RS = A["ringSet"]
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
def when(iso): return f'{MON[int(iso[5:7]) - 1]} {int(iso[8:10])} {iso[11:16]}'
SD = A["seed"]
OWN = sorted((e for e in SD["hop1"]["edges"] if SD["id"] in (e["source"], e["target"])), key=lambda e: e["time"])
BOUT = [e for e in OWN if e["source"] == SD["id"] and 9000 <= e["amount"] < 10000]
FIN = next(e for e in OWN if e["target"] == SD["id"])
TOWN = sorted(A["tuitionCase"]["hop1"]["edges"], key=lambda e: e["time"])

F = []
def frame(sid, title, who, sees, does, doubt, crop, size=(1440, 900)):
    F.append(dict(sid=sid, title=title, who=who, sees=sees, does=does, doubt=doubt, crop=crop, size=size))

# ---------- Part 1: the triage ----------
frame("open", "The queue, drawn without a hairball",
      "Nadia, level-1 alert reviewer, Wednesday 10:14 at her docked laptop. Six alerts done this morning.",
      "Density for 2,950 accounts, and the 50 the monitoring system alerted on as orange diamonds. The legend's last line counts what is density; the table lists the queue in the order it was raised.",
      "Copies AL-40121's account number from the case system.",
      "Is this all 50, or only what fits on the screen?",
      (300, 470, 560, 130))
frame("open-points", "The same opening with every account a point (under test)",
      "The study's comparison, shown to the same participants as frame 1.",
      "3,000 gray points and the same 50 diamonds on top. No not-drawn line, because nothing is left out.",
      "--",
      "Which one shows me the queue faster: this, or frame 1?",
      (480, 40, 560, 330))
frame("tuition-find", "AL-40121: find the account",
      "Nadia, same screen.",
      "Find replaces the lists in the left panel. The hit is selected: a ring around its diamond, its row selected in the table, and the inspector: personal, PH, risk 71, alerted for one transfer of 9,000 to 9,999 USD; 5 neighbors.",
      "Pastes the account number and presses Enter.",
      "Is what I found in scope, or left out by a step?",
      (1200, 90, 240, 360))
frame("tuition-hop1", "One hop: who got the money?",
      "Nadia, the canvas and the Edges tab.",
      "The chip reads Filtered: 6 of 3,000 nodes. The Edges tab: 9,651.08 USD to ACC-562115, a salary of 3,993.00 in from an IT services firm, three small card payments. Selecting ACC-562115 shows a merchant in the category Education.",
      "Uses Filter to neighbors, 1 hop, then selects the receiving account.",
      "Is 9,651 to a university tuition, or a cover story?",
      (298, 600, 620, 190))
frame("tuition-clear", "Clear it: a note, and the evidence file as its record",
      "Nadia, about five minutes into the alert.",
      f"Her note on the step says why she cleared it. With the account selected, Export the selection's edges lists its own {len(TOWN)} transfers with time and amount before anything is written, and says the file names 6 accounts, 2 of them people. The findings report (.html) carries the note, the account's attributes with the file each came from, and the view; a CSV carries the transfers. 2 files go to Downloads; nothing is uploaded.",
      "Adds the note, selects the account, exports its edges, pastes the note into the case system and closes the alert there.",
      "Will QA accept this as the record, and does the file say which accounts it was about?",
      (360, 213, 720, 240))
frame("seed-find", "AL-40122: the next account",
      "Nadia deletes the step (the notice offers Undo) and finds the next alert's account.",
      f"Full graph again. ACC-365386 is selected. Each group of attributes says where it came from: personal, US, riskScore 92 from {A['accountsFile']}, the bank's customer risk rating, not computed by graphty; alert {SD['alertId']} from {A['alertsFile']}: structuring, 3 or more transfers of 9,000 to 9,999 USD out in 30 days, raised {when(SD['alertTime'])} UTC. 8 neighbors, 3 in and 5 out.",
      "Pastes the account; reads why and when it was alerted.",
      "Why was it alerted, when, and where does the 92 come from?",
      (1200, 90, 240, 400))
frame("seed-menu", "How big is each hop? The sizes before committing",
      "Nadia opens the menu on the Neighbors button in the node's type row.",
      f"Checkable hop rows with their sizes: 1 hop is 9 nodes and 13 edges; 2 hops {n(H2)}, with a second line naming the pharmacy and the streaming service it mostly comes through; 3 hops {n(A['seed']['hops']['both'][2]['nodes'])}. Then Direction, then the two commands naming the checked count.",
      "Leaves 1 hop checked.",
      "One hop from what? And why does two jump to 283?",
      (1128, 150, 312, 260))
frame("seed-hop1", "One hop: the money passes through",
      "Nadia presses Neighbors, then reads the Edges tab.",
      "Filtered: 9 of 3,000 nodes. Five of the nine are alerted. The Edges tab gives each transfer its time right after the endpoints. The largest, 9,139 to 9,864 USD, go between alerted accounts and four of them into the money transfer service ACC-465572.",
      "Reads the amounts top to bottom.",
      "Where does the money go next, and is that my question or level 2's?",
      (298, 600, 620, 190))
frame("seed-own", "The account's own transfers, in time order",
      "Nadia selects ACC-365386 inside the step.",
      f"The Edges tab follows the selection: its {len(OWN)} transfers, not the step's 13. Sorted by time: {FIN['amount']:,.2f} USD in on {when(FIN['time'])}; the next day, between {BOUT[0]['time'][11:16]} and {BOUT[-1]['time'][11:16]}, {len(BOUT)} transfers of 9,000 to 9,999 USD out. The alert was raised that night, {when(SD['alertTime'])}. The Export section's + offers Export the selection's edges.",
      "Sorts by time; reads in against out.",
      "Did the money come in and go straight out, and how fast?",
      (298, 630, 902, 270))
frame("seed-refer", "Refer it: keep the boundary, write why",
      "Nadia, about six minutes in. She cannot clear it.",
      "A new set, Referred AL-40122, holds the step's 9 accounts. Her note gives the times: in on Aug 5, out the next afternoon to two alerted accounts and the money transfer service, alerted that night, and the later money in; all four personal counterparties are alerted and pay the same service.",
      "Creates the set, adds the note.",
      "Will level 2 see why I escalated without calling me?",
      (1200, 420, 240, 280))
frame("seed-evidence", "The evidence: export the selection's edges",
      "Nadia selects ACC-365386 again and chooses Export the selection's edges.",
      f"The dialog lists the account's own {len(OWN)} transfers, with time and amount, before anything is written. The findings report (.html) also carries her note, the account's attributes with the file each came from, the view and the method; the CSV carries the transfers. It names 9 accounts, 6 of them people. 2 files; nothing is uploaded.",
      "Checks the rows and the head count; exports; escalates in the case system.",
      "Is this the account's own money, with dates, that I can paste into the referral?",
      (360, 43, 720, 470))
frame("next-delete", "Done: delete the step",
      "Nadia opens the filter chip.",
      "The filter steps popover. Under the step, one line: kept from this step, set Referred AL-40122 and 1 note; evidence exported 10:31. The step's menu offers Delete step.",
      "Deletes the step.",
      "Was this boundary kept, or its evidence exported, before I replace it?",
      (298, 60, 540, 190))
frame("next", "AL-40123: a new step on a new seed",
      "Nadia, 10:33.",
      "ACC-492465, a consulting firm alerted for outflow over three times its average. After Filter to, the chip reads Filtered: 1 of 3,000 nodes; its 10 payees come with the next Filter to neighbors.",
      "Find, the hit, Filter to.",
      "Is this one connected to the one I just escalated?",
      (57, 0, 241, 70))
frame("file", "Did anything just upload?",
      "Nadia, after four files written this morning.",
      "The file chip opens Where the data is: read from this computer at 08:41, nothing uploaded this session, saved in this browser, the four files written and when, the Assistant off.",
      "Opens the chip, reads, closes it.",
      "Did any of that leave the bank?",
      (298, 55, 330, 270))

# ---------- Part 2: the escalated case ----------
frame("case-open", "Day 1: the escalation arrives",
      "Sarah, level-2 investigator, Wednesday 15:40. The escalation carries Nadia's project file.",
      "The set Referred AL-40122 is selected: its 9 members are points over the density (2,946 + 54 = 3,000) and Nadia's note heads the inspector.",
      "Reads the note; filters to the set.",
      "What did level 1 already check, and what did they not?",
      (1200, 90, 240, 420))
frame("case-menu", "Two hops: what are the 283?",
      "Sarah, inside the step, ACC-365386 selected.",
      f"The same menu as Nadia's, 2 hops checked: {n(H2)} nodes, mostly through ACC-597001 (Pharmacy, 152 neighbors) and ACC-512219 (Streaming, 109). The 1-hop row says the step already holds those 9.",
      "Chooses Filter to neighbors, 2 hops.",
      "283 -- is that the ring, or two shops' customers?",
      (1128, 150, 312, 260))
frame("case-hop2", "Two hops, sorted by amount",
      "Sarah, the Edges tab.",
      f"Filtered: {n(H2)} of 3,000 nodes. 13 alerted accounts inside, for four different reasons. Sorted by amount, the top 33 transfers are all between 9,000 and 9,999 USD.",
      "Sorts by amount.",
      "I could get this from a statement in a pivot in ten minutes. What does this show that the pivot does not?",
      (298, 600, 620, 190))
frame("case-distractor", "Fourteen accounts: is every one of them in it?",
      "Sarah adds a second filter step: transfers of 9,000 to 9,999 USD, with their accounts.",
      "14 accounts. Twelve pass money to each other, three or more transfers each. ACC-523284 is alerted too, but inside the step it has one transfer, to the money transfer service; its full-graph count says it has two more (a salary from a construction firm and fuel, on its statement).",
      "Selects ACC-523284 and reads it; leaves it and the service out.",
      "Am I finding a ring, or finding what I expect?",
      (1200, 90, 240, 420))
frame("case-ring", "Keep the ring: from the transfers, not the alerts",
      "Sarah, Wednesday 17:05.",
      f"A set of {len(RS['members'])}: {A['ring']['alerted']} alerted, {len(A['ring']['notAlerted'])} never alerted, because they cash out just under 9,000. Its statistics: {RS['transfersAmong']} transfers among them, 226,756.28 USD. Her note says why each is in and why ACC-523284 is not.",
      "Creates the set from the 12 selected, names it, adds a note.",
      "Will I know next week why this set exists, and why those four are in it?",
      (1200, 90, 240, 460))
frame("case-path", "Day 2: does ACC-365386 feed the rest?",
      "Sarah, Thursday morning, the Path tool.",
      "Along transfers, ACC-365386 reaches ACC-580664 in 5 hops of 9,260 to 9,862 USD. Each hop shows its time, and one (Aug 4) is earlier than the hop before: a route along transfers, not one sum moving forward. The inspector adds: ignoring direction, the route is 2 hops through the money transfer service, which is two customers of one service, not a flow.",
      "From and To by Find; Run.",
      "Did the search stay inside the boundary, and is this a flow of money or a shared shop?",
      (298, 600, 902, 250))
frame("case-export", "Day 3: the evidence file for the SAR",
      "Sarah, Friday. She has decided to file.",
      f"She saved a view first, so the report has its own figure. With the set selected, the export is scoped to its {len(RS['members'])} members and the {RS['transfersTouching']} transfers touching them, and says it names {len(RS['members']) + RS['counterparties']['count']} accounts, {RS['counterparties']['kinds'].get('personal', 0)} of them people outside the ring. The figure's print check shows the diamonds in grayscale.",
      "Checks the scope and the head count; exports 4 files for the SAR narrative.",
      "Why would the file name people who are not in the ring, and will the picture survive a black-and-white printout?",
      (360, 153, 720, 300))

# ---------- Variants ----------
frame("rule", "Priya starts from a rule",
      "Priya, a threat hunter, looking for structuring rather than working an alert.",
      f"The filter steps popover's rule editor: keep transfers of 9,000 to 9,999.99 with their nodes. Before committing: {A['rule']['nodes']} nodes, {A['rule']['edges']} edges, {A['rule']['alerted']} of the {A['rule']['nodes']} alerted.",
      "Types the rule; reads the count; Filter to.",
      "How many will this keep before I commit?",
      (298, 60, 310, 290))
frame("rule-find", "Then Find, inside the rule's step",
      "Priya, the step drawn.",
      "Three groups: the ring around the money transfer service, and two universities with their tuition payers. ACC-365386's Connections count within the step (5), with the full-graph count (8) beside it.",
      "Finds ACC-365386 in the step.",
      "Which of these 25 matter, and is the count I see the step's or the whole graph's?",
      (1200, 330, 240, 140))
frame("bank-open", "The whole bank's month: nothing drawn",
      "Nadia's team, the month's file for the whole bank.",
      f"{n(BANK['nodes'])} accounts and {n(BANK['edges'])} transfers: past the drawing limit, so the canvas holds only the not-drawn line. The inspector's statistics and component list stand in; the Alerts set has {n(BANK['alerts'])} members.",
      "Reads the statistics.",
      "The vendor demo ran on twenty accounts. Ours has a million. Where do I start?",
      (1200, 90, 240, 220))
frame("bank-narrow", "Narrow the graph...: the offered steps",
      "Nadia presses Narrow the graph... on the not-drawn line.",
      f"The filter chip's popover. Offered steps with their sizes: the largest component is all {n(BANK['nodes'])}; the top account by degree with its neighbors is {n(BANK['topByDegreeWithNeighbors']['nodes'])}. Neither draws. A line says to start from an account.",
      "Closes it and goes to Find.",
      "Is there any way in from here that is not an account?",
      (298, 60, 310, 200))
frame("bank-menu", "Find the account with nothing drawn",
      "Nadia pastes ACC-365386.",
      f"The hit is selected and its row is in the table, though nothing is drawn. The hop menu counts over the whole bank: 1 hop, 9 nodes; 2 hops, {n(BANK['seedHops'][1]['nodes'])}; 3 hops would not be drawn.",
      "Filter to neighbors, 1 hop.",
      "Can I size this before it takes the machine down?",
      (1128, 150, 312, 270))
frame("bank-hop1", "One hop draws",
      "Nadia.",
      f"Filtered: 9 of {n(BANK['nodes'])} nodes, drawn as on the smaller file, with the same 13 transfers.",
      "Carries on as in frame 9.",
      "Is it the same as on the smaller file?",
      (57, 0, 241, 70))

def crop_html(sid, crop, size):
    x, y, w, h = crop
    s = min(1.0, 560 / w)
    W, H = size
    def one(cls, suffix):
        return (f'<div class="crop {cls}" style="width:{round(w * s)}px;height:{round(h * s)}px;background-image:url(../shots/alert-triage/{sid}{suffix}.png);'
                f'background-size:{round(W * s)}px {round(H * s)}px;background-position:-{round(x * s)}px -{round(y * s)}px" role="img" aria-label="Detail of the frame"></div>')
    return one("k-light-only", "") + one("k-dark-only", "--dark")

frames_html = []
for k, f in enumerate(F, 1):
    x, y, w, h = f["crop"]
    W, Hh = f["size"]
    box = f'<span class="k-annot-box" style="left:{x / W * 100:.1f}%;top:{y / Hh * 100:.1f}%;width:{w / W * 100:.1f}%;height:{h / Hh * 100:.1f}%"></span>'
    does = f'<dt>Does</dt><dd>{f["does"]}</dd>' if f["does"] != "--" else ""
    if f["sid"] == "case-open": frames_html.append('<div><h2 id="case">The escalated case: Sarah, over three days</h2><p>The extension of the alert journey: a level-2 investigator takes what level 1 referred and works it for days, to a decision and a file for the SAR. Nobody times her per alert.</p></div>')
    if f["sid"] == "rule": frames_html.append('<div><h2 id="variants">Variants</h2><p>Two other ways into the same work: a hunt that starts from a rule, and the same month for the whole bank, past the drawing limit, where the journey says investigators start from an account and leave the overview for last.</p></div>')
    frames_html.append(
        f'<figure class="k-frame" id="f{k}"><div class="shot"><a href="{SCR}#{f["sid"]}" class="k-frame-shot">'
        f'<img class="k-light-only" src="../shots/alert-triage/{f["sid"]}.png" alt="{f["title"]}" loading="lazy"><img class="k-dark-only" src="../shots/alert-triage/{f["sid"]}--dark.png" alt="{f["title"]}" loading="lazy">{box}</a>'
        '</div>'
        f'<figcaption><h3><span class="k-step">{k}</span>{f["title"]}</h3><dl><dt>Who and where</dt><dd>{f["who"]}</dd><dt>Sees</dt><dd>{f["sees"]}</dd>{does}</dl>'
        f'<p class="doubt"><span>Doubt</span>{f["doubt"]}</p>{crop_html(f["sid"], f["crop"], f["size"])}<a class="open" href="{SCR}#{f["sid"]}">Open this screen</a></figcaption></figure>')

# ---------- The study: the flagged-account task starts on these frames ----------
NUM = {f["sid"]: k for k, f in enumerate(F, 1)}
Q = json.load(open(os.path.join(PROTO, "kit/fixtures.json")))["tasks"]["flagged-account"]["question"]
SEED = next(x for x in A["alerts"] if x["id"] == "ACC-365386")
TASK = [
    ("open", "The file just opened. Nothing is asked yet; let the participant look for five seconds.", "Is this all 3,000 accounts, or only what fits on the screen?"),
    ("seed-find", "Read the task. The participant finds the account the alert names.", f"Why was {SEED['alertId']} raised, when, and where does the riskScore come from?"),
    ("seed-menu", "The participant decides how far to look.", "One hop from what? And why does two jump to 283?"),
    ("seed-hop1", "The participant reads the counterparties, their amounts and times.", "Where does the money go next, and is that my question or level 2's?"),
    ("seed-own", "The participant reads the account's own transfers in time order.", "Did the money come in and go straight out, and how fast?"),
    ("seed-refer", "The decision and what is kept to justify it.", "Would someone else see why I referred it without calling me?"),
    ("seed-evidence", "The evidence file for the decision.", "Is this the account's own money, with dates, that I can paste into the referral?"),
    ("next-delete", "The participant finishes and clears the step.", "Was this boundary kept, or its evidence exported, before I remove it?"),
    ("file", "Ask: did anything you just did leave this computer?", "Did any of that leave the bank?"),
]
CASE = ["case-open", "case-menu", "case-hop2", "case-distractor", "case-ring", "case-path", "case-export"]
def fl(sid): return f'<a href="#f{NUM[sid]}">frame {NUM[sid]}</a>'
task_rows = "".join(f'<tr><td class="k-num">{i}</td><td>{fl(sid)}: {F[NUM[sid] - 1]["title"]}</td><td>{what}</td><td>{doubt}</td></tr>' for i, (sid, what, doubt) in enumerate(TASK, 1))
STUDY = f"""
  <h2 id="study">In the study: the flagged-account task starts here</h2>
  <p>The flagged-account task is shown on these frames, in the order below, and on nothing else: every screen of the task is the file the participant is told was just opened, the account the task names is in it, and its transfers, with their times and amounts, are on screen from the fourth step on. The same list is the task's page set in <code>kit/fixtures.json</code>.</p>
  <table>
    <tr><th>Question as read</th><td>"{Q}"</td></tr>
    <tr><th>The file opened</th><td><code>{A['file']}</code> (each transfer's time and amount), with the accounts in <code>{A['accountsFile']}</code> (kind, country, riskScore) and the monitoring system's alerts in <code>{A['alertsFile']}</code> (alertId, alertScenario, alertTime): {A['title']}, {n(A['nodes'])} accounts and {n(A['edges'])} transfers, {len(A['alerts'])} accounts alerted. ACC-365386 is alert {SEED['alertId']}, raised {when(SEED['alertTime'])} UTC: {SEED['kind']}, {SEED['country']}, riskScore {SEED['riskScore']}, {SEED['degree']} counterparties ({SEED['in']} paying in, {SEED['out']} paid), alerted for "{SEED['alertScenario']}".</td></tr>
    <tr><th>Not shown</th><td>Stand-in screens on other data (the novel, the proteins, the March transfers), the tuition alert (frames {NUM['tuition-find']} to {NUM['tuition-clear']}) and the next alert (frame {NUM['next']}). Frame {NUM['open-points']} is its own comparison, shown after the task.</td></tr>
    <tr><th>Who</th><td>Anyone who works alerts or cases: the fraud investigator, the threat hunter, the intelligence analyst. A threat hunter who would rather start from a rule also sees frames {NUM['rule']} and {NUM['rule-find']} after the task.</td></tr>
  </table>
  <table>
    <tr><th>Step</th><th>Frame</th><th>When</th><th>Doubt shown with it</th></tr>
    {task_rows}
  </table>
  <p>A participant who wants to go past clear-or-refer ("where did the money go?") continues on Sarah's case, frames {NUM[CASE[0]]} to {NUM[CASE[-1]]}, on the same file.</p>
"""
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Alert triage: from a flagged account to a decision and an evidence file</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  .k-doc {{ max-width: 1320px; }}
  .sb {{ display: grid; gap: 40px; margin-top: 24px; }}
  .sb .k-frame {{ display: grid; grid-template-columns: 640px minmax(0, 1fr); gap: 24px; align-items: start; }}
  .sb .shot {{ display: grid; gap: 8px; }}
  .sb .k-frame-shot {{ display: block; width: 640px; }}
  .sb .crop {{ max-width: 100%; margin-top: 4px; border-radius: 6px; box-shadow: 0 0 0 2px var(--k-annot); background-repeat: no-repeat; }}
  .sb figcaption {{ margin-top: 0 !important; }}
  .sb figcaption h3 {{ margin: 0 0 8px; font-size: 15px; line-height: 22px; }}
  .sb dl {{ display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 4px 12px; margin: 0; }}
  .sb dt {{ color: var(--cm-text-secondary); }}
  .sb dd {{ margin: 0; }}
  .doubt {{ margin: 12px 0 8px; padding: 8px 12px; border-inline-start: 3px solid var(--k-annot); background: var(--k-annot-bg); }}
  .doubt span {{ display: block; font-size: 11px; font-weight: 600; color: var(--k-annot-ink); }}
  .open {{ display: inline-block; margin-top: 4px; color: var(--cm-text-brand); }}
  .outcome {{ padding: 12px 16px; border-radius: 8px; background: var(--cm-bg-secondary); }}
  .k-doc table td, .k-doc table th {{ font-size: 13px; }}
  @media (max-width: 1100px) {{ .sb .k-frame {{ grid-template-columns: 1fr; }} .sb .k-frame-shot {{ width: 100%; }} }}
</style>
</head>
<body>
<div class="k-doc">
  <p><a href="../index.html">Design gallery</a></p>
  <h1>Alert triage: from a flagged account to a decision and an evidence file</h1>
  <p class="k-lede">The bank's transaction monitoring raised 50 alerts on August's 3,000 accounts; like real monitoring output, most are ordinary life. Nadia, a level-1 reviewer, works the queue: she clears a tuition payment with a note and an evidence file, refers an account that passes money through with a set and a note, and starts the next alert. Sarah, a level-2 investigator, takes the referred account over three days: she finds a ring of 12, four of them never alerted, rules out an alerted lookalike, follows the money, and exports the file for a suspicious activity report. Two variants follow: a hunt that starts from a rule, and the same month for the whole bank, past the drawing limit.</p>

  <table>
    <tr><th>People</th><td>Nadia, <a href="../study/personas/alert-reviewer.md">level-1 alert reviewer</a> (the queue, a few minutes per alert); Sarah, <a href="../study/personas/fraud-analyst.md">level-2 fraud investigator</a> (cases over days); Priya, <a href="../study/personas/cybersecurity-analyst.md">threat hunter</a> (the rule variant).</td></tr>
    <tr><th>Data</th><td>August transfers: 3,000 accounts, {n(A['edges'])} transfers, 50 alerted, 42 of them benign; a 12-account ring that only 8 alerts touch. The whole bank's August: {n(BANK['nodes'])} accounts containing the same 3,000. Every number is computed by <code>kit/gen-alerts.mjs</code> into <code>kit/alerts.json</code>.</td></tr>
    <tr><th>Screens</th><td>Every frame is a state of <a href="{SCR}">the alert triage screens</a>, 1440 by 900 (four key states also at 1536 by 740, the reviewers' zoomed laptops), light and dark, with an annotation layer citing the design framework and naming the compact-mantine component of each element.</td></tr>
    <tr><th>Behavior</th><td>Focus after each step, undo labels, and the cancel and failure branches are in <a href="{FLOW}">the alert triage flow</a>.</td></tr>
    <tr><th>Doubts</th><td>Each frame ends with the doubt the screen must answer, taken from the journey's trust questions and the personas' own objections. They are questions, not findings: in study sessions the frames are shown with the doubts only, and what participants do and say is recorded in the study folder.</td></tr>
  </table>
{STUDY}
  <h2 id="triage">The triage: Nadia works the alert queue</h2>
  <p>The main line of the alert journey: most alerts end early, cleared or referred, in one sitting.</p>
  <div class="sb">
  {"".join(frames_html)}
  </div>

  <h2 id="outcome">Outcome</h2>
  <div class="outcome">
    <p><b>Nadia, 10:14 to 10:33.</b> Two alerts decided and a third started. Each alert's evidence is the account's own transfers, exported as the selection's edges: 2 files, a findings report (.html) with her note, the account's attributes and the file each came from, the view and the method, and a CSV of the transfers with time and amount. The cleared alert leaves only that. The referred alert also leaves a set of its 9 accounts with a note. Keeping the referred boundary and starting the next alert took 6 steps (Create set, Add note, Delete step, Find, the hit, Filter to), counted as the next-seed task flow counts them. That flow's budget is 3; this is over it, and the proposed single command that keeps the boundary and starts the next is the fix to test.</p>
    <p><b>Sarah, Wednesday to Friday.</b> A set of 12 built from the transfers of 9,000 to 9,999 USD, not from the alert flag: 4 of its members were never alerted, and an alerted lookalike was ruled out and the reason written down. A 5-hop path along transfers links the escalated account to the rest; its times show one hop earlier than the one before, so it is a route, not one sum traced forward. The evidence file for the SAR is scoped to the set, names its 46 accounts before it is written, carries one saved view and both notes, and reads in grayscale.</p>
    <p><b>Past the drawing limit.</b> On the whole bank's month nothing draws, the offered steps do not help, and Find on the account plus one hop brings the same 9 accounts back on screen.</p>
  </div>
  <p>What this storyboard proposes to change in the design framework is in <a href="../framework-changes.md">framework-changes.md</a>, under the entries starting "Alert triage".</p>
</div>
</body>
</html>
"""
html.encode("ascii")
open(os.path.join(PROTO, "storyboards/alert-triage.html"), "w").write(html)
print(len(F), "frames")
