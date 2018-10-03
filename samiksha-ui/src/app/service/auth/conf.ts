export const AppConfigs = {
  app_url: "https://dev.shikshalokam.org", //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkYTJiMTA5MWVlMDE0MDQ3OTdhYjRjZDI3ODJmYTFkZCJ9.olC-mJ9JVqeeIf-eyBVYciPIIsqDm46XHbKuO1GgNG0", // api_key:
  api_base_url: "https://dev.shikshalokam.org/assessment/api/v1",
  keyCloak: {
    getAccessToken: "/auth/realms/sunbird/protocol/openid-connect/token",
    redirection_url: "http://localhost:3000/assessment/web/oauth2callback",
    logout_redirect_url:
      "http://localhost:3000/assessment/web/oauthLogoutcallback"
  },
  survey: { submission: "/submissions/make/" }
};
