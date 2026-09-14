import {Router} from 'express';
import * as c from '../controllers/catalog.controller.js';
export const catalogRoutes=Router();
catalogRoutes.get('/tournaments',c.list);catalogRoutes.get('/tournaments/:slug',c.detail);catalogRoutes.get('/community',c.community);
