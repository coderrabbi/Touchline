import fs from 'node:fs';
const f='apps/web/features/matches/match-room.tsx';let s=fs.readFileSync(f,'utf8');s=s.replace('</div><label className="field" style={{display:', '</div>}<label className="field" style={{display:');fs.writeFileSync(f,s);
