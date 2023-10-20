import { getSessionData, setOrUpdateSessionData } from "../redisService.js";
import {
  issueCredential,
  makeGatacaVerificationRequest,
  pollForTicketVerificationResultOIDC,
  pollForVerificationResultOIDC,
  makeGatacaVerificationRequestTicket,
  makeGatacaVerificationRequestStdAndAlliance,
} from "../gatacaService.js";

export async function makeGatacaVerificationRequestCtrl(req, res, next) {
  console.log("gataca.js makeGatacaVerificationRequest");

  let io = req.io;
  let gataCataVerificationRequest = await makeGatacaVerificationRequest(
    req.body.verificationTemplate
  );
  let qrCode = gataCataVerificationRequest.qr;
  let gatacaSession = gataCataVerificationRequest.gatacaSession;
  let clientWebSocketId = req.body.socketSessionId;
  let clientKeycloakVerificationSession = req.body.verificationSession;
  // start polling for verification data
  pollForVerificationResultOIDC(gatacaSession)
    .then((result) => {
      console.log("gataca.js user authenticated");
      // once data is received send notification to the webSocketSesssionId that the verification is completed
      io.to(clientWebSocketId).emit("message", {
        sessionId: clientKeycloakVerificationSession,
        status: "READY",
        message: "user authenticated",
      });
      // store user data in redis under the keycloak verification session
      setOrUpdateSessionData(
        clientKeycloakVerificationSession,
        "userData",
        result
      );
    })
    .catch((err) => {
      console.log(err);
    });
  res.send({ qrCode });
}

export async function makeGatacaVerificationRequestTicketCtrl(req, res, next) {
  console.log("gataca.js /makeGatacaVerificationRequestTicket");
  let gataCataVerificationRequest = await makeGatacaVerificationRequestTicket(
    "TICKET_VERIFIER_ERUA" //"TICKET_Verification"
  );
  let io = req.io;
  let qrCode = gataCataVerificationRequest.qr;
  let gatacaSession = gataCataVerificationRequest.gatacaSession;
  let clientWebSocketId = req.body.socketSessionId;
  let clientKeycloakVerificationSession = req.body.verificationSession;

  res.send({ qrCode });

  // start polling for verification data
  try {
    let result = await pollForTicketVerificationResultOIDC(gatacaSession);
    console.log("gataca.js user authenticated");
    // console.log(result);
    // once data is received send notification to the webSocketSesssionId that the verification is completed
    io.to(clientWebSocketId).emit("message", {
      sessionId: clientKeycloakVerificationSession,
      status: "READY",
      message: "user authenticated",
    });
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


// 
export async function makeGatacaVerificationRequestStdAndAllianceCtrl(req, res, next) {
    console.log("gataca.js /makeGatacaVerificationRequestStdAndAlliance");
    let io = req.io
    let gataCataVerificationRequest =
      await makeGatacaVerificationRequestStdAndAlliance(
        "STUDENT_AND_ALLIANCE_ID" //"TICKET_Verification"
      );
    let qrCode = gataCataVerificationRequest.qr;
    let gatacaSession = gataCataVerificationRequest.gatacaSession;
    let clientWebSocketId = req.body.socketSessionId;
    let clientKeycloakVerificationSession = req.body.verificationSession;

    res.send({ qrCode });

    // start polling for verification data
    try {
      let result = await pollForTicketVerificationResultOIDC(gatacaSession);
      console.log("gataca.js user authenticated");
      console.log(result);
      // once data is received send notification to the webSocketSesssionId that the verification is completed
      io.to(clientWebSocketId).emit("message", {
        sessionId: clientKeycloakVerificationSession,
        status: "READY",
        message: "user authenticated",
      });
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






export async function issueCtrl(req, res, next) {
    let gatacaSession = req.body.gatacaSession;
    let userData = req.body.userData;
    let issueTemplate = req.body.issueTemplate;
    try {
      let result = await issueCredential(
        gatacaSession,
        userData,
        issueTemplate
      );
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