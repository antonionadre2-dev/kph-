type Identity={uid:string;getIdToken:()=>Promise<string>};
export function createOperatorClient({uid,currentUser,fetcher=fetch}:{uid:string;currentUser:()=>Identity|null;fetcher?:typeof fetch}){
  return async(path:string,body?:unknown,signal?:AbortSignal)=>{
    if(!/^\/api\/booking\/operator\/requests(?:\/[A-Za-z0-9_:/-]+)?$/.test(path))throw new Error('INVALID_OPERATOR_ROUTE');
    const person=currentUser();if(!person||person.uid!==uid)throw new Error('UNAUTHORIZED');
    const token=await person.getIdToken();
    if(signal?.aborted||currentUser()?.uid!==uid)throw new Error('UNAUTHORIZED');
    if(body!==undefined){
      const config=await fetcher('/api/booking/config',{credentials:'same-origin',cache:'no-store',signal});
      if(!config.ok)throw new Error('BOOKING_OPERATOR_UNAVAILABLE');
    }
    if(signal?.aborted||currentUser()?.uid!==uid)throw new Error('UNAUTHORIZED');
    const response=await fetcher(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal,
      headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json().catch(()=>null);
    if(signal?.aborted||currentUser()?.uid!==uid)throw new Error('UNAUTHORIZED');
    if(!response.ok)throw new Error(typeof result?.code==='string'&&/^[A-Z_]{3,80}$/.test(result.code)?result.code:'BOOKING_OPERATOR_UNAVAILABLE');
    return result;
  };
}
