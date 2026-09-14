'use client';
import {useState} from 'react';
export function PlayerAvatar({name,url,large=false}:{name:string;url?:string|null;large?:boolean}) {
  const [failed,setFailed]=useState(false);
  return url&&!failed?<img className={'player-avatar'+(large?' large':'')} src={url} alt={`${name}'s profile picture`} onError={()=>setFailed(true)}/>:<span className={'player-avatar'+(large?' large':'')} role="img" aria-label={`${name}'s profile picture placeholder`}>{name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span>;
}
