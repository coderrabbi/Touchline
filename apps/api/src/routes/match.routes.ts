import {z} from 'zod';
import * as coordination from '../services/coordination.service.js';
import {Router} from 'express';
import {requireAuth,requireRole,requireCsrf} from '../middleware/auth.js';
import * as c from '../controllers/match.controller.js';
export const matchRoutes=Router(),admin=[requireAuth,requireRole('ADMIN','SUPER_ADMIN'),requireCsrf];
matchRoutes.get('/matches/:id',(req,res,next)=>req.cookies?.tl_access?requireAuth(req,res,next):next(),c.view);
matchRoutes.post('/matches/:id/result',requireAuth,requireCsrf,c.submit);
matchRoutes.post('/matches/:id/confirm',requireAuth,requireCsrf,c.confirm);
matchRoutes.post('/matches/:id/dispute',requireAuth,requireCsrf,c.dispute);
matchRoutes.patch('/admin/matches/:id/result',...admin,c.resolve);
matchRoutes.patch('/admin/matches/:id/schedule',...admin,c.schedule);
matchRoutes.post('/admin/tournaments/:id/generate-fixtures',...admin,c.generate);
matchRoutes.post('/admin/tournaments/:id/qualify',...admin,c.qualify);

matchRoutes.get('/matches/:id/coordination',requireAuth,async(req,res)=>res.json({success:true,message:'Private match room.',data:await coordination.room(z.uuid().parse(req.params.id),req.auth!.userId,req.auth!.role!=='PLAYER')}));
matchRoutes.post('/matches/:id/coordination',requireAuth,requireCsrf,async(req,res)=>{const input=z.discriminatedUnion('action',[z.object({action:z.literal('ready')}),z.object({action:z.literal('lobby'),text:z.string().trim().max(1000)}),z.object({action:z.literal('no-show'),text:z.string().trim().min(10).max(2000)}),z.object({action:z.literal('decision'),text:z.string().trim().min(10).max(2000)})]).parse(req.body);res.json({success:true,message:'Match coordination updated.',data:await coordination.coordinate(z.uuid().parse(req.params.id),req.auth!.userId,req.auth!.role!=='PLAYER',input)})});

matchRoutes.get('/match-lookup/:code',(req,res,next)=>req.cookies?.tl_access?requireAuth(req,res,next):next(),c.lookup);
