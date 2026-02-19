import { Injectable, NgZone } from '@angular/core';

declare var google: any;
declare var gapi: any;

const CLIENT_ID = '114221488480-qkrnl83879rjqds3499f7k0kti562ni1.apps.googleusercontent.com';
const API_KEY = '';
const SCOPES_IMPORT = 'https://www.googleapis.com/auth/drive.readonly';
const SCOPES_EXPORT = 'https://www.googleapis.com/auth/drive.file';

@Injectable({ providedIn: 'root' })
export class DriveService {

  private tokenClient: any = null;
  private pickerLoaded = false;

  constructor(private zone: NgZone) {}

  getAccessToken(scope: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.accounts) {
        reject('Google Identity Services no cargado');
        return;
      }
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope,
        callback: (resp: any) => {
          this.zone.run(() => {
            if (resp.error) { reject(resp.error); return; }
            resolve(resp.access_token);
          });
        },
        error_callback: (err: any) => {
          this.zone.run(() => reject(err));
        }
      });
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  getImportToken(): Promise<string> {
    return this.getAccessToken(SCOPES_IMPORT);
  }

  getExportToken(): Promise<string> {
    return this.getAccessToken(SCOPES_EXPORT);
  }

  openFilePicker(accessToken: string): Promise<{ id: string; name: string; mimeType: string; sizeBytes: number }> {
    return new Promise((resolve, reject) => {
      const show = () => {
        const view = new google.picker.View(google.picker.ViewId.DOCS);
        view.setMimeTypes('video/mp4,video/avi,video/quicktime,video/x-msvideo,video/x-matroska,video/webm');

        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(accessToken)
          .setDeveloperKey(API_KEY || undefined)
          .setCallback((data: any) => {
            this.zone.run(() => {
              if (data.action === google.picker.Action.PICKED) {
                const doc = data.docs[0];
                resolve({
                  id: doc.id,
                  name: doc.name,
                  mimeType: doc.mimeType,
                  sizeBytes: doc.sizeBytes || 0
                });
              } else if (data.action === google.picker.Action.CANCEL) {
                reject('cancelled');
              }
            });
          })
          .setTitle('Selecciona un vídeo de Google Drive')
          .build();
        picker.setVisible(true);
      };

      if (this.pickerLoaded) {
        show();
      } else {
        gapi.load('picker', () => {
          this.pickerLoaded = true;
          show();
        });
      }
    });
  }

  async uploadToDrive(accessToken: string, blob: Blob, filename: string, mimeType: string): Promise<any> {
    const metadata = JSON.stringify({
      name: filename,
      mimeType
    });

    const boundary = '-------sphaira_boundary';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';

    const reader = new FileReader();
    const base64Data: string = await new Promise((resolve) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadata +
      delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body
      }
    );

    if (!response.ok) {
      throw new Error('Error subiendo a Drive: ' + response.status);
    }
    return response.json();
  }
}
