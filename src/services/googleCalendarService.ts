declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const CLIENT_ID = "YOUR_CLIENT_ID";
const API_KEY = "YOUR_API_KEY";

const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

const SCOPES = "https://www.googleapis.com/auth/calendar";

let accessToken: string | null = null;

export const initGoogle = () =>
  new Promise((resolve) => {
    window.gapi.load("client", async () => {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
      resolve(true);
    });
  });

export const connectGoogle = () => {
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse: any) => {
      accessToken = tokenResponse.access_token;
      window.gapi.client.setToken(tokenResponse);
      localStorage.setItem("google_access_token", accessToken!);
    },
  });

  tokenClient.requestAccessToken();
};

export const restoreSession = () => {
  const token = localStorage.getItem("google_access_token");
  if (token) {
    accessToken = token;
    window.gapi.client.setToken({ access_token: token });
  }
};

export const createEvent = async (event: any) => {
  if (!accessToken) throw new Error("Not connected to Google");

  return window.gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });
};