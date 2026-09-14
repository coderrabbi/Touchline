'use client';
import {useRef,useState} from 'react';
import {Camera} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {PlayerAvatar} from '@/components/player-avatar';
import {uploadImage} from '@/lib/api';
export function ProfilePhoto({name,url,editable=false}:{name:string;url?:string|null;editable?:boolean}) {
  const input=useRef<HTMLInputElement>(null),router=useRouter(),cache=useQueryClient();
  const [preview,setPreview]=useState(url),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <div className="profile-photo"><PlayerAvatar key={preview} name={name} url={preview} large/>{editable&&<><button className="photo-change" aria-label="Change profile picture" disabled={busy} onClick={()=>input.current?.click()}><Camera size={17}/><span>{busy?'Uploading…':'Change photo'}</span></button><input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose profile picture" onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setBusy(true);setError('');try{const image=await uploadImage(file,'AVATAR');setPreview(image.url);await cache.invalidateQueries({queryKey:['session']});router.refresh();}catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);if(input.current)input.current.value='';}}}/></>}{error&&<p className="field-error" role="alert">{error}</p>}</div>;
}
