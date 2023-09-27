import { getSessionData, setOrUpdateSessionData } from "./redisService.js";
import isJwtTokenExpired from "jwt-check-expiry";
import axios from "axios";
import consts from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import { pollResult, verificationRequest, basicAuthToken } from "./utils.js";

let constants = consts.consts;

const makeGatacaVerificationRequest = async (
  verificationTemplate //MyAcademicID_Verification
) => {
  console.log(
    "gatacaService.js makeGatacaVerificationRequest for " + verificationTemplate
  );
  console.log("pollAcademicIDVerificationResult");
  let gatacaUser = process.env.GATACA_APP_ACADEMIC_ID;
  let gatacaPass = process.env.GATACA_PASS_ACADEMIC_ID;
  let sessionTokenName = "gataca_jwt";
  return verificationRequest(
    verificationTemplate,
    gatacaUser,
    gatacaPass,
    sessionTokenName
  );
};

const makeGatacaVerificationRequestTicket = async (
  verificationTemplate //MyAcademicID_Verification
) => {
  console.log(
    "gatacaService.js /makeGatacaVerificationRequestTicket for " +
      verificationTemplate
  );
  let gatacaUser = process.env.GATACA_APP_TICKET;
  let gatacaPass = process.env.GATACA_PASS_TICKET;
  let sessionTokenName = "gataca_jwt_ticket";
  return verificationRequest(
    verificationTemplate,
    gatacaUser,
    gatacaPass,
    sessionTokenName
  );
};

const pollForVerificationResult = async (gatacaSessionId) => {
  console.log("pollAcademicIDVerificationResult");
  let gatacaUser = process.env.GATACA_APP_ACADEMIC_ID;
  let gatacaPass = process.env.GATACA_PASS_ACADEMIC_ID;
  let sessionTokenName = "gataca_jwt";
  return pollResult(gatacaSessionId, gatacaUser, gatacaPass, sessionTokenName);
};

const pollForTicketVerificationResult = async (gatacaSessionId) => {
  console.log("pollForTicketVerificationResult");
  let gatacaUser = process.env.GATACA_APP_TICKET_ERUA;
  let gatacaPass = process.env.GATACA_PASS_TICKET_ERUA;
  let sessionTokenName = "gataca_jwt_ticket_erua";
  return pollResult(gatacaSessionId, gatacaUser, gatacaPass, sessionTokenName);
};

const issueCredential = async (gatacaSessionId, userData, issueTemplate) => {
  let credentialData;
  let basicAuthStr;
  if (issueTemplate === "eruaID") {
    basicAuthStr = basicAuthToken(
      process.env.GATACA_APP_ACADEMIC_ID,
      process.env.GATACA_PASS_ACADEMIC_ID
    );
    credentialData = [
      {
        credentialSubject: {
          displayName: userData.givenName + " " + userData.familyName,
          givenName: userData.givenName,
          familyName: userData.familyName,
          emailAddress: userData.emailAddress,
          communityUserIdentifier: userData.communityUserIdentifier,
          schacHomeOrganization: userData.schacHomeOrganization,
          assurance: [
            "https://refeds",
            "https://refeds/ID/unique",
            "https://refeds/ID/eppn-unique-no-reassign",
            "https://refeds/IAP/low",
            "https://refeds$/ATP/ePA-1m",
            "https://refeds/ATP/ePA-1d",
          ],
        },
        type: ["VerifiableCredential", "myAcademicIDCredential"],
      },
    ];
  }
  if (
    issueTemplate === "workshop-ticket-ANIMA SYROS" ||
    issueTemplate === "workshop-ticket-Anima_Syros 2023"
  ) {
    // console.log(userData);
    basicAuthStr = basicAuthToken(
      process.env.GATACA_APP_TICKET,
      process.env.GATACA_PASS_TICKET
    );

    credentialData = [
      {
        credentialSubject: {
          workshopRef: [
            "urn:schac:workshopID:aegean.gr:" + uuidv4() + ":anima-syros-2023",
          ],
          display: userData.name
            ? userData.name + " " + userData.surname
            : userData.givenName + " " + userData.familyName,
          givenName: userData.name ? userData.name : userData.givenName,
          familyName: userData.surname ? userData.surname : userData.familyName,
          email: userData.emailAddress ? userData.emailAddress : userData.email,
          affiliation: userData.affiliation
            ? userData.affiliation
            : userData.schacHomeOrganization,
        },
        type: ["VerifiableCredential", "workshopTicketCredential"],
      },
    ];
  }

  return new Promise(async (res, rej) => {
    let options = {
      method: "POST",
      url: constants.GATACA_CERTIFY_URL,
      headers: {
        Authorization: `Basic ${basicAuthStr}`,
      },
    };
    let gatacaAuthToken = await getSessionData("gataca_jwt", "gataca_jwt");
    if (!gatacaAuthToken || isJwtTokenExpired.default(gatacaAuthToken)) {
      const gatacaTokenResponse = await axios.request(options);
      gatacaAuthToken = gatacaTokenResponse.headers.token;
    }

    options = {
      method: "PATCH",
      url: `https://certify.gataca.io/admin/v1/issuanceRequests/${gatacaSessionId}/credentials`,
      headers: {
        Authorization: `jwt ${gatacaAuthToken}`,
        "Content-Type": "application/json",
      },
      data: credentialData,
    };
    axios
      .request(options)
      .then(function (response) {
        // console.log(response.data);
        res(response.data);
      })
      .catch(function (error) {
        // console.error(error);
        rej(error);
      });
  });
};

export {
  makeGatacaVerificationRequest,
  pollForVerificationResult,
  issueCredential,
  pollForTicketVerificationResult,
  makeGatacaVerificationRequestTicket,
};
