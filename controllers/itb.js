import {
  makeGatacaVerificationRequest,
  makeGatacaVerificationRequestStdAndAlliance,
} from "../gatacaService.js";
import { getSessionData, setOrUpdateSessionData } from "../redisService.js";
import { checkVerificationStatus } from "../utils.js";

import consts from "../constants.js";
let constants = consts.consts;

export async function credentialRequest(req, res, next) {
  console.log("controllers/itb.js /credentialRequest");
  try {
    let verificationTemplate = req.query.credentialType;
    if (
      req.query.credentialType === "academicID" ||
      req.query.credentialType === "academicId"
    ) {
      verificationTemplate = "STUDENT_AND_ALLIANCE_ID"; //"MyAcademicID_Verification";
    }
    if (!req.query.sessionId) {
      const customError = new Error("Custom Error Message");
      customError.error = {
        response: {
          data: {
            message: "sessionId is required",
          },
        },
      };

      throw customError;
    }
    let gataCataVerificationRequest =
      await makeGatacaVerificationRequestStdAndAlliance(verificationTemplate);
    let qrCode = gataCataVerificationRequest.qr;
    let gatacaSession = gataCataVerificationRequest.gatacaSession;
    setOrUpdateSessionData(
      req.query.sessionId,
      "itb-gataca-session",
      gatacaSession
    );
    res.status(200).send({ qr: qrCode, sessionId: req.query.sessionId });
  } catch (err) {
    // console.log(err);
    if (
      err.error &&
      err.error.response &&
      err.error.response.data &&
      err.error.response.data.message
    )
      res.status(500).send({ error: err.error.response.data.message });
  }
}

export async function getValidationResponse(req, res, next) {
  console.log("itb.js getValidationResponse");
  let gatacaUser = process.env.GATACA_APP_STD_ALL;
  let gatacaPass = process.env.GATACA_PASS_STD_ALL;
  let sessionTokenName = "gataca_jwt_std_all";
  let itbSession = req.query.sessionId;
  let gatacaSessionId = await getSessionData(
    req.query.sessionId,
    "itb-gataca-session"
  );
  if (gatacaSessionId) {
    try {
      let response = await checkVerificationStatus(
        gatacaSessionId,
        gatacaUser,
        gatacaPass,
        sessionTokenName,
        constants.GATACA_CHECK_VERIFICATION_STATUS_OIDC_URL
      );

      if (response.status === 200) {
        res.status(200).send({
          status: "success",
          reason: "ok",
          sessionId: req.query.sessionId,
          attributes: response.attributes,
        });
      }
      if (response.status === 202) {
        res.status(200).send({
          status: "pending",
          reason: "ok",
          sessionId: req.query.sessionId,
        });
      }
    } catch (error) {
      res.status(403).send({
        status: "fail",
        reason: error.message,
        sessionId: req.query.sessionId,
      });
    }
  } else {
    res.status(500).send({
      status: "fail",
      reason: "no verification session found",
      sessionId: req.query.sessionId,
    });
  }
}
