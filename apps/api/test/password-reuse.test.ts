import {beforeEach,describe,it,expect,vi} from 'vitest';
const db=vi.hoisted(()=>({passwordResetToken:{findUnique:vi.fn(),updateMany:vi.fn()},user:{findUnique:vi.fn(),update:vi.fn()},refreshToken:{updateMany:vi.fn()}}));
vi.mock('../src/config/prisma.js',()=>({prisma:{$transaction:async(fn:(tx:typeof db)=>unknown)=>fn(db)}}));
vi.mock('../src/config/env.js',()=>({env:{}}));
vi.mock('../src/utils/email.js',()=>({sendAccountEmail:vi.fn()}));
vi.mock('../src/utils/tokens.js',()=>({hashToken:(v:string)=>v,csrfFor:vi.fn(),opaqueToken:vi.fn(),signToken:vi.fn(),verifyToken:vi.fn()}));
import bcrypt from 'bcrypt';
import {resetPassword} from '../src/services/auth.service';
import {sendAccountEmail} from '../src/utils/email';
beforeEach(async()=>{vi.clearAllMocks();db.passwordResetToken.findUnique.mockResolvedValue({id:'token',userId:'user',consumedAt:null,expiresAt:new Date(Date.now()+60000)});db.user.findUnique.mockResolvedValue({passwordHash:await bcrypt.hash('OldStrongPassword47!',4)});db.passwordResetToken.updateMany.mockResolvedValue({count:1});db.user.update.mockResolvedValue({email:'player@example.com'});});
describe('Password reset reuse prevention',()=>{
 it('rejects the current password without consuming the link or changing sessions',async()=>{await expect(resetPassword('token','OldStrongPassword47!')).rejects.toMatchObject({message:'Your new password must be different from your current password.'});expect(db.passwordResetToken.updateMany).not.toHaveBeenCalled();expect(db.user.update).not.toHaveBeenCalled();expect(db.refreshToken.updateMany).not.toHaveBeenCalled();expect(sendAccountEmail).not.toHaveBeenCalled();});
 it('accepts a different password and sends the change notification',async()=>{await resetPassword('token','NewStrongPassword89!');expect(db.user.update).toHaveBeenCalledOnce();expect(db.refreshToken.updateMany).toHaveBeenCalledOnce();expect(sendAccountEmail).toHaveBeenCalledWith('player@example.com','changed');});
});
