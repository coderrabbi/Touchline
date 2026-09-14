'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {PlayerAvatar} from '@/components/player-avatar';
import {Feedback} from '@/components/ui/feedback';
import {uploadImage} from '@/lib/api';
export function AvatarEditor({name,url}:{name:string;url?:string|null}) {
  const router=useRouter(),cache=useQueryClient(),[preview,setPreview]=useState(url),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <section className="panel"><h2>Profile picture</h2><div className="profile-heading" style={{marginTop:18}}><PlayerAvatar key={preview} name={name} url={preview} large/><label className="field">Upload profile picture<input type="file" className="input" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setBusy(true);setError('');try{const upload=await uploadImage(file,'AVATAR');setPreview(upload.url);await cache.invalidateQueries({queryKey:['session']});router.refresh();}catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);event.target.value='';}}}/><span className="small muted">JPEG, PNG or WebP · Up to 5 MB · Visible on your public profile</span></label></div>{busy&&<p role="status">Uploading picture…</p>}<Feedback message={error} error/></section>;
}
