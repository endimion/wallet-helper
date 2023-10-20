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
  pollForTicketVerificationResultOIDC,
  pollForVerificationResultOIDC,
  makeGatacaVerificationRequestTicket,
  makeGatacaVerificationRequestStdAndAlliance,
} from "./gatacaService.js";
import { getSessionData, setOrUpdateSessionData } from "./redisService.js";
import  {itbRouter}  from "./routes/itbRoutes.js"
import {gatacaRouter} from "./routes/gatacaRoutes.js"
dotenv.config();
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';


const app = express();
const openApiOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ITB open api',
      version: '1.0.0',
    },
  },
  apis: ['./routes/itbRoutes.js'],
};
const specs = swaggerJsdoc(openApiOptions);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: constants.CORS_URI.split(","),
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: "*/*" }));
/* ***************      */
app.use(['/api-docs', "/gataca-helper/api-docs"], swaggerUi.serve, swaggerUi.setup(specs));
app.use( ['/itb', "/gataca-helper/itb" ], itbRouter); //to use the routes
app.use("/", (req, res, next) => {
  // Attach your object to the req object
  req.io = io;
  next(); // Move to the next middleware or route
},gatacaRouter )

 


let isJwtTokenExpired = checkJWT.default;
// console.log(checkJWT.default)

app.use(cors()); // Enable CORS for all routes
let activeSessionsAcademicID = [];
let activeTicketSessions = [];
let activeStudentIDSessions = [];
let gatacaAuthToken = null;
let gatacaAuthTokenTicket = null;
let gatacaAuthStudent = null;

io.on("connection", (socket) => {
  console.log("A user connected");

  // socket.on;

  // Listen for incoming messages
  // TODO when a client opens a session this way is it only an issuance session??
  socket.on("message", (message) => {
    console.log("Received message:", message);
    if (message.type === constants.WS_INIT_SESSION) {
      console.log(`client started a session with Id ${message.id}`);
      if (
        message.credential === "Student_ID" ||
        message.credential === "Alliance_ID"
      ) {
        activeStudentIDSessions.push({
          sessionId: message.id,
          timestamp: Date.now(),
          socketId: message.socketID,
        });
      }
      if (
        message.credential === "Academic_ID" ||
        message.credential === "eruaID"
      ) {
        activeSessionsAcademicID.push({
          sessionId: message.id,
          timestamp: Date.now(),
          socketId: message.socketID,
        });
      }
      if (
        message.credential === "Workshop_Ticket" ||
        message.credential === "workshop-ticket-Anima_Syros 2023"
      ) {
        activeTicketSessions.push({
          sessionId: message.id,
          timestamp: Date.now(),
          socketId: message.socketID,
        });
      }
    }

    // Broadcast the message to the specific client, "private message" to the specific socket ID
    // to send the message to all connected clients use io.emit("message",message)
    io.to(message.socketID).emit("message", message);
  });

  socket.on("message", (message) => {});

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const removeActiveSession = (activeSessions, sessionObj) => {
  if (!activeSessions) return [];
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

 











function isGatacaSessionExpired(sessionObject) {
  // Calculate the current time
  const currentTime = Date.now();
  // Calculate the time difference in milliseconds
  const timeDifference = currentTime - sessionObject.timestamp;

  // Convert the time difference to minutes
  const minutesDifference = timeDifference / (1000 * 60); // 1000 milliseconds in a second, 60 seconds in a minute

  // Check if it has been 2 minutes or more
  if (minutesDifference >= 2) {
    console.log("It has been 2 minutes or more since the timestamp.");
    return true;
  }
  console.log("It has not been 2 minutes since the timestamp.");
  return false;
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  //TODO refactor these "try" into functions
  //check if a the user completed the session
  setInterval(async () => {
    if (activeStudentIDSessions && activeStudentIDSessions.length > 0) {
      //TRY with STUDENT_ID
      activeStudentIDSessions.forEach(async (sessionObj) => {
        if (!isGatacaSessionExpired(sessionObj)) {
          try {
            let basicAuthStringStudent =
              process.env.GATACA_APP_STUDENT_ID +
              ":" +
              process.env.GATACA_PASS_STUDENT_ID;
            let buff = new Buffer(basicAuthStringStudent);
            let base64data = buff.toString("base64");
            let options = {
              method: "POST",
              url: constants.GATACA_CERTIFY_URL,
              headers: {
                Authorization: `Basic ${base64data}`,
              },
            };
            if (!gatacaAuthStudent || isJwtTokenExpired(gatacaAuthStudent)) {
              console.log("will get a new GATACA API tokent for STUDENT_ID");
              const gatacaTokenResponse = await axios.request(options);
              gatacaAuthStudent = gatacaTokenResponse.headers.token;
            }

            options = {
              method: "GET",
              url: `${constants.GATACA_CHECK_ISSUE_STATUS_URL}/${sessionObj.sessionId}`,
              headers: {
                Authorization: `jwt ${gatacaAuthStudent}`,
                "Content-Type": "application/json",
              },
            };

            axios
              .request(options)
              .then(function (response) {
                if (response.data.status === "READY") {
                  activeStudentIDSessions = removeActiveSession(
                    activeStudentIDSessions,
                    sessionObj
                  );
                  // send the message to the specific client (private message)
                  io.to(sessionObj.socketId).emit("message", {
                    sessionId: sessionObj.sessionId,
                    status: "READY",
                    message: "credential Issued",
                  });
                }
              })
              .catch((err) => {
                console.log("Error checking session with STUDENT_ID");
                if (err.response) console.log(err.response.data);
                else console.log(err);
                if (
                  (err.response && err.response.status === 404) ||
                  err.response.status === 403
                ) {
                  console.log(
                    "got " +
                      err.response.status +
                      "will remove session " +
                      sessionObj.sessionId
                  );
                  if (activeStudentIDSessions) {
                    activeStudentIDSessions = removeActiveSession(
                      activeStudentIDSessions,
                      sessionObj
                    );
                    console.log("studentID sessions");
                    console.log(activeStudentIDSessions);
                  }
                }
              });
          } catch (err) {
            console.log(err.response ? err.response : err);
            console.log("ERRIR2");
            activeStudentIDSessions = removeActiveSession(
              activeStudentIDSessions,
              sessionObj
            );
            console.log("Ticket sessions");
            console.log(activeTicketSessions);
          }
        } else {
          activeStudentIDSessions = removeActiveSession(
            activeStudentIDSessions,
            sessionObj
          );
        }
      });
    }

    //check tickets
    if (activeTicketSessions && activeTicketSessions.length > 0) {
      activeTicketSessions.forEach(async (sessionObj) => {
        if (!isGatacaSessionExpired(sessionObj)) {
          //TRY if this is a ticket
          try {
            let basicAuthStringTicket =
              process.env.GATACA_APP_TICKET +
              ":" +
              process.env.GATACA_PASS_TICKET;
            let buff = new Buffer(basicAuthStringTicket);
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

            axios
              .request(options)
              .then(function (response) {
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
              })
              .catch((err) => {
                console.log("Error checking session with Ticket");
                if (err.response) console.log(err.response.data);
                else console.log(err);
                if (
                  (err.response && err.response.status === 404) ||
                  err.response.status === 403
                ) {
                  console.log(
                    "got " +
                      err.response.status +
                      "will remove session " +
                      sessionObj.sessionId
                  );
                  if (activeTicketSessions) {
                    activeTicketSessions = removeActiveSession(
                      activeTicketSessions,
                      sessionObj
                    );
                    console.log("Ticket sessions");
                    console.log(activeTicketSessions);
                  }
                }
              });
          } catch (err) {
            // console.log(err)
            console.log(err.response ? err.response : err);
            console.log("ERRIR");
            activeTicketSessions = removeActiveSession(
              activeTicketSessions,
              sessionObj
            );
            console.log("Ticket sessions");
            console.log(activeTicketSessions);
          }
        } else {
          activeTicketSessions = removeActiveSession(
            activeTicketSessions,
            sessionObj
          );
        }
      });
    }

    if (activeSessionsAcademicID && activeSessionsAcademicID.length > 0) {
      activeSessionsAcademicID.forEach(async (sessionObj) => {
        if (!isGatacaSessionExpired(sessionObj)) {
          //try academic_ID
          let basicAuthStringAcad =
            process.env.GATACA_APP_GENERIC +
            ":" +
            process.env.GATACA_PASS_GENERIC;
          let buff = new Buffer(basicAuthStringAcad);
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
              console.log(
                `check status response.data for ` + sessionObj.sessionId
              );
              console.log(response.data.status);
              if (response.data.status === "READY") {
                activeSessionsAcademicID = removeActiveSession(
                  activeSessionsAcademicID,
                  sessionObj
                );
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
              if (
                error.response &&
                (error.response.status === 404 || error.response.status === 403)
              ) {
                console.log(
                  "got 404 will remove session " + sessionObj.sessionId
                );
                if (activeSessionsAcademicID) {
                  activeSessionsAcademicID = removeActiveSession(
                    activeSessionsAcademicID,
                    sessionObj
                  );
                  console.log(activeSessionsAcademicID);
                }
              }
            });
        } else {
          activeSessionsAcademicID = removeActiveSession(
            activeSessionsAcademicID,
            sessionObj
          );
        }
      });
    }
  }, 3000);
});
