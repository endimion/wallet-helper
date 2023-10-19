import {
  makeGatacaVerificationRequest,
  makeGatacaVerificationRequestStdAndAlliance,
} from "../gatacaService.js";
import { getSessionData, setOrUpdateSessionData } from "../redisService.js";


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
