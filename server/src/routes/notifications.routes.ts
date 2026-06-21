import { Router } from 'express';
import { listNotifications, markAllRead, markRead } from '../controllers/notifications.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, asyncHandler(listNotifications));
router.patch('/:notificationId/read', requireAuth, asyncHandler(markRead));
router.post('/read-all', requireAuth, asyncHandler(markAllRead));

export default router;
