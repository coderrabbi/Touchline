import {z} from 'zod';
import {kickoffNow} from '../services/kickoff.service.js';
import {Router} from 'express';
import {requireAuth,requireRole,requireCsrf} from '../middleware/auth.js';
import * as c from '../controllers/tournament.controller.js';
export const tournamentRoutes=Router(),admin=[requireAuth,requireRole('ADMIN','SUPER_ADMIN')];
tournamentRoutes.post('/tournaments',...admin,requireCsrf,c.create);
tournamentRoutes.patch('/tournaments/:id',...admin,requireCsrf,c.update);
tournamentRoutes.delete('/tournaments/:id',...admin,requireCsrf,c.remove);
tournamentRoutes.post('/tournaments/:id/status',...admin,requireCsrf,c.status);
tournamentRoutes.post('/tournaments/:id/join',requireAuth,requireCsrf,c.join);
tournamentRoutes.post('/tournaments/:id/withdraw',requireAuth,requireCsrf,c.withdraw);
tournamentRoutes.get('/admin/tournaments',...admin,c.list);
tournamentRoutes.patch('/admin/registrations/:id',...admin,requireCsrf,c.review);

tournamentRoutes.post('/tournaments/:id/kickoff',...admin,requireCsrf,async(req,res)=>res.json({success:true,message:'Tournament is live.',data:await kickoffNow(req.auth!.userId,z.uuid().parse(req.params.id))}));
