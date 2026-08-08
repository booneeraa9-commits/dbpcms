import { Router } from 'express';
import * as healthController from './health.controller';

const router = Router();

router.get('/live', healthController.live);
router.get('/ready', healthController.ready);
router.get('/', healthController.detailed);

export default router;
