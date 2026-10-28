# Walkthrough: c3002 career141 full final flow

Generated from cards/c3002-career141-full-final-flow.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 60 (expected 60) | arrows 94 (expected 94) | entry points 1 | end steps 4 | unreachable from an entry 0

Entry points: Lead arrives [n3003]

End steps (no arrow out): Final decline [n3005]; ESA declined [n3010]; Weekly report [n3061]; Close posts and position [n3062]

## Steps

1. **Lead arrives** [n3003] - Director | Director, Asma · lead form, source, owner (s-locked)
   - [new lead] -> Industry and client check [n3004]

2. **Industry and client check** [n3004] - Ops | Ops · banking/finance flag, ESA lookup (s-locked)
   - -> Final decline [n3005]
   - -> Intro call [n3006]
   - [new client (~91px away)] -> Record client and position [n3013]

3. **Final decline** [n3005] - System | System · standard reply, no invite back (s-locked)
   - (end)

4. **Intro call** [n3006] - Ops + TA | Ops + TA · notes saved, ESA clock starts (s-locked)
   - [ESA signed (~87px away)] -> Draft and send ESA [n3007]

5. **Record client and position** [n3013] - Ops owner | Ops owner · one owner per client (s-locked)
   - [recorded] -> Requirement meeting [n3014]

6. **Draft and send ESA** [n3007] - Ops | Ops · template, within 1-2 hours (s-locked)
   - [sent] -> Chase ESA signature [n3008]

7. **Requirement meeting** [n3014] - Ops + TA | Ops + TA · JD, salary, level, location (s-locked)
   - [rebooked (~62px away)] -> Meeting not held [n3015]
   - -> Role impractical [n3016]
   - [practical (~251px away)] -> Assign TA, daily 100% [n3017]

8. **Chase ESA signature** [n3008] - System | System, Rushda · 3 emails, 2 WhatsApps, final call (s-locked)
   - [client signs (~106px away)] -> Signed ESA returned [n3011]
   - [wants changes (~82px away)] -> ESA negotiation meeting [n3009]
   - [2 weeks silent (~116px away)] -> ESA declined [n3010]

9. **Meeting not held** [n3015] - Ops | Ops · no work starts, rebook task (s-locked)
   - [not held (~128px away)] LOOP back to Requirement meeting [n3014]

10. **Role impractical** [n3016] - Ops | Ops · declined, invited back later (s-locked)
   - [cleared (~209px away)] LOOP back to Lead arrives [n3003]

11. **Assign TA, daily 100%** [n3017] - Ops lead | Ops lead, TA lead · opening, primary TA (s-locked)
   - [TA owns] -> Write and approve JD [n3018]

12. **Signed ESA returned** [n3011] - System | System · alert to ops, TA, Director (s-locked)
   - [team notified (~125px away)] -> Director countersigns [n3012]

13. **ESA negotiation meeting** [n3009] - Ops | Ops · terms notes, resend if agreed (s-locked)
   - [agreed, resend] LOOP back to Draft and send ESA [n3007]
   - [no agreement] -> ESA declined [n3010]

14. **ESA declined** [n3010] - Ops | Ops · after 2 weeks, no search starts (s-locked)
   - (end)

15. **Write and approve JD** [n3018] - TA | TA · AI draft, Approve button (s-locked)
   - [TA requests] -> Post on LinkedIn [n3019]

16. **Director countersigns** [n3012] - Mr Azeem | Mr Azeem · within 1 day, escalation (s-locked)
   - [countersigned] LOOP back to Record client and position [n3013]

17. **Post on LinkedIn** [n3019] - TA | TA · first action, URL saved on opening (s-locked)
   - [JD approved (~297px away)] -> TopJobs flyer, live, closed [n3020]
   - [weekly] -> Talent Pulse weekly [n3021]
   - [live (~235px away)] -> CVs arrive, AI scores [n3022]

18. **TopJobs flyer, live, closed** [n3020] - Director | TA asks, marketing designs, Ops sends (s-locked)
   - [live, CVs] -> CVs arrive, AI scores [n3022]

19. **Talent Pulse weekly** [n3021] - Ops | Ops lists Tue, marketing posts Wed (s-locked)
   - -> CVs arrive, AI scores [n3022]

20. **CVs arrive, AI scores** [n3022] - System | System · source tagged (s-locked)
   - [TA picks (~210px away)] -> Search, call, screen [n3023]
   - [high score] -> AI Follow-up [n3024]

21. **Search, call, screen** [n3023] - TA | TA · database, Workable, LinkedIn, phone (s-locked)
   - [shortlisted (~200px away)] -> TA Follow-up, dropped out [n3025]

22. **AI Follow-up** [n3024] - System | System · WhatsApp, email, 24h reminders (s-locked)
   - [reply or 1 day (~66px away)] -> TA Follow-up, dropped out [n3025]
   - [shortlisted (~371px away)] -> Director Review, notify rejects [n3026]

23. **TA Follow-up, dropped out** [n3025] - TA | TA · chase flagged, call drop-outs (s-locked)
   - -> Director Review, notify rejects [n3026]

24. **Director Review, notify rejects** [n3026] - Director | Director · reason; system messages rejects (s-locked)
   - -> CV set email to client [n3027]
   - [need more (~270px away)] LOOP back to Search, call, screen [n3023]

25. **CV set email to client** [n3027] - System | System prepares, Ops approves · held, 7-14 days (s-locked)
   - -> CV ownership check [n3028]
   - [weekly (~94px away)] -> Weekly report [n3061]

26. **CV ownership check** [n3028] - Client | Client · 7 working days from receiving set (s-locked)
   - [no claim] -> Client group, set posting [n3030]
   - [client had CV] -> Drop claimed CV [n3029]

27. **Weekly report** [n3061] - Ops lead | TA lead owns · system sends to Mr Azeem (s-locked)
   - (end)

28. **Client group, set posting** [n3030] - Ops | Ops · WhatsApp group, set logged (s-locked)
   - [set posted (~94px away)] -> Chase client feedback [n3031]

29. **Drop claimed CV** [n3029] - Ops | Ops · not pursued further (s-locked)
   - [set sent (~227px away)] LOOP back to Client group, set posting [n3030]

30. **Chase client feedback** [n3031] - System | System, owner · WhatsApp, call, email (s-locked)
   - [client replies (~180px away)] -> Client shortlists or rejects [n3033]
   - [2 weeks silent] -> Hold position [n3032]
   - -> Unreported hire [n3060]
   - [weekly] LOOP back to Weekly report [n3061]

31. **Client shortlists or rejects** [n3033] - Client | Client HR · reason saved (s-locked)
   - LOOP back to Director Review, notify rejects [n3026]
   - [set reviewed (~145px away)] -> Check pipeline depth [n3034]
   - -> Who schedules? [n3036]

32. **Hold position** [n3032] - Ops | Ops · silent client, ESA inactive rule (s-locked)
   - [client returns] LOOP back to Chase client feedback [n3031]
   - -> Close posts and position [n3062]

33. **Unreported hire** [n3060] - Ops | Ops · 50% surcharge after 3 months (s-locked)
   - [50% surcharge (~258px away)] -> Send invoice [n3053]

34. **Check pipeline depth** [n3034] - TA | TA · pending interview count (s-locked)
   - [refill set (~140px away)] LOOP back to CV set email to client [n3027]
   - -> Add-on or monitor [n3035]

35. **Who schedules?** [n3036] - Ops | Ops · client or us (s-locked)
   - [we schedule (~76px away)] -> Get client slots, match candidate [n3037]
   - [client books (~119px away)] -> Client books directly [n3038]

36. **Close posts and position** [n3062] - TA | TA closes LinkedIn, Ops closes TopJobs (s-locked)
   - (end)

37. **Send invoice** [n3053] - Ops | Ops · joining day, due 30 days later (s-locked)
   - [paid] -> Fee collected [n3055]
   - [unpaid (~68px away)] -> Payment chase [n3054]

38. **Add-on or monitor** [n3035] - TA | TA · 3 or fewer: add-on 30-60 min; 5 shortlisted: monitor (s-locked)
   - LOOP back to Search, call, screen [n3023]
   - [keep moving (~109px away)] LOOP back to Chase client feedback [n3031]

39. **Get client slots, match candidate** [n3037] - Ops | Ops · new slots until both align (s-locked)
   - [slots align (~182px away)] -> Interview scheduled [n3039]

40. **Client books directly** [n3038] - Client | Client · must report schedule, feedback (s-locked)
   - [no update (~249px away)] LOOP back to Chase client feedback [n3031]
   - [reported] -> Interview scheduled [n3039]

41. **Fee collected** [n3055] - Ops | Ops, Asma · payment logged (s-locked)
   - [position done (~145px away)] LOOP back to Close posts and position [n3062]

42. **Payment chase** [n3054] - System | System, Ops · up to 2 months, 5% per month (s-locked)
   - [paid] LOOP back to Fee collected [n3055]
   - -> Fee written off, no guarantee [n3059]

43. **Interview scheduled** [n3039] - Ops | Ops · invite, Teams, day-before reconfirm (s-locked)
   - [day arrives (~93px away)] -> Interview held [n3042]
   - [candidate out (~141px away)] -> Candidate drops out [n3040]
   - [client cancels] -> Client cancels or postpones [n3041]

44. **Fee written off, no guarantee** [n3059] - Ops | Ops · unpaid 2 months or candidate left (s-locked)
   - LOOP back to Close posts and position [n3062]

45. **Interview held** [n3042] - TA | TA, client · attendance marked (s-locked)
   - [no-show (~145px away)] -> Feedback after 5 PM [n3043]
   - [held] -> Candidate drops out [n3040]

46. **Candidate drops out** [n3040] - TA | TA · client told 1 day or 3 hours before (s-locked)
   - [replacement (~191px away)] LOOP back to Get client slots, match candidate [n3037]

47. **Client cancels or postpones** [n3041] - Ops | Ops · alert to TA, new slot (s-locked)
   - [new slot] LOOP back to Who schedules? [n3036]

48. **Feedback after 5 PM** [n3043] - TA | TA · candidate, then client group (s-locked)
   - -> Round 2, final, or not moving [n3044]

49. **Round 2, final, or not moving** [n3044] - Client | Client · back-up kept; TA tells candidate (s-locked)
   - -> Reference check [n3045]
   - [round 2 (~242px away)] LOOP back to Get client slots, match candidate [n3037]
   - [shortlisted (~353px away)] LOOP back to Check pipeline depth [n3034]

50. **Reference check** [n3045] - TA | TA · form 1-10, forwarded to client (s-locked)
   - [invited back] -> Make offer, stop search [n3046]
   - [client drops (~115px away)] LOOP back to Check pipeline depth [n3034]

51. **Make offer, stop search** [n3046] - TA | TA · offer panel, negotiation (s-locked)
   - [accepted] -> Place with join date [n3048]
   - [declined (~62px away)] -> Offer declined [n3047]

52. **Place with join date** [n3048] - TA | TA · Placed, package, offer letter (s-locked)
   - [placed] -> Placement update [n3049]

53. **Offer declined** [n3047] - TA | TA · reason, back-up, reopen search (s-locked)
   - [reopen search (~71px away)] LOOP back to Search, call, screen [n3023]

54. **Placement update** [n3049] - Ops + TA | System to Asma, ops · package, DOJ, invoice address (s-locked)
   - [DOJ set] -> Track DOJ [n3050]

55. **Track DOJ** [n3050] - Mr Azeem | TA tracks, ops owner · reminders, date moves (s-locked)
   - [candidate lost (~88px away)] LOOP back to Offer declined [n3047]
   - [joining day] -> Joining day call [n3051]

56. **Joining day call** [n3051] - Ops owner | System alert, TA · 9am, confirm joined (s-locked)
   - [joined] LOOP back to Send invoice [n3053]
   - [not joined] -> No-show [n3052]
   - -> 90-day guarantee [n3056]

57. **No-show** [n3052] - Ops | Ops · client picks replacement or stop, no refund (s-locked)
   - [replacement (~104px away)] LOOP back to Search, call, screen [n3023]
   - [client stops (~372px away)] LOOP back to Close posts and position [n3062]

58. **90-day guarantee** [n3056] - Ops owner | Ops owner · leaves: replace or 25% refund; ends clean (s-locked)
   - -> Inform TA or Director of Operations [n3057]

59. **Inform TA or Director of Operations** [n3057] - Ops owner | Ops owner · replace or refund (s-locked)
   - [replacement] LOOP back to Search, call, screen [n3023]
   - [refund] -> Refund 25% [n3058]

60. **Refund 25%** [n3058] - Ops | Ops · paid, position closed (s-locked)
   - LOOP back to Close posts and position [n3062]
