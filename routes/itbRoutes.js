import express from 'express';
const itbRouter = express.Router();
import { credentialRequest, getValidationResponse } from '../controllers/itb.js'; // 


/**
 * @swagger
 * /gataca-helper/itb/getCredentialRequest:
 *   get:
 *     description: Generate a new VP QR code
 *     parameters:
 *       - name: sessionId
 *         in: query
 *         required: true
 *         description: The session ID for the credential request
 *       - name: credentialType
 *         in: query
 *         required: true
 *         description: The type of the credential that is being validated
 *     responses:
 *       200:
 *         description: Success
 *         response: { qr: qrCode, sessionId: req.query.sessionId }
 *       500:
 *         description: Fail
 */
itbRouter.get('/getCredentialRequest', credentialRequest);

/**
 * @swagger
 * /gataca-helper/itb/getValidationResponse:
 *   get:
 *     description: Check the status of an previously generated VP session
 *     parameters: 
 *       - name: sessionId
 *         in: query
 *         required: true
 *         description: The session ID for the credential request
 *     responses:
 *       200:
 *         description: Success 
 *         content:
 *           application/json:
 *              examples:
 *                 example1:
 *                   summary: Example 1
 *                   value:
 *                       status: "success"
 *                       reason: "ok"
 *                       sessionId: "123"
 *                       attributes: 
 *                         familyName: "Triantafyllou" 
 *                         firstName: "Nikos"
 *                         identifier: "" 
 *        
 *       500:
 *         description: Fail
 *         content:
 *           application/json:
 *              examples:
 *                 example1:
 *                   summary: Example 1
 *                   value:
 *                       status: "fail"
 *                       reason: "no verification session found"
 *                       sessionId: "123"
 *                       attributes: ""  
 */
itbRouter.get("/getValidationResponse",getValidationResponse)

// Export the router object as a named export
export { itbRouter };