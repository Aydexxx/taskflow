import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import healthRoutes from './health.routes';
import workspacesRoutes from './workspaces.routes';
import boardsRoutes from './boards.routes';
import columnsRoutes from './columns.routes';
import cardsRoutes from './cards.routes';
import labelsRoutes from './labels.routes';
import commentsRoutes from './comments.routes';
import notificationsRoutes from './notifications.routes';
import aiRoutes from './ai.routes';

/** Root API router; mount additional feature routers here. */
const api = Router();

api.use('/health', healthRoutes);
api.use('/auth', authRoutes);
api.use('/users', usersRoutes);
api.use('/workspaces', workspacesRoutes);
api.use('/boards', boardsRoutes);
api.use('/columns', columnsRoutes);
api.use('/cards', cardsRoutes);
api.use('/labels', labelsRoutes);
api.use('/comments', commentsRoutes);
api.use('/notifications', notificationsRoutes);
api.use('/ai', aiRoutes);

export default api;
