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
  let io = req.io;
  let pendingVerificationSessions = req.pendingVerificationSessions
    ? req.pendingVerificationSessions
    : [];
  let gataCataVerificationRequest = await makeGatacaVerificationRequest(
    req.body.verificationTemplate
  );
  let qrCode = gataCataVerificationRequest.qr;
  let deepLink = gataCataVerificationRequest.deepLink;
  let gatacaSession = gataCataVerificationRequest.gatacaSession;
  let clientWebSocketId = req.body.socketSessionId;
  let clientKeycloakVerificationSession = req.body.verificationSession;

  res.send({ qrCode: qrCode, deepLink: deepLink });

  // start polling for verification data
  try {
    let result = await pollForVerificationResultOIDC(gatacaSession);
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

export async function makeGatacaVerificationRequestTicketCtrl(req, res, next) {
  console.log("gataca.js /makeGatacaVerificationRequestTicket");
  let io = req.io;
  let pendingVerificationSessions = req.pendingVerificationSessions
    ? req.pendingVerificationSessions
    : [];
  let gataCataVerificationRequest = await makeGatacaVerificationRequestTicket(
    "TICKET_VERIFIER_ERUA" //"TICKET_Verification"
  );
  let qrCode = gataCataVerificationRequest.qr;
  let deepLink = gataCataVerificationRequest.deepLink;
  let gatacaSession = gataCataVerificationRequest.gatacaSession;
  let clientWebSocketId = req.body.socketSessionId;
  let clientKeycloakVerificationSession = req.body.verificationSession;

  res.send({ qrCode: qrCode, deepLink: deepLink });

  // start polling for verification data
  try {
    let result = await pollForTicketVerificationResultOIDC(gatacaSession);
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

//
export async function makeGatacaVerificationRequestStdAndAllianceCtrl(
  req,
  res,
  next
) {
  console.log("gataca.js /makeGatacaVerificationRequestStdAndAlliance");
  let io = req.io;
  let pendingVerificationSessions = req.pendingVerificationSessions
    ? req.pendingVerificationSessions
    : [];
  let gataCataVerificationRequest =
    await makeGatacaVerificationRequestStdAndAlliance(
      "STUDENT_AND_ALLIANCE_ID" //"TICKET_Verification"
    );
  let qrCode = gataCataVerificationRequest.qr;
  let deepLink = gataCataVerificationRequest.deepLink;
  let gatacaSession = gataCataVerificationRequest.gatacaSession;
  let clientWebSocketId = req.body.socketSessionId;
  let clientKeycloakVerificationSession = req.body.verificationSession;

  res.send({ qrCode: qrCode, deepLink: deepLink });

  // start polling for verification data
  try {
    let result = await pollForTicketVerificationResultOIDC(gatacaSession);
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
