import { getSessionData, setOrUpdateSessionData } from "./redisService.js";
import isJwtTokenExpired from "jwt-check-expiry";
import axios from "axios";
import consts from "./constants.js";
import qr from "qr-image";
import imageDataURI from "image-data-uri";
import { streamToBuffer } from "@jorgeferrero/stream-to-buffer";

let constants = consts.consts;

function basicAuthToken(gatacaUser, gatacaPass) {
  let basicAuthString = gatacaUser + ":" + gatacaPass;
  let buff = new Buffer(basicAuthString);
  return buff.toString("base64");
}

async function pollResultCore(
  gatacaSessionId,
  gatacaUser,
  gatacaPass,
  sessionTokenName,
  checkVerificationSessionURL
) {
  return new Promise((resolve, rej) => {
    let pollingIntervalId = setInterval(async () => {
      let options = {
        method: "POST",
        url: constants.GATACA_CERTIFY_URL,
        headers: {
          Authorization: `Basic ${basicAuthToken(gatacaUser, gatacaPass)}`,
        },
      };
      let gatacaAuthToken = await getSessionData(
        sessionTokenName,
        "gataca_jwt"
      );
      if (!gatacaAuthToken || isJwtTokenExpired.default(gatacaAuthToken)) {
        try {
          const gatacaTokenResponse = await axios.request(options);
          gatacaAuthToken = gatacaTokenResponse.headers.token;
          setOrUpdateSessionData(
            sessionTokenName,
            "gataca_jwt",
            gatacaAuthToken
          );
        } catch (error) {
          console.log("GATACA BASIC AUTH ERROR");
          if (error.response && error.response.data)
            console.log(error.response.data);
          clearInterval(pollingIntervalId);
          rej(error);
        }
      }

      options = {
        method: "GET",
        url: `${checkVerificationSessionURL}/${gatacaSessionId}`,
        headers: {
          Authorization: `jwt ${gatacaAuthToken}`,
          "Content-Type": "application/json",
        },
      };

      axios
        .request(options)
        .then(function (response) {
          console.log(
            `utils.js pollResult:: check verification status result for session ${gatacaSessionId}`
          );
          if (response.status === 200 && response.data) {
            // console.log("VP response!!!");
            // console.log(response.data);

            let credentialsPresented =
              response.data.PresentationSubmission.verifiableCredential; //response.data.data.verifiableCredential; // this is an array
            // console.log(credentialsPresented);
            let allAttributesOfUser = {};
            credentialsPresented.forEach((cred) => {
              for (var name in cred.credentialSubject) {
                // console.log(name + "=" + valuesJSON[name]);
                if (name !== "id") {
                  allAttributesOfUser[name] = cred.credentialSubject[name];
                }
              }
            });
            clearInterval(pollingIntervalId);
            resolve(allAttributesOfUser);
          } else {
            if (response.status === 204 || response.status === 202)
              console.log("no ready");
            else {
              clearInterval(pollingIntervalId);
              rej("errror2");
            }
          }
        })
        .catch(function (error) {
          console.log("ERROR2");
          if (error.response && error.response.data)
            console.log(error.response.data);
          clearInterval(pollingIntervalId);
          rej(error);
        });
    }, 3000);

    //sto pollin after 2 minutes for specific sesionId
    setTimeout(() => {
      clearInterval(pollingIntervalId);
      console.log("will stop polling for " + gatacaSessionId);
      rej("timeout 2 mins");
    }, 120000);
  });
}

//TODO Refactor this with the rest of the polling functions
// there is repetition here....
async function checkVerificationStatus(
  gatacaSessionId,
  gatacaUser,
  gatacaPass,
  sessionTokenName,
  checkVerificationSessionURL
) {
  return new Promise(async (resolve, rej) => {
    let options = {
      method: "POST",
      url: constants.GATACA_CERTIFY_URL,
      headers: {
        Authorization: `Basic ${basicAuthToken(gatacaUser, gatacaPass)}`,
      },
    };
    let gatacaAuthToken = await getSessionData(sessionTokenName, "gataca_jwt");
    if (!gatacaAuthToken || isJwtTokenExpired.default(gatacaAuthToken)) {
      try {
        const gatacaTokenResponse = await axios.request(options);
        gatacaAuthToken = gatacaTokenResponse.headers.token;
        setOrUpdateSessionData(sessionTokenName, "gataca_jwt", gatacaAuthToken);
      } catch (error) {
        console.log("GATACA BASIC AUTH ERROR");
        if (error.response && error.response.data)
          console.log(error.response.data);

        rej(error);
      }
    }

    options = {
      method: "GET",
      url: `${checkVerificationSessionURL}/${gatacaSessionId}`,
      headers: {
        Authorization: `jwt ${gatacaAuthToken}`,
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then(function (response) {
        console.log(
          `utils.js pollResult:: check verification status result for session ${gatacaSessionId}`
        );
        if (response.status === 200 && response.data) {
          let credentialsPresented =
            response.data.PresentationSubmission.verifiableCredential; //response.data.data.verifiableCredential; // this is an array
          // console.log(credentialsPresented);
          let allAttributesOfUser = {};
          credentialsPresented.forEach((cred) => {
            for (var name in cred.credentialSubject) {
              // console.log(name + "=" + valuesJSON[name]);
              if (name !== "id") {
                allAttributesOfUser[name] = cred.credentialSubject[name];
              }
            }
          });
          resolve({ status: 200, attributes: allAttributesOfUser });
        } else {
          if (response.status === 204 || response.status === 202) {
            console.log("no ready");
            resolve({ status: 202 });
          } else {
            rej({
              status: 500,
              message:
                "verificaiton response not 204 or 202 or 200, instead " +
                response.status,
            });
          }
        }
      })
      .catch(function (error) {
        console.log("ERROR2");
        if (error.response && error.response.data) {
          rej({ status: 500, message: error.response.data });
        }
        rej({ status: 500, message: error });
      });
  });
}

async function pollResult(
  gatacaSessionId,
  gatacaUser,
  gatacaPass,
  sessionTokenName
) {
  return pollResultCore(
    gatacaSessionId,
    gatacaUser,
    gatacaPass,
    sessionTokenName,
    constants.GATACA_CHECK_VERIFICATION_STATUS_URL
  );
}

async function verificationRequest(
  verificationTemplate,
  gatacaUser,
  gatacaPass,
  sessionTokenName
) {
  return new Promise(async (res, rej) => {
    let options = {
      method: "POST",
      url: constants.GATACA_CERTIFY_URL,
      headers: {
        Authorization: `Basic ${basicAuthToken(gatacaUser, gatacaPass)}`,
      },
    };

    try {
      // by setting the sessionId to "gataca_jwt" same as the variable this becomes a globaly accessible cached value
      // so all calls will use the same token until its expired
      let gatacaAuthToken = await getSessionData(
        sessionTokenName,
        "gataca_jwt"
      );
      if (!gatacaAuthToken || isJwtTokenExpired.default(gatacaAuthToken)) {
        const gatacaTokenResponse = await axios.request(options);
        gatacaAuthToken = gatacaTokenResponse.headers.token;
        setOrUpdateSessionData(sessionTokenName, "gataca_jwt", gatacaAuthToken);
      }

      // request verification
      options = {
        method: "POST",
        url: constants.GATACA_CREATE_VERIFICATION_SESSION_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `jwt ${gatacaAuthToken}`,
        },
        data: { ssiConfigId: verificationTemplate },
      };
      axios
        .request(options)
        .then(async function (response) {
          console.log("VERIFICATION SESSION IS:" + response.data.id);
          let verificationSessionId = response.data.id;
          let buff = new Buffer(
            encodeURIComponent("https://connect.gataca.io")
          );
          let base64Callbackdata = buff.toString("base64");

          let qrPartialData =
            "https://gataca.page.link/scan?session=" +
            verificationSessionId +
            "&callback=" +
            base64Callbackdata;

          let qrData =
            "https://gataca.page.link/?apn=com.gatacaapp&ibi=com.gataca.wallet&link=" +
            encodeURIComponent(qrPartialData);

          //   console.log(qrData);

          let code = qr.image(qrData, {
            type: "png",
            ec_level: "H",
            size: 10,
            margin: 10,
          });
          let mediaType = "PNG";
          let encodedQR = imageDataURI.encode(
            await streamToBuffer(code),
            mediaType
          );
          res({ qr: encodedQR, gatacaSession: verificationSessionId });
        })
        .catch(function (error) {
          console.error(error);
          rej({ error: error });
        });
    } catch (error) {
      console.error(error);
      rej({ error: error });
    }
  });
}

async function verificationRequestOIDC(
  verificationTemplate,
  gatacaUser,
  gatacaPass,
  sessionTokenName
) {
  console.log("verificationRequestOIDC");
  console.log(gatacaPass + " " + gatacaUser + " " + sessionTokenName);

  return new Promise(async (res, rej) => {
    let options = {
      method: "POST",
      url: constants.GATACA_CERTIFY_URL,
      headers: {
        Authorization: `Basic ${basicAuthToken(gatacaUser, gatacaPass)}`,
      },
    };

    try {
      // by setting the sessionId to "gataca_jwt" same as the variable this becomes a globaly accessible cached value
      // so all calls will use the same token until its expired
      let gatacaAuthToken = await getSessionData(
        sessionTokenName,
        "gataca_jwt"
      );
      if (!gatacaAuthToken || isJwtTokenExpired.default(gatacaAuthToken)) {
        const gatacaTokenResponse = await axios.request(options);
        gatacaAuthToken = gatacaTokenResponse.headers.token;
        setOrUpdateSessionData(sessionTokenName, "gataca_jwt", gatacaAuthToken);
      }

      // request verification
      options = {
        method: "POST",
        url: constants.GATACA_CREATE_OIDC_VERIFICATION_SESSION_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `jwt ${gatacaAuthToken}`,
        },
        data: { ssiConfigId: verificationTemplate },
      };
      axios
        .request(options)
        .then(async function (response) {
          if (!response.data) rej("no data returned!");
          response = response.data;
          if (!response.presentation_definition) rej("no session returned!");
          // console.log(response.presentation_definition);
          let verificationSessionId = response.presentation_definition.id;
          console.log("OIDC VERIFICATION SESSION IS:" + verificationSessionId);
          if (!response.authentication_request)
            rej("no oidc auth string returned");
          let qrData = response.authentication_request;
          let code = qr.image(qrData, {
            type: "png",
            ec_level: "H",
            size: 10,
            margin: 10,
          });
          let mediaType = "PNG";
          let encodedQR = imageDataURI.encode(
            await streamToBuffer(code),
            mediaType
          );
          res({
            qr: encodedQR,
            deepLink: response.authentication_request,
            gatacaSession: verificationSessionId,
          });
        })
        .catch(function (error) {
          console.error(error);
          rej({ error: error });
        });
    } catch (error) {
      console.error(error);
      rej({ error: error });
    }
  });
}

async function pollResultOIDC(
  gatacaSessionId,
  gatacaUser,
  gatacaPass,
  sessionTokenName
) {
  return pollResultCore(
    gatacaSessionId,
    gatacaUser,
    gatacaPass,
    sessionTokenName,
    constants.GATACA_CHECK_VERIFICATION_STATUS_OIDC_URL
  );
}

export {
  pollResult,
  verificationRequest,
  basicAuthToken,
  verificationRequestOIDC,
  pollResultOIDC,
  checkVerificationStatus,
};
