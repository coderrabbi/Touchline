'use client';
import {Button} from '@/components/ui/button';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <section className="panel empty"><h1>We couldn’t load this page.</h1><p>Your progress is safe. Please try again.</p><Button onClick={reset}>Try again</Button></section>}
