# Hand values for the new tier 2 tasks (cross-check only; the key takes the build's values).
import csv, re, collections
F = "/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/files/"
S = "/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/graphty/public/samples/"
def csv_edges(n):
    r = list(csv.reader(open(F + n)))
    return [(a, b, float(w)) for a, b, w in r[1:]]
def gml(n):
    t = open(S + n).read()
    ids = {}
    for m in re.finditer(r'node\s*\[(.*?)\]', t, re.S):
        b = m.group(1)
        i = re.search(r'\bid\s+(\S+)', b).group(1)
        lab = re.search(r'\b(?:label|name)\s+"([^"]*)"', b)
        ids[i] = lab.group(1) if lab else i
    es = []
    for m in re.finditer(r'edge\s*\[(.*?)\]', t, re.S):
        b = m.group(1)
        s = re.search(r'\bsource\s+(\S+)', b).group(1); d = re.search(r'\btarget\s+(\S+)', b).group(1)
        w = re.search(r'\b(?:value|shared_chapters|weight)\s+([0-9.]+)', b)
        es.append((ids[s], ids[d], float(w.group(1)) if w else 1.0))
    return es
def within(es, src, k, mode):
    adj = collections.defaultdict(set)
    for a, b, _ in es:
        if mode in ("out", "all"): adj[a].add(b)
        if mode in ("in", "all"): adj[b].add(a)
    seen, front = {src}, {src}
    for _ in range(k):
        front = {y for x in front for y in adj[x]} - seen
        seen |= front
    return sorted(seen - {src})
fr, bus, les, flo = csv_edges("friends.csv"), csv_edges("bus-stops.csv"), gml("les-miserables.gml"), gml("florentine.gml")
print("lesmis edges", len(les), "florentine edges", len(flo))
for mode in ("out", "all"):
    print("Ava 2 hops", mode, len(within(fr, "Ava", 2, mode)), within(fr, "Ava", 2, mode))
print("Ava 1 hop all", within(fr, "Ava", 1, "all"))
for k in (1, 2):
    print("Medici", k, len(within(flo, "Medici", k, "all")), within(flo, "Medici", k, "all"))
    print("Valjean", k, len(within(les, "Valjean", k, "all")))
print("bus >=10", [e for e in bus if e[2] >= 10])
for t in (8, 10, 12, 15):
    m = [e for e in les if e[2] >= t]
    print("lesmis >=", t, len(m), sorted({x for e in m for x in e[:2]}))
print([e for e in fr if {e[0], e[1]} == {"Gus", "Ivan"}], [e for e in bus if {e[0], e[1]} == {"Station", "Stadium"}])
print("friends weight 5", [e for e in fr if e[2] == 5])
