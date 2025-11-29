import { Router } from 'express';
import { verifyToken } from '../middleware/jwtValidate.js';
import { getSorteos, getSorteoById } from '../controllers/sorteoController.js';
import { guardarNumeros, misParticipaciones } from '../controllers/participanteController.js';

const router = Router();

// Públicas (solo lectura)
router.get('/sorteos', getSorteos);
router.get('/sorteos/:id', getSorteoById);

// Protegidas
router.use(verifyToken);
router.post('/participante/guardar-numeros', guardarNumeros);
router.get('/participante/mis-participaciones', misParticipaciones);

export default router;