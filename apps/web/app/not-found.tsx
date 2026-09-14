import Link from 'next/link';
import {Button} from '@/components/ui/button';
export default function NotFound(){return <div className="panel empty"><h1>That page is off the pitch.</h1><p>Check the address or return to the homepage.</p><Button asChild><Link href="/">Back to home</Link></Button></div>}
