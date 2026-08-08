import { Router } from 'express';
import * as ctrl from './activity.controller';
import { requireAuth } from '../../common/guards/auth.guard';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listActivity);
router.get('/recent', ctrl.getRecent);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getActivity);

export default router;
