import { getSessionData, setOrUpdateSessionData } from "./redisService.js";
import isJwtTokenExpired from "jwt-check-expiry";
import axios from "axios";
import consts from "./constants.js";

let constants = consts.consts;

async function pollResult(
  gatacaSessionId,
  gatacaUser,
  gatacaPass,
  sessionTokenName
) {
  return new Promise((resolve, rej) => {
    let pollingIntervalId = setInterval(async () => {
      let basicAuthString = gatacaUser + ":" + gatacaPass;
      let buff = new Buffer(basicAuthString);
      let base64data = buff.toString("base64");
      let options = {
        method: "POST",
        url: constants.GATACA_CERTIFY_URL,
        headers: {
          Authorization: `Basic ${base64data}`,
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
            console.log(error.response).data;
          clearInterval(pollingIntervalId);
          rej(error);
        }
      }

      options = {
        method: "GET",
        url: `${constants.GATACA_CHECK_VERIFICATION_STATUS_URL}/${gatacaSessionId}`,
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
            // console.log(response.data);
            let credentialsPresented = response.data.data.verifiableCredential; // this is an array
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
            if (response.status === 204) console.log("no ready");
            else {
              clearInterval(pollingIntervalId);
              rej("errror2");
            }
          }
        })
        .catch(function (error) {
          console.log("ERROR2");
          if (error.response && error.response.data)
            console.log(error.response).data;
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

async function verificationRequest(
  verificationTemplate,
  gatacaUser,
  gatacaPass,
  sessionTokenName
) {
  return new Promise(async (res, rej) => {
    let basicAuthString = gatacaUser + ":" + gatacaPass;
    let buff = new Buffer(basicAuthString);
    let base64data = buff.toString("base64");
    console.log(base64data);
    let options = {
      method: "POST",
      url: constants.GATACA_CERTIFY_URL,
      headers: {
        Authorization: `Basic ${base64data}`,
      },
    };

    try {
      // by setting the sessionId to "gataca_jwt" same as the variable this becomes a globaly accessible cached value
      // so all calls will use the same token until its expired
      let gatacaAuthToken = await getSessionData(sessionTokenName, "gataca_jwt");
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

export { pollResult, verificationRequest };
