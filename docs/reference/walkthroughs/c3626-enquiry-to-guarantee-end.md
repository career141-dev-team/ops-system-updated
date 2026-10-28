# Walkthrough: c3626 enquiry to guarantee end

Generated from cards/c3626-enquiry-to-guarantee-end.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 60 (expected 60) | arrows 95 (expected 95) | entry points 1 | end steps 9 | unreachable from an entry 0

Entry points: Lead arrives [n3627]

End steps (no arrow out): Final decline [n3629]; ESA declined [n3634]; Requirement entry: manual or auto [n3996]; Client already had CV [n3652]; Guarantee ends [n3681]; Rejection notice [n3649]; Close posts and position [n3684]; Unreported hire [n3682]; Weekly report [n3683]

## Steps

1. **Lead arrives** [n3627] - Director | Director, Asma · lead form: source, ops owner (s-locked)
   - [lead saved (~210px away)] -> Industry and client check [n3628]
   - [WhatsApp, call, email: TA lead / Asma / director enters; Website: auto from hello@career141.com (~246px away)] -> Requirement entry: manual or auto [n3996]

2. **Industry and client check** [n3628] - System/Ops | System · banking/finance flag, ESA on file (s-locked)
   - -> Final decline [n3629]
   - [new client (~122px away)] -> Intro call [n3630]
   - [ESA on file] -> Requirement meeting [n3636]

3. **Requirement entry: manual or auto** [n3996] - (blank) | (no sub-text) (s-locked)
   - (end)

4. **Final decline** [n3629] - System/Ops | System · standard reply, no invite back (s-locked)
   - (end)

5. **Intro call** [n3630] - Ops owner + TA | Ops owner + TA · package, role, brief saved (s-locked)
   - [countersigned (~72px away) [label looks misplaced; likely belongs on Countersign ESA -> Requirement meeting or similar; label as shown]] -> ESA from template [n3631]

6. **Requirement meeting** [n3636] - Ops owner + TA | Ops owner + TA · JD, salary, level, location (s-locked)
   - [not held] -> Meeting not held [n3637]
   - [impractical] -> Role impractical [n3638]
   - [practical] -> Open position, assign TA [n3639]

7. **ESA from template** [n3631] - System drafts | System drafts · Ops approves, system sends within 1–2h (s-locked)
   - [2 weeks of chase (~68px away) [label as shown; probably belongs to ESA chase -> ESA declined]] -> ESA chase [n3632]

8. **Meeting not held** [n3637] - System/Ops | System · rebook task, no work starts (s-locked)
   - [rebooked] LOOP back to Requirement meeting [n3636]

9. **Role impractical** [n3638] - Ops owner | Ops owner · reason, invite back later (s-locked)
   - [invited back (~163px away)] LOOP back to Lead arrives [n3627]

10. **Open position, assign TA** [n3639] - TA lead | TA lead · opening, primary TA, 100% day (s-locked)
   - [TA owns] -> Write and approve JD [n3640]

11. **ESA chase** [n3632] - System/Ops | System · 3 emails, 2 WhatsApps; Rushda call (s-locked)
   - [signed back (~213px away)] -> Countersign ESA [n3635]
   - [wants changes (~105px away)] -> Negotiation meeting [n3633]
   - [sent] -> ESA declined [n3634]

12. **Write and approve JD** [n3640] - TA | TA · AI draft, Approve button (s-locked)
   - [TA requests] -> Post on LinkedIn [n3641]

13. **Countersign ESA** [n3635] - (blank) | Mr Azeem by email as today · team alerted, copy auto-returned (s-locked)
   - [call done] LOOP back to Requirement meeting [n3636]

14. **Negotiation meeting** [n3633] - Ops owner | Ops owner · terms notes, resend (s-locked)
   - [no agreement (~70px away)] LOOP back to ESA from template [n3631]
   - [agreed [label as shown; reads oddly, probably should be on Negotiation -> ESA from template (agreed, resend) and "no agreement" -> declined; swapped]] -> ESA declined [n3634]

15. **ESA declined** [n3634] - System/Ops | System · after 2 weeks of chase, reason saved (s-locked)
   - (end)

16. **Post on LinkedIn** [n3641] - TA | TA · URL pasted on opening (s-locked)
   - [JD approved (~141px away)] -> TopJobs ad [n3642]
   - [weekly (~68px away)] -> Talent Pulse [n3643]
   - [applications (~148px away)] -> CVs land, AI scores [n3644]

17. **TopJobs ad** [n3642] - #c7e36f | TA requests · marketing flyer, Ops sends, status on opening (s-locked)
   - [CVs (~231px away)] -> CVs land, AI scores [n3644]

18. **Talent Pulse** [n3643] - Director | System lists Tue · marketing posts Wed (s-locked)
   - [CVs tagged (~98px away)] -> CVs land, AI scores [n3644]

19. **CVs land, AI scores** [n3644] - System/Ops | System · source tagged, filed to opening (s-locked)
   - [paid (~151px away) [label looks misplaced]] -> Search, call, screen [n3645]
   - [high score (~137px away)] -> Candidate follow-up [n3646]

20. **Search, call, screen** [n3645] - TA | TA · 100%, follow-up, add-on (s-locked)
   - [shortlisted (~205px away)] -> Candidate follow-up [n3646]

21. **Candidate follow-up** [n3646] - System/Ops | System · WhatsApp, email, 24h, 3 tries (s-locked)
   - -> Director Review [n3648]
   - [no reply (~77px away)] -> Dropped-out calls [n3647]

22. **Director Review** [n3648] - Director | Director · no reason needed; set drafted, approved, system emails; reply read in (s-locked)
   - [shortlisted (~241px away)] -> CV set to client [n3650]
   - [rejected (~82px away)] -> Rejection notice [n3649]
   - [need more (~80px away)] LOOP back to Search, call, screen [n3645]

23. **Dropped-out calls** [n3647] - TA | TA · alert list, reason saved (s-locked)
   - [reached (~91px away)] LOOP back to Candidate follow-up [n3646]

24. **CV set to client** [n3650] - System drafts | System drafts · Ops owner approves, system sends; email and client group (s-locked)
   - [replacement (~336px away) [label looks misplaced]] -> CV ownership window [n3651]

25. **Rejection notice** [n3649] - System/Ops | System · approved template, sent automatically (s-locked)
   - (end)

26. **CV ownership window** [n3651] - System/Ops | System · 7 working days from receipt (s-locked)
   - [received (~135px away)] -> Client already had CV [n3652]
   - -> Chase client feedback [n3653]
   - [client replies] -> Client decides [n3655]

27. **Client already had CV** [n3652] - Ops owner | Ops owner · CV dropped, set continues (s-locked)
   - (end)

28. **Chase client feedback** [n3653] - System drafts | System drafts · Ops owner approves; no feedback after 1 day, owner calls next day (s-locked)
   - [reply (~143px away)] -> Client decides [n3655]
   - [hire found (~64px away)] -> Unreported hire [n3682]
   - [weekly] -> Weekly report [n3683]
   - [client returns (~360px away) [label as shown; direction seems reversed vs the label]] -> Engagement inactive [n3654]

29. **Client decides** [n3655] - Client | Client · shortlist or reject, reason read in (s-locked)
   - [rejected (~98px away)] LOOP back to Rejection notice [n3649]
   - [set reviewed (~102px away)] -> Pipeline depth [n3656]
   - [shortlisted (~118px away)] -> Who schedules? [n3657]

30. **Unreported hire** [n3682] - Ops owner | Ops owner · 50% surcharge invoiced (s-locked)
   - (end)

31. **Weekly report** [n3683] - #c7e36f | System builds · TA lead sends Mr Azeem (s-locked)
   - (end)

32. **Engagement inactive** [n3654] - System/Ops | System · per ESA inactive rule, hold; notice held for approval (s-locked)
   - LOOP back to Chase client feedback [n3653]
   - [inactive per ESA (~77px away)] -> Close posts and position [n3684]

33. **Pipeline depth** [n3656] - System/Ops | System · ≤3 pending add-on; 5 shortlisted monitor (s-locked)
   - [3 or fewer (~355px away)] LOOP back to Search, call, screen [n3645]
   - [stop (~220px away)] LOOP back to Chase client feedback [n3653]

34. **Who schedules?** [n3657] - Ops owner | Ops owner · client or us (s-locked)
   - -> Slots matched [n3658]
   - [client books (~99px away)] -> Client books directly [n3659]

35. **Close posts and position** [n3684] - Director | TA LinkedIn, Ops TopJobs · checklist (s-locked)
   - (end)

36. **Slots matched** [n3658] - System/Ops | Ops · client slots vs candidate, until aligned (s-locked)
   - [slots align] -> Interview booked [n3660]

37. **Client books directly** [n3659] - Client | Client · must report date, chased (s-locked)
   - [reported (~70px away)] -> Interview booked [n3660]
   - [no update] LOOP back to Chase client feedback [n3653]

38. **Interview booked** [n3660] - System/Ops | System · invite, Teams, day-before reconfirm; sent automatically (s-locked)
   - [candidate out (~99px away)] -> Candidate drops out [n3661]
   - [client cancels (~294px away)] -> Client cancels or postpones [n3662]
   - [day arrives (~69px away)] -> Interview held [n3663]

39. **Candidate drops out** [n3661] - TA | TA · system drafts client notice, ops approves; ≥1 day or 3h (s-locked)
   - [rejected (~181px away)] LOOP back to Slots matched [n3658]

40. **Client cancels or postpones** [n3662] - System/Ops | Ops · TA alerted automatically, rebook (s-locked)
   - [new slot (~332px away)] LOOP back to Who schedules? [n3657]

41. **Interview held** [n3663] - System/Ops | System · attendance marked (s-locked)
   - [no-show (~114px away)] LOOP back to Candidate drops out [n3661]
   - [held] -> Candidate feedback [n3664]

42. **Candidate feedback** [n3664] - Ops owner + TA | TA logs after 5 PM · ops sends to client on WhatsApp, drafted and approved (s-locked)
   - [client decides] -> Client feedback [n3838]

43. **Client feedback** [n3838] - System/Ops | Ops gets it · TA informed either way (s-locked)
   - [not moving (~363px away)] -> Round 2 or final [n3665]
   - LOOP back to Rejection notice [n3649]

44. **Round 2 or final** [n3665] - Client | Client · back-up kept (s-locked)
   - [round 2] LOOP back to Slots matched [n3658]
   - LOOP back to Rejection notice [n3649]
   - [selected (~206px away)] -> Reference check [n3666]

45. **Reference check** [n3666] - TA | TA · form 1–10, sent to client as is (s-locked)
   - -> Offer made, search stops [n3667]
   - LOOP back to Pipeline depth [n3656]

46. **Offer made, search stops** [n3667] - TA | TA · offer panel (s-locked)
   - [accepted (~143px away)] -> Place, client details [n3669]
   - [declined] -> Offer declined [n3668]

47. **Place, client details** [n3669] - System drafts | TA presses Place · system asks package, DOJ, offer letter (s-locked)
   - [DOJ set] -> Track DOJ [n3670]

48. **Offer declined** [n3668] - TA | TA · reason, back-up promoted (s-locked)
   - [back-up] LOOP back to Offer made, search stops [n3667]
   - [reopen (~134px away)] LOOP back to Search, call, screen [n3645]

49. **Track DOJ** [n3670] - System/Ops | System · TA reminders, date moves logged (s-locked)
   - [candidate lost] LOOP back to Offer declined [n3668]
   - [joining day (~79px away)] -> Joining-day call [n3671]

50. **Joining-day call** [n3671] - Ops owner | System 9am alert · TA confirms (s-locked)
   - [not joined (~122px away)] -> No-show [n3672]
   - [joined (~240px away)] -> Invoice on joining day [n3673]
   - [joined] -> 90-day guarantee [n3677]

51. **No-show** [n3672] - Ops owner | Ops owner · client picks replace or stop, no refund (s-locked)
   - [replace] LOOP back to Search, call, screen [n3645]
   - LOOP back to Close posts and position [n3684]

52. **Invoice on joining day** [n3673] - System drafts | System drafts · Ops approves, system sends; due 30 days (s-locked)
   - -> Fee collected [n3675]
   - [unpaid day 30 (~65px away)] -> Payment chase [n3674]

53. **90-day guarantee** [n3677] - System/Ops | System · ops owner, from joining (s-locked)
   - -> Candidate leaves [n3678]
   - -> Written off [n3676]
   - -> Guarantee ends [n3681]

54. **Fee collected** [n3675] - System/Ops | Ops, Asma · payment logged (s-locked)
   - LOOP back to Close posts and position [n3684]

55. **Payment chase** [n3674] - System drafts | System drafts · Ops approves, system sends; 5% per month, 2 months (s-locked)
   - [60 working days, no replacement (~155px away) [label looks misplaced; belongs to the replacement clock]] LOOP back to Fee collected [n3675]
   - [2 months (~75px away)] -> Written off [n3676]

56. **Candidate leaves** [n3678] - Ops owner | Ops owner · TA told, replacement opened (s-locked)
   - [90 days clean (~147px away) [label looks misplaced; "90 days clean" probably belongs to 90-day guarantee -> Guarantee ends]] LOOP back to Search, call, screen [n3645]
   - [clock starts] -> Replacement within 60 working days? [n3679]

57. **Written off** [n3676] - Ops owner | Ops owner · no guarantee, closed (s-locked)
   - [refund paid (~135px away) [label looks misplaced; probably Refund 25% -> Close]] LOOP back to Close posts and position [n3684]

58. **Guarantee ends** [n3681] - System/Ops | System · commitment done (s-locked)
   - (end)

59. **Replacement within 60 working days?** [n3679] - TA lead | System clock (s-locked)
   - [replaced] LOOP back to Guarantee ends [n3681]
   - [paid (~129px away)] -> Refund 25% [n3680]

60. **Refund 25%** [n3680] - TA | Director of Operations · logged (s-locked)
   - LOOP back to Close posts and position [n3684]
