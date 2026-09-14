import {z} from 'zod';
export const tournamentQuery=z.object({page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(12),search:z.string().trim().max(100).optional(),status:z.enum(['REGISTRATION_OPEN','REGISTRATION_CLOSED','UPCOMING','ONGOING','COMPLETED','CANCELLED']).optional(),format:z.enum(['LEAGUE','KNOCKOUT','GROUP_STAGE','GROUP_KNOCKOUT']).optional(),platform:z.enum(['STEAM_PC','MOBILE']).optional()});

