/** Presentation-only feedback. No prices, requests or booking state are changed here. */
export const CALCULATOR_PRICE_FEEDBACK_MS = 300;
export type CalculatorPricePulse='a'|'b'|null;
export interface CalculatorFeedbackClock { set(callback:()=>void,delay:number):unknown; clear(token:unknown):void }
const feedbackClock:CalculatorFeedbackClock={set:(callback,delay)=>setTimeout(callback,delay),clear:token=>clearTimeout(token as ReturnType<typeof setTimeout>)};
const priceValue = (value:number|null) => typeof value==='number' && Number.isFinite(value) ? value : null;

/** A stable live region can pulse without replacing its text node or animating its first render. */
export function createCalculatorPriceFeedback(initial:number|null,clock:CalculatorFeedbackClock=feedbackClock) {
  let previous=priceValue(initial),timer:unknown=null,generation=0,sequence=0;
  let pulse:CalculatorPricePulse=null,notify:((value:CalculatorPricePulse)=>void)|null=null;
  const clear=()=>{generation++;if(timer!==null)clock.clear(timer);timer=null;};
  const show=(value:CalculatorPricePulse)=>{pulse=value;notify?.(value);};
  const cancel=()=>{clear();if(pulse!==null)show(null);};
  return {
    update(value:number|null,reducedMotion:boolean,onPulse:(value:CalculatorPricePulse)=>void) {
      const next=priceValue(value);
      if(next===previous)return;
      previous=next;clear();notify=onPulse;
      if(reducedMotion){if(pulse!==null)show(null);return;}
      // Switching names restarts CSS on rapid changes; the live-region node stays mounted.
      show(++sequence%2?'a':'b');
      const current=generation;
      timer=clock.set(()=>{if(current!==generation)return;timer=null;show(null);},CALCULATOR_PRICE_FEEDBACK_MS);
    },
    cancel,
    dispose(){clear();notify=null;pulse=null;},
  };
}

/** Synchronous UI latch: a second click cannot race React's next disabled render. */
export function createCalculatorSubmissionGate() {
  let sequence=0, active:number|null=null;
  return {
    get busy(){return active!==null;},
    acquire():null|(()=>void) {
      if(active!==null)return null;
      const token=++sequence;active=token;
      return ()=>{if(active===token)active=null;};
    },
    cancel(){active=null;},
  };
}
