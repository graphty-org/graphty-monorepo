# Tier 2 round 4 session list: checks it against plan.md's allocation; writes the plan's table (table.md) and sessions.json to the current folder.
import json, collections, os
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
# every start is the roster's ("Where each session starts"); a setup file must exist
SETUPS = "/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/tier-2/setups/"
for ds, st in DATA.values():
    if st.startswith("setup:"): assert os.path.exists(SETUPS + st[6:]), st
ORDER = """T24 A Alex; T24 B Ruth; T24 A Nadia; T24 B Grace; T24 A Jordan; T24 B Dana; T24 A Tom; T24 B Elena;
T22 A Ruth; T22 B Grace; T22 A Dana; T22 B Alex;
T18 A Nadia; T18 B Ruth; T18 A Dev; T18 B Dana; T18 A Alex; T18 B Grace; T18 A Tom; T18 B Elena;
T17 A Grace; T17 B Ruth; T17 A Dev; T17 B Jordan; T17 A Alex; T17 B Elena; T17 A Tom; T17 B Nadia;
T20 A Grace; T20 B Nadia; T20 A Jordan; T20 B Dev; T20 A Tom; T20 B Alex; T20 A Dana; T20 B Elena;
T21 A Dev; T21 B Grace; T21 A Dana; T21 B Alex; T21 A Ruth; T21 B Tom; T21 A Nadia; T21 B Jordan;
T23 A Nadia; T23 B Elena; T23 A Ruth; T23 B Tom;
T4 A Dev; T4 B Dana; T4 A Jordan; T4 B Elena;
T12R A Jordan; T12R B Ruth;
T19 A Dev; T19 B Jordan"""
rows = [tuple(x.split()) for x in ORDER.replace("\n", " ").split(";")]
for p, fs in FILES.items():
    for f in fs: assert os.path.exists(f), f
ROSTER = {("T20","A"):"Grace Tom Jordan Dana",("T20","B"):"Nadia Dev Elena Alex",
 ("T21","A"):"Dev Ruth Nadia Dana",("T21","B"):"Grace Tom Alex Jordan",
 ("T18","A"):"Nadia Dev Tom Alex",("T18","B"):"Ruth Grace Elena Dana",
 ("T17","A"):"Grace Dev Tom Alex",("T17","B"):"Ruth Elena Nadia Jordan",
 ("T24","A"):"Alex Jordan Nadia Tom",("T24","B"):"Ruth Dana Grace Elena",
 ("T22","A"):"Ruth Dana",("T22","B"):"Grace Alex",
 ("T23","A"):"Nadia Ruth",("T23","B"):"Elena Tom",
 ("T4","A"):"Dev Jordan",("T4","B"):"Elena Dana",
 ("T19","A"):"Dev",("T19","B"):"Jordan",("T12R","A"):"Jordan",("T12R","B"):"Ruth"}
assert len(rows) == 56, len(rows)
got = collections.defaultdict(set)
for t, h, p in rows: got[(t, h)].add(p)
assert set(got) == set(ROSTER)
for k, v in ROSTER.items(): assert got[k] == set(v.split()), (k, got[k])
assert len(set(rows)) == 56
per = collections.Counter(p for _, _, p in rows)
assert all(per[p] == (7 if p in ("Ruth", "Jordan") else 6) for p in FILES), per
for t in {r[0] for r in rows}: assert not ({p for tt, h, p in rows if tt == t and h == "A"} & {p for tt, h, p in rows if tt == t and h == "B"}), t
assert sum(per[p] for p in GRAD) == 37
assert "Ruth" not in {p for t, h, p in rows if t == "T19"}  # her own word "notes" names the place T19 measures
size = collections.Counter(t for t, _, _ in rows)
# criteria.md bar 1: full size is 8; T24 missed its bar in round 3, so it runs at 8; the core four at 8 always
assert size == {"T24": 8, "T20": 8, "T21": 8, "T17": 8, "T18": 8, "T22": 4, "T23": 4, "T4": 4, "T19": 2, "T12R": 2}, size
for t in ("T24", "T20", "T21", "T17", "T18", "T22", "T23", "T4"):
    for h in "AB": assert len({p for tt, hh, p in rows if tt == t and hh == h}) >= 2, (t, h)
# T24 first: the one task below its bar, and its reworded prompt's first briefed sessions
assert [r[0] for r in rows[:8]] == ["T24"] * 8
# every persona meets the other half from round 3 wherever it took the task then (round-3/sessions.json)
R3 = collections.defaultdict(set)
for s in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../round-3/sessions.json"))):
    R3[(s["task"], s["dataset"][0])].add(s["persona"].split()[0])
same = sorted((t, h, p) for t, h, p in rows if p in R3[(t, h)])
assert same == [], same
# halves alternate within a task, so a defect on one dataset shows in a task's first sessions
for t in size:
    hs = [h for tt, h, _ in rows if tt == t]
    assert all(a != b for a, b in zip(hs, hs[1:])), (t, hs)
out, md = [], []
for i, (t, h, p) in enumerate(rows, 1):
    sid = f"r4-s{i:02d}"; ds, st = DATA[(t, h)]
    out.append({"id": sid, "task": t, "dataset": f"{h}: {ds}", "start": st,
                "persona": f"{p} ({'tier 1 graduate' if p in GRAD else 'regular analyst'}); files: " + ", then ".join(FILES[p]) + "; history: tier2/roster.md, under " + p})
    md.append(f"| {sid} | {t} | {h}: {ds} | {p}{'' if p in GRAD else ' (analyst)'} | `{st}` |")
open("sessions.json", "w").write(json.dumps(out, indent=1))
open("table.md", "w").write("\n".join(md) + "\n")
print("ok", len(out), dict(per))
