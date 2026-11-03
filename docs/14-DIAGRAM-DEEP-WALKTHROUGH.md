# 14 · Deep walkthrough of the diagram (c5237)

The owner's newest flow, **"Ops and recruiter systems: enquiry to guarantee end"** (card
c5237), read step by step. Re-read from the live board on **1 Nov 2026**: 250 steps, 332
arrows, every arrow end resolved, 0 unreachable steps. The board is byte-for-byte the same
as on 27 and 28 Oct. Every step on it is still marked **draft** (`s-guess`).

Each table row is one step on the board. **Owner** is the colour the board gives the step
(🟦 Ops system · 👤 ops owner · 🟩 TA · 🤖 AI/pipeline · 🔁 link step · ⚪ open). **Next** lists
every arrow leaving the step, with its label. Labels in *italics* were on the wrong arrow or
floating on the board and were placed by reading the flow (see section 11). **CP** is the
connection point between the two systems ([03](03-CONNECTION-TO-TA.md)).

---

## Phase A · Lead in (steps 1–16)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n5238 Lead sources | 🟩 | Website, WhatsApp, call, personal email | website → n5729; *WhatsApp, call, personal email* → n5731 | — |
| n5729 Website lead created | 🟦 | auto from hello@ | → n5733 | — |
| n5731 Lead entered by hand | 👤 | TA lead, Asma or director | → n5733 | — |
| n5733 Lead tagged, owner set | 🔁 | lead assignment | → n5735 | CP-01 |
| n5735 Owner alerted | 🔁 | lead assignment | → n5737 (*unlabelled; "search continues" belongs elsewhere*) | CP-25 |
| n5737 Duplicate client match | 🟦 | system | client already on file → n5739; new client → n5741 | CP-02 |
| n5739 Existing client linked | 🟦 | client already on file | → n5749 | CP-02 |
| n5741 Banking/finance check | 🔁 | system flag | banking/finance → n5743; *other industry* → n5749 | — |
| n5743 Standard decline sent | 🟦 | no invite back | → n5745 | — |
| n5745 Decline reason saved | 🟦 | | → n5747 | — |
| n5747 Lead closed, declined | 🟦 | **end** | — | — |
| n5749 ESA lookup | 🟦 | | returning client, no ESA → n5751; new client, no ESA → n5753; *ESA on file* → n5803 | CP-03 |
| n5751 Hold lead, chase ESA | ⚪ | returning client with no ESA; lead held, signature chased, closed if unsigned | chase signature → n5777; unsigned, closed → n5815 | — |

**Reading:** a lead always gets one owner before anything else. The board sends a returning
client straight into the chase emails (n5777), skipping draft and approval; the corrected
flow sends the existing agreement again first ([13](13-CORRECTIONS-LOG.md), gap 11).

## Phase B · Intro call and ESA (steps 12–64)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n5753 Intro call booked | 👤 | ops owner | not held → n5755; held → n5759 | CP-01 (TA lead invited) |
| n5755 Intro call not held | 🔁 | ops owner rebooks; rebooks continue while client replies | → n5757 (*no reply to 3 emails*); held ↩ n5753 | — |
| n5757 Intro silent, lead closed | ⚪ | three rebook emails with no reply closes the lead; reason saved | closed → n6221 | CP-23 |
| n5759 Intro call held | 🤖 | TA lead on every call; director, DLA and ops person attend together or in part | → n5761 | — |
| n5761 Package, role, brief saved | 👤 | brief visible to TA lead | → n5763 | — |
| n5763 ESA clock starts | 🟦 | 1–2 h to send | → n5765 | — |
| n5765 ESA drafted from template | 🟦 | | → n5767 | — |
| n5767 Placeholders checked | ⚪ | system blocks blanks | → n5769; *blank found, redraft* ↩ n5765 | — |
| n5769 Ops reviews ESA | 👤 | | not sent in 2 h → n5771; → n5773 | — |
| n5771 Late-send alert | ⚪ | alerts ops if not sent in 2 h | → n5773 | — |
| n5773 ESA approved | 👤 | | → n5775 | — |
| n5775 ESA sent | 🟩 | system sends | → n5777 (chase starts) | — |
| n5777 ESA email 1 | 🟦 | held for approval | → n5779 | — |
| n5779 ESA WhatsApp 1 | 🟦 | held for approval | → n5781 | — |
| n5781 ESA email 2 | 🟦 | held for approval | → n5783 | — |
| n5783 ESA WhatsApp 2 | 🟦 | held for approval | → n5785 | — |
| n5785 ESA email 3 | 🟦 | held for approval | → n5787 | — |
| n5787 ESA final call | 🟦 | Rushda, only if stuck | *signs* → n5791; *unsigned after 2 weeks of chase* → n5809; → n5789 | — |
| n5789 ESA reply read | 🟦 | client replies at any point and the chase stops | wants changes → n5805; *signs* → n5791; declines outright → n5809 | — |
| n5791 Signed ESA received | 💬 client | | → n5793 | — |
| n5793 Signed copy filed | 🟦 | | → n5795 | CP-26 |
| n5795 Notice to ops, TA, director | 🔁 | ESA signed | → n5797; not countersigned in 1 day → n5799 | CP-25 |
| n5797 Director countersigns | 🔁 | | → n5801 | — |
| n5799 Director reminder | 🟦 | one reminder only, no escalation decided | ↩ n5797 | ⚪ |
| n5801 Countersigned copy returned | ⚪ | system returns to client | → n5803 | — |
| n5803 Client, ops owner recorded | 🔁 | ESA signed | → n5817 (*unlabelled; "set reviewed, none shortlisted" belongs elsewhere*) | CP-02, CP-03 |
| n5805 Negotiation meeting booked | 👤 | | wants changes → n5807 | — |
| n5807 Negotiation held | 👤 | terms notes | *agreed, resend* → n5769; no agreement → n5809 | — |
| n5809 ESA declined | ⚪ | after 2 weeks of chase, no agreement, or outright decline | → n5811 | — |
| n5811 ESA decline reason saved | 🟦 | | → n5813 | — |
| n5813 Search blocked, team told | 🔁 | no opening or search can start; ops and TA see it | → n5815 | CP-03 |
| n5815 Lead closed, ESA declined | 🟦 | **end** | — | — |

**Reading:** the chase is five messages then one call; each message waits for the ops
owner's approval; a reply at any point stops it. The board says "2 weeks of chase"; the
settled rule is 14 calendar days from sending. The team is told at n5795 **before** the
Director countersigns, so the requirement meeting can be booked at once.

## Phase C · Requirement meeting → opening (steps 19–56)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n5817 Requirement meeting booked | 🔁 | ops owner + TA | → n5819 | — |
| n5819 Meeting reminder | 🟦 | | held → n5821; not held → n5823 | — |
| n5821 Requirement meeting held | 👤 | requirement phase | impractical → n5829; practical → n5837 | — |
| n5823 Meeting not held | ⚪ | system rebook task, no work starts | → n5825 | — |
| n5825 Daily rebook reminder | 🟦 | rebooks continue while client replies | no reply to 3 emails → n5827; rebooked ↩ n5817 | — |
| n5827 Meeting silent, closed | ⚪ | three rebook emails with no reply; no opening, lead closed | → n6221 | CP-23 |
| n5829 Role impractical | 👤 | reason saved | → n5831 | — |
| n5831 Polite reply drafted | 🟦 | | → n5833 | — |
| n5833 Invite-back date set | 👤 | | → n5835 | — |
| n5835 Invite-back reminder | 🟦 | | *invited back later* ↩ n5238 | — |
| n5837 Requirement saved | 👤 | requirement phase | → n5839 | — |
| n5839 Opening built | 🔁 | requirement phase | → n5841 | **CP-04** |
| n5841 Primary TA picked | 🔁 | opening setup | → n5843 | CP-04 |
| n5843 100% day set | 🔁 | opening setup | → n5845 | CP-04, CP-14 |
| n5845 Bell to TA | 🔁 | opening setup | → n5847 | CP-25 |

**Reading:** this is the hand-over. On the board n5839–n5845 are four link steps in a row;
in the system they are one API call (create opening) followed by the TA lead's choice of TA
and 100% day inside TA. In the TA System today, "opening built" = its New Opening page
(client required, JD waiting for approval, priority P3).

## Phase D · JD, adverts, CVs, follow-up, Director set (steps 60–121)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n5847 JD drafted | 🤖 | AI | → n5849 | — |
| n5849 JD edited | 🟩 | | → n5851; → n5853 | — |
| n5851 Approval alert | 🟦 | unapproved after 1 day | → n5853 | — |
| n5853 JD approved | 🔁 | JD approval | → n5855 | CP-05 |
| n5855 LinkedIn post made | 🟩 | mandatory for every job | URL missing → n5857; → n5859 | — |
| n5857 Live blocked, no URL | 🟦 | | *URL added* → n5859 | — |
| n5859 LinkedIn URL pasted | 🟩 | on opening | → n5861 | — |
| n5861 LinkedIn advert Live | 🔁 | advertising | → n5863; weekly while live → n5865; → n5867 (*see note*); *TA wants TopJobs* → n5871; weekly → n5883 | CP-05, CP-06 |
| n5863 Application matching on | 🟦 | | → n5887; → n5907 | — |
| n5865 LinkedIn reposted | 🟩 | below 20 CVs a day is not performing, closed and reposted | *new URL pasted* ↩ n5859 | CP-05 |
| n5867 Weekly report built | 🟦 | weekly while live | → n5869 | CP-24 |
| n5869 Report sent to Mr Azeem | 🔁 | TA lead sends; **end** | — | — |
| n5871 TopJobs requested | 👤 | TA requests, optional | → n5873 | — |
| n5873 Request routed to marketing | 🟦 | ops sends the JD | → n5875 | — |
| n5875 Flyer designed | 🔁 | marketing | → n5877 | — |
| n5877 Flyer sent to TopJobs | 👤 | cost logged | → n5879 | — |
| n5879 TopJobs ad Live | 🔁 | advertising | two weeks after posting → n5881; CVs ↩ n5887 | CP-06 |
| n5881 TopJobs ad closed | 🔁 | **end** | — | CP-06 |
| n5883 Talent Pulse list compiled | 🟦 | Tuesday | → n5885 | — |
| n5885 Newsletter posted | 🔁 | marketing, Wednesday | *CVs tagged* ↩ n5887; next Tuesday while role open ↩ n5883 | CP-06 |
| n5887 CV arrives | 🤖 | mailbox, upload, import | → n5889 | — |
| n5889 CV source tagged | 🔁 | CV intake | → n5891; mail, no advert match → n5893; no advert → n5895 | CP-06 |
| n5891 CV filed to opening | 🟦 | | → n5897 | — |
| n5893 CV held for a lead | 🟦 | lead places it | lead places ↩ n5891 | — |
| n5895 CV to database only | 🟦 | **end** | — | — |
| n5897 CV read | 🟦 | | extraction fails → n5899; → n5901 | — |
| n5899 Extraction alert | 🟦 | | fixed → n5901 | — |
| n5901 CV scored | 🤖 | AI | high score → n5903; *TA picks / hunts* ↩ n5905 | CP-07 |
| n5903 AI shortlists candidate | 🟦 | high score | ↩ n5911 | — |
| n5905 TA shortlists candidate | 🟩 | | *do-not-contact flag* → n5909; → n5911 | — |
| n5907 Search, call, screen | 🟩 | workday screen, hunting | shortlist button → n5905 | — |
| n5909 Candidate skipped | ⚪ | do-not-contact flag | ↩ n5907 | — |
| n5911 First message sent | 🟦 | WhatsApp + email | → n5913 | — |
| n5913 Reminder 24h | 🟦 | | → n5915; *replies, reminders stop* → n5919 (corrected, gap 4) | — |
| n5915 Reminder 48h | 🟦 | | → n5917; *replies, reminders stop* → n5919 | — |
| n5917 Reminder 72h | 🟦 | third and last | → n5919; no reply, 3 tries → n5925 | — |
| n5919 Reply read | 🤖 | AI | → n5921; → n5923; AI cannot help → n5933 | — |
| n5921 Missing items asked | 🤖 | max 3 messages in 24h | *reply received* ↩ n5919; *all given* → n5923; *3 unanswered in 24 h* → n6333 | — |
| n5923 Details complete | 🔁 | CV, salary, notice | → n5937 | CP-07 |
| n5925 Moved to dropped-out list | 🟦 | | → n5927 | CP-07 |
| n5927 Call task to TA | 🟦 | | → n5929 | — |
| n5929 TA calls candidate | 🟩 | | *not reached* → n5931; *reached* ↩ n5919 | — |
| n5931 Drop-out reason saved | 🟩 | | ↩ n5907 | — |
| n5933 Flagged for TA | 🤖 | AI | → n5935 | — |
| n5935 TA resolves | 🟩 | | ↩ n5923 | — |
| n6333 Escalated to TA | 🟦 | after 3 unanswered messages in 24h; **end on the board** | corrected: → n5927 call task (gap 3) | — |
| n5937 Director set size check | ⚪ | five CVs minimum | fewer than five → n5939; five or more → n5941 | — |
| n5939 Set held, search more | ⚪ | | ↩ n5907 | — |
| n5941 Queued for Director | ⚪ | system auto-advance | → n5943 | CP-08 |
| n5943 Set email drafted | 🟦 | end of day | → n5945 | — |
| n5945 Set email approved | 🔁 | held for approval | → n5947 | — |
| n5947 Set emailed to Director | 🔁 | Director review | → n5949; *no reply in 1 working day* → n5951 | CP-08 |
| n5949 Director reviews | 🔁 | | → n5953 | — |
| n5951 Director chase | ⚪ | after 1 working day; no escalation decided | replies → n5953 | ⚪ |
| n5953 Reply read in | 🔁 | Director review | → n5955; → n5959; *need more* ↩ n5907 | CP-08 |
| n5955 Director shortlist recorded | 🟦 | | shortlisted → n5957 | CP-07 |
| n5957 Position status next day | 🟦 | follow-up or 100% | → n5963; *follow-up or 100% again* ↩ n5907 | CP-14 |
| n5959 Rejected by Director | ⚪ | candidate set to rejected | → n5961 | CP-21 |
| n5961 Director rejection notice | ⚪ | system sends approved template, search continues | ↩ n5907; → n6051 (**corrected: removed**, gap 5) | CP-21 |

**Reading:** everything here is TA's existing work except TopJobs/Talent Pulse (Ops) and
the five-CV check before the Director set. The weekly report (n5867) hangs off the advert
on the board; it is really one weekly desk job (gap 12).

## Phase E · Client set, ownership, feedback, decision, depth (steps 120–199)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n5963 Client set size check | ⚪ | five CVs minimum for a client set | fewer than five → n5965; five or more → n5967 | — |
| n5965 Client set held | ⚪ | search more | ↩ n5907 | — |
| n5967 Client set drafted | 💬 | client set | → n5969 | **CP-09** (event "client set ready") |
| n5969 Set due date tracked | 🟦 | 7 to 14 days of ESA | set late → n5971; → n5973 | — |
| n5971 Overdue alert to ops | 🟦 | | → n5973 | — |
| n5973 Ops reviews set | 👤 | | → n5975 | CP-09, CP-26 |
| n5975 Set approved | 👤 | | → n5977 | — |
| n5977 Set sent to client | 🔁 | client set | → n5979; *3 months, no hire reported* → n6037 | CP-09 |
| n5979 Client group created | 👤 | new client after first set | → n5981 | — |
| n5981 Set posted in client group | 👤 | | → n5983 | — |
| n5983 Set logged | 🟦 | | → n5985 | — |
| n5985 Client receipt date saved | 🟦 | | → n5987; *set received* → n5995 | CP-09 |
| n5987 Ownership clock starts | 🟦 | 7 working days from receipt | → n5989 | — |
| n5989 Countdown shown | 👤 | | → n5991; client says already had CV → n6015 | — |
| n5991 Alert before expiry | 🟦 | | → n5993 | — |
| n5993 Ownership window closes | 🟦 | **end** | — | — |
| n6015 Claim checked | 👤 | | within 7 working days → n6017; after 7 working days → n6023 | — |
| n6017 CV dropped, not pursued | 👤 | | → n6019 | — |
| n6019 Candidate marked client-owned | 🟦 | | set still live → n6021 | **CP-11** |
| n6021 Rest of set continues | 🟦 | | ↩ n5995 | — |
| n6023 Claim refused | 🟦 | after 7 working days | ↩ n5995 | — |
| n5995 Feedback timer starts | 🟦 | from client receipt | *no feedback after 1 day* → n5997; *client replies first* → n6005 | — |
| n5997 Chase drafted | 🟦 | | → n5999 | — |
| n5999 Chase approved | 👤 | | → n6001 | — |
| n6001 Chase sent | 🟦 | email + WhatsApp | → n6003; silent, ESA inactive rule → n6027; *client replies* ↩ n6005 | — |
| n6003 Owner calls client | ⚪ | next day if no feedback | client replies ↩ n6005; no answer after call → n6025 | — |
| n6025 Client silent after call | 🟦 | | silent, ESA inactive rule ↩ n6027 | — |
| n6027 Inactive notice drafted | 🟦 | ESA inactive rule | → n6029 | — |
| n6029 Inactive notice approved | 👤 | | → n6031 | — |
| n6031 Inactive notice sent | 🟦 | | → n6033 | — |
| n6033 Position on hold | 🟦 | reason saved; follows ESA inactive rule | → n6035; *client returns* ↩ n5995; hold limit ↩ n6221 | **CP-12** |
| n6035 Silent-hold limit | ⚪ | not decided: exact inactive days and how long a hold lasts; **end** | — | ⚪ |
| n6037 Unreported hire flagged | 🟦 | no hire reported in 3 months | → n6039 | CP-13 |
| n6039 Surcharge invoice drafted | 🟦 | 50% | → n6041 | — |
| n6041 Surcharge invoice approved | 👤 | | → n6043 | — |
| n6043 Surcharge invoice sent | 🟦 | no chase decided; **end** | — | ⚪ |
| n6005 Client replies | 💬 | client feedback | → n6007 | — |
| n6007 Reply read into system | 🔁 | | → n6009 | CP-10 |
| n6009 TA informed | 🔁 | | → n6011 | CP-25 |
| n6011 Reason saved | 🔁 | | → n6013 | CP-10 |
| n6013 Client decision | 🔁 | client feedback | rejected → n6045; client shortlisted → n6049; *set reviewed, none shortlisted* ↩ n6051 | **CP-10** |
| n6045 Rejected by client | ⚪ | candidate set to rejected | → n6047 | CP-10 |
| n6047 Client rejection notice | 🔁 | system sends | ↩ n6051 | CP-21 |
| n6049 Candidate marked shortlisted | 🤖 | pipeline mgmt | ↩ n6051 | CP-10 |
| n6051 Pipeline pending counted | 🤖 | pipeline mgmt | → n6053 | **CP-14** |
| n6053 Total shortlisted counted | 🤖 | | 3 or fewer pending → n6055; 5+ shortlisted in total → n6059; *client shortlisted* → n6065 | CP-14 |
| n6055 Add-on alert to TA | 🔁 | | → n6057 | CP-14, CP-25 |
| n6057 Add-on search | 🟩 | 30–60 min a day | *refill* ↩ n5907 | — |
| n6059 Hold at five CVs | 🔁 | | → n6061 | CP-14 |
| n6061 Monitor position | 🟩 | monitors only; LinkedIn closes | exit rule → n6063; → n5995; *monitor-only closes LinkedIn* ↩ n6223 | CP-05 |
| n6063 Five-CV hold lifts | 🔁 | | *below five: sending resumes* ↩ n5907 | CP-14 |

**Reading:** two clocks start at the client's receipt date: the 7-working-day ownership
clock and the feedback timer. The pipeline-depth counter (n6051–n6063) runs after every
client decision. The board's "set reviewed, none shortlisted" arrow into scheduling was the
arrow the owner's tool could not delete (gap 7); it is dropped.

## Phase F · Interviews and reference (steps 130–214)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n6065 Who schedules? | 👤 | client or us | we schedule → n6067; *client books* → n6079 | — |
| n6067 Client slots requested | 👤 | | → n6069 | — |
| n6069 Slots received | 🟦 | | → n6071 | — |
| n6071 Slots checked with candidate | 🟦 | | no slot fits → n6073; → n6077 | CP-15 (TA side) |
| n6073 New slots requested | 🔁 | keeps going while client replies | no reply to 3 emails → n6075; ↩ n6069 | — |
| n6075 Slot loop, TA alerted | ⚪ | no response after 3 attempts alerts the TA | TA alerted, picks back-up → n6111 | CP-25 |
| n6079 Client contacts candidate | ⚪ | client books directly | reported → n6081; no update → n6085 | — |
| n6081 Date reported | ⚪ | client must report | → n6083 | — |
| n6083 Date logged | 🟦 | | → n6077 | — |
| n6085 Report reminder to client | 🟦 | ops approves; no escalation decided | client reports ↩ n6081 | ⚪ |
| n6077 Interview booked | 🔁 | interview | → n6087 | **CP-15** |
| n6087 Invite and Teams sent | 🔁 | | → n6089; client cancels or postpones → n6113 | CP-15 |
| n6089 TA alerted of booking | 🔁 | | → n6091 | CP-25 |
| n6091 Day-before reconfirm | 🟦 | automatic | → n6093; no reply → n6101; candidate out → n6103 | — |
| n6093 Candidate reconfirms | 🔁 | candidate | → n6095 | — |
| n6095 Interview day arrives | 🟦 | | → n6097 | — |
| n6097 Interview held | 🔁 | | → n6099 | CP-15 |
| n6099 Attendance marked | 🟦 | | attended → n6117; no-show ↩ n6103 | CP-15 |
| n6101 Reconfirm call task | 👤 | system to TA | ↩ n6093; cannot reach → n6103 | — |
| n6103 Candidate out or no-show | 🟩 | | → n6105 | CP-15 |
| n6105 Client notice drafted | 🟦 | 1 day or 3h before | → n6107 | — |
| n6107 Client notice approved | 👤 | | → n6109 | — |
| n6109 Client notice sent | 🟦 | | ↩ n6111 | — |
| n6111 Replacement candidate picked | 🟩 | back-up | *TA picks another* ↩ n6071; ↩ n5907 | — |
| n6113 Client cancel logged | 🔁 | | → n6115 | CP-15 |
| n6115 TA told of cancel | 🔁 | | new slot ↩ n6065 | CP-25 |
| n6117 TA logs feedback after 5 PM | 🟩 | | → n6119 | CP-16 |
| n6119 Candidate told | 🟩 | | → n6121 | — |
| n6121 Client message drafted | 🟦 | | → n6123 | — |
| n6123 Client message approved | 👤 | | → n6125 | — |
| n6125 Feedback posted to client | 👤 | | → n6127 | — |
| n6127 Client round decision | 🔁 | | → n6129 | **CP-16** |
| n6129 TA informed of decision | 🔁 | | *not moving* → n6131; *selected* → n6135; round 2 ↩ n6067 | CP-25 |
| n6131 Rejected after round | ⚪ | candidate set to rejected | → n6133 | CP-16 |
| n6133 Candidate told not moving | 🟩 | | ↩ n6051 | — |
| n6135 Client asks for reference? | 🔁 | optional, only if the client requests it | client requests → n6137; *no request, skip* → n6145 | CP-17 |
| n6137 TA calls referee | ⚪ | phones directly, no form, notes saved | → n6141; referee not reached → n6139 | — |
| n6139 Referee not reached | ⚪ | TA reports this to the client | report the gap ↩ n6141 | — |
| n6141 Reference reported to client | 🤖 | TA reports as is; client decides | → n6143 | CP-17 |
| n6143 Client clears reference | 💬 | | ↩ n6145; *client drops* ↩ n6051 | — |

**Reading:** one interview record lives in TA; Ops books the client side (slots, invite,
Teams) and TA the candidate side (reconfirm, call task, back-up). "Rebooks" (new slot after
a client cancel) are for the client meeting only.

## Phase G · Offer, placement, joining (steps 210–231)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n6145 Offer made | 🟩 | offer | → n6147 | **CP-18** |
| n6147 Search stops | 🟩 | | candidate does not answer → n6149; → n6151; *candidate declines* → n6153 | CP-18 |
| n6149 Offer silent | ⚪ | not decided: how long silence counts as declined; **end** | — | ⚪ |
| n6151 Offer accepted | 🟦 | placement | accepted → n6159 | CP-18 |
| n6153 Offer declined | 🟩 | reason saved | back-up kept → n6155; no back-up → n6157 | CP-18 |
| n6155 Back-up promoted | 🟩 | | ↩ n6145 | — |
| n6157 Search reopened | 🟩 | | ↩ n5907 | CP-05 |
| n6159 TA presses Place | 🟦 | placement | → n6161 | **CP-19** |
| n6161 Package, DOJ, offer letter asked | 🟦 | | → n6163; *still missing* → alert Asma/ops | CP-19 |
| n6163 Placement saved | 🟦 | | → n6165 | CP-19 |
| n6165 Asma and ops told | 🟦 | | → n6167 | CP-19, CP-25 |
| n6167 DOJ tracked | ⚪ | system reminders to TA and ops owner | date moves → n6169; candidate lost → n6171; joining day → n6173 | CP-19 |
| n6169 Date move logged | 👤 | with owner | ↩ n6167 | CP-19 |
| n6171 Placement cancelled | 🟦 | | candidate lost ↩ n6153 | CP-19 |
| n6173 Joining-day 9am alert | 🟦 | | → n6175; not joined → n6177 | CP-20 |
| n6175 TA confirms joined | 🟦 | | *joined* → n6181 | **CP-20** |
| n6177 No-show flagged | 👤 | | → n6179 | CP-20 |
| n6179 Client options sent | 🟦 | replace or stop; no refund, nothing invoiced; client deadline not decided | *client picks replace* ↩ n5907; *client stops* ↩ n6221 | ⚪, CP-23 |

## Phase H · Invoice and payment (steps 230–250)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n6181 90-day clock starts | 🔁 | guarantee | first hire → n6183; replacement hire: no invoice, new 90-day guarantee → n6201 | — |
| n6183 Invoice drafted | 🟦 | first hire only | → n6185 | — |
| n6185 Invoice approved | 👤 | | → n6187 | — |
| n6187 Invoice sent | 🟦 | due 30 days | paid → n6189; unpaid day 30 → n6191 | — |
| n6189 Fee collected | 🔁 | ops and Asma log payment; **end on the board** | corrected: → guarantee runs on (gap 2) | — |
| n6191 Payment chase drafted | 🟦 | 5% a month | → n6193 | — |
| n6193 Payment chase approved | 👤 | | → n6195 | — |
| n6195 Payment chase sent | 🟦 | up to 2 months | unpaid after 2 months → n6197; paid ↩ n6189 | — |
| n6197 Fee written off | 👤 | | → n6199 | — |
| n6199 No guarantee, clock stopped | 🟦 | closes the position | ↩ n6221 | CP-22 |

## Phase I · Guarantee and close (steps 233–250)

| Step | Owner | What the board says | Next | CP |
|---|---|---|---|---|
| n6201 90-day clock starts (2) | 🔁 | guarantee | day 75, nobody left → n6203; 90 days, nobody left → n6205; leaves within 90 days → n6209 | — |
| n6203 Day-75 warning | ⚪ | undecided: is a warning wanted | 90 days → n6205 | ⚪ |
| n6205 Guarantee ends clean | 🟦 | 90 days and nobody left | → n6207 | — |
| n6207 Commitment done | 🟦 | | *guarantee over, position done* ↩ n6221 | CP-23 |
| n6209 Candidate leaves | 🔁 | guarantee | fee paid: replace first → n6211; fee paid: clock starts → n6213; *fee unpaid* → n6199 | **CP-22** |
| n6211 Position reopened | 🔁 | | ↩ n5907 | CP-22 |
| n6213 60-working-day clock starts | 🟦 | | none in 60 working days → n6215; *replaced in time* ↩ n6205 | — |
| n6215 Director of Operations told | 🟦 | | *none in 60 working days* → n6217 | — |
| n6217 Refund 25% | ⚪ | Director of Operations; only after 60 working days with no replacement | → n6219 | — |
| n6219 Refund logged | 🟦 | | *refund paid, close* ↩ n6221 | — |
| n6221 Lead or position closed | 🔁 | closing | *close checklist* → n6223 | **CP-23** |
| n6223 LinkedIn closed | 👤 | TA closes; under 20 CVs a day (repost) or monitor-only; **end** | — | CP-05 |

**Reading:** on the board only the second clock (n6201) has the leave / day-75 / clean
branches; the first clock (n6181) goes only to the invoice. The corrected flow joins them:
every hire's guarantee has all branches, and only a first hire is invoiced (gap 1).

---

## 10. The 12 end steps on the board, and what they mean

| End step | Kind | Verdict |
|---|---|---|
| n5747 Lead closed, declined | real end | keep |
| n5815 Lead closed, ESA declined | real end | keep |
| n5895 CV to database only | real end | keep |
| n5881 TopJobs ad closed | real end | keep |
| n6223 LinkedIn closed | real end | keep |
| n5869 Report sent to Mr Azeem | real end (weekly) | keep, but desk-level |
| n5993 Ownership window closes | real end | keep |
| n6043 Surcharge invoice sent | **gap**: no chase or payment | ⚪ decide |
| n6035 Silent-hold limit | **open** | ⚪ decide |
| n6149 Offer silent | **open** | ⚪ decide |
| n6333 Escalated to TA | **gap**: should become the call task | corrected |
| n6189 Fee collected | **gap**: the position must still run its guarantee | corrected |

## 11. Floating labels placed by reading the flow (27 on the board)

| Label on the board | Placed on |
|---|---|
| replies, reminders stop (×2) | n5913 → n5919 and n5915 → n5919 |
| reply received | n5921 ↩ n5919 |
| items missing | n5919 → n5921 |
| rejected | n6013 → n6045 |
| set received | n5985 → n5995 |
| joined | n6175 → n6181 |
| blank found, redraft | n5767 ↩ n5765 |
| client replies, chase stops | each chase step → n5789 |
| signs | n5789 → n5791 |
| agreed, resend | n5807 → n5769 |
| ESA on file | n5749 → n5803 |
| URL added | n5857 → n5859 |
| new URL pasted | n5865 ↩ n5859 |
| TA picks another | n6111 ↩ n6071 |
| all given | n5921 → n5923 |
| reached | n5929 ↩ n5919 |
| search continues | n5961 ↩ n5907 |
| need more | n5953 ↩ n5907 |
| follow-up or 100% again | n5957 ↩ n5907 |
| client returns | n6033 ↩ n5995 |
| keep moving | n6053 → n6065 |
| monitor-only closes LinkedIn | n6061 ↩ n6223 |
| client drops | n6143 ↩ n6051 |
| client picks replace | n6179 ↩ n5907 |
| no request, skip | n6135 → n6145 |
| below five: sending resumes | n6063 ↩ n5907 |

The ~35 labels that sat on a **neighbouring** arrow are listed in
[`reference/ANALYSIS.md`](reference/ANALYSIS.md) section 3.

## 12. Counts, for the record

| | |
|---|---|
| Steps | 250 (Ops 🟦/👤 ≈ 118 · TA 🟩/🤖 ≈ 62 · link 🔁 ≈ 52 · open/unknown ⚪ ≈ 18) |
| Arrows | 332 (loops back to an earlier step: 61) |
| Entry | 1 (n5238 Lead sources) |
| Ends | 12 (section 10) |
| Connection points touched | 24 of 26 (CP-24 weekly report and CP-26 files appear only as steps' side effects) |
| Open (⚪) decisions on the board | 8: Director reminder escalation, Director chase escalation, client report reminder escalation, silent-hold limit, surcharge chase, offer-silent timeout, day-75 warning, client deadline for replace/stop |
