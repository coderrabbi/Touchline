"use client";
import Link from 'next/link';
import {Button} from '@/components/ui/button';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <section className="panel empty" role="alert"><h1>We couldn’t connect just yet.</h1><p>The service may be starting or temporarily unavailable. Please try again in a moment.</p><div className="actions" style={{justifyContent:'center'}}><Button onClick={reset}>Try again</Button><Button asChild variant="outline"><Link href="/">Back to home</Link></Button></div></section>}
