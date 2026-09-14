import {Router} from 'express';
import {requireAuth,requireCsrf} from '../middleware/auth.js';
import * as c from '../controllers/user.controller.js';
export const userRoutes=Router();
userRoutes.patch('/me',requireAuth,requireCsrf,c.update);
userRoutes.get('/:username',c.profile);
