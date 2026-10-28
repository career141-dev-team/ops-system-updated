# Walkthrough: c1061 candidates in the pipeline

Generated from cards/c1061-candidates-in-the-pipeline.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 25 (expected 25) | arrows 36 (expected 36) | entry points 1 | end steps 6 | unreachable from an entry 0

Entry points: CV arrives [n1062]

End steps (no arrow out): Held for a lead to place [n1065]; Sent to database only [n1066]; Do-not-contact skipped [n1086]; Placed [n1081]; Overdue alert to recruiter [n1085]; Rejected [n1084]

## Steps

1. **CV arrives** [n1062] - mailbox | mailbox, upload or import - New CVs (s-locked)
   - [CV extracted (~107px away; label position-matched)] -> AI reads and scores CV [n1063]
   - [mail intake (~77px away; label position-matched)] -> Mail filed to an opening [n1064]

2. **AI reads and scores CV** [n1063] - system | system - Matched (s-locked)
   - [TA picks] -> TA shortlists candidate [n1067]
   - -> High CV score shortlisted by AI [n1068]

3. **Mail filed to an opening** [n1064] - system | system - mail intake (s-locked)
   - -> Held for a lead to place [n1065]
   - [no advert] -> Sent to database only [n1066]

4. **TA shortlists candidate** [n1067] - TA | TA - TA Follow-up (s-locked)
   - [shortlisted] -> First message sent [n1069]

5. **High CV score shortlisted by AI** [n1068] - system | system - AI Follow-up (s-locked)
   - [shortlisted] -> First message sent [n1069]
   - -> Moved to TA Follow-up [n1073]

6. **Held for a lead to place** [n1065] - lead | lead - held mail (s-locked)
   - (end)

7. **Sent to database only** [n1066] - system | system - no advert matched (s-locked)
   - (end)

8. **First message sent** [n1069] - system | system - WhatsApp and email (s-locked)
   - -> Reminder every 24 hours [n1070]

9. **Moved to TA Follow-up** [n1073] - system | system - no reply in 1 day (s-locked)
   - [still missing (~101px away; label position-matched)] -> Reminder every 24 hours [n1070]
   - -> Dropped out [n1083]

10. **Reminder every 24 hours** [n1070] - system | system - up to 3 attempts (s-locked)
   - -> Reply read, missing items asked [n1071]
   - [all given (~87px away; label position-matched)] -> Details complete [n1074]
   - -> Dropped out [n1083]
   - [do not contact] -> Do-not-contact skipped [n1086]

11. **Dropped out** [n1083] - system | system - unresponsive (s-locked)
   - LOOP back to TA shortlists candidate [n1067]

12. **Reply read, missing items asked** [n1071] - AI | AI - inbound reply (s-locked)
   - [AI cannot help (~89px away; label position-matched)] -> Flagged for a person [n1072]
   - LOOP back to Reminder every 24 hours [n1070]
   - [all given] -> Details complete [n1074]

13. **Details complete** [n1074] - system | system - CV, expected salary, notice (s-locked)
   - [auto-advance] -> Director Review [n1075]

14. **Do-not-contact skipped** [n1086] - system | system - candidate flag (s-locked)
   - (end)

15. **Flagged for a person** [n1072] - TA | TA - flagged for review (s-locked)
   - [TA resolves] -> Director Review [n1075]

16. **Director Review** [n1075] - Director | Director - second shortlist (s-locked)
   - -> Director Shortlist [n1076]
   - -> Rejected [n1084]
   - [rejected (~135px away; label position-matched; likely misplaced, the arrow is the overdue alert)] -> Overdue alert to recruiter [n1085]

17. **Director Shortlist** [n1076] - Director | Director - director_shortlist (s-locked)
   - [sent to client] -> Client Shortlist [n1077]

18. **Rejected** [n1084] - TA | TA or client - rejected (s-locked)
   - (end)

19. **Overdue alert to recruiter** [n1085] - system | system - SLA breach (s-locked)
   - (end)

20. **Client Shortlist** [n1077] - client | client - client review (s-locked)
   - -> Interview [n1078]
   - LOOP back to Rejected [n1084]

21. **Interview** [n1078] - TA | TA and client - interview (s-locked)
   - [passed] -> Offer made [n1079]
   - [failed (~136px away; label position-matched)] LOOP back to Rejected [n1084]
   - LOOP back to Overdue alert to recruiter [n1085]

22. **Offer made** [n1079] - TA | TA - offer pending (s-locked)
   - [accepted (~85px away; label position-matched)] -> Offer accepted [n1080]
   - [approved (~194px away; label position-matched; this label looks misplaced, likely meant for the Offer made -> accepted path or an offer-approval step)] -> Offer declined or withdrawn [n1082]

23. **Offer accepted** [n1080] - candidate | candidate - accepted (s-locked)
   - -> Placed [n1081]

24. **Offer declined or withdrawn** [n1082] - candidate | candidate - loop action (s-locked)
   - LOOP back to AI reads and scores CV [n1063]
   - LOOP back to Client Shortlist [n1077]

25. **Placed** [n1081] - TA | TA - placed (s-locked)
   - (end)
