import type {Role} from '@touchline/shared';
declare global {namespace Express {interface Request {auth?:{userId:string;role:Role;familyId:string};requestId:string}}}
export {};
