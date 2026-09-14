import type {RequestHandler} from 'express';
import {z} from 'zod';
import * as service from '../services/catalog.service.js';
export const list:RequestHandler=async(req,res)=>{const data=await service.list(req.query);res.json({success:true,message:'Public tournaments.',data:data.items,pagination:data.pagination})};
export const detail:RequestHandler=async(req,res)=>{const slug=z.string().min(1).max(140).parse(req.params.slug);res.json({success:true,message:'Tournament.',data:await service.detail(slug)})};
export const community:RequestHandler=async(_req,res)=>res.json({success:true,message:'Community statistics.',data:await service.community()});
