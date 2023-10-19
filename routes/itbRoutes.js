import express from 'express';
const itbRouter = express.Router();
import { credentialRequest } from '../controllers/itb.js'; // Import the named export

/**
 * @swagger
 * /itb/getCredentialRequest:
 *   get:
 *     description: Get data from route1
 *     responses:
 *       200:
 *         description: Success
 *         response: { qr: qrCode, sessionId: req.query.sessionId }
 *       500:
 *         description: Fail
 */
itbRouter.get('/getCredentialRequest', credentialRequest);

// Export the router object as a named export
export { itbRouter };