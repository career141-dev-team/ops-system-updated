/**
 * The agreement as the owner's own draft words it (the Valtrix ESA, 25 Nov), filled from the client's fields.
 * Pure: no database, nothing sent. The numbering is by position, so "Clause 5.1" and "clause 6.1" in the text
 * stay true as long as the order here matches the order of the draft.
 */
import { DRAFT_NOTE, TBC, holeValues, type EsaFields, type EsaMode } from "@/lib/esa";

/**
 * 26 Nov (Nov 25 ops meeting): a part of a line that a Draft leaves to be confirmed sits between these two
 * marks, so the screen can highlight it. An inline mark keeps every line a plain string.
 */
export const MARK_OPEN = "⟦";
export const MARK_CLOSE = "⟧";
/** A line cut at its marks: `{ mark: true }` parts are the highlighted ones. */
export function markedParts(line: string): { text: string; mark: boolean }[] {
  return line.split(new RegExp(`[${MARK_OPEN}${MARK_CLOSE}]`)).map((text, i) => ({ text, mark: i % 2 === 1 })).filter((p) => p.text !== "");
}

export interface EsaDoc {
  /** Draft only: the note that goes above the parties. */
  draftNote?: string;
  /** The addressee lines at the top. */
  to: string[];
  /** The opening paragraphs, before "AGREE AS FOLLOWS". */
  parties: string[];
  sections: { title: string; lead?: string; items: string[] }[];
  /** The signing block. */
  signing: { career: string; client: string; clientTitle: string };
}

const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th"));
/** "9th November 2026", Colombo time. */
export function longOrdinalDate(t: number): string {
  const d = new Date(t + 5.5 * 3_600_000);
  return `${ordinal(d.getUTCDate())} ${d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
}

export function esaDocument(fields: EsaFields, o: { company: string; at: number; directorName: string }, mode: EsaMode = "final"): EsaDoc {
  const h = holeValues(fields);
  const company = (fields.companyName || o.company).trim();
  const draft = mode === "draft";
  const tbc = MARK_OPEN + TBC + MARK_CLOSE;
  const address = (fields.companyAddress || "").trim() || (draft ? tbc : "[registered address]");
  const business = (fields.clientBusiness || "").trim() || "[their business]";
  const fee = h.feeText || "[fee]";
  const expatFee = h.expatFeeText || "[fee for a non-Sri Lankan]";
  const guarantee = h.guaranteeText || "[guarantee period]";
  const pay = fields.paymentDays || "30";
  const replace = h.replacementText || "[replacement period]";
  const refund = fields.refundPct || "25";
  const signer = (fields.signatoryName || "").trim() || (draft ? tbc : "");
  const title = (fields.signatoryTitle || "").trim() || (draft ? tbc : "");

  return {
    draftNote: draft ? DRAFT_NOTE : undefined,
    to: [[signer, title].filter(Boolean).join(" · "), company, address].filter(Boolean),
    parties: [
      `This Agreement is made on this day of ${longOrdinalDate(o.at)} between CAREER CONSULTANTS PVT LTD (Reg No. PV73499), a company duly incorporated and organized under the laws of (Act No. 07 of 2007) having its registered office at 35/1 Sir Lester James Pieris Mawatha, Stubbs Plc, Colombo-05, Sri Lanka. (Hereinafter called Career141) which expression shall include all its heirs, executors and assignees of Career141.`,
      "AND",
      `${company} having its office at ${address}. Hereafter called the (Client) where expression shall unless expressly excluded or repugnant to the subject or context means and include, its successors and assignees of the Client.`,
      `Whereas in consideration of the disclosure of Confidential Information by Career Consultants Pvt Ltd, and ${company} agrees as follows:`,
      `Whereas Career141 is engaged in the business of providing Human Capital Recruitments as per the requirement criteria provided by the Client, who is involved in “${business}”. The Client and the Recruitment Agency shall individually be referred to as ‘Party’ and collectively as ‘Parties’ as and when the context so requires:`,
    ],
    sections: [
      {
        title: "RESPONSE TIME",
        items: [
          "Career141 will respond to the Client’s human resources requirements within seven (7) to fourteen (14) working calendar days from receiving the request from the Client.",
          "If in the event the Client’s request is in relation to a complex position and Career141 is unable to respond to the Client within the above stipulated time period, Career141 shall provide the Client immediate notice of the same and mutually agree on a revised time frame.",
          "In the event the Client does not provide feedback, instructions, or further communication within fourteen (14) calendar days from the date Career141 shares candidate profiles, despite reasonable follow-ups, Career141 reserves the right to deem the engagement inactive and terminate the agreement with respect to the said requirement, without any liability.",
        ],
      },
      {
        title: "THE SEARCH & SELECTION PROCESS",
        items: [
          "Upon the acceptance of the Service Agreement by the Client, Career141 shall assign an Executive Search Consultant / Team to work with the Client for every recruitment consignment.",
          "Upon the request of the Client, Career141 shall develop a detailed ‘Job Mandate’ for their Executive Search Consultants to understand the scope, accountabilities and remunerations of the position.",
          "Career141 shall address the Client’s request within the time frame more fully stipulated in Clause 1 hereto and shall submit to the Client the resume/profiles of at least 5-10 shortlisted candidate profiles along with Career141’ professional evaluation notes.",
          "Career141 will check with candidates if they have been approached by the client directly or indirectly for same or similar position and if found to have been not approached then Career141 will share the profiles of such candidates for the review of the client.",
          "Upon receiving the profiles/resumes the Client has to keep Career141 updated if any of the profiles/resumes have been recommended by other sources (prior to receiving the CVS from Career141) within seven (07) working days from receiving the profiles/resume from Career141.",
          "If in case the Client does not inform on timely manner the candidate is considered as a candidate belonging to Career141 and if the candidate is invited to work, the Client has to pay the full fee detailed in the Item 5.1 shall become due and payable.",
          "If the profile is in the client's database and the interview process is currently taking place, client should keep us informed that the interview is in progress.",
          "If a CV submitted by Career 141 to clients is selected for a part-time or contract basis, it will be considered a placement, and a consultancy fee will be due in accordance with the terms specified in Clause 5.1 or 5.2.",
          "Upon conclusion of the initial screening of resumes/profiles received from Career141, the Client shall shortlist the potential candidates and at its discretion call for interviews. The interviews may either be scheduled by the Client at its office or the Client may request / instruct Career141 to organize the interviews as per the instructions provided by the Client.",
          "If the profile is within four calendar months and the client has received the profile for the same vacancy, it would be considered as the client’s profile and if it is above 04 calendar months the profile would be considered as a profile sourced by Career141.",
          "Subsequent to each interview, the Client will provide Career141 feedback on each interviewed candidate in order to enable Career141 to obtain a better understanding of the Client’s requirements in the event the candidates interviewed did not suit the Client's requirements.",
          "Upon the selection and finalization of recruitment for a candidate, the Client shall promptly provide Career141 with the following details: the candidate’s designation; the total salary package, including a detailed breakdown of its components; the candidate’s official date of appointment; the division or department to which the candidate will be assigned; and complete billing address for invoice submission.",
          "Additionally, the Client shall provide Career141 with a copy of the signed offer letter issued to the selected candidate. Following this, Career141 shall continue to support the Client throughout the onboarding process. This includes maintaining communication with the selected candidate and taking reasonable steps to ensure a smooth and timely onboarding experience.",
        ],
      },
      {
        title: "INTERVIEW FACILITATION",
        items: [
          "If the Client wants to reserve Career141’s premises for interviewing & facilitation purpose Career141 will be invoicing the client LKR 50,000 per day (8.30 am – 5.30 pm) for the venue and the payment should be made prior to the interview date.",
          "Upon payment, the Client shall be entitled to use Career141’ premises for interviews from 8.30 am – 5.30 pm. Any exceeding hours will be charged at LKR 2000 per hour.",
        ],
      },
      {
        title: "NON-DISCLOSURE OF SHARED INFORMATION",
        items: [
          "Career141 expressly agrees that any and all information it discovers or develops under this Agreement shall not be used or disclosed to any third party, nor shall Career141 show or share this Agreement or disclose the existence, nature or subject matter of this Agreement to any third party without the prior written consent to the Client.",
          "Career141 agrees to keep all matters and material pertaining to the Client’s vacancy and any discussions confidential and shall not at any time be disclosed to 3rd parties. The Client agrees to keep all CVs / resumes, related discussions and other material shared by Career141 confidential and non-disclosed to 3rd parties.",
          "The recruitment process will be conducted with the utmost regard to confidentiality. Career141 will use confidential information received from the Client only for the purposes of professionally managing the recruitment consignment assigned to Career141 in terms of this Agreement. Career141 will only disclose such confidential information with authorization from the Client to those individuals who are involved in the project or to those appropriately qualified/interested candidates who have a need to know the information.",
          "For the avoidance of any doubt, divulging of the Client’s information to candidates will only take place during the 2nd / 3rd stages of Career141’s process and not during initial conversations with the candidates.",
          "The Client shall ensure the confidentiality regarding the candidate’s personal information and any other material belonging to the candidate provided by Career141 shall be maintained.",
          "If the client requests Career141 to advertise in the media on behalf of them for a position, a service fee and designing fee will be included along with the advertising cost regardless if the position is placed or not.",
        ],
      },
      {
        title: "CONSULTANCY FEE AND PAYMENT TERMS",
        items: [
          `The Consultancy Fee for placement of Sri Lankan is: ${fee} of the placed candidate.`,
          `The Consultancy Fee for placement of non-Sri Lankan is: ${expatFee} of the placed candidate.`,
          "If the placed candidate is paid in any other currency other than LKR then the Consultancy Fee must be transferred to Career 141’s foreign currency bank account in Singapore.",
          `The ‘Consultancy Fee’ should be made available by the Client to Career141 on or within ${pay} calendar days from the 1st working day (Physical or Online) of the placed candidate, irrespective of any pending procedures with regard to legal or government-related onboarding documents.`,
          "A late payment charge will be incurred on overdue invoices calculated and compounded at 5% monthly on the amount outstanding from the due date until the date of payment.",
          "The Consultancy fee is not inclusive of any International or local relevant taxes/duties (VAT, foreign contractor withholding tax, PIT, ...), which shall be borne by the Client, and paid in full without any deduction as indicated in Clause 5.1.",
          "The client will be in charge of paying the visa fees, travel expenses and any other fees related to the onboarding of candidate to the destination decided as the work base. Career141 will not take any responsibility for it.",
          "If at any time within a period of 12 calendar months any candidate referred by Career141 is employed by the Client, in any position, then the Client agrees to pay Career141's consultancy fee in full for the placement.",
          "If any candidate has been placed and the client has failed to inform Career141 within 3 Months, then there will be an additional 50% surcharge of the Gross salary added to the placement fee of the candidate.",
          "The placement fee has to be paid in full as mentioned in clause 5.1 for the replacement guarantee on clause 6 to be valid.",
          "It is imperative that the client acknowledges and agrees to adhere to the stipulated consultation fee even in the event of sharing the received resumes with a third party or a manpower agency. This Fee remains applicable regardless of any external entities involved, the client takes responsibility to fulfil the agreed-upon Consultation Fee.",
          "All components of the gross salary, including any allowances or benefits, whether explicitly mentioned in the candidate’s letter of appointment or not, shall be considered for the calculation of consultancy fees. This includes any hidden allowances or additional components apart from the fixed pay. If the total sum of these components adds up to the take home salary, it would be considered as the consultancy Fees.",
        ],
      },
      {
        title: "GUARANTEE AND REPLACEMENT CLAUSE",
        items: [
          `Career141 will provide a one-time replacement for the same position at no additional fee if the selected candidate resigns or is dismissed for cause relating to his/her suitability to the job and/or his/her qualifications within ${guarantee} from the first working day, provided that the fee has been settled as per Clause 5.4.`,
          "The guarantee does not apply when the selected candidate is dismissed due to organizational changes of the Client, including but not limited to reorganization, elimination of the position, takeover, or material change in job responsibilities. The guarantee in clause 6.1 does not apply if the candidate is dismissed or told or had to return due to Natural Disasters or outbreaks of health epidemics etc.",
          "Once a replacement has been successfully completed by Career141 to substitute the candidate who left or whose service was terminated, it would be considered as the conclusion of the ‘replacement-cycle’ for ‘that’ particular position.",
          `In the event a replacement is required, Career141 shall share the relevant resume/profiles within a period of Fourteen (14) days from receiving notice from the Client. Once shared, the Client shall within a period of ${replace} working days from the date of receiving the resume/profiles carry out interviews and finalize the selection of the replacement.`,
          "An additional 2nd replacement will not be provided for a replacement that has been made. It would be considered as a ‘New Placement Cycle’/’New Job Order’.",
          `If in case Career141 has not fulfilled the replacement within ${replace} working days commencing from the date of resignation of the current employee, Career141 will refund ${refund}% of the fee paid by the Client.`,
          "If in case the Client decides that it does not require a replacement for a candidate who had been terminated or voluntarily left, the fee paid to Career141 will not be transferable towards a different position that the Client wants Career141 to commence work on. E.g.: The placement fee of a Production Manager is not transferable towards a new placement cycle such as Marketing Manager, Factory Manager, Legal Officer etc.",
          "If the actual income of the replacement candidate is higher than the initial placement, the incremental portion of the salary shall be due from the Client to Career141 and has to be paid within the time duration mentioned in clause 5.4.",
        ],
      },
      {
        title: "INDEMNIFICATION",
        items: [
          "Career141 agrees to indemnify on demand and hold harmless the Client from and against each and every loss, liability or cost (including without limitation damages and costs reasonably incurred as a result of defending or settling a claim or action or awarded or agreed to be paid in connection therewith) arising or incurred by the Client directly, as a result of any act of negligence, omission and/or infringement of third party rights by the Career141 relating to or in connection with the provisions of the services under this Agreement.",
        ],
      },
      {
        title: "REPRESENTATIONS BY CAREER141",
        lead: "Career141 represents and warrants that:",
        items: [
          "Career141 diligently evaluates and recommends candidates based on the information available to us, including resumes, interviews, and assessments. However, it is important to note that the Career141 does not take responsibility for the behavior, actions, or decisions made by the candidates. The client acknowledges that the hiring decision rests solely with them. It is the client's responsibility to conduct a thorough evaluation of the candidates, including but not limited to checking references, conducting background checks, and verifying qualifications.",
          "Career141 strongly recommends that clients verify candidate information through contacting referees provided by the candidates. This step is crucial to ensuring the suitability and reliability of the candidates for the client's specific needs.",
          "Career141 expressly disclaims any liability for the behavior, performance, or outcomes associated with the candidates placed through our services. Clients agree that any decisions made regarding the hiring and employment of candidates are at their own risk. Clients agree to indemnify and hold Career141 harmless from any claims, damages, or liabilities arising from the actions, omissions, or performance of candidates placed by us.",
          "It is aware that valuable goodwill and reputation is attached to the Client’s intellectual property rights such as trademarks, copyright etc. and that Career141 will use the same only in the manner and to the extent specifically as permitted by the Client.",
          "It shall not at any point make representations on behalf of the Client, unless the Client has expressly permitted the same, and it shall not in any event make commitments on employment to any potential candidate.",
          "It has the necessary authority and approval to carry out the services envisaged herein in terms of applicable laws in Sri Lanka.",
          "It has obtained due consent from potential candidates to share their resumes/profiles with the Client.",
        ],
      },
      {
        title: "VALIDITY & TERMINATION OF AGREEMENT",
        items: [
          "Any amendment and addition to the Contract (if any) shall be made in writing and duly signed by the authorized representatives of both Parties, and shall form an integral part of the Contract. If in the event it is established that a Party is in breach of the terms of this Agreement, the other Party may terminate this Agreement by providing fourteen (14) days written notice to the Party in breach.",
          "This Agreement shall remain in effect for a period of three (3) years from the Effective Date and may be renewed thereafter only by mutual written consent of the Parties. Absent such renewal, this Agreement shall automatically terminate upon expiration of the initial term.",
          "If either party wishes to terminate the agreement at any time within the Term it may do so by providing fourteen (14) days written notice to the other Party.",
        ],
      },
    ],
    signing: { career: o.directorName, client: signer || company, clientTitle: title },
  };
}
