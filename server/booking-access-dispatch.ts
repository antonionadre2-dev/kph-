import { BookingError } from './booking-store.ts';
import type { PaymentEmailScheduler } from './booking-lifecycle.ts';

/** Reserve a real serverless lifecycle before looking up an anonymous recipient. */
export async function pinnedAccessRequest<T>({schedule,request,dispatch,onDispatchError=()=>{}}:{schedule?:PaymentEmailScheduler;request:(queued:(id:string)=>Promise<void>)=>Promise<T>;dispatch:(id:string)=>Promise<unknown>;onDispatchError?:()=>void}):Promise<T>{
  if(!schedule)throw new BookingError('ACCESS_EMAIL_DISPATCH_UNAVAILABLE',503);
  let release!:()=>void;
  const jobs:string[]=[];
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const work=gate.then(async()=>{for(const id of jobs)try{await dispatch(id);}catch{onDispatchError();}});
  let pinned=false;
  try{pinned=schedule(work);}catch{/* No recipient lookup or provider work has started. */}
  if(!pinned){release();await work;throw new BookingError('ACCESS_EMAIL_DISPATCH_UNAVAILABLE',503);}
  try{return await request(async id=>{jobs.push(id);});}
  finally{release();}
}
