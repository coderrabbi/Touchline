import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
import {AppError} from './errors.js';
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const opaqueToken=()=>randomBytes(32).toString('hex');
const issuer='touchline-api',audience='touchline-web';
export interface Claims {sub:string;jti:string;familyId:string;version:number;kind:'access'|'refresh'}
export function signToken(kind:Claims['kind'],userId:string,version:number,familyId:string,id=randomUUID()){
 return jwt.sign({kind,familyId,version},kind==='access'?env.JWT_ACCESS_SECRET:env.JWT_REFRESH_SECRET,{algorithm:'HS256',issuer,audience,subject:userId,jwtid:id,expiresIn:kind==='access'?'15m':'7d'});
}
export function verifyToken(token:string,kind:Claims['kind']):Claims{
 try{const value=jwt.verify(token,kind==='access'?env.JWT_ACCESS_SECRET:env.JWT_REFRESH_SECRET,{algorithms:['HS256'],issuer,audience});if(typeof value==='string'||value.kind!==kind||typeof value.sub!=='string'||typeof value.jti!=='string'||typeof value.familyId!=='string'||typeof value.version!=='number')throw Error();return value as unknown as Claims}catch{throw new AppError(401,'Your session has expired. Please log in again.')}
}
export const csrfFor=(familyId:string)=>createHmac('sha256',env.JWT_ACCESS_SECRET).update('csrf:'+familyId).digest('hex');
export function secureEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
