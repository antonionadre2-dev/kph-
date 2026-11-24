import 'dotenv/config';
import { createBookingHandlers } from '../server/booking.ts';

// Execute from a trusted scheduler (about every five minutes); there is no public
// job endpoint. Never log customer records, email bodies or capability tokens.
const handlers=createBookingHandlers();
const result=await handlers.runDue();
console.log(JSON.stringify(result));
process.exit(0);
