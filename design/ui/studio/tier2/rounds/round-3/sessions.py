# Tier 2 round 3 session list: checks it against roster.md's allocation; writes the plan's table (table.md) and sessions.json to the current folder.
import json, collections
S = "/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/personas/"
P = "/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/personas/"
FILES = {
    "Grace": [S + "nonprofit-operations-analyst.md", S + "returning-nonprofit-analyst.md"],
    "Ruth": [S + "data-journalist.md", S + "returning-data-journalist.md"],
    "Dev": [S + "class-project-student.md", S + "returning-class-project-student.md"],
    "Elena": [P + "explorer-elena.md"], "Nadia": [P + "alert-reviewer.md"], "Tom": [P + "recipe-recipient.md"],
    "Alex": [P + "analyst-alex.md"], "Jordan": [P + "marketing-analyst.md"], "Dana": [P + "supply-chain-analyst.md"],
}
GRAD = {"Grace", "Ruth", "Dev", "Elena", "Nadia", "Tom"}
DATA = {
    ("T20", "A"): ("bus stops, bus-stops.csv", "empty"), ("T20", "B"): ("hiking trails, trails.csv", "empty"),
    ("T17", "A"): ("running club, friends.csv", "setup:friends-ranked.txt"), ("T17", "B"): ("Les Miserables", "setup:lesmis-ranked.txt"),
    ("T18", "A"): ("running club, friends.csv", "setup:friends-ranked.txt"), ("T18", "B"): ("Florentine families", "setup:florentine-ranked.txt"),
    ("T21", "A"): ("running club, friends.csv to friends-v2.csv", "setup:friends-ranked.txt"), ("T21", "B"): ("team, team.csv to team-v2.csv", "setup:team-ranked.txt"),
    ("T4", "A"): ("office, people.csv + messages.csv", "empty"), ("T4", "B"): ("football, players.csv + passes.csv", "empty"),
    ("T19", "A"): ("running club, friends.csv", "setup:friends-ranked.txt"), ("T19", "B"): ("Florentine families", "setup:florentine-ranked.txt"),
    ("T22", "A"): ("bus stops, bus-stops.csv", "setup:bus-stops-ranked.txt"), ("T22", "B"): ("Les Miserables", "setup:lesmis-ranked.txt"),
    ("T23", "A"): ("running club, friends.csv", "setup:friends-ranked.txt"), ("T23", "B"): ("Florentine families", "setup:florentine-ranked.txt"),
    ("T24", "A"): ("running club, friends.csv, names drawn", "setup:friends-ranked-names.txt"), ("T24", "B"): ("bus stops, bus-stops.csv, names drawn", "setup:bus-stops-ranked-names.txt"),
    ("T12R", "A"): ("Les Miserables", "setup:lesmis-ranked.txt"), ("T12R", "B"): ("Florentine families", "setup:florentine-ranked.txt"),
}
ORDER = """T20 A Nadia; T20 B Grace; T20 A Dev; T20 B Jordan; T20 A Alex; T20 B Tom; T20 A Elena; T20 B Dana;
T22 A Nadia; T22 B Ruth; T22 A Jordan; T22 B Dana; T22 A Grace; T22 B Elena; T22 A Alex; T22 B Tom;
T21 A Grace; T21 B Dev; T21 A Alex; T21 B Dana; T21 A Jordan; T21 B Ruth; T21 A Tom; T21 B Nadia;
T18 A Ruth; T18 B Nadia; T18 A Dana; T18 B Alex; T18 A Grace; T18 B Dev; T18 A Elena; T18 B Tom;
T17 A Ruth; T17 B Grace; T17 A Jordan; T17 B Alex; T17 A Elena; T17 B Dev; T17 A Nadia; T17 B Tom;
T24 A Ruth; T24 B Alex; T24 A Dana; T24 B Jordan;
T23 A Elena; T23 B Nadia; T23 A Tom; T23 B Ruth;
T4 A Elena; T4 B Dev; T4 A Dana;
T19 A Grace; T19 B Dev; T19 A Jordan;
T12R A Ruth; T12R B Jordan"""
rows = [tuple(x.split()) for x in ORDER.replace("\n", " ").split(";")]
import os
for p, fs in FILES.items():
    for f in fs: assert os.path.exists(f), f
# round 3 allocation (plan.md, "Who takes which task"): round 2's halves swapped wherever the round allows
ROSTER = {("T20","A"):"Nadia Dev Elena Alex",("T20","B"):"Grace Tom Jordan Dana",
 ("T22","A"):"Nadia Grace Jordan Alex",("T22","B"):"Ruth Elena Tom Dana",
 ("T17","A"):"Ruth Elena Nadia Jordan",("T17","B"):"Grace Dev Tom Alex",
 ("T18","A"):"Ruth Grace Elena Dana",("T18","B"):"Nadia Dev Tom Alex",
 ("T21","A"):"Grace Tom Alex Jordan",("T21","B"):"Dev Ruth Nadia Dana",
 ("T4","A"):"Elena Dana",("T4","B"):"Dev",("T19","A"):"Grace Jordan",("T19","B"):"Dev",
 ("T23","A"):"Elena Tom",("T23","B"):"Nadia Ruth",("T24","A"):"Ruth Dana",("T24","B"):"Alex Jordan",
 ("T12R","A"):"Ruth",("T12R","B"):"Jordan"}
assert len(rows) == 56, len(rows)
got = collections.defaultdict(set)
for t, h, p in rows: got[(t, h)].add(p)
assert set(got) == set(ROSTER)
for k, v in ROSTER.items(): assert got[k] == set(v.split()), (k, got[k])
per = collections.Counter(p for _, _, p in rows)
assert all(per[p] == (7 if p in ("Ruth", "Jordan") else 6) for p in FILES), per
for t in {r[0] for r in rows}: assert not ({p for tt, h, p in rows if tt == t and h == "A"} & {p for tt, h, p in rows if tt == t and h == "B"}), t
assert sum(per[p] for p in GRAD) == 37
assert "Ruth" not in {p for t, h, p in rows if t == "T19"}  # her own word "notes" names the place T19 measures
size = collections.Counter(t for t, _, _ in rows)
assert size == {"T20": 8, "T21": 8, "T17": 8, "T18": 8, "T22": 8, "T23": 4, "T24": 4, "T4": 3, "T19": 3, "T12R": 2}, size
# r2-s05 run again: T20 A, Nadia, empty, first in the round (criteria.md, "Round 3 re-runs")
assert rows[0] == ("T20", "A", "Nadia")
# every persona meets the other half from round 2 wherever it took the task then, except the two the rules force
R2 = {("T20","A"):"Grace Nadia Tom Jordan",("T20","B"):"Dev Elena Alex Dana",("T21","A"):"Dev Ruth Nadia Dana",
 ("T21","B"):"Grace Tom Alex Jordan",("T17","A"):"Grace Dev Tom Alex",("T17","B"):"Ruth Elena Nadia Jordan",
 ("T18","A"):"Nadia Dev Tom Alex",("T18","B"):"Ruth Grace Elena Dana",("T4","A"):"Tom Dev",("T4","B"):"Dana Elena",
 ("T19","A"):"Dev",("T19","B"):"Jordan Grace",("T22","A"):"Ruth Dana Elena Tom",("T22","B"):"Nadia Jordan Grace Alex",
 ("T23","A"):"Nadia Ruth",("T23","B"):"Elena",("T24","A"):"Alex Jordan",("T24","B"):"Ruth Dana",("T12R","A"):"Jordan",("T12R","B"):"Ruth"}
same = sorted((t, h, p) for t, h, p in rows if p in R2.get((t, h), "").split())
assert same == [("T20", "A", "Nadia"), ("T20", "B", "Dana")], same  # Nadia: the r2-s05 re-run; Dana: T20 A has no room once Nadia is in it
# halves alternate within a task, so a defect on one dataset shows in a task's first sessions
for t in size:
    hs = [h for tt, h, _ in rows if tt == t]
    assert all(a != b for a, b in zip(hs, hs[1:])), (t, hs)
out, md = [], []
for i, (t, h, p) in enumerate(rows, 1):
    sid = f"r3-s{i:02d}"; ds, st = DATA[(t, h)]
    out.append({"id": sid, "task": t, "dataset": f"{h}: {ds}", "start": st,
                "persona": f"{p} ({'tier 1 graduate' if p in GRAD else 'regular analyst'}); files: " + ", then ".join(FILES[p]) + "; history: tier2/roster.md, under " + p})
    md.append(f"| {sid} | {t} | {h}: {ds} | {p}{'' if p in GRAD else ' (analyst)'} | `{st}` |")
open("sessions.json", "w").write(json.dumps(out, indent=1))
open("table.md", "w").write("\n".join(md) + "\n")
print("ok", len(out), dict(per))
