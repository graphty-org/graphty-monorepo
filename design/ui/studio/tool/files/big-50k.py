# Writes tier 5's two 50,000-node study files next to this script (git ignores them; run it once
# before a tier 5 dry run or round): python3 big-50k.py
#   staff-50k.graphml   -- a research office's staff network: name, dept (40 departments), 100,000 ties
#   sensors-50k.graphml -- a state's river sensor network: station, basin (40 basins), 100,000 stretches
# Seeded, so every run writes the same files and answers.md's counts hold. Prints each value's count.
import os, random
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
N, E = 50000, 100000
DEPTS = ["Facilities", "Research Computing", "Finance", "Human Resources", "Library", "Admissions",
         "Student Services", "Communications", "Legal", "Procurement", "Grants", "Payroll", "Security",
         "Catering", "Transport", "Archives", "Travel", "Alumni Relations", "Health and Safety", "Estates",
         "Print Shop", "Mail Room", "Help Desk", "Events", "Ethics Board", "Data Office", "Sports",
         "Language Centre", "Careers", "Chaplaincy", "Museum", "Herbarium", "Observatory", "Farm",
         "Boathouse", "Nursery", "Press Office", "Records", "Insurance", "Parking"]
BASINS = ["Lower Delta", "Grand Reach", "North Fork", "Pine Valley", "Clear Lake", "Red Bluff",
          "South Fork", "Willow Flats", "Bear Creek", "Stony Brook", "Otter Creek", "Hollow Run",
          "Elk River", "Cedar Basin", "Fox Hollow", "Mill Race", "Heron Bay", "Birch Creek",
          "Granite Falls", "Sandy Bottom", "Crow Wing", "Maple Run", "Iron Gate", "Swan Marsh",
          "Black Ash", "Owl Creek", "Copper Run", "Lynx Lake", "Quarry Brook", "Bell Spring",
          "Tamarack", "Moss Glen", "Wolf Pond", "Gull Point", "Ash Hollow", "Sage Flat",
          "Juniper Wash", "Cold Spring", "Kettle Pond", "Hawk Ridge"]


def write(name, key, label, values, seed):
    rnd = random.Random(seed)
    w = [1.0 / (i + 1) for i in range(len(values))]
    group = rnd.choices(values, w, k=N)
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
             f'<key id="{key}" for="node" attr.name="{key}" attr.type="string"/>',
             f'<key id="{label}" for="node" attr.name="{label}" attr.type="string"/>',
             '<graph id="G" edgedefault="undirected">']
    prefix = "Person" if key == "name" else "Sensor"
    for i in range(N):
        lines.append(f'<node id="n{i}"><data key="{key}">{prefix} {i:05d}</data>'
                     f'<data key="{label}">{group[i]}</data></node>')
    seen = set()
    while len(seen) < E:
        a = rnd.randrange(N)
        b = (a + rnd.randint(1, 200)) % N
        k = (min(a, b), max(a, b))
        if k in seen:
            continue
        seen.add(k)
        lines.append(f'<edge source="n{a}" target="n{b}"/>')
    lines += ["</graph>", "</graphml>"]
    with open(os.path.join(HERE, name), "w") as f:
        f.write("\n".join(lines) + "\n")
    print(name, dict(Counter(group).most_common()))


write("staff-50k.graphml", "name", "dept", DEPTS, 79)
write("sensors-50k.graphml", "station", "basin", BASINS, 791)
