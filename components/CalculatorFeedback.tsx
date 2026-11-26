import React, {useEffect,useRef,useState,type ReactNode} from 'react';
import {ClipboardList,LoaderCircle} from 'lucide-react';
import {createCalculatorPriceFeedback,type CalculatorPricePulse} from '../src/booking/calculatorInteractions.ts';
import './calculator-feedback.css';

/** Both desktop and mobile retain one stable, atomic polite live region. */
export function CalculatorPriceSurface({amount,className,children}:{amount:number|null;className:string;children:ReactNode}) {
  const [pulse,setPulse]=useState<CalculatorPricePulse>(null);
  const feedback=useRef(createCalculatorPriceFeedback(amount));
  useEffect(()=>{
    feedback.current.update(amount,window.matchMedia('(prefers-reduced-motion: reduce)').matches,setPulse);
  },[amount]);
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop=()=>{if(preference.matches)feedback.current.cancel();};
    preference.addEventListener('change',stop);
    return ()=>{preference.removeEventListener('change',stop);feedback.current.dispose();};
  },[]);
  return <div className={pulse?`${className} kr-calc-price-pulse-${pulse}`:className} aria-live="polite" aria-atomic="true">{children}</div>;
}

/** The check decorates an existing real result; it never supplies confirmation copy. */
export function CalculatorCompletionCheck() {
  return <span className="kr-calc-completion-check" aria-hidden="true"><span className="kr-calc-check-short"><span /></span><span className="kr-calc-check-long"><span /></span></span>;
}

export function CalculatorSubmitButton({busy,disabled,label,busyLabel}:{busy:boolean;disabled:boolean;label:string;busyLabel:string}) {
  return <button type="submit" className="kr-calc-primary" disabled={disabled||busy} aria-busy={busy||undefined}>
    {busy?<LoaderCircle className="kr-calc-spin" aria-hidden="true"/>:<ClipboardList aria-hidden="true"/>}{busy?busyLabel:label}
  </button>;
}
