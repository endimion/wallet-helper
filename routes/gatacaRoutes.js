import express from "express";
const gatacaRouter = express.Router();
import {
  makeGatacaVerificationRequestCtrl,
  makeGatacaVerificationRequestTicketCtrl,
  makeGatacaVerificationRequestStdAndAllianceCtrl,
  issueCtrl,
  getUserDetailsCtrl,
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

gatacaRouter.post(
  [
    "/issue",
    `\/${constants.BASE_PATH}/issue`,
    "/socket.io/issue",
    "/gataca-helper/issue",
  ],
  issueCtrl
);

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
