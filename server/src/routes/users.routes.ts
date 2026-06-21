import { Router } from 'express';
import { updateProfile, uploadAvatar } from '../controllers/users.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema, uploadAvatarSchema } from '../validation/profile.schemas';

const router = Router();

router.patch('/me', requireAuth, validateBody(updateProfileSchema), asyncHandler(updateProfile));
router.post('/me/avatar', requireAuth, validateBody(uploadAvatarSchema), asyncHandler(uploadAvatar));

export default router;
