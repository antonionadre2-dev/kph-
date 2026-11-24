import 'dotenv/config';
import { createBookingHandlers } from '../server/booking.ts';

// Trusted operator command, not an HTTP admin route. It does not determine
// availability: an authorized operator checks scope/date/access first.
const [id,holdExpiresAt]=process.argv.slice(2);
const operatorId=process.env.BOOKING_OPERATOR_ID;
if(!id || !holdExpiresAt || !operatorId) {
  console.error('Usage: BOOKING_OPERATOR_ID=<operator> node --import tsx scripts/confirm-booking.ts <booking-id> <hold-expiry-ISO>');
  process.exit(1);
}
try {
  const runtime=await createBookingHandlers().initialize();
  if(!runtime.service)throw new Error('BOOKING_NOT_CONFIGURED');
  await runtime.service.confirmAppointment(id,{holdExpiresAt,operatorId});
  console.log('Appointment confirmed. No checkout was created and no money was charged.');
  process.exit(0);
}catch {
  console.error('Confirmation failed. Check configuration, scope, existing checkout and hold expiry.');
  process.exit(1);
}
