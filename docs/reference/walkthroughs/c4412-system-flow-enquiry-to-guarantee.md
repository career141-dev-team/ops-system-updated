# Walkthrough: c4412 system flow enquiry to guarantee

Generated from cards/c4412-system-flow-enquiry-to-guarantee.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 65 (expected 65) | arrows 93 (expected 93) | entry points 1 | end steps 7 | unreachable from an entry 0

Entry points: Lead arrives [n4413]

End steps (no arrow out): ESA declined [n4490]; Final decline [n4484]; Guarantee ends clean [n4482]; Weekly report [n4522]; Unreported hire [n4520]; Rejection notice [n4507]; Close posts and position [n4557]

## Steps

1. **Lead arrives** [n4413] - (blank) | [1 Lead] Entered by TA lead, Asma or director for WhatsApp, call, personal email; website auto from hello@. Tags: source + ops owner. Alert: owner. Next: client check
   - -> Industry and client check [n4414]

2. **Industry and client check** [n4414] - (blank) | [1 Lead] System: banking/finance flag, ESA lookup, duplicate match. Next: decline, intro call or requirement
   - -> Intro call [n4416]
   - [banking/finance (~90px away)] -> Final decline [n4484]
   - [ESA on file (~61px away)] -> Record client, ops owner [n4428]

3. **Intro call** [n4416] - (blank) | [2 Qualifying] Ops owner + TA. Saves package, role, brief. System starts the 1-2h ESA clock
   - -> ESA drafted from template [n4418]

4. **Final decline** [n4484] - System | System
   - (end)

5. **Record client, ops owner** [n4428] - [4 Openings] Ops owner | [4 Openings] Ops owner, one per client, movable. Owns DOJ and guarantee. Tag: client
   - -> Requirement meeting [n4430]

6. **ESA drafted from template** [n4418] - (blank) | [3 ESA] System drafts per client: name, company, tax no., email, signing. Placeholders blocked
   - -> ESA approved and sent [n4420]

7. **Requirement meeting** [n4430] - (blank) | [4 Openings] Ops owner + TA. JD, salary, level, location saved. No opening without it
   - -> Open position, assign TA [n4432]
   - [not held] -> Meeting not held [n4492]
   - [impractical] -> Role impractical [n4495]

8. **ESA approved and sent** [n4420] - (blank) | [3 ESA] Ops owner approves, system sends. Alert to ops if not sent in 2h
   - -> ESA chase [n4422]

9. **Open position, assign TA** [n4432] - (blank) | [4 Openings] TA lead. Opening built from requirement, primary TA, 100% day. Bell to TA
   - -> Write and approve JD [n4434]

10. **Meeting not held** [n4492] - System | System
   - [rebooked] LOOP back to Requirement meeting [n4430]

11. **Role impractical** [n4495] - Ops owner | Ops owner
   - [invited back later (~99px away)] LOOP back to Lead arrives [n4413]

12. **ESA chase** [n4422] - (blank) | [3 ESA] System follows up itself: 3 emails, 2 WhatsApps, held for approval. Rushda calls only if stuck
   - -> Signed ESA notice [n4424]
   - [wants changes (~179px away)] -> ESA negotiation [n4487]
   - [unsigned after 2 weeks (~298px away)] -> ESA declined [n4490]

13. **Write and approve JD** [n4434] - (blank) | [4 Openings] TA. AI drafts, TA approves. Alert if unapproved after 1 day. Approval starts scoring
   - -> Post on LinkedIn [n4436]

14. **Signed ESA notice** [n4424] - (blank) | [3 ESA] System notifies ops, TA, Director first; countersigned copy only after
   - -> Director countersigns ESA [n4426]

15. **ESA negotiation** [n4487] - Ops owner | Ops owner
   - [agreed, resend (~244px away)] LOOP back to ESA approved and sent [n4420]

16. **ESA declined** [n4490] - System | System, ops
   - (end)

17. **Post on LinkedIn** [n4436] - (blank) | [4 Openings] TA pastes URL on opening. System blocks Live without URL
   - -> CVs land, AI scores [n4438]
   - [TA requests] -> TopJobs ad [n4498]
   - [weekly] -> Talent Pulse [n4501]

18. **Director countersigns ESA** [n4426] - (blank) | [3 ESA] Mr Azeem within 1 day. System reminds, then auto-returns copy to client
   - LOOP back to Record client, ops owner [n4428]

19. **CVs land, AI scores** [n4438] - (blank) | [5 Sourcing] System files to opening, tags source (LinkedIn, TopJobs, Talent Pulse, hunted), scores
   - -> Search, call, screen [n4440]

20. **TopJobs ad** [n4498] - TA requests | TA requests
   - [CVs (~86px away)] LOOP back to CVs land, AI scores [n4438]

21. **Talent Pulse** [n4501] - System | System
   - [CVs tagged] LOOP back to CVs land, AI scores [n4438]

22. **Search, call, screen** [n4440] - (blank) | [5 Sourcing] TA on workday screen. Shortlist button. Calls are by hand
   - [not moving (~100px away)] -> Candidate follow-up [n4442]

23. **Candidate follow-up** [n4442] - (blank) | [5 Sourcing] System: WhatsApp + email every 24h, 3 tries, reads replies. Complete goes to Director
   - -> Director Review [n4444]
   - [no reply, 3 tries (~141px away)] -> Dropped-out calls [n4504]

24. **Director Review** [n4444] - (blank) | [5 Sourcing] Director. System drafts end-of-day set email, approved, sent; reply read in. No reason needed
   - -> CV set drafted [n4446]
   - [rejected (~78px away)] -> Rejection notice [n4507]
   - LOOP back to Search, call, screen [n4440]

25. **Dropped-out calls** [n4504] - TA | TA
   - LOOP back to Candidate follow-up [n4442]

26. **CV set drafted** [n4446] - (blank) | [6 Set] System builds client email, set 'CLIENT > ROLE > SET n'. Due 7-14 days of ESA
   - [need more (~103px away)] -> Ops approves, system sends set [n4448]

27. **Rejection notice** [n4507] - System | System
   - (end)

28. **Ops approves, system sends set** [n4448] - (blank) | [6 Set] Ops owner approves, system sends; ops posts in client group. Set logged
   - -> CV ownership clock [n4450]

29. **CV ownership clock** [n4450] - (blank) | [6 Set] System. 7 working days from client receipt. Ops owner sees countdown, alert before it runs out
   - -> Chase client feedback [n4452]
   - [client already had CV (~62px away)] -> Drop claimed CV [n4512]

30. **Chase client feedback** [n4452] - (blank) | [7 Feedback] System drafts, ops owner approves. No feedback after 1 day, owner calls next day
   - -> Client decides [n4454]
   - [client returns (~130px away)] -> Position on hold [n4517]
   - [hire not reported in 3 months (~118px away)] -> Unreported hire [n4520]
   - [weekly] -> Weekly report [n4522]

31. **Drop claimed CV** [n4512] - Ops owner | Ops owner
   - [other profiles stay] -> Rest of set continues [n4514]

32. **Client decides** [n4454] - (blank) | [7 Feedback] Client. Reply read into shortlist or reject. TA informed either way, before branching
   - [watch progress (~333px away)] -> Pipeline depth check [n4456]
   - [rejected] LOOP back to Rejection notice [n4507]

33. **Position on hold** [n4517] - System | System
   - [silent, ESA inactive rule (~199px away)] LOOP back to Chase client feedback [n4452]
   - [(none) [see unmatched label below]] -> Close posts and position [n4557]

34. **Unreported hire** [n4520] - Ops owner | Ops owner
   - (end)

35. **Weekly report** [n4522] - System | System
   - (end)

36. **Rest of set continues** [n4514] - System | System
   - [set still live (~61px away)] LOOP back to Chase client feedback [n4452]

37. **Pipeline depth check** [n4456] - (blank) | [7 Feedback] System counts pending and total shortlisted. After any rejection too
   - [round 2 (~180px away)] -> Who schedules [n4458]
   - [3 or fewer pending (~84px away)] -> Add-on search [n4524]
   - [5+ shortlisted in total (~75px away)] -> Hold at five CVs [n4527]

38. **Close posts and position** [n4557] - TA | TA, Ops
   - (end)

39. **Who schedules** [n4458] - (blank) | [8 Interviews] Ops owner: client or us
   - [reached (~155px away)] -> Slots matched [n4460]
   - [client books (~145px away)] -> Client books directly [n4530]

40. **Add-on search** [n4524] - TA | TA
   - [refill (~179px away)] LOOP back to Search, call, screen [n4440]

41. **Hold at five CVs** [n4527] - System | System
   - LOOP back to Chase client feedback [n4452]

42. **Slots matched** [n4460] - [8 Interviews] Ops | [8 Interviews] Ops, client slots vs candidate, repeat until aligned
   - -> Interview booked [n4462]

43. **Client books directly** [n4530] - Client | Client
   - [date reported] -> Interview booked [n4462]
   - [no update (~326px away)] LOOP back to Chase client feedback [n4452]

44. **Interview booked** [n4462] - (blank) | [8 Interviews] System sends invite + Teams, day-before reconfirm, automatic. TA alerted
   - -> Interview held [n4464]
   - [candidate out (~181px away)] -> Candidate drops out [n4534]
   - [client cancels] -> Client cancels or postpones [n4537]

45. **Interview held** [n4464] - (blank) | [8 Interviews] System marks attendance
   - -> Candidate feedback relay [n4466]

46. **Candidate drops out** [n4534] - TA | TA
   - [replacement (~188px away)] LOOP back to Slots matched [n4460]

47. **Client cancels or postpones** [n4537] - Ops | Ops
   - [new slot (~178px away)] LOOP back to Who schedules [n4458]

48. **Candidate feedback relay** [n4466] - (blank) | [8 Interviews] TA logs after 5 PM, tells candidate. Ops sends to client, drafted + approved
   - -> Client round decision [n4468]

49. **Client round decision** [n4468] - (blank) | [8 Interviews] Client. Round 2, selected or not moving. Back-up kept
   - -> Reference check [n4470]
   - LOOP back to Rejection notice [n4507]
   - [we schedule (~197px away)] LOOP back to Slots matched [n4460]

50. **Reference check** [n4470] - (blank) | [9 Offer] TA. Form 1-10, sent to client as is
   - -> Offer made, search stops [n4472]
   - [client drops (~152px away)] LOOP back to Pipeline depth check [n4456]

51. **Offer made, search stops** [n4472] - (blank) | [9 Offer] TA on offer panel. Search stops when offer is given
   - -> Place, client details [n4474]
   - [declined (~158px away)] -> Offer declined [n4542]

52. **Place, client details** [n4474] - (blank) | [10 Joining] TA presses Place. System asks package, DOJ, offer letter; tells Asma + ops same day
   - -> Track DOJ [n4476]

53. **Offer declined** [n4542] - TA | TA
   - [back-up promoted or reopen (~99px away)] LOOP back to Search, call, screen [n4440]

54. **Track DOJ** [n4476] - (blank) | [10 Joining] System reminders to TA and ops owner. Date moves logged with owner
   - -> Joining day call [n4478]

55. **Joining day call** [n4478] - (blank) | [10 Joining] System 9am alert, TA confirms joined
   - -> 90-day guarantee [n4480]
   - [not joined (~185px away)] -> No-show [n4545]
   - [joined] -> Invoice on joining day [n4548]

56. **90-day guarantee** [n4480] - (blank) | [12 Guarantee] System clock from joining day (not fee), ops owner
   - [client picks replace (~200px away)] -> Guarantee ends clean [n4482]
   - [leaves within 90 days (~98px away)] -> Candidate leaves [n4562]

57. **No-show** [n4545] - Ops owner | Ops owner
   - LOOP back to Search, call, screen [n4440]
   - [client stops (~102px away)] LOOP back to Close posts and position [n4557]

58. **Invoice on joining day** [n4548] - System drafts | System drafts
   - [unpaid day 30] -> Payment chase [n4550]
   - [paid] -> Fee collected [n4552]

59. **Guarantee ends clean** [n4482] - (blank) | [12 Guarantee] System. 90 days, nobody left, commitment done
   - (end)

60. **Candidate leaves** [n4562] - Ops owner | Ops owner
   - [TA told, same position reopened (~133px away)] LOOP back to Search, call, screen [n4440]
   - [clock starts (~76px away)] -> Replacement in 60 working days? [n4565]

61. **Payment chase** [n4550] - System drafts | System drafts
   - [paid] -> Fee collected [n4552]
   - [unpaid 2 months] -> Fee written off [n4555]

62. **Fee collected** [n4552] - Ops | Ops, Asma
   - [closed (~384px away)] LOOP back to Close posts and position [n4557]

63. **Replacement in 60 working days?** [n4565] - [4 Openings] Ops owner | System clock
   - [replaced] LOOP back to Guarantee ends clean [n4482]
   - [none in 60 working days (~83px away)] -> Refund 25% [n4568]

64. **Fee written off** [n4555] - Ops owner | Ops owner
   - [fee in (~66px away)] LOOP back to Close posts and position [n4557]

65. **Refund 25%** [n4568] - [8 Interviews] Ops | Director of Operations
   - [refund paid (~100px away)] LOOP back to Close posts and position [n4557]
