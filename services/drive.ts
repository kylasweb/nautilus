
import { DriveFile } from '../types';

// TODO: REPLACE THESE WITH YOUR ACTUAL CREDENTIALS FROM GOOGLE CLOUD CONSOLE
const CLIENT_ID = '65053647074-hpll66c6hsd3121c4nkrqatk6f069u5m.apps.googleusercontent.com'; // e.g., "123456789-abc...apps.googleusercontent.com"
const API_KEY = 'AIzaSyBTkn6jmocTo-caCEnyOgd4RiHv87QsstI';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
// Track the reject function of the pending auth request
let pendingReject: ((reason?: any) => void) | null = null;

export const initGapiClient = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
        window.gapi.load('client', async () => {
            try {
                await window.gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });
                gapiInited = true;
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    } else {
        reject("Google API Script not loaded");
    }
  });
};

export const initGisClient = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.google) {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later in requestAccessToken
                error_callback: (error: any) => {
                    console.error("GIS Error:", error);
                    // If we have a pending request, reject it so the UI stops loading
                    if (pendingReject) {
                        pendingReject(error);
                        pendingReject = null;
                    }
                }
            });
            gisInited = true;
            resolve();
        } else {
            reject("Google Identity Script not loaded");
        }
    });
};

export const requestAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) return reject("Token Client not initialized (Check Client ID)");

        // Store the reject function so error_callback can use it
        pendingReject = reject;

        tokenClient.callback = async (resp: any) => {
            // Request completed, clear the pending reject
            pendingReject = null;
            
            if (resp.error !== undefined) {
                reject(resp);
            }
            resolve(resp.access_token);
        };

        if (window.gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when establishing a new session.
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // Skip display of account chooser and consent dialog for an existing session.
            tokenClient.requestAccessToken({prompt: ''});
        }
    });
};

export const listCsvFiles = async (): Promise<DriveFile[]> => {
    try {
        const response = await window.gapi.client.drive.files.list({
            'pageSize': 10,
            'fields': 'files(id, name, mimeType, modifiedTime)',
            'q': "mimeType = 'text/csv' and trashed = false"
        });
        return response.result.files;
    } catch (err) {
        console.error("Error listing files", err);
        throw err;
    }
};

export const downloadFileContent = async (fileId: string): Promise<string> => {
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        return response.body;
    } catch (err) {
        console.error("Error downloading file", err);
        throw err;
    }
};
