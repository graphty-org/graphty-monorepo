# Tier 2 round 1 session list: checks it against roster.md's allocation; writes the plan's table (table.md) and sessions.json to the current folder.
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
ORDER = """T20 A Dev; T20 B Grace; T20 A Alex; T20 B Jordan; T20 A Elena; T20 B Nadia; T20 A Dana; T20 B Tom;
T17 A Ruth; T17 B Dev; T17 A Jordan; T17 B Alex; T17 A Elena; T17 B Grace; T17 A Nadia; T17 B Tom;
T18 A Ruth; T18 B Nadia; T18 A Dana; T18 B Alex; T18 A Grace; T18 B Dev; T18 A Elena; T18 B Tom;
T21 A Grace; T21 B Dev; T21 A Alex; T21 B Dana; T21 A Tom; T21 B Ruth; T21 A Jordan; T21 B Nadia;
T4 A Grace; T4 B Tom; T4 A Dana; T4 B Alex; T4 A Elena; T4 B Ruth;
T19 A Tom; T19 B Dev; T19 A Jordan; T19 B Elena;
T22 A Nadia; T22 B Ruth; T22 A Jordan; T22 B Dana;
T23 A Elena; T23 B Grace; T23 A Jordan; T23 B Nadia;
T24 A Ruth; T24 B Dev; T24 A Dana; T24 B Alex;
T12R A Ruth; T12R B Jordan"""
rows = [tuple(x.split()) for x in ORDER.replace("\n", " ").split(";")]
# roster.md "Who takes which task in round 1", copied as sets per half
ROSTER = {("T20","A"):"Dev Elena Alex Dana",("T20","B"):"Grace Nadia Tom Jordan",("T21","A"):"Grace Tom Alex Jordan",
 ("T21","B"):"Dev Ruth Nadia Dana",("T17","A"):"Ruth Elena Nadia Jordan",("T17","B"):"Grace Dev Tom Alex",
 ("T18","A"):"Ruth Grace Elena Dana",("T18","B"):"Nadia Dev Tom Alex",("T4","A"):"Grace Elena Dana",("T4","B"):"Tom Ruth Alex",
 ("T19","A"):"Tom Jordan",("T19","B"):"Dev Elena",("T22","A"):"Nadia Jordan",("T22","B"):"Ruth Dana",("T23","A"):"Elena Jordan",
 ("T23","B"):"Grace Nadia",("T24","A"):"Ruth Dana",("T24","B"):"Dev Alex",("T12R","A"):"Ruth",("T12R","B"):"Jordan"}
assert len(rows) == 56, len(rows)
got = collections.defaultdict(set)
for t, h, p in rows: got[(t, h)].add(p)
for k, v in ROSTER.items(): assert got[k] == set(v.split()), (k, got[k])
per = collections.Counter(p for _, _, p in rows)
assert all(per[p] == (7 if p in ("Ruth", "Jordan") else 6) for p in FILES), per
for t in {r[0] for r in rows}: assert not ({p for tt, h, p in rows if tt == t and h == "A"} & {p for tt, h, p in rows if tt == t and h == "B"}), t
assert sum(per[p] for p in GRAD) == 37
out, md = [], []
for i, (t, h, p) in enumerate(rows, 1):
    sid = f"r1-s{i:02d}"; ds, st = DATA[(t, h)]
    out.append({"id": sid, "task": t, "dataset": f"{h}: {ds}", "start": st,
                "persona": f"{p} ({'tier 1 graduate' if p in GRAD else 'regular analyst'}); files: " + ", then ".join(FILES[p]) + "; history: tier2/roster.md, under " + p})
    md.append(f"| {sid} | {t} | {h}: {ds} | {p}{'' if p in GRAD else ' (analyst)'} | `{st}` |")
open("sessions.json", "w").write(json.dumps(out, indent=1))
open("table.md", "w").write("\n".join(md) + "\n")
print("ok", len(out), dict(per))
