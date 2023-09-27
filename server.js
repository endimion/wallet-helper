import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import consts from "./constants.js";
import axios from "axios";
import dotenv from "dotenv";
import checkJWT from "jwt-check-expiry";
let constants = consts.consts;
import bodyParser from "body-parser";
import {
  issueCredential,
  makeGatacaVerificationRequest,
  pollForTicketVerificationResult,
  pollForVerificationResult,
  makeGatacaVerificationRequestTicket,
} from "./gatacaService.js";
import { getSessionData, setOrUpdateSessionData } from "./redisService.js";
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: "*/*" }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: constants.CORS_URI.split(","),
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

let isJwtTokenExpired = checkJWT.default;
// console.log(checkJWT.default)

app.use(cors()); // Enable CORS for all routes
let activeSessions = [];
let activeTicketSessions = [];
let gatacaAuthToken = null;
let gatacaAuthTokenTicket = null;

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on;

  // Listen for incoming messages
  socket.on("message", (message) => {
    // console.log("Received message:", message);
    if (message.type === constants.WS_INIT_SESSION) {
      console.log(`client started a session with Id ${message.id}`);
      activeSessions.push({
        sessionId: message.id,
        timestamp: Date.now(),
        socketId: message.socketID,
      });
    }

    // Broadcast the message to the specific client, "private message" to the specific socket ID
    // to send the message to all connected clients use io.emit("message",message)
    io.to(message.socketID).emit("message", message);
  });

  // Listen for incoming verification requests
  socket.on("message", (message) => {});

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const removeActiveSession = (activeSessions, sessionObj) => {
  // console.log(`will remove ${sessionObj}`)
  const index = activeSessions.indexOf(sessionObj);
  // console.log(`sesionOBJ index to be removed ${index}`);
  if (index > -1) {
    // only splice array when item is found
    activeSessions.splice(index, 1); // 2nd parameter means remove one item only
    // console.log(activeSessions);
    return activeSessions;
  }
};

const PORT = process.env.PORT || 5000;

app.post(
  [
    "/makeGatacaVerificationRequest",
    `\/${constants.BASE_PATH}/makeGatacaVerificationRequest`,
    "/gataca-helper/makeGatacaVerificationRequest",
  ],
  async (req, res) => {
    console.log("server.js /makeGatacaVerificationRequest")
    let gataCataVerificationRequest = await makeGatacaVerificationRequest(
      req.body.verificationTemplate
    );
    let qrCode = gataCataVerificationRequest.qr;
    let gatacaSession = gataCataVerificationRequest.gatacaSession;
    let clientWebSocketId = req.body.socketSessionId;
    let clientKeycloakVerificationSession = req.body.verificationSession;
    // start polling for verification data
    pollForVerificationResult(gatacaSession)
      .then((result) => {
        // console.log(
        //   "server.js: qr code sent to front end a while back, but now i also got the user attributes!"
        // );
        console.log("server.js user authenticated");
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
      })
      .catch((err) => {
        console.log(err);
      });
    res.send({ qrCode });
  }
);

app.post(
  [
    "/makeGatacaVerificationRequestTicket",
    `\/${constants.BASE_PATH}/makeGatacaVerificationRequestTicket`,
    "/gataca-helper/makeGatacaVerificationRequestTicket",
  ],
  async (req, res) => {
    console.log("server.js /makeGatacaVerificationRequestTicket")
    let gataCataVerificationRequest = await makeGatacaVerificationRequestTicket(
      "TICKET_VERIFIER_ERUA"//"TICKET_Verification"
    );
    let qrCode = gataCataVerificationRequest.qr;
    let gatacaSession = gataCataVerificationRequest.gatacaSession;
    let clientWebSocketId = req.body.socketSessionId;
    let clientKeycloakVerificationSession = req.body.verificationSession;

    res.send({ qrCode });

    // start polling for verification data
    try {
      let result = await pollForTicketVerificationResult(gatacaSession);
      console.log("server.js user authenticated");
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
);

// add a different end-point via which the client queries for the user data with the keycloak verificaiton session
app.get(
  [
    "/getUserDetails",
    `\/${constants.BASE_PATH}/getUserDetails`,
    "/gataca-helper/getUserDetails",
  ],
  async (req, res) => {
    let clientKeycloakVerificationSession = req.query.sessionId;
    let result = await getSessionData(
      clientKeycloakVerificationSession,
      "userData"
    );
    res.send(result);
  }
);

// issue a credential
app.post(
  [
    "/issue",
    `\/${constants.BASE_PATH}/issue`,
    "/socket.io/issue",
    "/gataca-helper/issue",
  ],
  async (req, res) => {
    let gatacaSession = req.body.gatacaSession;
    let userData = req.body.userData;
    let issueTemplate = req.body.issueTemplate;
    let result = await issueCredential(gatacaSession, userData, issueTemplate);
    res.send(result);
  }
);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  //check if a the user completed the session
  setInterval(() => {
    if (activeSessions) {
      activeSessions.forEach(async (sessionObj) => {
        let basicAuthString =
          process.env.GATACA_APP_GENERIC + ":" + process.env.GATACA_PASS_GENERIC;
        let buff = new Buffer(basicAuthString);
        let base64data = buff.toString("base64");
        let options = {
          method: "POST",
          url: constants.GATACA_CERTIFY_URL,
          headers: {
            Authorization: `Basic ${base64data}`,
          },
        };
        if (!gatacaAuthToken || isJwtTokenExpired(gatacaAuthToken)) {
          console.log("will get a new GATACA API tokent");
          const gatacaTokenResponse = await axios.request(options);
          gatacaAuthToken = gatacaTokenResponse.headers.token;
        }

        options = {
          method: "GET",
          url: `${constants.GATACA_CHECK_ISSUE_STATUS_URL}/${sessionObj.sessionId}`,
          headers: {
            Authorization: `jwt ${gatacaAuthToken}`,
            "Content-Type": "application/json",
          },
        };

        axios
          .request(options)
          .then(function (response) {
            // console.log(`check status response.data`);
            // console.log(response.data);
            //TODO change this to READY for production
            if (response.data.status === "READY") {
              activeSessions = removeActiveSession(activeSessions, sessionObj);
              // send the message to the specific client (private message)
              io.to(sessionObj.socketId).emit("message", {
                sessionId: sessionObj.sessionId,
                status: "READY",
                message: "credential Issued",
              });
            }
          })
          .catch(async function (error) {
            // console.log(error.response);
            console.log("Error getting " + sessionObj.sessionId);
            if (error.response && error.response.status === 404) {
              console.log(
                "got 404 will remove session " + sessionObj.sessionId
              );
              if (activeSessions) {
                activeSessions = removeActiveSession(
                  activeSessions,
                  sessionObj
                );
                console.log(activeSessions);
              }
            }

            //TRY if this is a ticket
            try {
              basicAuthString =
                process.env.GATACA_APP_TICKET +
                ":" +
                process.env.GATACA_PASS_TICKET;
              let buff = new Buffer(basicAuthString);
              let base64data = buff.toString("base64");
              let options = {
                method: "POST",
                url: constants.GATACA_CERTIFY_URL,
                headers: {
                  Authorization: `Basic ${base64data}`,
                },
              };
              if (
                !gatacaAuthTokenTicket ||
                isJwtTokenExpired(gatacaAuthTokenTicket)
              ) {
                console.log("will get a new GATACA API tokent for TICKET");
                const gatacaTokenResponse = await axios.request(options);
                gatacaAuthTokenTicket = gatacaTokenResponse.headers.token;
              }

              options = {
                method: "GET",
                url: `${constants.GATACA_CHECK_ISSUE_STATUS_URL}/${sessionObj.sessionId}`,
                headers: {
                  Authorization: `jwt ${gatacaAuthTokenTicket}`,
                  "Content-Type": "application/json",
                },
              };

              axios.request(options).then(function (response) {
                if (response.data.status === "READY") {
                  activeTicketSessions = removeActiveSession(
                    activeTicketSessions,
                    sessionObj
                  );
                  // send the message to the specific client (private message)
                  io.to(sessionObj.socketId).emit("message", {
                    sessionId: sessionObj.sessionId,
                    status: "READY",
                    message: "credential Issued",
                  });
                }
              });
            } catch (err) {
              console.log("ERRIR");
            }
          });
      });
    } else {
      console.log("activeSessions");
      console.log(activeSessions);
      activeSessions = [];
    }
  }, 3000);
});
