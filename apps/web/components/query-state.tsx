'use client';
import {Button} from './ui/button';
export function QueryState({pending,error,retry}:{pending:boolean;error:Error|null;retry:()=>void}){if(pending)return <section className="panel" role="status"><div className="skeleton"/><div className="skeleton"/><span className="small muted">Loading competition data…</span></section>;if(error)return <section className="panel"><h2>Could not load this view</h2><p className="muted">{error.message}</p><Button onClick={retry}>Try again</Button></section>;return null}
