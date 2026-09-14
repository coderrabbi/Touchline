import type {Metadata} from 'next';
import {Providers} from '@/components/providers';
import {VerificationNotice} from '@/components/verification-notice';
import {Header} from '@/components/header';
import './globals.css';
import './profile-bracket.css';
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3100'),title:{default:'Touchline — Your next match starts here',template:'%s | Touchline'},description:'Discover community eFootball tournaments and make every match count.',icons:{icon:'/favicon.svg'},openGraph:{title:'Touchline — Your next match starts here',description:'Community eFootball tournaments, organized around you.',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><Providers><Header/><VerificationNotice/><main id="main" className="container">{children}</main><footer className="footer"><span>© 2026 Touchline. For the love of the game.</span><span>Independent community platform. Not affiliated with KONAMI or eFootball.</span></footer></Providers></body></html>}
