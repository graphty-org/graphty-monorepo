# Tier 2 round 2 session list: checks it against roster.md's allocation; writes the plan's table (table.md) and sessions.json to the current folder.
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
ORDER = """T20 A Grace; T20 B Dev; T20 A Jordan; T20 B Alex; T20 A Nadia; T20 B Elena; T20 A Tom; T20 B Dana;
T22 A Ruth; T22 B Nadia; T22 A Dana; T22 B Jordan; T22 A Elena; T22 B Grace; T22 A Tom; T22 B Alex;
T17 A Grace; T17 B Ruth; T17 A Alex; T17 B Jordan; T17 A Dev; T17 B Elena; T17 A Tom; T17 B Nadia;
T18 A Nadia; T18 B Ruth; T18 A Alex; T18 B Dana; T18 A Dev; T18 B Grace; T18 A Tom; T18 B Elena;
T21 A Dev; T21 B Grace; T21 A Dana; T21 B Alex; T21 A Ruth; T21 B Jordan; T21 A Nadia; T21 B Tom;
T4 A Tom; T4 B Dana; T4 A Dev; T4 B Elena;
T19 A Dev; T19 B Jordan; T19 B Grace;
T23 A Nadia; T23 B Elena; T23 A Ruth;
T24 A Alex; T24 B Ruth; T24 A Jordan; T24 B Dana;
T12R A Jordan; T12R B Ruth"""
rows = [tuple(x.split()) for x in ORDER.replace("\n", " ").split(";")]
# round 2 allocation (plan.md, "Who takes which task"): round 1's core-four and T22 halves swapped, the rest rotated
ROSTER = {("T20","A"):"Grace Nadia Tom Jordan",("T20","B"):"Dev Elena Alex Dana",("T21","A"):"Dev Ruth Nadia Dana",
 ("T21","B"):"Grace Tom Alex Jordan",("T17","A"):"Grace Dev Tom Alex",("T17","B"):"Ruth Elena Nadia Jordan",
 ("T18","A"):"Nadia Dev Tom Alex",("T18","B"):"Ruth Grace Elena Dana",("T4","A"):"Tom Dev",("T4","B"):"Dana Elena",
 ("T19","A"):"Dev",("T19","B"):"Jordan Grace",("T22","A"):"Ruth Dana Elena Tom",("T22","B"):"Nadia Jordan Grace Alex",("T23","A"):"Nadia Ruth",
 ("T23","B"):"Elena",("T24","A"):"Alex Jordan",("T24","B"):"Ruth Dana",("T12R","A"):"Jordan",("T12R","B"):"Ruth"}
assert len(rows) == 56, len(rows)
got = collections.defaultdict(set)
for t, h, p in rows: got[(t, h)].add(p)
for k, v in ROSTER.items(): assert got[k] == set(v.split()), (k, got[k])
per = collections.Counter(p for _, _, p in rows)
assert all(per[p] == (7 if p in ("Ruth", "Jordan") else 6) for p in FILES), per
for t in {r[0] for r in rows}: assert not ({p for tt, h, p in rows if tt == t and h == "A"} & {p for tt, h, p in rows if tt == t and h == "B"}), t
assert sum(per[p] for p in GRAD) == 37
assert "Ruth" not in {p for t, h, p in rows if t == "T19"}  # her own word "notes" names the place T19 measures
size = collections.Counter(t for t, _, _ in rows)
assert size == {"T20": 8, "T21": 8, "T17": 8, "T18": 8, "T22": 8, "T4": 4, "T24": 4, "T19": 3, "T23": 3, "T12R": 2}, size
# round 1 sets per half, so a persona meets the other dataset of each core-four task and T22
R1 = {("T20","A"):"Dev Elena Alex Dana",("T20","B"):"Grace Nadia Tom Jordan",("T21","A"):"Grace Tom Alex Jordan",("T21","B"):"Dev Ruth Nadia Dana",
 ("T17","A"):"Ruth Elena Nadia Jordan",("T17","B"):"Grace Dev Tom Alex",("T18","A"):"Ruth Grace Elena Dana",("T18","B"):"Nadia Dev Tom Alex"}
for (t, h), v in R1.items(): assert set(v.split()) == got[(t, "B" if h == "A" else "A")], (t, h)
assert {"Ruth", "Dana"} <= got[("T22","A")] and {"Nadia", "Jordan"} <= got[("T22","B")]
out, md = [], []
for i, (t, h, p) in enumerate(rows, 1):
    sid = f"r2-s{i:02d}"; ds, st = DATA[(t, h)]
    out.append({"id": sid, "task": t, "dataset": f"{h}: {ds}", "start": st,
                "persona": f"{p} ({'tier 1 graduate' if p in GRAD else 'regular analyst'}); files: " + ", then ".join(FILES[p]) + "; history: tier2/roster.md, under " + p})
    md.append(f"| {sid} | {t} | {h}: {ds} | {p}{'' if p in GRAD else ' (analyst)'} | `{st}` |")
open("sessions.json", "w").write(json.dumps(out, indent=1))
open("table.md", "w").write("\n".join(md) + "\n")
print("ok", len(out), dict(per))
