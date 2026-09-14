import type {RequestHandler} from 'express';
import {z} from 'zod';
import {scoreSchema} from '@touchline/shared';
import * as result from '../services/result.service.js';
import * as fixtures from '../services/fixture.service.js';
import {reschedule} from '../services/coordination.service.js';

const id=(v:unknown)=>z.uuid().parse(v);
export const generate:RequestHandler=async(req,res)=>res.json({success:true,message:'Fixtures generated and published.',data:await fixtures.generate(req.auth!.userId,id(req.params.id))});
export const qualify:RequestHandler=async(req,res)=>res.json({success:true,message:'Qualification confirmed.',data:await fixtures.confirmQualification(req.auth!.userId,id(req.params.id))});
export const view:RequestHandler=async(req,res)=>res.json({success:true,message:'Match details.',data:await result.view(id(req.params.id),req.auth?.userId,!!req.auth&&req.auth.role!=='PLAYER')});
export const submit:RequestHandler=async(req,res)=>res.status(201).json({success:true,message:'Result submitted for opponent confirmation.',data:await result.submit(req.auth!.userId,id(req.params.id),scoreSchema.parse(req.body))});
export const confirm:RequestHandler=async(req,res)=>res.json({success:true,message:'Official result confirmed.',data:await result.confirm(req.auth!.userId,id(req.params.id))});
export const dispute:RequestHandler=async(req,res)=>{const data=z.object({reason:z.string().min(10).max(2000),evidenceId:z.uuid()}).parse(req.body);res.json({success:true,message:'Dispute sent to administrators.',data:await result.dispute(req.auth!.userId,id(req.params.id),data.reason,data.evidenceId)})};
export const resolve:RequestHandler=async(req,res)=>{const data=z.object({score:scoreSchema,reason:z.string().min(10).max(2000)}).parse(req.body);res.json({success:true,message:'Official decision published.',data:await result.resolve(req.auth!.userId,id(req.params.id),data.score,data.reason)})};
export const schedule:RequestHandler=async(req,res)=>{const data=z.object({scheduledAt:z.iso.datetime(),reason:z.string().trim().min(5).max(1000)}).parse(req.body);res.json({success:true,message:'Match rescheduled and players notified.',data:await reschedule(id(req.params.id),req.auth!.userId,data.scheduledAt,data.reason)})};
export const lookup:RequestHandler=async(req,res)=>res.json({success:true,message:'Match found.',data:await result.lookup(z.string().max(32).parse(req.params.code),req.auth?.userId,!!req.auth&&req.auth.role!=='PLAYER')});
