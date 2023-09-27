import { getSessionData, setOrUpdateSessionData } from "./redisService.js";
import isJwtTokenExpired from "jwt-check-expiry";
import axios from "axios";
import constants from "./constants.js";

async function pollResult(gatacaSessionId, gatacaUser, gatacaPass, sessionTokenName){
    
    return new Promise((resolve, rej) => {
        let pollingIntervalId = setInterval(async () => {
          let basicAuthString =
            gatacaUser +
            ":" +
            gatacaPass;
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


export {pollResult}