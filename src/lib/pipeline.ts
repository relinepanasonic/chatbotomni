/**
 * The sales pipeline, the same list as the ERP (Accounting Prof, src/lib/sales/flow.ts): one pipeline, two screens. The stored names of the old
 * stages are kept ('Lead', 'Invoice', 'Deal', 'Cold Case'); people read the labels.
 */
export const PIPELINE = ['Lead', 'Contacted', 'Qualified', 'Warm', 'Meeting Offered', 'Meeting Booked', 'Meeting Offline', 'Meeting Done', 'Negotiation', 'Invoice Requested', 'Invoice', 'Deal', 'Finished'] as const;
/** Cold Leads: went quiet, or said not now. Lost: said no or asked not to be contacted, never messaged again. */
export const COLD = 'Cold Case';
export const LOST = 'Lost';
const LABEL: Record<string, string> = { Lead: 'New Lead', Invoice: 'Invoice Sent', Deal: 'Active Client', 'Cold Case': 'Cold Leads' };
export const stageLabel = (s: string) => LABEL[s] || s;
export const STAGE_HINT: Record<string, string> = {
  Lead: 'First message, nothing known yet', Contacted: 'We answered and the lead replied', Qualified: 'We know the name, the store and the need',
  Warm: 'Asked about price, packages or the deck', 'Meeting Offered': 'Free times sent, waiting for a pick', 'Meeting Booked': 'A consultation is booked', 'Meeting Offline': 'A meeting in person is set (told to Fefe)',
  'Meeting Done': 'The consultation happened', Negotiation: 'Proposal and price, then the ACC in the ERP', 'Invoice Requested': 'Waiting for Accounting',
  Invoice: 'Invoice made, waiting for payment', Deal: 'Paid: the project starts', Finished: 'The project ended, still our client (not churn, not cold)', 'Cold Case': 'Quiet after 3 follow-ups, or not now',
  Lost: 'Said no or asked not to be contacted: never messaged again',
};
/** Stages a person may pick. The three after Negotiation are set by the invoice request, the invoice and the payment in the ERP. */
export const MANUAL = new Set<string>(['Lead', 'Contacted', 'Qualified', 'Warm', 'Meeting Offered', 'Meeting Booked', 'Meeting Offline', 'Meeting Done', 'Negotiation']);
export const LOCKED = new Set<string>(['Invoice Requested', 'Invoice', 'Deal', 'Finished']);
/** The three parts of the road, for the colour of the bar. */
export const stagePart = (s: string): 'lead' | 'meeting' | 'sale' => (['Meeting Offered', 'Meeting Booked', 'Meeting Offline', 'Meeting Done'].includes(s) ? 'meeting' : ['Negotiation', 'Invoice Requested', 'Invoice', 'Deal', 'Finished'].includes(s) ? 'sale' : 'lead');

/** The colour family of a stage chip: before the meeting, the meeting, the sale, active, lost. */
export const stageTone = (s: string): 'lead' | 'meeting' | 'sale' | 'active' | 'lost' => (s === 'Cold Case' || s === 'Lost' ? 'lost' : s === 'Deal' || s === 'Finished' ? 'active' : stagePart(s) === 'meeting' ? 'meeting' : stagePart(s) === 'sale' ? 'sale' : 'lead');
export const STAGE_CHIP: Record<ReturnType<typeof stageTone>, string> = { lead: 'bg-brand-soft text-brand-dark', meeting: 'bg-[#ece7ff] text-[#5b3fd1]', sale: 'bg-warn-soft text-warn', active: 'bg-ok-soft text-ok', lost: 'bg-[#eef2f6] text-ink-soft' };
export const PAYMENT_LABEL = { unpaid: 'Unpaid', partial: 'Partly paid', paid: 'Paid', overdue: 'Overdue' } as const;
export const PAYMENT_CHIP = { unpaid: 'bg-warn-soft text-warn', partial: 'bg-warn-soft text-warn', paid: 'bg-ok-soft text-ok', overdue: 'bg-bad-soft text-bad' } as const;
/** Every stage a chat can be filtered by, in pipeline order, Lost last. */
export const FILTER_STAGES = [...PIPELINE, COLD, LOST] as const;

/** After this many days in a stage with no move a card shows as waiting too long (the same limits as the BOD report). */
export const STUCK_DAYS: Record<string, number> = { Lead: 5, Contacted: 5, Qualified: 5, Warm: 4, 'Meeting Offered': 3, 'Meeting Done': 3, Negotiation: 7, 'Invoice Requested': 2 };
/** Where a card may be dropped by hand: the hand stages and Lost. */
export const DROP_OK = new Set<string>([...MANUAL, COLD, LOST]);
