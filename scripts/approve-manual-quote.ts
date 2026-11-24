import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createBookingHandlers } from '../server/booking.ts';

// The scope is an approved written commercial offer, never generated from a browser price.
const [id,cents,scopeFile]=process.argv.slice(2);
const operatorId=process.env.BOOKING_OPERATOR_ID;
if(!id || !cents || !scopeFile || !operatorId) {
  console.error('Usage: BOOKING_OPERATOR_ID=<operator> node --import tsx scripts/approve-manual-quote.ts <booking-id> <CHF-rappen-integer> <scope-text-file>');process.exit(1);
}
try {
  const runtime=await createBookingHandlers().initialize();if(!runtime.service)throw new Error('BOOKING_NOT_CONFIGURED');
  await runtime.service.approveManualQuote(id,{totalCents:Number(cents),scopeNotes:await readFile(scopeFile,'utf8'),operatorId});
  console.log('Approved scope saved as a new quote revision. Customer acceptance and appointment confirmation remain required.');process.exit(0);
}catch {console.error('Approval failed. Check configuration, approved scope, integer amount, review state and existing checkout.');process.exit(1);}
