import { Router } from 'express';
import * as ctrl from './notifications.controller';
import { requireAuth } from '../../common/guards/auth.guard';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listMyNotifications);
router.get('/unread-count', ctrl.getUnreadCount);
router.post('/mark-all-read', ctrl.markAllRead);
router.post('/', ctrl.createNotification);
router.post('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.deleteNotification);

export default router;
