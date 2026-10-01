import Link from 'next/link';

// Static server component: no API calls or session dependencies.
export function HomeHero(){return <section className="hero"><div className="eyebrow">THE HOME OF COMMUNITY eFOOTBALL</div><h1>Your next match.<br/><span className="lime">Your next moment.</span></h1><p>Find your competition. Take on the community.<br/>Turn every match into something worth playing for.</p><div className="actions"><Link className="button button-primary" href="/tournaments">Explore tournaments ↗</Link><Link className="button button-outline" href="/admin">Host a tournament</Link></div><span className="hero-note">PLAY IN eFOOTBALL. COMPETE ON TOUCHLINE.</span></section>}
