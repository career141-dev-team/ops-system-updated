# Walkthrough: c2790 enquiry to fee collected

Generated from cards/c2790-enquiry-to-fee-collected.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 60 (expected 60) | arrows 93 (expected 93) | entry points 1 | end steps 7 | unreachable from an entry 0

Entry points: Lead arrives [n2791]

End steps (no arrow out): Final decline [n2793]; ESA declined [n2798]; Guarantee ends [n2846]; Unreported hire [n2848]; Weekly report [n2849]; Close posts and position [n2850]; Rejected candidates notified [n2814]

## Steps

1. **Lead arrives** [n2791] - Director | Director, Asma · lead form: source, owner (s-locked)
   - [new lead (~136px away)] -> Industry and client check [n2792]

2. **Industry and client check** [n2792] - Ops | Ops · banking/finance flag, ESA lookup (s-locked)
   - -> Final decline [n2793]
   - [new client (~64px away)] -> Intro call [n2794]
   - -> Record client and position [n2800]

3. **Final decline** [n2793] - System | System · standard reply, no invite back (s-locked)
   - (end)

4. **Intro call** [n2794] - Ops + TA | Ops + TA · notes saved, ESA clock starts (s-locked)
   - [call done (~106px away)] -> Draft and send ESA [n2795]

5. **Record client and position** [n2800] - Ops owner | Ops owner · one owner per client, movable (s-locked)
   - [recorded (~65px away)] -> Requirement meeting [n2801]

6. **Draft and send ESA** [n2795] - Ops | Ops · template, within 1-2 hours (s-locked)
   - [sent] -> Chase ESA signature [n2796]

7. **Requirement meeting** [n2801] - Ops + TA | Ops + TA · JD, salary, level, location (s-locked)
   - [not held] -> Meeting not held [n2802]
   - [impractical] -> Role impractical [n2803]
   - [practical] -> Record requirement, assign TA [n2804]

8. **Chase ESA signature** [n2796] - System | System, Rushda · 3 emails, 2 WhatsApps, final call (s-locked)
   - [client signs] -> Signed ESA, countersign [n2799]
   - [wants changes (~175px away)] -> ESA negotiation meeting [n2797]
   - [2 weeks silent (~167px away)] -> ESA declined [n2798]

9. **Meeting not held** [n2802] - Ops | Ops · no work starts, rebook task (s-locked)
   - [rebooked (~69px away)] LOOP back to Requirement meeting [n2801]

10. **Role impractical** [n2803] - Ops | Ops · declined, invited back later (s-locked)
   - [invited back (~82px away)] LOOP back to Lead arrives [n2791]

11. **Record requirement, assign TA** [n2804] - Ops lead | Ops lead, TA lead · opening, primary TA, daily 100% (s-locked)
   - -> Write and approve JD [n2805]

12. **Signed ESA, countersign** [n2799] - System alerts ops | System alerts ops, TA; Mr Azeem within 1 day (s-locked)
   - [countersigned] LOOP back to Record client and position [n2800]

13. **ESA negotiation meeting** [n2797] - Ops | Ops · terms notes, resend if agreed (s-locked)
   - [agreed, resend] LOOP back to Draft and send ESA [n2795]
   - [no agreement (~274px away)] -> ESA declined [n2798]

14. **ESA declined** [n2798] - Ops | Ops · after 2 weeks, no search starts (s-locked)
   - (end)

15. **Write and approve JD** [n2805] - TA | TA · AI draft, Approve button (s-locked)
   - [JD approved (~208px away)] -> Post on LinkedIn [n2806]

16. **Post on LinkedIn** [n2806] - TA | TA · first action, URL saved on opening (s-locked)
   - [TA requests] -> TopJobs flyer, live, closed [n2807]
   - [weekly (~114px away)] -> Talent Pulse weekly [n2808]
   - [live] -> CVs arrive, AI scores [n2809]

17. **TopJobs flyer, live, closed** [n2807] - Director | TA asks, marketing designs, Ops sends · alert to TA (s-locked)
   - [live, CVs] -> CVs arrive, AI scores [n2809]

18. **Talent Pulse weekly** [n2808] - Ops | Ops lists Tue, marketing posts Wed (s-locked)
   - [CVs tagged (~112px away)] -> CVs arrive, AI scores [n2809]

19. **CVs arrive, AI scores** [n2809] - System | System · source tagged, New CVs or Matched (s-locked)
   - [rejected (~153px away)] -> Search, call, screen [n2810]
   - [high score (~67px away)] -> AI Follow-up [n2811]

20. **Search, call, screen** [n2810] - TA | TA · database, Workable, LinkedIn, phone (s-locked)
   - -> TA Follow-up and dropped out [n2812]

21. **AI Follow-up** [n2811] - System | System · WhatsApp, email, 24h reminders (s-locked)
   - [reply or 1 day (~98px away)] -> TA Follow-up and dropped out [n2812]
   - [TA picks (~371px away)] -> Director Review [n2813]

22. **TA Follow-up and dropped out** [n2812] - TA | TA · chase flagged, call drop-outs (s-locked)
   - [need more (~393px away)] -> Director Review [n2813]

23. **Director Review** [n2813] - Director | Director · reason if not shortlisted (s-locked)
   - [shortlisted (~96px away)] -> CV set email to client [n2815]
   - -> Rejected candidates notified [n2814]
   - [set sent (~170px away)] LOOP back to Search, call, screen [n2810]

24. **CV set email to client** [n2815] - System | System prepares, Ops approves · held, within 7-14 days (s-locked)
   - [approved, sent] -> Client group and set posting [n2816]
   - [weekly] -> Weekly report [n2849]

25. **Rejected candidates notified** [n2814] - System | System · auto message, saved (s-locked)
   - (end)

26. **Client group and set posting** [n2816] - Ops | Ops · WhatsApp group, set logged (s-locked)
   - -> Chase client feedback [n2817]

27. **Weekly report** [n2849] - System | System · to Mr Azeem (s-locked)
   - (end)

28. **Chase client feedback** [n2817] - System | System, owner · WhatsApp, call, email (s-locked)
   - [client replies (~77px away)] -> Client shortlists or rejects [n2819]
   - -> Hold position [n2818]
   - [weekly (~278px away)] -> Unreported hire [n2848]
   - [fee in (~108px away)] LOOP back to Weekly report [n2849]

29. **Client shortlists or rejects** [n2819] - Client | Client HR · reason saved (s-locked)
   - [rejected] LOOP back to Rejected candidates notified [n2814]
   - -> Check pipeline depth [n2820]
   - -> Who schedules? [n2823]

30. **Hold position** [n2818] - Ops | Ops · silent client, ESA inactive rule, reason saved (s-locked)
   - LOOP back to Chase client feedback [n2817]
   - [closed (~138px away)] -> Close posts and position [n2850]

31. **Unreported hire** [n2848] - Ops | Ops · 50% surcharge after 3 months (s-locked)
   - (end)

32. **Check pipeline depth** [n2820] - TA | TA · pending interview count (s-locked)
   - [refill set (~62px away)] LOOP back to CV set email to client [n2815]
   - [5 shortlisted (~99px away)] -> Monitor position [n2822]
   - -> Add-on search [n2821]

33. **Who schedules?** [n2823] - Ops | Ops · client or us (s-locked)
   - -> Get client slots, match candidate [n2824]
   - [client books] -> Client books directly [n2825]

34. **Close posts and position** [n2850] - Ops lead | TA closes LinkedIn, Ops closes TopJobs (s-locked)
   - (end)

35. **Monitor position** [n2822] - TA | TA · 5 shortlisted in total, keep moving (s-locked)
   - [refill (~347px away)] -> Add-on search [n2821]
   - [shortlisted (~228px away)] LOOP back to Chase client feedback [n2817]

36. **Add-on search** [n2821] - TA | TA · 3 or fewer pending, 30-60 min a day (s-locked)
   - [keep moving (~120px away)] LOOP back to Search, call, screen [n2810]

37. **Get client slots, match candidate** [n2824] - Ops | Ops · new slots until both align (s-locked)
   - -> Interview scheduled [n2826]

38. **Client books directly** [n2825] - Client | Client · must report schedule and feedback (s-locked)
   - [client returns (~153px away)] LOOP back to Chase client feedback [n2817]
   - [reported (~61px away)] -> Interview scheduled [n2826]

39. **Interview scheduled** [n2826] - Ops | Ops · invite, Teams, day-before reconfirm (s-locked)
   - [day arrives (~153px away)] -> Interview held [n2829]
   - [candidate out (~223px away)] -> Candidate drops out [n2827]
   - [client cancels] -> Client cancels or postpones [n2828]

40. **Interview held** [n2829] - TA | TA, client · attendance marked (s-locked)
   - [held] -> Feedback after 5 PM [n2830]
   - [no-show (~71px away)] -> Candidate drops out [n2827]

41. **Candidate drops out** [n2827] - TA | TA · client told 1 day or 3 hours before (s-locked)
   - [we schedule (~367px away)] LOOP back to Get client slots, match candidate [n2824]

42. **Client cancels or postpones** [n2828] - Ops | Ops · alert to TA, new slot (s-locked)
   - [new slot] LOOP back to Who schedules? [n2823]

43. **Feedback after 5 PM** [n2830] - TA | TA · candidate, then client group (s-locked)
   - [TA owns (~147px away)] -> Round 2 or final [n2831]

44. **Round 2 or final** [n2831] - Client | Client · back-up kept (s-locked)
   - [selected (~102px away)] -> Reference check [n2833]
   - [round 2 (~138px away)] LOOP back to Get client slots, match candidate [n2824]
   - -> Candidate told not moving [n2832]

45. **Reference check** [n2833] - TA | TA · form 1-10, forwarded to client (s-locked)
   - -> Make offer, stop search [n2834]
   - [not moving (~307px away)] LOOP back to Check pipeline depth [n2820]

46. **Candidate told not moving** [n2832] - TA | TA · rejection saved (s-locked)
   - [set ends (~106px away)] LOOP back to Check pipeline depth [n2820]

47. **Make offer, stop search** [n2834] - TA | TA · offer panel, negotiation; search stops on accept (s-locked)
   - [accepted] -> Place with join date, update [n2836]
   - [declined (~178px away)] -> Offer declined [n2835]

48. **Place with join date, update** [n2836] - TA | TA; system to Asma, ops · package, DOJ, invoice address (s-locked)
   - [DOJ set (text cut at the slice boundary: "DOJ se" + "t")] -> Track DOJ [n2837]

49. **Offer declined** [n2835] - TA | TA · reason, back-up, reopen search (s-locked)
   - [2 weeks silent (~140px away)] LOOP back to Search, call, screen [n2810]

50. **Track DOJ** [n2837] - Ops + TA | TA tracks, ops owner · reminders, date moves (s-locked)
   - [candidate lost (~188px away)] LOOP back to Offer declined [n2835]
   - [joining day (~234px away)] -> Joining day call [n2838]

51. **Joining day call** [n2838] - System alerts ops | System alert, TA · 9am, confirm joined (s-locked)
   - [joined (~135px away)] -> Send invoice [n2840]
   - -> 90-day guarantee [n2843]
   - [not joined (~335px away)] -> No-show [n2839]

52. **Send invoice** [n2840] - Ops | Ops · on joining day, due 30 days later (s-locked)
   - [paid (~101px away)] -> Fee collected [n2842]
   - [90 days clean (~141px away)] -> Payment chase [n2841]

53. **90-day guarantee** [n2843] - Ops owner | Ops owner · from joining day (s-locked)
   - -> Replacement [n2844]
   - [replacement (~82px away)] -> Refund 25% [n2845]
   - -> Guarantee ends [n2846]

54. **No-show** [n2839] - Ops | Ops · client picks replacement or stop, no refund (s-locked)
   - LOOP back to Search, call, screen [n2810]
   - [client stops] LOOP back to Close posts and position [n2850]

55. **Fee collected** [n2842] - Ops | Ops, Asma · payment logged (s-locked)
   - [shortlisted (~92px away)] LOOP back to Close posts and position [n2850]

56. **Payment chase** [n2841] - System | System, Ops · up to 2 months, 5% per unpaid month (s-locked)
   - LOOP back to Fee collected [n2842]
   - [paid (~114px away)] -> Fee written off or no guarantee [n2847]

57. **Replacement** [n2844] - Ops owner | Ops owner informs TA · reopen same position (s-locked)
   - [unpaid (~340px away)] LOOP back to Search, call, screen [n2810]

58. **Refund 25%** [n2845] - (none) | Ops owner informs Director of Operations (s-locked)
   - [refund paid (~268px away)] LOOP back to Close posts and position [n2850]

59. **Guarantee ends** [n2846] - Ops | Ops · commitment done (s-locked)
   - (end)

60. **Fee written off or no guarantee** [n2847] - Ops | Ops · position closed (s-locked)
   - LOOP back to Close posts and position [n2850]
