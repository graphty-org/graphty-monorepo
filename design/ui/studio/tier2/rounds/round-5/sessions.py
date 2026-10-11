# Tier 2 round 5 session list: checks it against plan.md's allocation; writes the plan's table (table.md) and sessions.json to the current folder.
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
ORDER = """T22 A Grace; T22 B Ruth; T22 A Alex; T22 B Dana; T22 A Nadia; T22 B Elena; T22 A Tom; T22 B Jordan;
T17 A Ruth; T17 B Grace; T17 A Jordan; T17 B Alex; T17 A Elena; T17 B Dev; T17 A Nadia; T17 B Tom;
T18 A Ruth; T18 B Nadia; T18 A Dana; T18 B Alex; T18 A Grace; T18 B Dev; T18 A Elena; T18 B Tom;
T24 A Ruth; T24 B Dev; T24 A Dana; T24 B Jordan;
T20 A Nadia; T20 B Grace; T20 A Alex; T20 B Dana; T20 A Dev; T20 B Tom; T20 A Elena; T20 B Jordan;
T21 A Grace; T21 B Dev; T21 A Alex; T21 B Dana; T21 A Tom; T21 B Ruth; T21 A Jordan; T21 B Nadia;
T19 A Jordan; T19 B Elena; T19 A Grace; T19 B Alex;
T23 A Elena; T23 B Ruth; T23 A Tom; T23 B Nadia;
T4 A Dana; T4 B Dev;
T12R A Ruth; T12R B Jordan"""
rows = [tuple(x.split()) for x in ORDER.replace("\n", " ").split(";")]
for p, fs in FILES.items():
    for f in fs: assert os.path.exists(f), f
here = os.path.dirname(os.path.abspath(__file__))
def load(n):
    d = collections.defaultdict(set)
    for s in json.load(open(os.path.join(here, f"../round-{n}/sessions.json"))):
        d[(s["task"], s["dataset"][0])].add(s["persona"].split()[0])
    return d
R4 = load(4)
assert len(rows) == 56, len(rows)
assert len(set(rows)) == 56
size = collections.Counter(t for t, _, _ in rows)
# criteria.md "Round plan": the core four at 8 always; T22 at 8 (bar 10's severity 3 sits on its route, three fixes);
# T19 and T23 at 4 (a fix touched each); T24 at 4 (drawn names over its tie); T4 and T12R at 2, covered
assert size == {"T20": 8, "T21": 8, "T17": 8, "T18": 8, "T22": 8, "T19": 4, "T23": 4, "T24": 4, "T4": 2, "T12R": 2}, size
half = collections.Counter((t, h) for t, h, _ in rows)
assert all(half[(t, "A")] == half[(t, "B")] for t in size), half
per = collections.Counter(p for _, _, p in rows)
assert all(per[p] == (7 if p in ("Ruth", "Jordan") else 6) for p in FILES), per
assert sum(per[p] for p in GRAD) == 37
for t in size:
    ps = [p for tt, _, p in rows if tt == t]
    assert len(ps) == len(set(ps)), t  # one session per persona per task, so never both halves
    if size[t] >= 4:
        assert len(set(ps)) >= 3
        for h in "AB": assert len({p for tt, hh, p in rows if tt == t and hh == h}) >= 2, (t, h)
assert "Ruth" not in {p for t, h, p in rows if t == "T19"}  # her own word "notes" names the place T19 measures
assert "Dana" not in {p for t, h, p in rows if t == "T17"}  # her history still names the toolbar, where Filters starts
# every persona meets the other half from round 4 wherever it took the task then
same = sorted((t, h, p) for t, h, p in rows if p in R4[(t, h)])
assert same == [], same
# T22 first: bar 10's severity 3 on its natural route, and three fixes on it
assert [r[0] for r in rows[:8]] == ["T22"] * 8
for t in size:
    hs = [h for tt, h, _ in rows if tt == t]
    assert all(a != b for a, b in zip(hs, hs[1:])), (t, hs)
out, md = [], []
for i, (t, h, p) in enumerate(rows, 1):
    sid = f"r5-s{i:02d}"; ds, st = DATA[(t, h)]
    out.append({"id": sid, "task": t, "dataset": f"{h}: {ds}", "start": st,
                "persona": f"{p} ({'tier 1 graduate' if p in GRAD else 'regular analyst'}); files: " + ", then ".join(FILES[p]) + "; history: tier2/roster.md, under " + p})
    md.append(f"| {sid} | {t} | {h}: {ds} | {p}{'' if p in GRAD else ' (analyst)'} | `{st}` |")
open("sessions.json", "w").write(json.dumps(out, indent=1))
open("table.md", "w").write("\n".join(md) + "\n")
print("ok", len(out), dict(per))
