# Walkthrough: c4234 system workflow enquiry to guarantee graph

Generated from cards/c4234-system-workflow-enquiry-to-guarantee-graph.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 28 (expected 28) | arrows 27 (expected 27) | entry points 1 | end steps 6 | unreachable from an entry 0

Entry points: Lead captured [n4235]

End steps (no arrow out): Rebook task [n4280]; Hold position [n4282]; Offer declined [n4284]; Unreported hire [n4288]; Fee written off [n4286]; Close posts and position [n4278]

## Steps

1. **Lead captured** [n4235] - System/System alert | System · form, tag source, assign owner
   - -> Industry and client check [n4236]

2. **Industry and client check** [n4236] - System/System alert | System · banking flag, ESA lookup
   - -> ESA drafted and sent [n4238]

3. **ESA drafted and sent** [n4238] - System drafts | System drafts, Ops approves · 1-2 hour clock
   - -> ESA chase [n4240]

4. **ESA chase** [n4240] - System/System alert | System · 3 emails, 2 WhatsApps, call task
   - -> Signed ESA, countersign [n4242]

5. **Signed ESA, countersign** [n4242] - System alerts | System alerts · Director within 1 day
   - -> Client, position, requirement saved [n4244]

6. **Client, position, requirement saved** [n4244] - Ops owner | Ops owner · screen and record
   - -> TA assigned, JD approved [n4246]
   - [requirement meeting not held (~96px away)] -> Rebook task [n4280]

7. **TA assigned, JD approved** [n4246] - TA lead | TA lead, TA · AI draft, Approve
   - -> Job ads posted [n4248]

8. **Rebook task** [n4280] - Ops | Ops, no work starts
   - (end)

9. **Job ads posted** [n4248] - TA | TA, Ops · LinkedIn first, URL saved
   - -> CVs in, scored, followed up [n4250]

10. **CVs in, scored, followed up** [n4250] - System/System alert | System · mail intake, AI score, 24h reminders
   - -> Director Review [n4252]

11. **Director Review** [n4252] - Director | Director · email decision read by system
   - -> CV set to client [n4254]

12. **CV set to client** [n4254] - System drafts | System drafts, Ops approves · ownership clock
   - -> Client feedback chase [n4256]

13. **Client feedback chase** [n4256] - System/System alert | System, owner · timers, call task
   - -> Pipeline depth check [n4258]
   - [client silent (~64px away)] -> Hold position [n4282]

14. **Pipeline depth check** [n4258] - System/System alert | System · add-on or monitor
   - -> Interview scheduled [n4260]

15. **Hold position** [n4282] - Ops | Ops, reason saved
   - (end)

16. **Interview scheduled** [n4260] - Ops | Ops, TA · invite, reconfirm
   - -> Interview and feedback [n4262]

17. **Interview and feedback** [n4262] - TA | TA, Ops · attendance, feedback relay
   - -> Reference check and offer [n4264]

18. **Reference check and offer** [n4264] - TA | TA · form 1-10, offer panel
   - -> Placed with join date [n4266]
   - [declined (~101px away)] -> Offer declined [n4284]

19. **Placed with join date** [n4266] - TA | TA · system tells Asma, ops
   - -> Joining day call [n4268]
   - [not reported in 3 months (~92px away)] -> Unreported hire [n4288]

20. **Offer declined** [n4284] - TA | TA, back-up, reopen search
   - (end)

21. **Joining day call** [n4268] - System/System alert | System alert, TA · 9am
   - -> Invoice and payment chase [n4270]

22. **Unreported hire** [n4288] - Ops | Ops, 50% surcharge invoiced
   - (end)

23. **Invoice and payment chase** [n4270] - Ops | Ops, System · due 30 days
   - -> Fee collected [n4272]
   - [unpaid after about 2 months (~93px away)] -> Fee written off [n4286]

24. **Fee collected** [n4272] - Ops | Ops, Asma · payment logged
   - -> 90-day guarantee [n4274]

25. **Fee written off** [n4286] - Ops | Ops, position closed
   - (end)

26. **90-day guarantee** [n4274] - Ops owner | Ops owner · timer from joining day
   - -> Guarantee ends clean [n4276]

27. **Guarantee ends clean** [n4276] - System/System alert | System · commitment done
   - -> Close posts and position [n4278]

28. **Close posts and position** [n4278] - TA | TA, Ops · LinkedIn, TopJobs, system
   - (end)
