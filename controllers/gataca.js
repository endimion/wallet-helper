import { getSessionData, setOrUpdateSessionData } from "../redisService.js";
import {
  issueCredential,
  pollForVerificationResultOIDC,
} from "../gatacaService.js";

import { verificationRequestOIDC, pollResultOIDC } from "../utils.js";

export async function makeGatacaVerificationRequestCtrl(req, res, next) {
  let gatacaUser = process.env.GATACA_APP_ACADEMIC_ID;
  let gatacaPass = process.env.GATACA_PASS_ACADEMIC_ID;
  // let sessionTokenName = "gataca_jwt";
  genericVerificationLogic(req, res, gatacaUser, gatacaPass, "gataca_jwt");
}

export async function makeGatacaVerificationRequestTicketCtrl(req, res, next) {
  // "TICKET_VERIFIER_ERUA"
  req.body.verificationTemplate = "TICKET_VERIFIER_ERUA";
  console.log("gataca.js /makeGatacaVerificationRequestTicket");
  let gatacaUser = process.env.GATACA_APP_TICKET;
  let gatacaPass = process.env.GATACA_PASS_TICKET;
  genericVerificationLogic(
    req,
    res,
    gatacaUser,
    gatacaPass,
    "gataca_jwt_ticket"
  );
}

//
export async function makeGatacaVerificationRequestStdAndAllianceCtrl(
  req,
  res,
  next
) {
  console.log("gataca.js /makeGatacaVerificationRequestStdAndAlliance");
  // "STUDENT_AND_ALLIANCE_ID" //"TICKET_Verification"
  req.body.verificationTemplate = "STUDENT_AND_ALLIANCE_ID";
  console.log("gataca.js /makeGatacaVerificationRequestTicket");
  let gatacaUser = process.env.GATACA_APP_STD_ALL;
  let gatacaPass = process.env.GATACA_PASS_STD_ALL;
  genericVerificationLogic(
    req,
    res,
    gatacaUser,
    gatacaPass,
    "gataca_jwt_std_all"
  );
}

export async function issueCtrl(req, res, next) {
  let gatacaSession = req.body.gatacaSession;
  let userData = req.body.userData;
  let issueTemplate = req.body.issueTemplate;
  try {
    let result = await issueCredential(gatacaSession, userData, issueTemplate);
    res.send(result);
  } catch (err) {
    res.send(err);
  }
}

export async function getUserDetailsCtrl(req, res, next) {
  let clientKeycloakVerificationSession = req.query.sessionId;
  let result = await getSessionData(
    clientKeycloakVerificationSession,
    "userData"
  );
  res.send(result);
}

export async function genericVerificationLogic(
  req,
  res,
  gatacaUser,
  gatacaPass,
  sessionTokenName
) {
  let io = req.io;
  let pendingVerificationSessions = req.pendingVerificationSessions
    ? req.pendingVerificationSessions
    : [];

  let gataCataVerificationRequest = await verificationRequestOIDC(
    req.body.verificationTemplate,
    gatacaUser,
    gatacaPass,
    sessionTokenName
  );
 
  let qrCode = gataCataVerificationRequest.qr;
  let deepLink = gataCataVerificationRequest.deepLink;
  let gatacaSession = gataCataVerificationRequest.gatacaSession;
  let clientKeycloakVerificationSession = req.body.verificationSession;

  res.send({ qrCode: qrCode, deepLink: deepLink });

  // start polling for verification data
  try {
    let result = await pollResultOIDC(
      gatacaSession,
      gatacaUser,
      gatacaPass,
      sessionTokenName
    );
    console.log("gataca.js user authenticated");
    console.log(result);
    // once data is received send notification to the webSocketSesssionId that the verification is completed
    // io.to(clientWebSocketId)
    // console.log("!!!!!gataca.js /makeGatacaVerificationRequestStdAndAlliance pendingVerificationSessions")
    const MAX_ATTEMPTS = 25;

    pendingVerificationSessions.push(clientKeycloakVerificationSession);
    let index;
    // console.log(`sesionOBJ index to be removed ${index}`);
    console.log("clientKeycloakVerificationSession");
    console.log(clientKeycloakVerificationSession);

    let counter = 0;

    const intervalId = setInterval(() => {
      index = pendingVerificationSessions.indexOf(
        clientKeycloakVerificationSession
      );
      console.log(
        "the index of session-" +
          clientKeycloakVerificationSession +
          "-is : " +
          index
      );
      counter++;
      if (index < 0 || counter > MAX_ATTEMPTS) {
        console.log(
          "the index of session-" +
            clientKeycloakVerificationSession +
            " MAX Attempts reached OR session NOT FOUND"
        );
        clearInterval(intervalId); // Stop the interval when the condition is met
      } else {
        console.log(
          "Session-" +
            clientKeycloakVerificationSession +
            "- found notifying all WS clients"
        );
        io.emit("message", {
          sessionId: clientKeycloakVerificationSession,
          status: "READY",
          message: "user authenticated",
        });
      }
    }, 2000);

    // store user data in redis under the keycloak verification session
    setOrUpdateSessionData(
      clientKeycloakVerificationSession,
      "userData",
      result
    );
  } catch (err) {
    console.log("session " + gatacaSession + " err:");
    console.log(err);
  }
}
