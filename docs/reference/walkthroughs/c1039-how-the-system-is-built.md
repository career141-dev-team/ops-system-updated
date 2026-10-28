# Walkthrough: c1039 how the system is built

Generated from cards/c1039-how-the-system-is-built.md by tools/walkthrough.mjs. Steps in flow order (breadth-first from the entry points). "->" = arrow; "LOOP back to" = arrow to a step already listed above; labels marked "~px" or position-matched in the card are approximate.

Steps 10 (expected 10) | arrows 11 (expected 11) | entry points 3 | end steps 3 | unreachable from an entry 0

Entry points: Clerk sign-in [n1042]; Scheduled background jobs [n1043]; Workable and partner imports [n1049]

End steps (no arrow out): AI models (CV reading, replies) [n1047]; Qdrant candidate search [n1048]; AI voice calls (LiveKit, ElevenLabs) [n1046]

## Steps

1. **Clerk sign-in** [n1042] - (none) (s-locked)
   - -> TA web screens (Next.js) [n1040]

2. **Scheduled background jobs** [n1043] - (none) (s-locked)
   - -> Convex back-end and database [n1041]

3. **Workable and partner imports** [n1049] - (none) (s-locked)
   - -> Convex back-end and database [n1041]

4. **TA web screens (Next.js)** [n1040] - (none) (s-locked)
   - -> Convex back-end and database [n1041]

5. **Convex back-end and database** [n1041] - (none) (s-locked)
   - -> Microsoft 365 mailboxes [n1044]
   - -> WhatsApp messaging [n1045]
   - [call requests (label ~73px away from arrow)] -> AI voice calls (LiveKit, ElevenLabs) [n1046]
   - -> AI models (CV reading, replies) [n1047]
   - -> Qdrant candidate search [n1048]

6. **Microsoft 365 mailboxes** [n1044] - (none) (s-locked)
   - LOOP back to Convex back-end and database [n1041]

7. **WhatsApp messaging** [n1045] - (none) (s-locked)
   - LOOP back to Convex back-end and database [n1041]

8. **AI voice calls (LiveKit, ElevenLabs)** [n1046] - (none) (s-locked)
   - (end)

9. **AI models (CV reading, replies)** [n1047] - (none) (s-locked)
   - (end)

10. **Qdrant candidate search** [n1048] - (none) (s-locked)
   - (end)
