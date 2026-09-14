import {prisma} from '../src/config/prisma.js';
const slugs=['midnight-champions-cup','european-elite-league','weekend-warriors','asia-rising-invitational','summer-community-cup'];
for(const t of await prisma.tournament.findMany({where:{slug:{in:slugs}}})){if(t.registrationStartsAt>=t.registrationDeadline)await prisma.tournament.update({where:{id:t.id},data:{registrationStartsAt:new Date(t.registrationDeadline.getTime()-7*86400000)}})}
await prisma.$executeRawUnsafe('ALTER TABLE "Tournament" DROP CONSTRAINT IF EXISTS "tournament_capacity_valid"');
await prisma.$disconnect();console.log('Corrected seeded event dates and removed the incomplete migration constraint.');
