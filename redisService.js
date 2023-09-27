import consts from "./constants.js";
let constants = consts.consts;
import Redis from "redis";
import { createClient } from "redis";

let _client = null;

const DEFAULT_EXPIRATION = 300;

async function getClient() {
  if (_client === null) {
    let redisUrl = constants.REDIS;
    // console.log("redisService.js redisURL is: " + redisUrl);
    _client = createClient({
      url: `redis://${redisUrl}:6379`,
      legacyMode: true,
    });

    _client.on("error", (err) => console.log("Redis Client Error", err));
    await _client.connect();
    //   await _client.connect();
  }

  return _client;
}

const setOrUpdateSessionData = async (
  sessionId,
  variableName,
  variableValue
) => {
  let client = await getClient();
  let cacheObject = {
    [variableName]: variableValue,
  };
  let existingObject = JSON.parse(await getSessionData(sessionId));
  if (existingObject) {
    existingObject[variableName] = variableValue;
    await client.setex(
      sessionId,
      DEFAULT_EXPIRATION,
      JSON.stringify(existingObject)
    );
  } else {
    await client.setex(
      sessionId,
      DEFAULT_EXPIRATION,
      JSON.stringify(cacheObject)
    );
  }
};

const getSessionData = async (sessionId, variableName = null) => {
  return new Promise(async (resolve, reject) => {
    let client = await getClient();
    client.get(sessionId, (error, data) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        if (variableName !== null) {
          try {
            let valueAsObject = JSON.parse(data);
            if (valueAsObject == null) resolve(null);
            else resolve(valueAsObject[variableName]);
          } catch (err) {
            reject(err);
          }
        } else {
          resolve(data);
        }
      }
    });
  });
};

export { getSessionData, setOrUpdateSessionData };
