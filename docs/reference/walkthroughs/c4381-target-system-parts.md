# Walkthrough: c4381 target system parts

Generated from cards/c4381-target-system-parts.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 10 (expected 10) | arrows 9 (expected 9) | entry points 1 | end steps 1 | unreachable from an entry 0

Entry points: Leads and intake desk [n4382]

End steps (no arrow out): Scheduled reports [n4399]

## Steps

1. **Leads and intake desk** [n4382] - NEW: lead / NEW: invoice (same colour) | NEW: lead, intro call
   - -> ESA manager [n4383]

2. **ESA manager** [n4383] - NEW: draft | NEW: draft, chase, countersign
   - -> Openings and clients [n4385]

3. **Openings and clients** [n4385] - EXTEND: ops owner | EXTEND: ops owner, requirement
   - -> Ad channels tracker [n4387]

4. **Ad channels tracker** [n4387] - NEW: LinkedIn | NEW: LinkedIn, TopJobs, Talent Pulse
   - -> CV intake and pipeline [n4389]

5. **CV intake and pipeline** [n4389] - EXISTS: fix gaps | EXISTS: fix gaps
   - -> Client comms hub [n4391]

6. **Client comms hub** [n4391] - NEW: set email | NEW: set email, chase, ownership
   - -> Interview scheduler [n4393]

7. **Interview scheduler** [n4393] - NEW: slots | NEW: slots, invites, feedback
   - -> Offers and placements [n4395]

8. **Offers and placements** [n4395] - EXTEND: notify | EXTEND: notify, DOJ
   - -> Finance and guarantee tracker [n4397]

9. **Finance and guarantee tracker** [n4397] - NEW: lead / NEW: invoice (same colour) | NEW: invoice, refund
   - -> Scheduled reports [n4399]

10. **Scheduled reports** [n4399] - NEW: draft | EXTEND: weekly
   - (end)
