import {createHash} from 'node:crypto';
export interface ResendMessage {from:string;to:string[];subject:string;text:string;html:string}
export async function deliverResend(key:string|undefined,message:ResendMessage){
 if(!key?.trim())throw new Error('Resend configuration: set RESEND_API_KEY in the backend environment.');
 const body=JSON.stringify(message);
 const idempotencyKey=createHash('sha256').update(body).digest('hex');
 for(let attempt=0;attempt<2;attempt++){
  let response:Response;
  try{response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(5000),headers:{Authorization:'Bearer '+key.trim(),'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body});}
  catch{if(attempt===0)continue;throw new Error('Resend network request failed or timed out. Retry delivery.');}
  if(response.ok){const data=await response.json() as {id?:string};if(!data.id)throw new Error('Resend returned no email ID; delivery could not be confirmed.');return data.id;}
  const data=await response.json().catch(()=>({})) as {name?:string};
  const retryable=response.status>=500||response.status===429||(response.status===409&&data.name==='concurrent_idempotent_requests');
  if(retryable&&attempt===0){await new Promise(resolve=>setTimeout(resolve,1000));continue;}
  const hint=response.status===401?'Check RESEND_API_KEY.':response.status===403?'Verify the sender domain and API key permissions. The resend.dev test sender can only send to permitted test recipients.':response.status===429?'Provider rate limit reached. Try again later.':'Check sender, recipient and provider logs.';
  throw new Error(`Resend rejected delivery (HTTP ${response.status}). ${hint}`);
 }
 throw new Error('Resend delivery was not accepted.');
}
