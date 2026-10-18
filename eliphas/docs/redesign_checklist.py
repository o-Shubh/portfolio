# Regenerates redesign-checklist.md from screen_inventory.py + redesign-status.json: python3 docs/redesign_checklist.py
import json, sys
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from screen_inventory import AREAS
# status per screen number: (implementation, verification, blockers)
try:
    status = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "redesign-status.json")))
except FileNotFoundError:
    status = {}
STITCH = {1:"01",2:"02",3:"03",4:"04",5:"05",6:"06",7:"07",8:"08",9:"09",10:"10",11:"11",12:"12",13:"13",14:"14",15:"15",16:"16",17:"17",18:"18",19:"19",21:"21",22:"22",23:"23",24:"24"}
out = ["# Redesign screen checklist", "", "Visual reference: Stitch export \"Cupertino Editorial\" (screens 01–24 except 20, plus a shared component sheet).",
       "Functional reference: Eliphas-Screen-Brief.pdf (80 screens). Source of truth for business rules: the existing code.", "",
       "Status keys. Implementation: **done** (built to the shared system and the reference/brief), **partial**, **todo**. ",
       "Verification: **checked** (browser screenshot reviewed + automated checks), **auto** (automated checks only), **—** (not yet).", "",
       "| # | Screen | Route | Stitch ref | Implementation | Verification | Blockers / notes |", "|---|---|---|---|---|---|---|"]
n = 0
for key, title, intro, screens in AREAS:
    out.append(f"| | **{title}** | | | | | |")
    for s in screens:
        n += 1
        st = status.get(str(n), {})
        out.append(f"| {n} | {s[0]} | `{s[1]}` | {STITCH.get(n, '—')} | {st.get('impl','todo')} | {st.get('ver','—')} | {st.get('note','')} |")
out += ["", "## Resume here", "", status.get("_next", "Stage 1: shared design system and navigation.")]
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "redesign-checklist.md"),"w").write("\n".join(out)+"\n")
print(n)
