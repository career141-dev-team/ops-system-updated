# Walkthrough: c5237 ops and recruiter systems enquiry to guarantee end

Generated from cards/c5237-ops-and-recruiter-systems-enquiry-to-guarantee-end.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 250 (expected 250) | arrows 332 (expected 332) | entry points 1 | end steps 12 | unreachable from an entry 0

Entry points: OPS Lead sources [n5238]

End steps (no arrow out): OPEN Offer silent [n6149]; REC Escalated to TA [n6333]; OPS Surcharge invoice sent [n6043]; OPS Lead closed, declined [n5747]; OPS Ownership window closes [n5993]; OPS Lead closed, ESA declined [n5815]; OPS Report sent to Mr Azeem [n5869]; OPS Fee collected [n6189]; OPEN Silent-hold limit [n6035]; LINK TopJobs ad closed [n5881]; LinkedIn closed [n6223]; REC CV to database only [n5895]

## Steps

1. **OPS Lead sources** [n5238] - REC: TA | Website, WhatsApp, call, personal email
   - [website] -> OPS Website lead created [n5729]
   - -> OPS Lead entered by hand [n5731]

2. **OPS Website lead created** [n5729] - OPS: system/REC: system/Placement | OPS: system, auto from hello@
   - [WhatsApp, call, personal email (~247px away)] -> LINK Lead tagged, owner set [n5733]

3. **OPS Lead entered by hand** [n5731] - #7fb3ff | OPS: TA lead, Asma or director
   - -> LINK Lead tagged, owner set [n5733]

4. **LINK Lead tagged, owner set** [n5733] - Interview | Lead assignment
   - -> LINK Owner alerted [n5735]

5. **LINK Owner alerted** [n5735] - Interview | Lead assignment
   - [search continues (~181px away)] -> OPS Duplicate client match [n5737]

6. **OPS Duplicate client match** [n5737] - OPS: system/REC: system/Placement | OPS: system
   - [client already on file (~155px away)] -> OPS Existing client linked [n5739]
   - [new client] -> OPS Banking/finance check [n5741]

7. **OPS Existing client linked** [n5739] - OPS: system/REC: system/Placement | OPS: system, client already on file
   - -> OPS ESA lookup [n5749]

8. **OPS Banking/finance check** [n5741] - #8fd3a9 | OPS: system flag
   - [banking/finance] -> OPS Standard decline sent [n5743]
   - -> OPS ESA lookup [n5749]

9. **OPS ESA lookup** [n5749] - OPS: system/REC: system/Placement | OPS: system
   - [returning client, no ESA (~78px away)] -> OPS Hold lead, chase ESA [n5751]
   - [new client, no ESA (~98px away)] -> OPS Intro call booked [n5753]
   - -> LINK Client, ops owner recorded [n5803]

10. **OPS Standard decline sent** [n5743] - OPS: system/REC: system/Placement | OPS: system, no invite back
   - -> OPS Decline reason saved [n5745]

11. **OPS Hold lead, chase ESA** [n5751] - ? | OPS: returning client with no ESA; lead held, signature chased, closed if unsigned
   - [chase signature (~159px away)] -> OPS ESA email 1 [n5777]
   - [unsigned, closed] -> OPS Lead closed, ESA declined [n5815]

12. **OPS Intro call booked** [n5753] - OPS: ops owner | OPS: ops owner
   - [not held (~91px away)] -> OPS Intro call not held [n5755]
   - [rebooked (~160px away)] -> Intro call held [n5759]

13. **LINK Client, ops owner recorded** [n5803] - #7fb3ff | ESA signed
   - [set reviewed, none shortlisted (~253px away)] -> OPS Requirement meeting booked [n5817]

14. **OPS Decline reason saved** [n5745] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Lead closed, declined [n5747]

15. **OPS ESA email 1** [n5777] - OPS: system/REC: system/Placement | OPS: system, held for approval
   - [client replies, chase stops (~73px away)] -> OPS ESA WhatsApp 1 [n5779]

16. **OPS Lead closed, ESA declined** [n5815] - OPS: system/REC: system/Placement | OPS: system, end
   - (end)

17. **OPS Intro call not held** [n5755] - #ff8a6b | OPS: ops owner rebooks; rebooks continue while client replies
   - -> OPS Intro silent, lead closed [n5757]
   - [held] LOOP back to OPS Intro call booked [n5753]

18. **Intro call held** [n5759] - Pipeline mgmt/REC: AI | TA lead on every call; director, DLA and ops person attend together or in part
   - -> OPS Package, role, brief saved [n5761]

19. **OPS Requirement meeting booked** [n5817] - #8fd3a9 | OPS: ops owner + TA
   - -> OPS Meeting reminder [n5819]

20. **OPS Lead closed, declined** [n5747] - OPS: system/REC: system/Placement | OPS: system, end
   - (end)

21. **OPS ESA WhatsApp 1** [n5779] - OPS: system/REC: system/Placement | OPS: system, held for approval
   - [client replies, chase stops (~147px away)] -> OPS ESA email 2 [n5781]

22. **OPS Intro silent, lead closed** [n5757] - ? | OPS: three rebook emails with no reply closes the lead; reason saved
   - [closed (~264px away)] -> LINK Lead or position closed [n6221]

23. **OPS Package, role, brief saved** [n5761] - OPS: ops owner | OPS: ops owner; brief visible to TA lead
   - -> OPS ESA clock starts [n5763]

24. **OPS Meeting reminder** [n5819] - OPS: system/REC: system/Placement | OPS: system
   - [held (~75px away)] -> LINK Requirement meeting held [n5821]
   - [not held (~107px away)] -> OPS Meeting not held [n5823]

25. **OPS ESA email 2** [n5781] - OPS: system/REC: system/Placement | OPS: system, held for approval
   - [client replies, chase stops (~71px away)] -> OPS ESA WhatsApp 2 [n5783]

26. **LINK Lead or position closed** [n6221] - #8fd3a9 | Closing
   - -> LinkedIn closed [n6223]

27. **OPS ESA clock starts** [n5763] - OPS: system/REC: system/Placement | OPS: system, 1-2h to send
   - [no reply to 3 emails (~113px away)] -> OPS ESA drafted from template [n5765]

28. **LINK Requirement meeting held** [n5821] - OPS: ops owner | Requirement phase
   - [impractical] -> OPS Role impractical [n5829]
   - [practical] -> LINK Requirement saved [n5837]

29. **OPS Meeting not held** [n5823] - ? | OPS: system rebook task, no work starts
   - -> OPS Daily rebook reminder [n5825]

30. **OPS ESA WhatsApp 2** [n5783] - OPS: system/REC: system/Placement | OPS: system, held for approval
   - [client replies, chase stops (~148px away)] -> OPS ESA email 3 [n5785]

31. **LinkedIn closed** [n6223] - OPS: ops owner | TA closes; under 20 CVs a day (repost) or monitor-only
   - (end)

32. **OPS ESA drafted from template** [n5765] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Placeholders checked [n5767]

33. **OPS Role impractical** [n5829] - OPS: ops owner | OPS: ops owner, reason saved
   - -> OPS Polite reply drafted [n5831]

34. **LINK Requirement saved** [n5837] - OPS: ops owner | Requirement phase
   - -> LINK Opening built [n5839]

35. **OPS Daily rebook reminder** [n5825] - OPS: system/REC: system/Placement | OPS: system; rebooks continue while client replies
   - [no reply to 3 emails] -> OPS Meeting silent, closed [n5827]
   - [rebooked (~185px away)] LOOP back to OPS Requirement meeting booked [n5817]

36. **OPS ESA email 3** [n5785] - OPS: system/REC: system/Placement | OPS: system, held for approval
   - -> OPS ESA final call [n5787]

37. **OPS Placeholders checked** [n5767] - ? | OPS: system blocks blanks
   - -> OPS Ops reviews ESA [n5769]
   - [check pipeline after rejection (~340px away)] LOOP back to OPS ESA drafted from template [n5765]

38. **OPS Polite reply drafted** [n5831] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Invite-back date set [n5833]

39. **LINK Opening built** [n5839] - OPS: ops owner | Requirement phase
   - -> LINK Primary TA picked [n5841]

40. **OPS Meeting silent, closed** [n5827] - ? | OPS: three rebook emails with no reply; no opening, lead closed
   - LOOP back to LINK Lead or position closed [n6221]

41. **OPS ESA final call** [n5787] - OPS: system/REC: system/Placement | OPS: Rushda, only if stuck
   - [client signs (~94px away)] -> OPS Signed ESA received [n5791]
   - -> OPS ESA declined [n5809]
   - -> OPS ESA reply read [n5789]

42. **OPS Ops reviews ESA** [n5769] - OPS: ops owner | OPS: ops owner
   - [not sent in 2h] -> OPS Late-send alert [n5771]
   - -> OPS ESA approved [n5773]

43. **OPS Invite-back date set** [n5833] - OPS: ops owner | OPS: ops owner
   - -> OPS Invite-back reminder [n5835]

44. **LINK Primary TA picked** [n5841] - #ff8a6b | Opening setup
   - -> LINK 100% day set [n5843]

45. **OPS Signed ESA received** [n5791] - Client feedback | OPS: client
   - -> OPS Signed copy filed [n5793]

46. **OPS ESA declined** [n5809] - ? | OPS: after 2 weeks of chase, no agreement, or outright decline
   - -> OPS ESA decline reason saved [n5811]

47. **OPS ESA reply read** [n5789] - OPS: system/REC: system/Placement | OPS: system; client replies at any point and the chase stops
   - -> OPS Negotiation meeting booked [n5805]
   - LOOP back to OPS Signed ESA received [n5791]
   - [declines outright] LOOP back to OPS ESA declined [n5809]

48. **OPS Late-send alert** [n5771] - ? | OPS: system alerts ops if not sent in 2h
   - -> OPS ESA approved [n5773]

49. **OPS ESA approved** [n5773] - OPS: ops owner | OPS: ops owner
   - -> OPS ESA sent [n5775]

50. **OPS Invite-back reminder** [n5835] - OPS: system/REC: system/Placement | OPS: system
   - LOOP back to OPS Lead sources [n5238]

51. **LINK 100% day set** [n5843] - #ff8a6b | Opening setup
   - -> LINK Bell to TA [n5845]

52. **OPS Signed copy filed** [n5793] - OPS: system/REC: system/Placement | OPS: system
   - -> LINK Notice to ops, TA, director [n5795]

53. **OPS ESA decline reason saved** [n5811] - OPS: system/REC: system/Placement | OPS: system
   - [other industry (~268px away)] -> Search blocked, team told [n5813]

54. **OPS Negotiation meeting booked** [n5805] - OPS: ops owner | OPS: ops owner
   - [wants changes (~326px away)] -> OPS Negotiation held [n5807]

55. **OPS ESA sent** [n5775] - REC: TA | OPS: system sends
   - [client replies at any point (~144px away)] LOOP back to OPS ESA email 1 [n5777]

56. **LINK Bell to TA** [n5845] - #ff8a6b | Opening setup
   - -> REC JD drafted [n5847]

57. **LINK Notice to ops, TA, director** [n5795] - #7fb3ff | ESA signed
   - -> LINK Director countersigns [n5797]
   - [not countersigned in 1 day (~88px away)] -> OPS Director reminder [n5799]

58. **Search blocked, team told** [n5813] - Interview | No opening or search can start; ops and TA see it
   - LOOP back to OPS Lead closed, ESA declined [n5815]

59. **OPS Negotiation held** [n5807] - OPS: ops owner | OPS: ops owner, terms notes
   - [no agreement (~220px away)] LOOP back to OPS Ops reviews ESA [n5769]
   - LOOP back to OPS ESA declined [n5809]

60. **REC JD drafted** [n5847] - Pipeline mgmt/REC: AI | REC: AI
   - -> REC JD edited [n5849]

61. **LINK Director countersigns** [n5797] - #7fb3ff | ESA signed
   - [client replies, chase stops (~256px away)] -> OPS Countersigned copy returned [n5801]

62. **OPS Director reminder** [n5799] - OPS: system/REC: system/Placement | OPS: system; one reminder only, no escalation decided
   - LOOP back to LINK Director countersigns [n5797]

63. **REC JD edited** [n5849] - REC: TA | REC: TA
   - -> REC Approval alert [n5851]
   - -> LINK JD approved [n5853]

64. **OPS Countersigned copy returned** [n5801] - ? | OPS: system returns to client
   - LOOP back to LINK Client, ops owner recorded [n5803]

65. **REC Approval alert** [n5851] - OPS: system/REC: system/Placement | REC: system, unapproved after 1 day
   - [unapproved after 1 day (~236px away)] -> LINK JD approved [n5853]

66. **LINK JD approved** [n5853] - #7fb3ff | JD approval
   - -> REC LinkedIn post made [n5855]

67. **REC LinkedIn post made** [n5855] - REC: TA | REC: TA; mandatory for every job
   - [URL missing] -> REC Live blocked, no URL [n5857]
   - -> REC LinkedIn URL pasted [n5859]

68. **REC Live blocked, no URL** [n5857] - OPS: system/REC: system/Placement | REC: system
   - -> REC LinkedIn URL pasted [n5859]

69. **REC LinkedIn URL pasted** [n5859] - REC: TA | REC: TA, on opening
   - -> LINK LinkedIn advert Live [n5861]

70. **LINK LinkedIn advert Live** [n5861] - Interview | Advertising
   - -> REC Application matching on [n5863]
   - [weekly while live (~157px away)] -> REC LinkedIn reposted [n5865]
   - -> OPS Weekly report built [n5867]
   - -> TopJobs requested [n5871]
   - [weekly (~71px away)] -> OPS Talent Pulse list compiled [n5883]

71. **REC Application matching on** [n5863] - OPS: system/REC: system/Placement | REC: system
   - -> REC CV arrives [n5887]
   - -> REC Search, call, screen [n5907]

72. **REC LinkedIn reposted** [n5865] - REC: TA | REC: TA; below 20 CVs a day is not performing, closed and reposted
   - LOOP back to REC LinkedIn URL pasted [n5859]

73. **OPS Weekly report built** [n5867] - OPS: system/REC: system/Placement | OPS: system, weekly while live
   - -> OPS Report sent to Mr Azeem [n5869]

74. **TopJobs requested** [n5871] - OPS: ops owner | TA requests, optional
   - -> OPS Request routed to marketing [n5873]

75. **OPS Talent Pulse list compiled** [n5883] - OPS: system/REC: system/Placement | OPS: system, Tuesday
   - [TA hunts (~310px away)] -> OPS Newsletter posted [n5885]

76. **REC CV arrives** [n5887] - Pipeline mgmt/REC: AI | REC: mailbox, upload, import
   - -> LINK CV source tagged [n5889]

77. **REC Search, call, screen** [n5907] - REC: TA | REC: TA, workday screen, hunting
   - [shortlist button (~63px away)] -> REC TA shortlists candidate [n5905]

78. **OPS Report sent to Mr Azeem** [n5869] - #8fd3a9 | OPS: TA lead sends
   - (end)

79. **OPS Request routed to marketing** [n5873] - OPS: system/REC: system/Placement | OPS: system; ops sends the JD
   - -> OPS Flyer designed [n5875]

80. **OPS Newsletter posted** [n5885] - #ff8a6b | OPS: marketing, Wednesday
   - [CVs tagged (~344px away)] LOOP back to REC CV arrives [n5887]
   - [next Tuesday while role open (~80px away)] LOOP back to OPS Talent Pulse list compiled [n5883]

81. **LINK CV source tagged** [n5889] - REC: TA | CV intake
   - -> REC CV filed to opening [n5891]
   - [mail, no advert match (~119px away)] -> REC CV held for a lead [n5893]
   - [no advert] -> REC CV to database only [n5895]

82. **REC TA shortlists candidate** [n5905] - REC: TA | REC: TA
   - [replies, reminders stop (~267px away)] -> REC Candidate skipped [n5909]
   - -> REC First message sent [n5911]

83. **OPS Flyer designed** [n5875] - #ff8a6b | OPS: marketing
   - -> OPS Flyer sent to TopJobs [n5877]

84. **REC CV filed to opening** [n5891] - OPS: system/REC: system/Placement | REC: system
   - -> REC CV read [n5897]

85. **REC CV held for a lead** [n5893] - OPS: system/REC: system/Placement | REC: lead places it
   - [lead places] LOOP back to REC CV filed to opening [n5891]

86. **REC CV to database only** [n5895] - OPS: system/REC: system/Placement | REC: system
   - (end)

87. **REC Candidate skipped** [n5909] - ? | REC: do-not-contact flag
   - [guarantee over, position done (~226px away)] LOOP back to REC Search, call, screen [n5907]

88. **REC First message sent** [n5911] - OPS: system/REC: system/Placement | REC: system, WhatsApp + email
   - [close checklist (~107px away)] -> REC Reminder 24h [n5913]

89. **OPS Flyer sent to TopJobs** [n5877] - OPS: ops owner | OPS: ops owner, cost logged
   - -> LINK TopJobs ad Live [n5879]

90. **REC CV read** [n5897] - OPS: system/REC: system/Placement | REC: system
   - [extraction fails] -> REC Extraction alert [n5899]
   - [fee unpaid (~312px away)] -> REC CV scored [n5901]

91. **REC Reminder 24h** [n5913] - OPS: system/REC: system/Placement | REC: system
   - -> REC Reminder 48h [n5915]

92. **LINK TopJobs ad Live** [n5879] - Interview | Advertising
   - [two weeks after posting (~85px away)] -> LINK TopJobs ad closed [n5881]
   - [CVs] LOOP back to REC CV arrives [n5887]

93. **REC Extraction alert** [n5899] - OPS: system/REC: system/Placement | REC: system
   - [fixed] -> REC CV scored [n5901]

94. **REC CV scored** [n5901] - Pipeline mgmt/REC: AI | REC: AI
   - [high score] -> REC AI shortlists candidate [n5903]
   - [TA picks] LOOP back to REC TA shortlists candidate [n5905]

95. **REC Reminder 48h** [n5915] - OPS: system/REC: system/Placement | REC: system
   - [unsigned after 2 weeks of chase (~184px away)] -> REC Reminder 72h [n5917]
   - -> REC Reply read [n5919]

96. **LINK TopJobs ad closed** [n5881] - Interview | Advertising
   - (end)

97. **REC AI shortlists candidate** [n5903] - OPS: system/REC: system/Placement | REC: system, high score
   - LOOP back to REC First message sent [n5911]

98. **REC Reminder 72h** [n5917] - OPS: system/REC: system/Placement | REC: system; third and last
   - -> REC Reply read [n5919]
   - [no reply, 3 tries] -> REC Moved to dropped-out list [n5925]

99. **REC Reply read** [n5919] - Pipeline mgmt/REC: AI | REC: AI
   - -> REC Missing items asked [n5921]
   - -> REC Details complete [n5923]
   - [AI cannot help] -> REC Flagged for TA [n5933]

100. **REC Moved to dropped-out list** [n5925] - OPS: system/REC: system/Placement | REC: system
   - -> REC Call task to TA [n5927]

101. **REC Missing items asked** [n5921] - Pipeline mgmt/REC: AI | REC: AI; max 3 messages in 24h
   - LOOP back to REC Reply read [n5919]
   - -> REC Details complete [n5923]
   - [client books (~138px away)] -> REC Escalated to TA [n6333]

102. **REC Details complete** [n5923] - #7fb3ff | REC: CV, salary, notice
   - -> REC Director set size check [n5937]

103. **REC Flagged for TA** [n5933] - Pipeline mgmt/REC: AI | REC: AI
   - [all items given (~208px away)] -> REC TA resolves [n5935]

104. **REC Call task to TA** [n5927] - OPS: system/REC: system/Placement | REC: system
   - -> REC TA calls candidate [n5929]

105. **REC Escalated to TA** [n6333] - OPS: system/REC: system/Placement | REC: system, after 3 unanswered messages in 24h
   - (end)

106. **REC Director set size check** [n5937] - ? | REC: five CVs minimum in a Director review set
   - [fewer than five] -> REC Set held, search more [n5939]
   - [five or more] -> REC Queued for Director [n5941]

107. **REC TA resolves** [n5935] - REC: TA | REC: TA
   - LOOP back to REC Details complete [n5923]

108. **REC TA calls candidate** [n5929] - REC: TA | REC: TA
   - [3 messages in 24h, still missing (~398px away)] -> REC Drop-out reason saved [n5931]
   - LOOP back to REC Reply read [n5919]

109. **REC Set held, search more** [n5939] - ? | REC: fewer than five CVs, set waits
   - LOOP back to REC Search, call, screen [n5907]

110. **REC Queued for Director** [n5941] - ? | REC: system auto-advance
   - [search more (~221px away)] -> REC Set email drafted [n5943]

111. **REC Drop-out reason saved** [n5931] - REC: TA | REC: TA
   - LOOP back to REC Search, call, screen [n5907]

112. **REC Set email drafted** [n5943] - OPS: system/REC: system/Placement | REC: system, end of day
   - -> REC Set email approved [n5945]

113. **REC Set email approved** [n5945] - Interview | REC: held for approval
   - -> LINK Set emailed to Director [n5947]

114. **LINK Set emailed to Director** [n5947] - #8fd3a9 | Director review
   - -> LINK Director reviews [n5949]
   - -> REC Director chase [n5951]

115. **LINK Director reviews** [n5949] - #8fd3a9 | Director review
   - [no reply in 1 working day (~392px away)] -> LINK Reply read in [n5953]

116. **REC Director chase** [n5951] - ? | REC: system after 1 working day; no escalation decided
   - [replies] -> LINK Reply read in [n5953]

117. **LINK Reply read in** [n5953] - #8fd3a9 | Director review
   - -> REC Director shortlist recorded [n5955]
   - -> REC Rejected by Director [n5959]
   - LOOP back to REC Search, call, screen [n5907]

118. **REC Director shortlist recorded** [n5955] - OPS: system/REC: system/Placement | REC: system
   - [shortlisted (~241px away)] -> REC Position status next day [n5957]

119. **REC Rejected by Director** [n5959] - ? | REC: candidate set to rejected
   - -> REC Director rejection notice [n5961]

120. **REC Position status next day** [n5957] - OPS: system/REC: system/Placement | REC: system, follow-up or 100%
   - -> Client set size check [n5963]
   - LOOP back to REC Search, call, screen [n5907]

121. **REC Director rejection notice** [n5961] - ? | REC: system sends approved template, search continues
   - LOOP back to REC Search, call, screen [n5907]
   - -> LINK Pipeline pending counted [n6051]

122. **Client set size check** [n5963] - ? | Five CVs minimum for a client set
   - [fewer than five (~159px away)] -> REC Client set held [n5965]
   - [five or more] -> LINK Client set drafted [n5967]

123. **LINK Pipeline pending counted** [n6051] - Pipeline mgmt/REC: AI | Pipeline mgmt
   - [below 20 CVs a day (~165px away)] -> LINK Total shortlisted counted [n6053]

124. **REC Client set held** [n5965] - ? | REC: fewer than five CVs, search more
   - LOOP back to REC Search, call, screen [n5907]

125. **LINK Client set drafted** [n5967] - Client feedback | Client set
   - -> OPS Set due date tracked [n5969]

126. **LINK Total shortlisted counted** [n6053] - Pipeline mgmt/REC: AI | Pipeline mgmt
   - [3 or fewer pending] -> LINK Add-on alert to TA [n6055]
   - [5+ shortlisted in total (~115px away)] -> LINK Hold at five CVs [n6059]
   - [client shortlisted (~159px away)] -> OPS Who schedules? [n6065]

127. **OPS Set due date tracked** [n5969] - OPS: system/REC: system/Placement | OPS: system, 7 to 14 days of ESA
   - [set late] -> OPS Overdue alert to ops [n5971]
   - -> OPS Ops reviews set [n5973]

128. **LINK Add-on alert to TA** [n6055] - Pipeline mgmt/REC: AI | Pipeline mgmt
   - -> REC Add-on search [n6057]

129. **LINK Hold at five CVs** [n6059] - Pipeline mgmt/REC: AI | Pipeline mgmt
   - -> REC Monitor position [n6061]

130. **OPS Who schedules?** [n6065] - OPS: ops owner | OPS: ops owner, client or us
   - [we schedule (~67px away)] -> OPS Client slots requested [n6067]
   - [not reached (~131px away)] -> OPS Client contacts candidate [n6079]

131. **OPS Overdue alert to ops** [n5971] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Ops reviews set [n5973]

132. **OPS Ops reviews set** [n5973] - OPS: ops owner | OPS: ops owner
   - -> OPS Set approved [n5975]

133. **REC Add-on search** [n6057] - REC: TA | REC: TA, 30-60 min a day
   - LOOP back to REC Search, call, screen [n5907]

134. **REC Monitor position** [n6061] - REC: TA | REC: TA monitors only; LinkedIn closes
   - [exit rule (~85px away)] -> LINK Five-CV hold lifts [n6063]
   - -> OPS Feedback timer starts [n5995]
   - LOOP back to LinkedIn closed [n6223]

135. **OPS Client slots requested** [n6067] - OPS: ops owner | OPS: ops owner
   - [refill (~158px away)] -> OPS Slots received [n6069]

136. **OPS Client contacts candidate** [n6079] - ? | OPS: client books directly
   - [reported] -> OPS Date reported [n6081]
   - [no update (~122px away)] -> OPS Report reminder to client [n6085]

137. **OPS Set approved** [n5975] - OPS: ops owner | OPS: ops owner
   - -> LINK Set sent to client [n5977]

138. **LINK Five-CV hold lifts** [n6063] - Pipeline mgmt/REC: AI | Pipeline mgmt
   - LOOP back to REC Search, call, screen [n5907]

139. **OPS Feedback timer starts** [n5995] - OPS: system/REC: system/Placement | OPS: system, from client receipt
   - [client replies first (~170px away)] -> OPS Chase drafted [n5997]
   - -> LINK Client replies [n6005]

140. **OPS Slots received** [n6069] - OPS: system/REC: system/Placement | OPS
   - -> OPS Slots checked with candidate [n6071]

141. **OPS Date reported** [n6081] - ? | OPS: client must report
   - -> OPS Date logged [n6083]

142. **OPS Report reminder to client** [n6085] - OPS: system/REC: system/Placement | OPS: system, ops approves; no escalation decided
   - [client reports (~135px away)] LOOP back to OPS Date reported [n6081]

143. **LINK Set sent to client** [n5977] - Client feedback | Client set
   - -> OPS Client group created [n5979]
   - [3 months, no hire reported (~140px away)] -> OPS Unreported hire flagged [n6037]

144. **OPS Chase drafted** [n5997] - OPS: system/REC: system/Placement | OPS: system
   - [invited back later (~127px away)] -> OPS Chase approved [n5999]

145. **LINK Client replies** [n6005] - Client feedback | Client feedback
   - -> LINK Reply read into system [n6007]

146. **OPS Slots checked with candidate** [n6071] - OPS: system/REC: system/Placement | OPS
   - [no slot fits (~75px away)] -> OPS New slots requested [n6073]
   - -> LINK Interview booked [n6077]

147. **OPS Date logged** [n6083] - OPS: system/REC: system/Placement | OPS: system
   - -> LINK Interview booked [n6077]

148. **OPS Client group created** [n5979] - OPS: ops owner | OPS: ops owner, new client after first set
   - -> OPS Set posted in client group [n5981]

149. **OPS Unreported hire flagged** [n6037] - OPS: system/REC: system/Placement | OPS: system, no hire reported in 3 months
   - [search more (~216px away)] -> OPS Surcharge invoice drafted [n6039]

150. **OPS Chase approved** [n5999] - OPS: ops owner | OPS: ops owner
   - -> OPS Chase sent [n6001]

151. **LINK Reply read into system** [n6007] - Client feedback | Client feedback
   - -> LINK TA informed [n6009]

152. **OPS New slots requested** [n6073] - #7fb3ff | OPS: no slot fits; keeps going while client replies
   - [no reply to 3 emails (~91px away)] -> OPS Slot loop, TA alerted [n6075]
   - LOOP back to OPS Slots received [n6069]

153. **LINK Interview booked** [n6077] - Interview | Interview
   - -> LINK Invite and Teams sent [n6087]

154. **OPS Set posted in client group** [n5981] - OPS: ops owner | OPS: ops owner
   - -> OPS Set logged [n5983]

155. **OPS Surcharge invoice drafted** [n6039] - OPS: system/REC: system/Placement | OPS: system, 50%
   - -> OPS Surcharge invoice approved [n6041]

156. **OPS Chase sent** [n6001] - OPS: system/REC: system/Placement | OPS: system, email + WhatsApp
   - -> OPS Owner calls client [n6003]
   - [silent, ESA inactive rule (~122px away)] -> OPS Inactive notice drafted [n6027]
   - [check pipeline after rejection (~384px away)] LOOP back to LINK Client replies [n6005]

157. **LINK TA informed** [n6009] - Client feedback | Client feedback
   - -> LINK Reason saved [n6011]

158. **OPS Slot loop, TA alerted** [n6075] - ? | OPS: keep going while candidate responds; no response after 3 attempts alerts the TA
   - [TA alerted, picks back-up (~73px away)] -> REC Replacement candidate picked [n6111]

159. **LINK Invite and Teams sent** [n6087] - Interview | Interview
   - -> LINK TA alerted of booking [n6089]
   - [client cancels or postpones (~76px away)] -> LINK Client cancel logged [n6113]

160. **OPS Set logged** [n5983] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Client receipt date saved [n5985]

161. **OPS Surcharge invoice approved** [n6041] - OPS: ops owner | OPS: ops owner
   - -> OPS Surcharge invoice sent [n6043]

162. **OPS Owner calls client** [n6003] - ? | OPS: next day if no feedback
   - [client replies (~73px away)] LOOP back to LINK Client replies [n6005]
   - [no answer after call] -> OPS Client silent after call [n6025]

163. **OPS Inactive notice drafted** [n6027] - OPS: system/REC: system/Placement | OPS: system, ESA inactive rule
   - -> OPS Inactive notice approved [n6029]

164. **LINK Reason saved** [n6011] - Client feedback | Client feedback
   - -> LINK Client decision [n6013]

165. **REC Replacement candidate picked** [n6111] - REC: TA | REC: TA, back-up
   - [replacement (~69px away)] LOOP back to OPS Slots checked with candidate [n6071]
   - LOOP back to REC Search, call, screen [n5907]

166. **LINK TA alerted of booking** [n6089] - Interview | Interview
   - -> OPS Day-before reconfirm [n6091]

167. **LINK Client cancel logged** [n6113] - Interview | Interview
   - [no back-up (~377px away)] -> LINK TA told of cancel [n6115]

168. **OPS Client receipt date saved** [n5985] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Ownership clock starts [n5987]
   - LOOP back to OPS Feedback timer starts [n5995]

169. **OPS Surcharge invoice sent** [n6043] - OPS: system/REC: system/Placement | OPS: system; no chase decided
   - (end)

170. **OPS Client silent after call** [n6025] - OPS: system/REC: system/Placement | OPS: system, no answer
   - [silent, ESA inactive rule (~68px away)] LOOP back to OPS Inactive notice drafted [n6027]

171. **OPS Inactive notice approved** [n6029] - OPS: ops owner | OPS: ops owner
   - -> OPS Inactive notice sent [n6031]

172. **LINK Client decision** [n6013] - Client feedback | Client feedback
   - [rejected] -> REC Rejected by client [n6045]
   - [client shortlisted] -> LINK Candidate marked shortlisted [n6049]
   - LOOP back to LINK Pipeline pending counted [n6051]

173. **OPS Day-before reconfirm** [n6091] - OPS: system/REC: system/Placement | OPS: system, automatic
   - -> REC Candidate reconfirms [n6093]
   - [no reply] -> REC Reconfirm call task [n6101]
   - [candidate out (~79px away)] -> REC Candidate out or no-show [n6103]

174. **LINK TA told of cancel** [n6115] - Interview | Interview
   - [new slot (~266px away)] LOOP back to OPS Who schedules? [n6065]

175. **OPS Ownership clock starts** [n5987] - OPS: system/REC: system/Placement | OPS: system, 7 working days from receipt
   - -> OPS Countdown shown [n5989]

176. **OPS Inactive notice sent** [n6031] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Position on hold [n6033]

177. **REC Rejected by client** [n6045] - ? | REC: candidate set to rejected
   - -> REC Client rejection notice [n6047]

178. **LINK Candidate marked shortlisted** [n6049] - Pipeline mgmt/REC: AI | Pipeline mgmt
   - LOOP back to LINK Pipeline pending counted [n6051]

179. **REC Candidate reconfirms** [n6093] - #8fd3a9 | REC: candidate
   - -> OPS Interview day arrives [n6095]

180. **REC Reconfirm call task** [n6101] - OPS: ops owner | REC: system to TA
   - LOOP back to REC Candidate reconfirms [n6093]
   - [cannot reach (~122px away)] -> REC Candidate out or no-show [n6103]

181. **REC Candidate out or no-show** [n6103] - REC: TA | REC: TA
   - -> OPS Client notice drafted [n6105]

182. **OPS Countdown shown** [n5989] - OPS: ops owner | OPS: ops owner sees it
   - -> OPS Alert before expiry [n5991]
   - [client says already had CV (~88px away)] -> OPS Claim checked [n6015]

183. **OPS Position on hold** [n6033] - OPS: system/REC: system/Placement | OPS: system, reason saved; follows ESA inactive rule, not the 2-week chase cutoff
   - -> OPEN Silent-hold limit [n6035]
   - LOOP back to OPS Feedback timer starts [n5995]
   - [hold limit (~148px away)] LOOP back to LINK Lead or position closed [n6221]

184. **REC Client rejection notice** [n6047] - #ff8a6b | REC: system sends
   - LOOP back to LINK Pipeline pending counted [n6051]

185. **OPS Interview day arrives** [n6095] - OPS: system/REC: system/Placement | OPS: system
   - -> LINK Interview held [n6097]

186. **OPS Client notice drafted** [n6105] - OPS: system/REC: system/Placement | OPS: system, 1 day or 3h before
   - -> OPS Client notice approved [n6107]

187. **OPS Alert before expiry** [n5991] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Ownership window closes [n5993]

188. **OPS Claim checked** [n6015] - OPS: ops owner | OPS: ops owner
   - [within 7 working days (~91px away)] -> OPS CV dropped, not pursued [n6017]
   - [after 7 working days (~65px away)] -> OPS Claim refused [n6023]

189. **OPEN Silent-hold limit** [n6035] - ? | Not decided: exact inactive days and how long a hold lasts before closing
   - (end)

190. **LINK Interview held** [n6097] - Interview | Interview
   - -> OPS Attendance marked [n6099]

191. **OPS Client notice approved** [n6107] - OPS: ops owner | OPS: ops owner
   - -> OPS Client notice sent [n6109]

192. **OPS Ownership window closes** [n5993] - OPS: system/REC: system/Placement | OPS: system
   - (end)

193. **OPS CV dropped, not pursued** [n6017] - OPS: ops owner | OPS: ops owner, within 7 working days
   - -> OPS Candidate marked client-owned [n6019]

194. **OPS Claim refused** [n6023] - OPS: system/REC: system/Placement | OPS: system, after 7 working days
   - LOOP back to OPS Feedback timer starts [n5995]

195. **OPS Attendance marked** [n6099] - OPS: system/REC: system/Placement | OPS: system
   - [attended (~280px away)] -> REC TA logs feedback after 5 PM [n6117]
   - [no-show] LOOP back to REC Candidate out or no-show [n6103]

196. **OPS Client notice sent** [n6109] - OPS: system/REC: system/Placement | OPS: system
   - LOOP back to REC Replacement candidate picked [n6111]

197. **OPS Candidate marked client-owned** [n6019] - OPS: system/REC: system/Placement | OPS: system
   - [set still live (~374px away)] -> OPS Rest of set continues [n6021]

198. **REC TA logs feedback after 5 PM** [n6117] - REC: TA | REC: TA
   - -> REC Candidate told [n6119]

199. **OPS Rest of set continues** [n6021] - OPS: system/REC: system/Placement | OPS: system
   - LOOP back to OPS Feedback timer starts [n5995]

200. **REC Candidate told** [n6119] - REC: TA | REC: TA
   - -> OPS Client message drafted [n6121]

201. **OPS Client message drafted** [n6121] - OPS: system/REC: system/Placement | OPS: system
   - -> OPS Client message approved [n6123]

202. **OPS Client message approved** [n6123] - OPS: ops owner | OPS: ops owner
   - -> OPS Feedback posted to client [n6125]

203. **OPS Feedback posted to client** [n6125] - OPS: ops owner | OPS: ops owner
   - -> LINK Client round decision [n6127]

204. **LINK Client round decision** [n6127] - Interview | Interview
   - -> LINK TA informed of decision [n6129]

205. **LINK TA informed of decision** [n6129] - Interview | Interview
   - [selected (~172px away)] -> REC Rejected after round [n6131]
   - -> REC Client asks for reference? [n6135]
   - [round 2 (~114px away)] LOOP back to OPS Client slots requested [n6067]

206. **REC Rejected after round** [n6131] - ? | REC: candidate set to rejected
   - [not moving (~364px away)] -> REC Candidate told not moving [n6133]

207. **REC Client asks for reference?** [n6135] - #ff8a6b | REC: optional, only if the client requests it
   - [client requests (~73px away)] -> REC TA calls referee [n6137]
   - [TA wants TopJobs (~170px away)] -> LINK Offer made [n6145]

208. **REC Candidate told not moving** [n6133] - REC: TA | REC: TA
   - LOOP back to LINK Pipeline pending counted [n6051]

209. **REC TA calls referee** [n6137] - ? | REC: TA phones the referee directly, no form, notes saved
   - [check pipeline (~277px away)] -> REC Reference reported to client [n6141]
   - [referee not reached] -> REC Referee not reached [n6139]

210. **LINK Offer made** [n6145] - REC: TA | Offer
   - -> LINK Search stops [n6147]

211. **REC Reference reported to client** [n6141] - Pipeline mgmt/REC: AI | REC: TA reports as is; client decides
   - -> Client clears reference [n6143]

212. **REC Referee not reached** [n6139] - ? | REC: TA reports this to the client; client decides
   - [report the gap (~68px away)] LOOP back to REC Reference reported to client [n6141]

213. **LINK Search stops** [n6147] - REC: TA | Offer
   - [candidate does not answer (~132px away)] -> OPEN Offer silent [n6149]
   - -> LINK Offer accepted [n6151]
   - -> REC Offer declined [n6153]

214. **Client clears reference** [n6143] - Client feedback | Client decides
   - LOOP back to LINK Offer made [n6145]
   - LOOP back to LINK Pipeline pending counted [n6051]

215. **OPEN Offer silent** [n6149] - ? | Not decided: how long candidate silence lasts before it counts as declined
   - (end)

216. **LINK Offer accepted** [n6151] - OPS: system/REC: system/Placement | Placement
   - [accepted (~307px away)] -> LINK TA presses Place [n6159]

217. **REC Offer declined** [n6153] - REC: TA | REC: TA, reason saved
   - [back-up kept] -> REC Back-up promoted [n6155]
   - [no back-up (~150px away)] -> REC Search reopened [n6157]

218. **LINK TA presses Place** [n6159] - OPS: system/REC: system/Placement | Placement
   - -> LINK Package, DOJ, offer letter asked [n6161]

219. **REC Back-up promoted** [n6155] - REC: TA | REC: TA
   - LOOP back to LINK Offer made [n6145]

220. **REC Search reopened** [n6157] - REC: TA | REC: TA
   - [replaced in time (~152px away)] LOOP back to REC Search, call, screen [n5907]

221. **LINK Package, DOJ, offer letter asked** [n6161] - OPS: system/REC: system/Placement | Placement
   - [candidate declines (~257px away)] -> LINK Placement saved [n6163]

222. **LINK Placement saved** [n6163] - OPS: system/REC: system/Placement | Placement
   - [still missing (~357px away)] -> LINK Asma and ops told [n6165]

223. **LINK Asma and ops told** [n6165] - OPS: system/REC: system/Placement | Placement
   - -> OPS DOJ tracked [n6167]

224. **OPS DOJ tracked** [n6167] - ? | OPS: system reminders to TA and ops owner
   - [date moves] -> OPS Date move logged [n6169]
   - [candidate lost (~113px away)] -> LINK Placement cancelled [n6171]
   - [joining day (~339px away)] -> OPS Joining-day 9am alert [n6173]

225. **OPS Date move logged** [n6169] - OPS: ops owner | OPS: ops owner, with owner
   - LOOP back to OPS DOJ tracked [n6167]

226. **LINK Placement cancelled** [n6171] - OPS: system/REC: system/Placement | Placement
   - [candidate lost] LOOP back to REC Offer declined [n6153]

227. **OPS Joining-day 9am alert** [n6173] - OPS: system/REC: system/Placement | OPS: system
   - -> LINK TA confirms joined [n6175]
   - [not joined (~81px away)] -> OPS No-show flagged [n6177]

228. **LINK TA confirms joined** [n6175] - OPS: system/REC: system/Placement | Placement
   - [guarantee starts at joining (~71px away)] -> LINK 90-day clock starts [n6181]

229. **OPS No-show flagged** [n6177] - OPS: ops owner | OPS: ops owner
   - -> OPS Client options sent [n6179]

230. **LINK 90-day clock starts** [n6181] - #7fb3ff | Guarantee
   - [first hire (~149px away)] -> OPS Invoice drafted [n6183]
   - [replacement hire: no invoice, new 90-day guarantee (~122px away)] -> LINK 90-day clock starts [n6201]

231. **OPS Client options sent** [n6179] - OPS: system/REC: system/Placement | OPS: system, replace or stop; no refund, nothing invoiced; client deadline not decided
   - [replacement search (~127px away)] LOOP back to REC Search, call, screen [n5907]
   - LOOP back to LINK Lead or position closed [n6221]

232. **OPS Invoice drafted** [n6183] - OPS: system/REC: system/Placement | OPS: system, first hire only
   - -> OPS Invoice approved [n6185]

233. **LINK 90-day clock starts** [n6201] - #7fb3ff | Guarantee
   - [day 75, nobody left (~210px away)] -> OPEN Day-75 warning [n6203]
   - [90 days, nobody left (~62px away)] -> OPS Guarantee ends clean [n6205]
   - [leaves within 90 days (~155px away)] -> LINK Candidate leaves [n6209]

234. **OPS Invoice approved** [n6185] - OPS: ops owner | OPS: ops owner
   - -> OPS Invoice sent [n6187]

235. **OPEN Day-75 warning** [n6203] - ? | Undecided: is a warning wanted
   - [90 days (~131px away)] -> OPS Guarantee ends clean [n6205]

236. **OPS Guarantee ends clean** [n6205] - OPS: system/REC: system/Placement | OPS: system, 90 days and nobody left
   - -> OPS Commitment done [n6207]

237. **LINK Candidate leaves** [n6209] - #7fb3ff | Guarantee
   - [fee paid: replace first (~75px away)] -> LINK Position reopened [n6211]
   - [fee paid: clock starts (~113px away)] -> OPS 60-working-day clock starts [n6213]
   - [refund paid, close (~296px away)] -> OPS No guarantee, clock stopped [n6199]

238. **OPS Invoice sent** [n6187] - OPS: system/REC: system/Placement | OPS: system, due 30 days
   - [paid (~132px away)] -> OPS Fee collected [n6189]
   - [unpaid day 30] -> OPS Payment chase drafted [n6191]

239. **OPS Commitment done** [n6207] - OPS: system/REC: system/Placement | OPS: system
   - LOOP back to LINK Lead or position closed [n6221]

240. **LINK Position reopened** [n6211] - #7fb3ff | Guarantee
   - LOOP back to REC Search, call, screen [n5907]

241. **OPS 60-working-day clock starts** [n6213] - OPS: system/REC: system/Placement | OPS: system
   - [none in 60 working days (~73px away)] -> OPS Director of Operations told [n6215]
   - LOOP back to OPS Guarantee ends clean [n6205]

242. **OPS No guarantee, clock stopped** [n6199] - OPS: system/REC: system/Placement | OPS: system; closes the position
   - LOOP back to LINK Lead or position closed [n6221]

243. **OPS Fee collected** [n6189] - Interview | OPS: ops and Asma log payment
   - (end)

244. **OPS Payment chase drafted** [n6191] - OPS: system/REC: system/Placement | OPS: system, 5% a month
   - -> OPS Payment chase approved [n6193]

245. **OPS Director of Operations told** [n6215] - OPS: system/REC: system/Placement | OPS: system
   - [client stops, no refund (~244px away)] -> OPS Refund 25% [n6217]

246. **OPS Payment chase approved** [n6193] - OPS: ops owner | OPS: ops owner
   - -> OPS Payment chase sent [n6195]

247. **OPS Refund 25%** [n6217] - ? | OPS: Director of Operations; only after 60 working days with no replacement
   - -> OPS Refund logged [n6219]

248. **OPS Payment chase sent** [n6195] - OPS: system/REC: system/Placement | OPS: system, up to 2 months
   - [unpaid after 2 months (~115px away)] -> OPS Fee written off [n6197]
   - [paid (~108px away)] LOOP back to OPS Fee collected [n6189]

249. **OPS Refund logged** [n6219] - OPS: system/REC: system/Placement | OPS: system
   - [do-not-contact flag (~88px away)] LOOP back to LINK Lead or position closed [n6221]

250. **OPS Fee written off** [n6197] - OPS: ops owner | OPS: ops owner
   - LOOP back to OPS No guarantee, clock stopped [n6199]
