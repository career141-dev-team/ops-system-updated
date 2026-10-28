# Walkthrough: c4585 detailed system flow

Generated from cards/c4585-detailed-system-flow.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 236 (expected 236) | arrows 324 (expected 324) | entry points 1 | end steps 6 | unreachable from an entry 0

Entry points: Lead sources [n4586]

End steps (no arrow out): Lead closed, no invite back [n4853]; Lead closed, ESA declined [n4874]; TopJobs ad closed [n4910]; CV sent to database only [n4923]; Report sent to Mr Azeem [n4985]; Position closed [n4841]

## Steps

1. **Lead sources** [n4586] - #f0a35e | Website, WhatsApp, call, personal email
   - -> Lead tagged, owner set [n4587]
   - -> Website lead created [n4843]
   - [website] -> Lead entered by hand [n4846]

2. **Lead tagged, owner set** [n4587] - - | System: source + ops owner
   - NOTE: IdeaDecided: Owners in the T that's gonna work on the position.
   - -> Owner alerted [n4589]

3. **Website lead created** [n4843] - System/TA lead | System, auto from hello@
   - LOOP back to Lead tagged, owner set [n4587]

4. **Lead entered by hand** [n4846] - System/TA lead | TA lead, Asma or director
   - [WhatsApp, call, personal email (~242px away)] LOOP back to Lead tagged, owner set [n4587]

5. **Owner alerted** [n4589] - #b3a6ff | System bell
   - -> Duplicate client match [n4591]

6. **Duplicate client match** [n4591] - System/TA lead | System
   - -> Banking/finance check [n4593]
   - [client already on file (~104px away)] -> Existing client linked [n5114]

7. **Banking/finance check** [n4593] - AI | System flag
   - -> ESA lookup [n4595]
   - -> Standard decline sent [n4849]

8. **Existing client linked** [n5114] - System/TA lead | System
   - -> ESA lookup [n4595]

9. **ESA lookup** [n4595] - System/TA lead | System
   - NOTE: IdeaDecided: Yes, that's fine.
   - -> Intro call booked [n4597]
   - -> Client and ops owner recorded [n4637]

10. **Standard decline sent** [n4849] - System/TA lead | System
   - [banking/finance (~229px away)] -> Decline reason saved [n4851]

11. **Intro call booked** [n4597] - Ops owner/TA | Ops owner
   - -> Intro call held [n4599]
   - [not held] -> Intro call not held [n5111]

12. **Client and ops owner recorded** [n4637] - Ops owner/TA | Ops owner, one per client
   - -> Requirement meeting booked [n4639]

13. **Decline reason saved** [n4851] - System/TA lead | System
   - [new client, no ESA (~211px away)] -> Lead closed, no invite back [n4853]

14. **Intro call held** [n4599] - Ops owner + TA | Ops owner + TA
   - NOTE: IdeaDecided: the TA lead only shows up to the call, the DLA the director and the operations person will show up to the call either all 3 or some of them will be showing up to the call.
   - -> Package, role, brief saved [n4601]

15. **Intro call not held** [n5111] - Ops owner/TA | Ops owner, rebook
   - NOTE: Question[Timing] The rebook loop for intro call and requirement meeting has no limit. d16 says no meeting means no work. After how many rebooks or days does the lead close?
   - [rebooked] LOOP back to Intro call booked [n4597]

16. **Requirement meeting booked** [n4639] - Ops owner + TA | Ops owner + TA
   - -> Meeting reminder [n4641]

17. **Lead closed, no invite back** [n4853] - System/TA lead | System
   - (end)

18. **Package, role, brief saved** [n4601] - Ops owner/TA | Ops owner
   - -> ESA clock starts [n4603]

19. **Meeting reminder** [n4641] - System/TA lead | System
   - -> Requirement meeting held [n4643]
   - [meeting not held (~108px away)] -> Rebook task [n4879]

20. **ESA clock starts** [n4603] - System/TA lead | System, 1-2h
   - -> ESA drafted from template [n4605]
   - [not sent in 2h] -> Late-send alert to ops [n4856]

21. **Requirement meeting held** [n4643] - Ops owner + TA | Ops owner + TA
   - -> Requirement saved [n4645]
   - [impractical] -> Role closed impractical [n4884]

22. **Rebook task** [n4879] - System/TA lead | System
   - [client replies, chase stops (~294px away)] -> Daily rebook reminder [n4881]

23. **ESA drafted from template** [n4605] - System/TA lead | System
   - [not sent in 2h (~244px away)] -> Placeholders checked [n4607]

24. **Late-send alert to ops** [n4856] - System/TA lead | System
   - -> ESA approved [n4611]

25. **Requirement saved** [n4645] - #b3a6ff | JD, salary, level, location
   - -> Opening built [n4647]

26. **Role closed impractical** [n4884] - Ops owner/TA | Ops owner, reason
   - -> Polite reply drafted [n4886]

27. **Daily rebook reminder** [n4881] - System/TA lead | System
   - [rebooked (~122px away)] LOOP back to Requirement meeting booked [n4639]

28. **Placeholders checked** [n4607] - Ops | System blocks blanks
   - [blank found, redraft (~187px away)] -> Ops reviews ESA [n4609]
   - LOOP back to ESA drafted from template [n4605]

29. **ESA approved** [n4611] - Ops owner/TA | Ops owner
   - [client replies at any point (~264px away)] -> ESA sent [n4613]

30. **Opening built** [n4647] - System/TA lead | TA lead, from requirement
   - -> Primary TA picked [n4649]

31. **Polite reply drafted** [n4886] - System/TA lead | System
   - -> Invite-back date set [n4888]

32. **Ops reviews ESA** [n4609] - Ops owner/TA | Ops owner
   - LOOP back to ESA approved [n4611]
   - LOOP back to Late-send alert to ops [n4856]

33. **ESA sent** [n4613] - System/TA lead | System
   - -> ESA email 1 [n4615]
   - -> ESA reply read [n4859]

34. **Primary TA picked** [n4649] - System/TA lead | TA lead
   - -> 100% day set [n4651]

35. **Invite-back date set** [n4888] - Ops owner/TA | Ops owner
   - -> Invite-back reminder [n4890]

36. **ESA email 1** [n4615] - System/TA lead | System, held for approval
   - -> ESA WhatsApp 1 [n4617]
   - [client replies, chase stops (~90px away)] -> ESA reply read [n4859]

37. **ESA reply read** [n4859] - System/TA lead | System
   - [signs] -> Signed ESA received [n4627]
   - [wants changes (~124px away)] -> Negotiation meeting booked [n4862]
   - [declines outright (~145px away)] -> ESA declined [n4867]

38. **100% day set** [n4651] - System/TA lead | TA lead
   - -> Bell to TA [n4653]

39. **Invite-back reminder** [n4890] - System/TA lead | System
   - LOOP back to Lead sources [n4586]

40. **ESA WhatsApp 1** [n4617] - System/TA lead | System, held for approval
   - [client replies, chase stops (~102px away)] -> ESA email 2 [n4619]
   - [client replies, chase stops (~66px away)] LOOP back to ESA reply read [n4859]

41. **Signed ESA received** [n4627] - Client | Client
   - -> Signed copy filed [n4629]

42. **Negotiation meeting booked** [n4862] - Ops owner/TA | Ops owner
   - -> Negotiation held [n4864]

43. **ESA declined** [n4867] - System/TA lead | System
   - -> ESA decline reason saved [n4870]

44. **Bell to TA** [n4653] - System/TA lead | System
   - -> JD drafted [n4655]

45. **ESA email 2** [n4619] - System/TA lead | System, held for approval
   - -> ESA WhatsApp 2 [n4621]
   - LOOP back to ESA reply read [n4859]

46. **Signed copy filed** [n4629] - System/TA lead | System
   - -> Notice to ops, TA, Director [n4631]

47. **Negotiation held** [n4864] - Ops owner/TA | Ops owner, terms notes
   - [agreed, resend (~133px away)] LOOP back to Ops reviews ESA [n4609]
   - [no agreement (~78px away)] LOOP back to ESA declined [n4867]

48. **ESA decline reason saved** [n4870] - System/TA lead | System
   - -> Search blocked, team told [n4872]

49. **JD drafted** [n4655] - AI | AI
   - -> JD edited [n4657]

50. **ESA WhatsApp 2** [n4621] - System/TA lead | System, held for approval
   - -> ESA email 3 [n4623]
   - [client replies, chase stops (~174px away)] LOOP back to ESA reply read [n4859]

51. **Notice to ops, TA, Director** [n4631] - System/TA lead | System, first
   - -> Director countersigns [n4633]
   - [not countersigned in 1 day (~78px away)] -> Director reminder [n4876]

52. **Search blocked, team told** [n4872] - System/TA lead | System
   - -> Lead closed, ESA declined [n4874]

53. **JD edited** [n4657] - Ops owner/TA | TA
   - -> JD approved [n4659]
   - [unapproved after 1 day (~69px away)] -> Approval alert [n4893]

54. **ESA email 3** [n4623] - System/TA lead | System, held for approval
   - -> ESA final call [n4625]
   - LOOP back to ESA reply read [n4859]

55. **Director countersigns** [n4633] - #f0a35e | Mr Azeem, within 1 day
   - -> Countersigned copy returned [n4635]

56. **Director reminder** [n4876] - System/TA lead | System
   - NOTE: Question[Ownership] Only one reminder for the countersign, with no escalation if Mr Azeem still has not signed. Who is told next?
   - LOOP back to Director countersigns [n4633]

57. **Lead closed, ESA declined** [n4874] - System/TA lead | System
   - (end)

58. **JD approved** [n4659] - Ops owner/TA | TA, starts scoring
   - -> LinkedIn post made [n4661]

59. **Approval alert** [n4893] - System/TA lead | System
   - LOOP back to JD approved [n4659]

60. **ESA final call** [n4625] - Candidate | Rushda, only if stuck
   - NOTE: IdeaDecided: Okay, so there so there it would be the operations person, uh one operations person will be assigned to that particular lead uh by the operations lead, operations lead.
   - [client signs (~89px away)] LOOP back to Signed ESA received [n4627]
   - [unsigned after 2 weeks (~237px away)] LOOP back to ESA declined [n4867]
   - [client replies, chase stops (~69px away)] LOOP back to ESA reply read [n4859]

61. **Countersigned copy returned** [n4635] - Client | System to client
   - [ESA on file (~136px away)] LOOP back to Client and ops owner recorded [n4637]

62. **LinkedIn post made** [n4661] - Ops owner/TA | TA
   - -> LinkedIn URL pasted [n4663]
   - [URL missing] -> Live blocked, no URL [n4896]

63. **LinkedIn URL pasted** [n4663] - Ops owner + TA | TA on opening
   - -> Advert set Live [n4665]

64. **Live blocked, no URL** [n4896] - System/TA lead | System
   - [URL added] LOOP back to LinkedIn URL pasted [n4663]

65. **Advert set Live** [n4665] - System/TA lead | System
   - -> Application matching on [n4667]
   - [weekly] -> TopJobs requested [n4899]
   - -> Talent Pulse list compiled [n4912]
   - -> Weekly report built [n4983]

66. **Application matching on** [n4667] - System/TA lead | System
   - -> CV arrives [n4669]
   - -> Search, call, screen [n4917]

67. **TopJobs requested** [n4899] - Ops owner/TA | TA
   - [TA wants TopJobs (~218px away)] -> Request routed to marketing [n4901]

68. **Talent Pulse list compiled** [n4912] - System/TA lead | System, Tuesday
   - NOTE: QuestionTalent Pulse: one tracked apply link per role? Undecided.
   - -> Newsletter posted [n4914]

69. **Weekly report built** [n4983] - System/TA lead | System
   - -> Report sent to Mr Azeem [n4985]

70. **CV arrives** [n4669] - Ops | Mailbox, upload, import
   - [CVs (~338px away)] -> CV source tagged [n4671]

71. **Search, call, screen** [n4917] - Ops owner/TA | TA, workday screen
   - -> TA shortlists candidate [n4679]

72. **Request routed to marketing** [n4901] - System/TA lead | System
   - -> Flyer designed [n4903]

73. **Newsletter posted** [n4914] - System/TA lead | Marketing, Wednesday
   - [CVs tagged (~322px away)] LOOP back to CV arrives [n4669]
   - [next Tuesday while role open (~89px away)] LOOP back to Talent Pulse list compiled [n4912]

74. **Report sent to Mr Azeem** [n4985] - System/TA lead | TA lead
   - (end)

75. **CV source tagged** [n4671] - Candidate | LinkedIn, TopJobs, Talent Pulse, hunted
   - -> CV filed to opening [n4673]
   - [mail, no advert match (~64px away)] -> CV held for a lead [n4920]
   - [no advert (~122px away)] -> CV sent to database only [n4923]

76. **TA shortlists candidate** [n4679] - Ops owner/TA | TA
   - [replies, reminders stop (~346px away)] -> First message sent [n4681]
   - [do-not-contact flag (~68px away)] -> Candidate skipped [n4931]

77. **Flyer designed** [n4903] - System/TA lead | Marketing
   - -> Flyer sent to TopJobs [n4905]

78. **CV filed to opening** [n4673] - System/TA lead | System
   - -> CV read [n4675]

79. **CV held for a lead** [n4920] - Ops owner/TA | Lead places it
   - [lead places (~62px away)] LOOP back to CV filed to opening [n4673]

80. **CV sent to database only** [n4923] - System/TA lead | System
   - (end)

81. **First message sent** [n4681] - - | System: WhatsApp + email
   - NOTE: IdeaDecided: Three reminders.
   - [check pipeline after rejection (~205px away)] -> Reminder 24h [n4683]
   - [set still live (~64px away)] -> Reply read [n4689]

82. **Candidate skipped** [n4931] - System/TA lead | System
   - [search continues (~267px away)] LOOP back to Search, call, screen [n4917]

83. **Flyer sent to TopJobs** [n4905] - Ops owner/TA | Ops owner, cost logged
   - -> TopJobs ad Live [n4907]

84. **CV read** [n4675] - System/TA lead | System
   - -> CV scored [n4677]
   - [extraction fails] -> Extraction alert [n4925]

85. **Reminder 24h** [n4683] - System/TA lead | System
   - -> Reminder 48h [n4685]
   - -> Reply read [n4689]

86. **Reply read** [n4689] - AI | AI
   - -> Missing items asked [n4691]
   - -> Flagged for TA [n4943]
   - [all items given (~87px away)] -> Details complete [n4693]

87. **TopJobs ad Live** [n4907] - AI | Ops marks, TA alerted
   - LOOP back to CV arrives [n4669]
   - [ad ends (~136px away)] -> TopJobs ad closed [n4910]

88. **CV scored** [n4677] - AI | AI
   - [TA picks (~97px away)] LOOP back to TA shortlists candidate [n4679]
   - [high score] -> AI shortlists candidate [n4928]

89. **Extraction alert** [n4925] - System/TA lead | System
   - [fixed] LOOP back to CV scored [n4677]

90. **Reminder 48h** [n4685] - System/TA lead | System
   - -> Reminder 72h [n4687]
   - [replies, reminders stop (~257px away)] LOOP back to Reply read [n4689]

91. **Missing items asked** [n4691] - AI | AI
   - NOTE: IdeaDecided: I think this is to be a little bit Okay, so that entire thing needs to be handled by the system within 24 hours. So within 24 hours the system can send maximum of three messages which is unresponsive. So if he sends more than three messages
   - [client stops, no refund (~91px away)] -> Details complete [n4693]
   - LOOP back to Reply read [n4689]

92. **Flagged for TA** [n4943] - AI | AI
   - -> TA resolves [n4945]

93. **Details complete** [n4693] - #f0a35e | CV, salary, notice
   - [paid (~364px away)] -> Queued for Director [n4695]

94. **TopJobs ad closed** [n4910] - AI | Ops marks, TA alerted
   - NOTE: Problem[Path] Dead end, and it duplicates 'TopJobs closed' at the end. d22 says notifying the TA ends the TopJobs process, which conflicts with the locked close step. See f5126.
   - (end)

95. **AI shortlists candidate** [n4928] - System/TA lead | System
   - [need more (~334px away)] LOOP back to First message sent [n4681]

96. **Reminder 72h** [n4687] - System/TA lead | System
   - [reply received] LOOP back to Reply read [n4689]
   - [no reply, 3 tries (~88px away)] -> Moved to dropped-out list [n4934]

97. **TA resolves** [n4945] - Ops owner/TA | TA
   - LOOP back to Details complete [n4693]

98. **Queued for Director** [n4695] - #b3a6ff | System auto-advance
   - -> Set email drafted [n4697]

99. **Moved to dropped-out list** [n4934] - System/TA lead | System
   - -> Call task to TA [n4936]

100. **Set email drafted** [n4697] - System/TA lead | System, end of day
   - -> Set email approved [n4699]

101. **Call task to TA** [n4936] - System/TA lead | System
   - -> TA calls candidate [n4938]

102. **Set email approved** [n4699] - System/TA lead | Held for approval
   - -> Set emailed to Director [n4701]

103. **TA calls candidate** [n4938] - Ops owner/TA | TA
   - [reached (~72px away)] LOOP back to Reply read [n4689]
   - [not reached (~127px away)] -> Drop-out reason saved [n4941]

104. **Set emailed to Director** [n4701] - System/TA lead | System
   - -> Director reviews [n4703]
   - [no reply in 1 working day (~77px away)] -> Director chase [n4948]

105. **Drop-out reason saved** [n4941] - Ops owner/TA | TA
   - [AI cannot help (~249px away)] LOOP back to Search, call, screen [n4917]

106. **Director reviews** [n4703] - AI | Director, no reason needed
   - -> Reply read in [n4705]

107. **Director chase** [n4948] - System/TA lead | System
   - NOTE: Question[Ownership] Only one Director chase, then nothing if there is no reply. Who is the escalation?
   - [replies] -> Reply read in [n4705]

108. **Reply read in** [n4705] - System/TA lead | System
   - -> Director shortlist recorded [n4707]
   - [rejected (~133px away)] -> Candidate set to rejected (Director) [n4951]
   - [search continues (~116px away)] LOOP back to Search, call, screen [n4917]

109. **Director shortlist recorded** [n4707] - System/TA lead | System
   - -> Position status next day [n4709]

110. **Candidate set to rejected (Director)** [n4951] - System/TA lead | System
   - -> Director rejection notice sent [n4953]

111. **Position status next day** [n4709] - Ops owner/TA | System: follow-up or 100%
   - NOTE: IdeaDecided: Five is the minimum, yes.
   - -> Client set drafted [n4711]
   - LOOP back to Search, call, screen [n4917]

112. **Director rejection notice sent** [n4953] - System/TA lead | System
   - LOOP back to Search, call, screen [n4917]
   - [not joined (~358px away)] -> Pipeline pending counted [n4757]

113. **Client set drafted** [n4711] - - | System: CLIENT > ROLE > SET n
   - -> Set due date tracked [n4713]

114. **Pipeline pending counted** [n4757] - System/TA lead | System
   - NOTE: Problem[Path] 'Client reviewed set, nobody shortlisted' goes through the depth check and then straight to 'Who schedules?'. The arrow from the depth check to 'Who schedules?' leaks and must be limited to the shortlisted case (needs removing).
   - [3 or fewer pending (~177px away)] -> Total shortlisted counted [n4759]

115. **Set due date tracked** [n4713] - System/TA lead | System, 7-14 days of ESA
   - -> Ops reviews set [n4715]
   - [set late] -> Overdue alert to ops [n4958]

116. **Total shortlisted counted** [n4759] - System/TA lead | System
   - NOTE: IdeaDecided: Give me an example.
   - -> Who schedules? [n4761]
   - -> Add-on alert to TA [n5001]
   - [no back-up (~300px away)] -> Hold at five CVs [n5006]

117. **Ops reviews set** [n4715] - Ops owner/TA | Ops owner
   - -> Set approved [n4717]

118. **Overdue alert to ops** [n4958] - System/TA lead | System
   - LOOP back to Ops reviews set [n4715]

119. **Who schedules?** [n4761] - Ops owner/TA | Ops owner
   - [we schedule (~84px away)] -> Client slots requested [n4763]
   - [client books (~105px away)] -> Client contacts candidate [n5011]

120. **Add-on alert to TA** [n5001] - System/TA lead | System
   - -> Add-on search [n5003]

121. **Hold at five CVs** [n5006] - System/TA lead | System
   - NOTE: QuestionHow does a position come off the five-CV hold? Exit rule not decided.
   - [keep moving (~276px away)] -> Monitor position [n5008]

122. **Set approved** [n4717] - Ops owner/TA | Ops owner
   - -> Set sent to client [n4719]

123. **Client slots requested** [n4763] - Ops owner/TA | Ops owner
   - -> Slots received [n4765]

124. **Client contacts candidate** [n5011] - Client | Client
   - NOTE: Problem[Path] 'Report reminder' feeds into the feedback chase and has no escalation if the client never reports a date. FIXED: reminder now loops back to 'Date reported'. Decide who escalates and when.
   - [reported (~130px away)] -> Date reported [n5013]
   - -> Report reminder to client [n5018]

125. **Add-on search** [n5003] - Ops owner/TA | TA, 30-60 min a day
   - [replacement search (~146px away)] LOOP back to Search, call, screen [n4917]

126. **Monitor position** [n5008] - Ops owner/TA | TA
   - [90 days, nobody left (~101px away)] -> Feedback timer starts [n4735]
   - [exit rule decided] -> Hold exit check [n5117]

127. **Set sent to client** [n4719] - System/TA lead | System
   - [3 months, no hire reported (~132px away)] -> Set posted in client group [n4721]
   - -> Unreported hire flagged [n4987]

128. **Slots received** [n4765] - Ops | Ops
   - [check pipeline after rejection (~348px away)] -> Slots checked with candidate [n4767]

129. **Date reported** [n5013] - Client | Client
   - -> Date logged [n5015]

130. **Report reminder to client** [n5018] - System/TA lead | System, ops approves
   - [weekly (~233px away)] -> Chase drafted [n4737]
   - LOOP back to Date reported [n5013]

131. **Feedback timer starts** [n4735] - System/TA lead | System
   - -> Chase drafted [n4737]
   - [client replies first (~198px away)] -> Client replies [n4745]

132. **Hold exit check** [n5117] - System/TA lead | TA lead
   - NOTE: QuestionFive-CV hold release: what releases it? Not decided.
   - LOOP back to Search, call, screen [n4917]

133. **Set posted in client group** [n4721] - Ops owner/TA | Ops owner
   - NOTE: Idea[Missing step] For a new client the WhatsApp group is created after the first set (notes c11), but no step creates it. Add 'Group created, ops owner' before this step?
   - -> Set logged [n4723]

134. **Unreported hire flagged** [n4987] - System/TA lead | System
   - NOTE: Question[Timing] Does the 3-month surcharge timer start at the first set sent or at finalisation? It now hangs off 'Set sent to client'.
   - -> Surcharge invoice drafted [n4989]

135. **Slots checked with candidate** [n4767] - Ops | Ops
   - NOTE: IdeaDecided: So there again, same logic, we keep communicating with the candidate as long as he is responsive. Provided he is not responsive after three attempts, you need to alert the TA.
   - [no back-up (~246px away)] -> Interview booked [n4769]
   - [no slot fits (~103px away)] -> New slots requested [n5021]

136. **Date logged** [n5015] - System/TA lead | System
   - -> Interview booked [n4769]

137. **Chase drafted** [n4737] - System/TA lead | System
   - NOTE: IdeaDecided: No, not like that. We stop working only when the client shortlisted shortlists five or more CDs. After the client shortlists only we hold it.
   - [closed (~252px away)] -> Chase approved [n4739]

138. **Client replies** [n4745] - Client | Client
   - -> Reply read into system [n4747]

139. **Set logged** [n4723] - System/TA lead | System
   - [follow-up or 100% again (~181px away)] -> Client receipt date saved [n4725]

140. **Surcharge invoice drafted** [n4989] - System/TA lead | System, 50%
   - -> Surcharge invoice approved [n4991]

141. **Interview booked** [n4769] - System/TA lead | System
   - -> Invite and Teams sent [n4771]

142. **New slots requested** [n5021] - Ops | Ops
   - LOOP back to Slots received [n4765]

143. **Chase approved** [n4739] - Ops owner/TA | Ops owner
   - [client replies (~147px away)] -> Chase sent [n4741]

144. **Reply read into system** [n4747] - System/TA lead | System
   - -> TA informed [n4749]

145. **Client receipt date saved** [n4725] - System/TA lead | System
   - -> Ownership clock starts [n4727]
   - [set received, feedback timer starts (~250px away)] LOOP back to Feedback timer starts [n4735]

146. **Surcharge invoice approved** [n4991] - Ops owner/TA | Ops owner
   - -> Surcharge invoice sent [n4993]

147. **Invite and Teams sent** [n4771] - System/TA lead | System, automatic
   - -> TA alerted of booking [n4773]
   - [client cancels or postpones (~74px away)] -> Client cancel logged [n5039]

148. **Chase sent** [n4741] - - | System: email + WhatsApp
   - -> Owner calls client [n4743]
   - [silent, ESA inactive rule (~75px away)] -> Inactive notice drafted [n4973]
   - LOOP back to Weekly report built [n4983]
   - [hire not reported in 3 months (~119px away)] LOOP back to Unreported hire flagged [n4987]
   - LOOP back to Client replies [n4745]

149. **TA informed** [n4749] - System/TA lead | System, before any branch
   - -> Reason saved [n4751]

150. **Ownership clock starts** [n4727] - System/TA lead | System, 7 working days
   - -> Countdown shown [n4729]

151. **Surcharge invoice sent** [n4993] - System/TA lead | System
   - NOTE: Question[Path] An unpaid surcharge invoice has no chase or write-off. Reuse the payment chase?
   - -> Payment logged [n4833]

152. **TA alerted of booking** [n4773] - System/TA lead | System
   - -> Day-before reconfirm [n4775]

153. **Client cancel logged** [n5039] - Ops | Ops
   - -> TA told of cancel [n5041]

154. **Owner calls client** [n4743] - - | Next day if no feedback
   - [client returns (~347px away)] LOOP back to Client replies [n4745]
   - [no answer after call] -> Client silent after call [n5108]

155. **Inactive notice drafted** [n4973] - System/TA lead | System
   - -> Inactive notice approved [n4975]

156. **Reason saved** [n4751] - Client | If client gives one
   - -> Client decision [n4753]

157. **Countdown shown** [n4729] - Ops owner + TA | Ops owner sees it
   - -> Alert before expiry [n4731]
   - [client says already had CV (~73px away)] -> Claim checked [n4961]

158. **Payment logged** [n4833] - Ops | Ops, Asma
   - -> Fee collected [n4835]

159. **Day-before reconfirm** [n4775] - System/TA lead | System, automatic
   - [no reply (~86px away)] -> Candidate reconfirms [n4777]
   - -> Call task to TA for reconfirm [n5024]
   - [candidate out (~182px away)] -> Candidate out or no-show [n5027]

160. **TA told of cancel** [n5041] - System/TA lead | System
   - [new slot (~62px away)] LOOP back to Who schedules? [n4761]

161. **Client silent after call** [n5108] - System/TA lead | System, no answer
   - [silent, ESA inactive rule (~133px away)] LOOP back to Inactive notice drafted [n4973]

162. **Inactive notice approved** [n4975] - Ops owner/TA | Ops owner
   - -> Inactive notice sent [n4977]

163. **Client decision** [n4753] - Client | Client
   - [client shortlisted (~102px away)] -> Candidate marked shortlisted [n4755]
   - [rejected] -> Candidate set to rejected (client) [n4995]
   - LOOP back to Pipeline pending counted [n4757]

164. **Alert before expiry** [n4731] - System/TA lead | System
   - -> Ownership window closes [n4733]

165. **Claim checked** [n4961] - Ops owner/TA | Ops owner
   - [within 7 working days (~88px away)] -> CV dropped, not pursued [n4963]
   - [after 7 working days (~138px away)] -> Claim refused [n4970]

166. **Fee collected** [n4835] - Ops | Ops, Asma
   - NOTE: Problem[Inefficiency] Duplicate of 'Payment logged', same event and same owners. Merge into one step.
   - [guarantee over, position done] -> LinkedIn closed [n4837]

167. **Candidate reconfirms** [n4777] - Candidate | Candidate
   - -> Interview day arrives [n4779]

168. **Call task to TA for reconfirm** [n5024] - System/TA lead | System
   - LOOP back to Candidate reconfirms [n4777]
   - [cannot reach] -> Candidate out or no-show [n5027]

169. **Candidate out or no-show** [n5027] - Ops owner/TA | TA
   - NOTE: Question[Path] A candidate who cannot be reached on the reconfirm call now goes here. Is unreachable treated as candidate out?
   - -> Client notice drafted [n5030]

170. **Inactive notice sent** [n4977] - System/TA lead | System
   - -> Position on hold [n4979]

171. **Candidate marked shortlisted** [n4755] - System/TA lead | System
   - LOOP back to Pipeline pending counted [n4757]

172. **Candidate set to rejected (client)** [n4995] - System/TA lead | System
   - [set reviewed (~203px away)] -> Client rejection notice sent [n4997]

173. **Ownership window closes** [n4733] - System/TA lead | System
   - NOTE: Problem[Timing] FIXED: the feedback timer now also starts at client receipt. The old arrow from 'Ownership window closes' to 'Feedback timer starts' made feedback chasing wait 7 working days and must be removed (I cannot delete arrows).
   - [replies, reminders stop (~85px away)] LOOP back to Feedback timer starts [n4735]

174. **CV dropped, not pursued** [n4963] - Ops owner/TA | Ops owner
   - -> Candidate marked client-owned [n4965]

175. **Claim refused** [n4970] - System/TA lead | System
   - LOOP back to Feedback timer starts [n4735]

176. **LinkedIn closed** [n4837] - Ops owner/TA | TA
   - [refund paid, close (~261px away)] -> TopJobs closed [n4839]

177. **Interview day arrives** [n4779] - System/TA lead | System
   - -> Interview held [n4781]

178. **Client notice drafted** [n5030] - System/TA lead | System, 1 day or 3h before
   - -> Client notice approved [n5032]

179. **Position on hold** [n4979] - System/TA lead | System, reason saved
   - NOTE: QuestionDay count for the silent-client hold follows the ESA inactive rule; exact days still to confirm. Question[Timing] The hold has no time limit before it closes. Does the TA stop searching while on hold? The 'closed' arrow has no step that decides it.
   - LOOP back to Feedback timer starts [n4735]
   - LOOP back to LinkedIn closed [n4837]

180. **Client rejection notice sent** [n4997] - System/TA lead | System
   - LOOP back to Pipeline pending counted [n4757]

181. **Candidate marked client-owned** [n4965] - System/TA lead | System
   - -> Rest of set continues [n4967]

182. **TopJobs closed** [n4839] - Ops owner/TA | Ops owner
   - NOTE: QuestionTopJobs close action: who closes it, and what triggers it? Confirm.
   - -> Position closed [n4841]

183. **Interview held** [n4781] - Client | Client + candidate
   - -> Attendance marked [n4783]

184. **Client notice approved** [n5032] - Ops owner/TA | Ops owner
   - -> Client notice sent [n5034]

185. **Rest of set continues** [n4967] - System/TA lead | System
   - LOOP back to Feedback timer starts [n4735]

186. **Position closed** [n4841] - System/TA lead | System
   - NOTE: Problem[Path] The position is closed at fee collected, but the guarantee runs on and a leaver reopens it. Closing happens twice, and the replacement search runs on a closed position. Decide when the position state is Closed versus Guarantee.
   - (end)

187. **Attendance marked** [n4783] - System/TA lead | System
   - NOTE: Problem[Path] FIXED: the arrow to feedback is now labeled 'attended' so a no-show does not log feedback. Check the other labeled spine arrows.
   - [attended] -> TA logs feedback after 5 PM [n4785]
   - [no-show (~151px away)] LOOP back to Candidate out or no-show [n5027]

188. **Client notice sent** [n5034] - System/TA lead | System
   - -> Replacement candidate picked [n5036]

189. **TA logs feedback after 5 PM** [n4785] - Ops owner/TA | TA
   - -> Candidate told [n4787]

190. **Replacement candidate picked** [n5036] - Ops owner/TA | TA, back-up
   - [replacement] LOOP back to Slots checked with candidate [n4767]
   - -> Search reopened [n5056]

191. **Candidate told** [n4787] - Ops owner/TA | TA
   - -> Client message drafted [n4789]

192. **Search reopened** [n5056] - Ops owner/TA | TA
   - LOOP back to Search, call, screen [n4917]

193. **Client message drafted** [n4789] - System/TA lead | System
   - -> Client message approved [n4791]

194. **Client message approved** [n4791] - Ops owner/TA | Ops owner
   - -> Feedback posted to client [n4793]

195. **Feedback posted to client** [n4793] - Ops owner/TA | Ops owner
   - [TA hunts (~106px away)] -> Client round decision [n4795]

196. **Client round decision** [n4795] - Client | Client
   - -> TA informed of decision [n4797]

197. **TA informed of decision** [n4797] - System/TA lead | System, either way
   - [not moving (~150px away)] -> Reference form sent [n4799]
   - [round 2 (~120px away)] LOOP back to Client slots requested [n4763]
   - [client reports (~117px away)] -> Candidate set to rejected (round) [n5045]

198. **Reference form sent** [n4799] - System/TA lead | System
   - [selected (~292px away)] -> Reference score returned [n4801]

199. **Candidate set to rejected (round)** [n5045] - System/TA lead | System
   - -> Candidate told not moving [n5047]

200. **Reference score returned** [n4801] - - | 1-10
   - -> Reference sent to client [n4803]

201. **Candidate told not moving** [n5047] - Ops owner/TA | TA
   - LOOP back to Pipeline pending counted [n4757]

202. **Reference sent to client** [n4803] - #f0a35e | As is, unjudged
   - NOTE: IdeaDecided: So there there the referees is optional check only done if the client requests it. Okay so if the client requests we go ahead and go ahead with the referral check and it's not a form or anything. The TA directly calls the referee and checks
   - [check pipeline (~125px away)] -> Client clears reference [n4805]
   - [client drops] LOOP back to Pipeline pending counted [n4757]

203. **Client clears reference** [n4805] - Client | Client
   - [client shortlisted (~141px away)] -> Offer made [n4807]
   - [client drops (~93px away)] LOOP back to Pipeline pending counted [n4757]

204. **Offer made** [n4807] - Ops owner/TA | TA, offer panel
   - -> Search stops [n4809]

205. **Search stops** [n4809] - System/TA lead | System
   - NOTE: IdeaDecided: So Top Jobs are closed two weeks after it posts. It is posted.
   - -> Offer accepted [n4811]
   - [candidate declines (~356px away)] -> Offer declined [n5051]

206. **Offer accepted** [n4811] - Candidate | Candidate
   - NOTE: Question[Timing] No timeout if the candidate does not answer the offer. How long before it counts as declined?
   - -> TA presses Place [n4813]

207. **Offer declined** [n5051] - Ops owner/TA | TA, reason saved
   - -> Back-up promoted [n5053]
   - [back-up kept (~199px away)] LOOP back to Search reopened [n5056]

208. **TA presses Place** [n4813] - Ops owner/TA | TA
   - [refill (~355px away)] -> Package, DOJ, offer letter asked [n4815]

209. **Back-up promoted** [n5053] - Ops owner/TA | TA
   - [5+ shortlisted in total (~122px away)] LOOP back to Offer made [n4807]

210. **Package, DOJ, offer letter asked** [n4815] - System/TA lead | System
   - -> Placement saved [n4817]

211. **Placement saved** [n4817] - System/TA lead | System
   - -> Asma and ops told [n4819]

212. **Asma and ops told** [n4819] - System/TA lead | System, same day
   - -> DOJ tracked [n4821]

213. **DOJ tracked** [n4821] - #b3a6ff | System reminders to TA, ops owner
   - NOTE: Problem[Path] If the candidate is lost after placing, the placement is not cancelled and Asma and ops are not told. Add 'Placement cancelled, Asma and ops told'.
   - -> Joining-day 9am alert [n4823]
   - [candidate lost (~175px away)] -> Date move logged [n5059]
   - LOOP back to Offer declined [n5051]

214. **Joining-day 9am alert** [n4823] - System/TA lead | System
   - -> TA confirms joined [n4825]
   - -> No-show flagged [n5063]

215. **Date move logged** [n5059] - Ops owner/TA | Ops owner, with owner
   - LOOP back to DOJ tracked [n4821]

216. **TA confirms joined** [n4825] - Ops owner/TA | TA
   - NOTE: Problem[Path] A replacement hire under the guarantee goes to invoice drafting like a new hire and would be billed. It needs a check that skips the invoice and closes the 60-day clock (see f5128). Step renamed to 'first hire only', but the direct arrow stays until the check is added.
   - -> Invoice drafted [n4827]
   - [joined (~175px away)] -> 90-day clock starts [n5082]

217. **No-show flagged** [n5063] - Ops owner/TA | Ops owner
   - -> Client options sent [n5065]

218. **Invoice drafted** [n4827] - System/TA lead | System, joining day, first hire only
   - -> Invoice approved [n4829]

219. **90-day clock starts** [n5082] - System/TA lead | System, ops owner
   - -> Guarantee ends clean [n5084]
   - [leaves within 90 days (~135px away)] -> Candidate leaves [n5088]
   - [day 75, nobody left (~198px away)] -> Day-75 warning [n5121]

220. **Client options sent** [n5065] - System/TA lead | System, replace or stop
   - NOTE: Question[Timing] Client has no deadline to choose replace or stop. How long before the position closes?
   - LOOP back to Search, call, screen [n4917]
   - LOOP back to LinkedIn closed [n4837]

221. **Invoice approved** [n4829] - Ops owner/TA | Ops owner
   - -> Invoice sent [n4831]

222. **Guarantee ends clean** [n5084] - System/TA lead | System
   - -> Commitment done [n5086]

223. **Candidate leaves** [n5088] - Ops owner/TA | Ops owner
   - [fee paid: TA told (~62px away)] -> TA told, position reopened [n5090]
   - [fee paid: clock starts (~73px away)] -> 60-working-day clock starts [n5093]
   - -> No guarantee, clock stopped [n5078]

224. **Day-75 warning** [n5121] - System/TA lead | System, if wanted
   - NOTE: QuestionIs a day-75 guarantee warning wanted? Undecided.
   - [90 days (~294px away)] LOOP back to Guarantee ends clean [n5084]

225. **Invoice sent** [n4831] - System/TA lead | System, due 30 days
   - [paid] LOOP back to Payment logged [n4833]
   - [unpaid day 30] -> Payment chase drafted [n5069]

226. **Commitment done** [n5086] - System/TA lead | System
   - LOOP back to Position closed [n4841]

227. **TA told, position reopened** [n5090] - Ops owner/TA | Ops owner
   - NOTE: Question[Timing] The ESA promises replacement profiles within 14 days (archive). Track that timer alongside the 60 working days?
   - [client picks replace (~295px away)] LOOP back to Search, call, screen [n4917]

228. **60-working-day clock starts** [n5093] - System/TA lead | System
   - NOTE: QuestionDoes a replacement hire start its own guarantee? Not decided.
   - [replaced in time] LOOP back to Guarantee ends clean [n5084]
   - [none in 60 working days (~73px away)] -> Director of Operations told [n5096]

229. **No guarantee, clock stopped** [n5078] - System/TA lead | System
   - LOOP back to LinkedIn closed [n4837]

230. **Payment chase drafted** [n5069] - System/TA lead | System, 5% a month
   - -> Payment chase approved [n5071]

231. **Director of Operations told** [n5096] - System/TA lead | System
   - [candidate leaves, fee unpaid (~322px away)] -> Refund 25% [n5098]

232. **Payment chase approved** [n5071] - Ops owner/TA | Ops owner
   - -> Payment chase sent [n5073]

233. **Refund 25%** [n5098] - Ops owner + TA | Director of Operations
   - -> Refund logged [n5100]

234. **Payment chase sent** [n5073] - System/TA lead | System
   - [paid (~128px away)] LOOP back to Payment logged [n4833]
   - [unpaid after 2 months (~98px away)] -> Fee written off [n5076]

235. **Refund logged** [n5100] - System/TA lead | System
   - LOOP back to LinkedIn closed [n4837]

236. **Fee written off** [n5076] - Ops owner/TA | Ops owner
   - LOOP back to No guarantee, clock stopped [n5078]
