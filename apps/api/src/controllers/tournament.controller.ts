import type {RequestHandler} from 'express';
import {z} from 'zod';
import {tournamentSchema} from '@touchline/shared';
import * as service from '../services/tournament.service.js';
const id=(v:unknown)=>z.uuid().parse(v),reasonSchema=z.object({reason:z.string().trim().min(5).max(1000)});
export const create:RequestHandler=async(req,res)=>res.status(201).json({success:true,message:'Tournament draft created.',data:await service.create(req.auth!.userId,tournamentSchema.parse(req.body))});
export const update:RequestHandler=async(req,res)=>res.json({success:true,message:'Tournament updated.',data:await service.update(req.auth!.userId,id(req.params.id),tournamentSchema.parse(req.body))});
export const status:RequestHandler=async(req,res)=>{const data=reasonSchema.extend({status:z.enum(['DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','UPCOMING','ONGOING','COMPLETED','CANCELLED'])}).parse(req.body);res.json({success:true,message:'Tournament status updated.',data:await service.changeStatus(req.auth!.userId,id(req.params.id),data.status,data.reason)})};
export const remove:RequestHandler=async(req,res)=>{const data=reasonSchema.extend({confirmation:z.string().min(1).max(140)}).parse(req.body);res.json({success:true,message:'Tournament deleted.',data:await service.remove(req.auth!.userId,id(req.params.id),data.reason,data.confirmation)})};
export const join:RequestHandler=async(req,res)=>{z.object({acceptRules:z.literal(true)}).strict().parse(req.body);res.status(201).json({success:true,message:'Registration submitted.',data:await service.join(req.auth!.userId,id(req.params.id))})};
export const withdraw:RequestHandler=async(req,res)=>res.json({success:true,message:'Registration withdrawn.',data:await service.withdraw(req.auth!.userId,id(req.params.id))});
export const review:RequestHandler=async(req,res)=>{const data=reasonSchema.extend({approve:z.boolean()}).parse(req.body);res.json({success:true,message:'Registration reviewed.',data:await service.reviewRegistration(req.auth!.userId,id(req.params.id),data.approve,data.reason)})};
export const list:RequestHandler=async(_req,res)=>res.json({success:true,message:'Tournament management.',data:await service.adminList()});

