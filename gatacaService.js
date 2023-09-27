import { getSessionData, setOrUpdateSessionData } from "./redisService.js";
import isJwtTokenExpired from "jwt-check-expiry";
import axios from "axios";
import consts from "./constants.js";
import { v4 as uuidv4 } from "uuid";
import { pollResult, verificationRequest } from "./utils.js";

// QR Generation
import qr from "qr-image";
import imageDataURI from "image-data-uri";
import { streamToBuffer } from "@jorgeferrero/stream-to-buffer";

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

  // return new Promise(async (res, rej) => {
  //   let basicAuthString =
  //     process.env.GATACA_APP_TICKET + ":" + process.env.GATACA_PASS_TICKET;
  //   let buff = new Buffer(basicAuthString);
  //   let base64data = buff.toString("base64");
  //   console.log(base64data);
  //   let options = {
  //     method: "POST",
  //     url: constants.GATACA_CERTIFY_URL,
  //     headers: {
  //       Authorization: `Basic ${base64data}`,
  //     },
  //   };

  //   try {
  //     // by setting the sessionId to "gataca_jwt" same as the variable this becomes a globaly accessible cached value
  //     // so all calls will use the same token until its expired
  //     let gatacaAuthToken = await getSessionData(
  //       "gataca_jwt_ticket",
  //       "gataca_jwt"
  //     );
  //     if (!gatacaAuthToken || isJwtTokenExpired.default(gatacaAuthToken)) {
  //       const gatacaTokenResponse = await axios.request(options);
  //       gatacaAuthToken = gatacaTokenResponse.headers.token;
  //       setOrUpdateSessionData(
  //         "gataca_jwt_ticket",
  //         "gataca_jwt",
  //         gatacaAuthToken
  //       );
  //     }

  //     // request verification
  //     options = {
  //       method: "POST",
  //       url: constants.GATACA_CREATE_VERIFICATION_SESSION_URL,
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `jwt ${gatacaAuthToken}`,
  //       },
  //       data: { ssiConfigId: verificationTemplate },
  //     };
  //     axios
  //       .request(options)
  //       .then(async function (response) {
  //         console.log("VERIFICATION SESSION IS:" + response.data.id);
  //         let verificationSessionId = response.data.id;
  //         let buff = new Buffer(
  //           encodeURIComponent("https://connect.gataca.io")
  //         );
  //         let base64Callbackdata = buff.toString("base64");

  //         let qrPartialData =
  //           "https://gataca.page.link/scan?session=" +
  //           verificationSessionId +
  //           "&callback=" +
  //           base64Callbackdata;

  //         let qrData =
  //           "https://gataca.page.link/?apn=com.gatacaapp&ibi=com.gataca.wallet&link=" +
  //           encodeURIComponent(qrPartialData);

  //         //   console.log(qrData);

  //         let code = qr.image(qrData, {
  //           type: "png",
  //           ec_level: "H",
  //           size: 10,
  //           margin: 10,
  //         });
  //         let mediaType = "PNG";
  //         let encodedQR = imageDataURI.encode(
  //           await streamToBuffer(code),
  //           mediaType
  //         );
  //         res({ qr: encodedQR, gatacaSession: verificationSessionId });
  //       })
  //       .catch(function (error) {
  //         console.error(error);
  //         rej({ error: error });
  //       });
  //   } catch (error) {
  //     console.error(error);
  //     rej({ error: error });
  //   }
  // });
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
  let basicAuthString;
  if (issueTemplate === "eruaID") {
    basicAuthString =
      process.env.GATACA_APP_ACADEMIC_ID +
      ":" +
      process.env.GATACA_PASS_ACADEMIC_ID;
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
    /*
              userData: {
            communityUserIdentifier: "triantafyllou.nid702ed58-b8d1-4ca5-918c-94193a10d3ec",
            givenName: "Nikos",
            familyName: "Triantafyllou",
            emailAddress: "triantafyllou.ni@aegean.gr",
          }
          userData: 
          {
            name: "Nikos",
            surname: "Triantafyllou",
            workshops: [
              "ANIMA SYROS",
            ],
          }

    */
    //credentialData=...
    console.log(userData);
    basicAuthString =
      process.env.GATACA_APP_TICKET + ":" + process.env.GATACA_PASS_TICKET;

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
    let buff = new Buffer(basicAuthString);
    let base64data = buff.toString("base64");
    let options = {
      method: "POST",
      url: constants.GATACA_CERTIFY_URL,
      headers: {
        Authorization: `Basic ${base64data}`,
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
