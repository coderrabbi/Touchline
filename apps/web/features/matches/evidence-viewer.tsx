"use client";
import {useEffect,useRef,useState} from 'react';
import {openProtectedUpload} from '@/lib/api';
import {Button} from '@/components/ui/button';
export function EvidenceViewer({id,label}:{id:string;label:string}){
  const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);
  return <><Button variant="outline" disabled={busy} onClick={async()=>{
    setBusy(true);setError('');
    try{setUrl(await openProtectedUpload(id));dialog.current?.showModal()}
    catch(e){setError(e instanceof Error?e.message:'Unable to load evidence.')}
    finally{setBusy(false)}
  }}>{busy?'Loading evidence…':label}</Button>{error&&<p role="alert" className="field-error">{error}</p>}
  <dialog ref={dialog} className="evidence-dialog" aria-label={label} onClose={()=>setUrl('')}>
    <div className="row"><h2>{label}</h2><Button autoFocus variant="outline" onClick={()=>dialog.current?.close()}>Close</Button></div>
    {/* The protected image is fetched as a local blob, never a public URL. */}
    {url&&<img src={url} alt={label+' screenshot'}/>}
  </dialog></>;
}
