/**
 * The sales pipeline, the same list as the ERP (Accounting Prof, src/lib/sales/flow.ts): one pipeline, two screens. The stored names of the old
 * stages are kept ('Lead', 'Invoice', 'Deal', 'Cold Case'); people read the labels.
 */
export const PIPELINE = ['Lead', 'Contacted', 'Qualified', 'Warm', 'Meeting Offered', 'Meeting Booked', 'Meeting Done', 'Negotiation', 'Invoice Requested', 'Invoice', 'Deal'] as const;
export const LOST = 'Cold Case';
const LABEL: Record<string, string> = { Lead: 'New Lead', Invoice: 'Invoice Sent', Deal: 'Active Client', 'Cold Case': 'Lost' };
export const stageLabel = (s: string) => LABEL[s] || s;
export const STAGE_HINT: Record<string, string> = {
  Lead: 'First message, nothing known yet', Contacted: 'We answered and the lead replied', Qualified: 'We know the name, the store and the need',
  Warm: 'Asked about price, packages or the deck', 'Meeting Offered': 'Free times sent, waiting for a pick', 'Meeting Booked': 'A consultation is booked',
  'Meeting Done': 'The consultation happened', Negotiation: 'Proposal and price, then the ACC in the ERP', 'Invoice Requested': 'Waiting for Accounting',
  Invoice: 'Invoice made, waiting for payment', Deal: 'Paid: the project starts', 'Cold Case': 'No answer, or said no',
};
/** Stages a person may pick. The three after Negotiation are set by the invoice request, the invoice and the payment in the ERP. */
export const MANUAL = new Set<string>(['Lead', 'Contacted', 'Qualified', 'Warm', 'Meeting Offered', 'Meeting Booked', 'Meeting Done', 'Negotiation']);
export const LOCKED = new Set<string>(['Invoice Requested', 'Invoice', 'Deal']);
/** The three parts of the road, for the colour of the bar. */
export const stagePart = (s: string): 'lead' | 'meeting' | 'sale' => (['Meeting Offered', 'Meeting Booked', 'Meeting Done'].includes(s) ? 'meeting' : ['Negotiation', 'Invoice Requested', 'Invoice', 'Deal'].includes(s) ? 'sale' : 'lead');
