import {beforeEach,describe,it,expect,vi} from 'vitest';
const db=vi.hoisted(()=>({match:{findUnique:vi.fn()},matchCoordination:{upsert:vi.fn()},notification:{createMany:vi.fn()},auditLog:{create:vi.fn()}}));
vi.mock('../src/config/prisma.js',()=>({prisma:{}}));
vi.mock('../src/services/transaction.js',()=>({transaction:async(fn:(tx:typeof db)=>unknown)=>fn(db)}));
import {coordinate} from '../src/services/coordination.service';
beforeEach(()=>{vi.clearAllMocks();db.match.findUnique.mockResolvedValue({id:'match',homeId:'home',awayId:'away',home:{userId:'player'},away:{userId:'opponent'},status:'SCHEDULED',tournament:{status:'ONGOING',name:'Cup'},scheduledAt:new Date(Date.now()+86400000),coordination:null});db.matchCoordination.upsert.mockResolvedValue({homeReadyAt:new Date()});});
describe('Early match check-in',()=>{
 it('allows a participant to check in a day before the schedule',async()=>{await coordinate('match','player',false,{action:'ready'});expect(db.matchCoordination.upsert).toHaveBeenCalledOnce();});
 it('still rejects early no-show claims',async()=>{await expect(coordinate('match','player',false,{action:'no-show'})).rejects.toMatchObject({status:409});expect(db.matchCoordination.upsert).not.toHaveBeenCalled();});
 it('keeps the room private',async()=>{await expect(coordinate('match','outsider',false,{action:'ready'})).rejects.toMatchObject({status:403});});
});
