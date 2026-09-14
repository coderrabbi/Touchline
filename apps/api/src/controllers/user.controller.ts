import type {RequestHandler} from 'express';
import {profileSchema} from '@touchline/shared';
import {z} from 'zod';
import * as service from '../services/user.service.js';
export const update:RequestHandler=async(req,res)=>{const user=await service.updateProfile(req.auth!.userId,profileSchema.parse(req.body));res.json({success:true,message:'Profile updated.',data:{user}})};
export const profile:RequestHandler=async(req,res)=>{const username=z.string().min(3).max(24).parse(req.params.username).toLowerCase();const user=await service.publicProfile(username);res.json({success:true,message:'Player profile.',data:{user}})};
