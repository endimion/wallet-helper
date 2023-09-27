export default {
  consts: {
    GATACA_CERTIFY_URL: "https://nucleus.gataca.io/admin/v1/api_keys/login",
    GATACA_CHECK_ISSUE_STATUS_URL:
      "https://certify.gataca.io/admin/v1/issuanceRequests",
    WS_INIT_SESSION: "start-session",
    CORS_URI: process.env.CORS_URI
      ? process.env.CORS_URI
      :  "http://localhost:5030,http://localhost,http://localhost:8081",
    REDIS: process.env.REDIS ? process.env.REDIS : "localhost",
    GATACA_CREATE_VERIFICATION_SESSION_URL: "https://connect.gataca.io/api/v1/sessions",
    GATACA_CHECK_VERIFICATION_STATUS_URL: "https://connect.gataca.io/api/v1/sessions",
    BASE_PATH:process.env.BASE_PATH ? process.env.BASE_PATH : ""
  },
};
