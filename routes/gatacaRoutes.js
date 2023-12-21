import express from "express";
const gatacaRouter = express.Router();
import {
  makeGatacaVerificationRequestCtrl,
  makeGatacaVerificationRequestTicketCtrl,
  makeGatacaVerificationRequestStdAndAllianceCtrl,
  issueCtrl,
  makeIssuanceOffer,
  getUserDetailsCtrl,
  genericIssuanceCredential,
} from "../controllers/gataca.js"; //
import consts from "../constants.js";
let constants = consts.consts;

gatacaRouter.post(
  [
    "/makeGatacaVerificationRequest",
    `\/${constants.BASE_PATH}/makeGatacaVerificationRequest`,
    "/gataca-helper/makeGatacaVerificationRequest",
  ],
  makeGatacaVerificationRequestCtrl
);
gatacaRouter.post(
  [
    "/makeGatacaVerificationRequestTicket",
    `\/${constants.BASE_PATH}/makeGatacaVerificationRequestTicket`,
    "/gataca-helper/makeGatacaVerificationRequestTicket",
  ],
  makeGatacaVerificationRequestTicketCtrl
);
gatacaRouter.post(
  [
    "/makeGatacaVerificationRequestStdAndAlliance",
    `\/${constants.BASE_PATH}/makeGatacaVerificationRequestStdAndAlliance`,
    "/gataca-helper/makeGatacaVerificationRequestStdAndAlliance",
  ],
  makeGatacaVerificationRequestStdAndAllianceCtrl
);

gatacaRouter.get(
  [
    "/makeIssueOffer/:template",
    `\/${constants.BASE_PATH}/makeIssueOffer/:template`,
    "/socket.io/makeIssueOffer/:template",
    "/gataca-helper/makeIssueOffer/:template",
  ],
  makeIssuanceOffer
);

gatacaRouter.post(
  [
    "/issue",
    `\/${constants.BASE_PATH}/issue`,
    "/socket.io/issue",
    "/gataca-helper/issue",
  ],
  issueCtrl
);



// gatacaRouter.post(
//   [
//     "/issueCredential",
//     `\/${constants.BASE_PATH}/issueCredential`,
//     "/gataca-helper/issueCredential",
//   ],
//   genericIssuanceCredential
// );


// add a different end-point via which the client queries for the user data with the keycloak verificaiton session
gatacaRouter.get(
  [
    "/getUserDetails",
    `\/${constants.BASE_PATH}/getUserDetails`,
    "/gataca-helper/getUserDetails",
  ],
  getUserDetailsCtrl
);



// Export the router object as a named export
export { gatacaRouter };
