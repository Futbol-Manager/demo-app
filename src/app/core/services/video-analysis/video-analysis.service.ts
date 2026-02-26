import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class VideoAnalysisService {

  private baseUrl = environment.apiUrl + 'video-analysis';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: 'Bearer ' + token });
  }

  // ── Projects ──

  createProject(body: {
    clubId: number; createdBy: number; videoId?: number; title: string;
    description?: string; templateId: number; teamId?: number;
    matchId?: number; trainingId?: number;
    localFileName?: string; localFileSize?: number; localFileDurationMs?: number;
    externalVideoUrl?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/project`, body, { headers: this.getHeaders() });
  }

  listProjects(clubId: number, filters?: {
    teamId?: number; matchId?: number; trainingId?: number; status?: string;
  }): Observable<any> {
    let url = `${this.baseUrl}/club/${clubId}/projects`;
    const params: string[] = [];
    if (filters?.teamId) params.push(`teamId=${filters.teamId}`);
    if (filters?.matchId) params.push(`matchId=${filters.matchId}`);
    if (filters?.trainingId) params.push(`trainingId=${filters.trainingId}`);
    if (filters?.status) params.push(`status=${filters.status}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getProject(projectId: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/project/${projectId}?clubId=${clubId}`, { headers: this.getHeaders() });
  }

  updateProject(projectId: number, body: { title?: string; description?: string; defaultPlaylistId?: number }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/project/${projectId}`, body, { headers: this.getHeaders() });
  }

  deleteProject(projectId: number, clubId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/project/${projectId}?clubId=${clubId}`, { headers: this.getHeaders() });
  }

  updateProjectStatus(projectId: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/project/${projectId}/status`, { status }, { headers: this.getHeaders() });
  }

  // ── Templates ──

  listTemplates(clubId?: number): Observable<any> {
    let url = `${this.baseUrl}/templates`;
    if (clubId) url += `?clubId=${clubId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getTemplate(templateId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/template/${templateId}`, { headers: this.getHeaders() });
  }

  createTemplate(body: { clubId: number; createdBy: number; name: string; description?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/template`, body, { headers: this.getHeaders() });
  }

  updateTemplate(templateId: number, body: { name?: string; description?: string; backgroundImage?: string | null; backgroundOpacity?: number; bgColor?: string | null; bgImgX?: number; bgImgY?: number; bgImgW?: number; bgImgH?: number; bgImgLocked?: boolean }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/template/${templateId}`, body, { headers: this.getHeaders() });
  }

  deleteTemplate(templateId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/template/${templateId}`, { headers: this.getHeaders() });
  }

  duplicateTemplate(templateId: number, clubId: number, createdBy: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/template/${templateId}/duplicate`, { clubId, createdBy }, { headers: this.getHeaders() });
  }

  // ── Categories ──

  addCategory(templateId: number, body: {
    name: string; color: string; icon?: string; shortcutKey?: string;
    defaultDurationSec?: number; sortOrder: number; parentId?: number;
    preTimeSec?: number; postTimeSec?: number;
    posX?: number; posY?: number; sizeW?: number; sizeH?: number;
    shape?: string; textSize?: number; textColor?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/template/${templateId}/category`, body, { headers: this.getHeaders() });
  }

  updateCategory(categoryId: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/category/${categoryId}`, body, { headers: this.getHeaders() });
  }

  deleteCategory(categoryId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/category/${categoryId}`, { headers: this.getHeaders() });
  }

  categoryToDescriptor(categoryId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/category/${categoryId}/to-descriptor`, {}, { headers: this.getHeaders() });
  }

  descriptorToCategory(tagId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tag/${tagId}/to-category`, {}, { headers: this.getHeaders() });
  }

  // ── Tags ──

  addTag(categoryId: number, body: { name: string; color?: string; sortOrder: number }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/category/${categoryId}/tag`, body, { headers: this.getHeaders() });
  }

  addDescriptor(templateId: number, body: {
    name: string; color?: string; sortOrder?: number;
    posX?: number; posY?: number; sizeW?: number; sizeH?: number;
    shape?: string; textSize?: number; textColor?: string; opacity?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/template/${templateId}/descriptor`, body, { headers: this.getHeaders() });
  }

  updateTag(tagId: number, body: {
    name?: string; color?: string; sortOrder?: number;
    posX?: number; posY?: number; sizeW?: number; sizeH?: number;
    shape?: string; textSize?: number; textColor?: string; opacity?: number; locked?: boolean;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/tag/${tagId}`, body, { headers: this.getHeaders() });
  }

  deleteTag(tagId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/tag/${tagId}`, { headers: this.getHeaders() });
  }

  // ── Events ──

  createEvent(projectId: number, body: {
    categoryId: number; startTimeMs: number; endTimeMs: number;
    notes?: string; fieldX?: number; fieldY?: number;
    playerId?: number; rating?: number; tagIds?: number[]; createdBy: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/project/${projectId}/event`, body, { headers: this.getHeaders() });
  }

  listEvents(projectId: number, filters?: { categoryId?: number; playerId?: number }): Observable<any> {
    let url = `${this.baseUrl}/project/${projectId}/events`;
    const params: string[] = [];
    if (filters?.categoryId) params.push(`categoryId=${filters.categoryId}`);
    if (filters?.playerId) params.push(`playerId=${filters.playerId}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  updateEvent(eventId: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/event/${eventId}`, body, { headers: this.getHeaders() });
  }

  deleteEvent(eventId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/event/${eventId}`, { headers: this.getHeaders() });
  }

  // ── Drawings ──

  saveDrawing(projectId: number, body: {
    eventId?: number; timestampMs: number; durationMs: number;
    drawingData: string; createdBy: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/project/${projectId}/drawing`, body, { headers: this.getHeaders() });
  }

  listDrawings(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/project/${projectId}/drawings`, { headers: this.getHeaders() });
  }

  updateDrawing(drawingId: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/drawing/${drawingId}`, body, { headers: this.getHeaders() });
  }

  deleteDrawing(drawingId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/drawing/${drawingId}`, { headers: this.getHeaders() });
  }

  // ── Playlists ──

  createPlaylist(body: {
    clubId: number; createdBy: number; projectId?: number;
    title: string; description?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/playlist`, body, { headers: this.getHeaders() });
  }

  listPlaylists(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/club/${clubId}/playlists`, { headers: this.getHeaders() });
  }

  getPlaylist(playlistId: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/playlist/${playlistId}?clubId=${clubId}`, { headers: this.getHeaders() });
  }

  updatePlaylist(playlistId: number, body: { title?: string; description?: string }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/playlist/${playlistId}`, body, { headers: this.getHeaders() });
  }

  deletePlaylist(playlistId: number, clubId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/playlist/${playlistId}?clubId=${clubId}`, { headers: this.getHeaders() });
  }

  addPlaylistItems(playlistId: number, items: {
    eventId: number; sortOrder: number; notes?: string;
    customStartMs?: number; customEndMs?: number;
  }[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/playlist/${playlistId}/items`, { items }, { headers: this.getHeaders() });
  }

  removePlaylistItem(playlistId: number, itemId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/playlist/${playlistId}/item/${itemId}`, { headers: this.getHeaders() });
  }

  reorderPlaylistItems(playlistId: number, itemIds: number[]): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/playlist/${playlistId}/reorder`, { itemIds }, { headers: this.getHeaders() });
  }

  updatePlaylistItem(itemId: number, body: {
    customStartMs?: number | null;
    customEndMs?: number | null;
    notes?: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/playlist/item/${itemId}`, body, { headers: this.getHeaders() });
  }

  // ── Clip Annotations ──

  listClipAnnotations(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/event/${eventId}/annotations`, { headers: this.getHeaders() });
  }

  createClipAnnotation(eventId: number, body: {
    frameTimeMs: number; frameDurationMs: number; drawingData: string;
    sortOrder: number; createdBy: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/event/${eventId}/annotation`, body, { headers: this.getHeaders() });
  }

  updateClipAnnotation(annotationId: number, body: {
    frameTimeMs?: number; frameDurationMs?: number; drawingData?: string; sortOrder?: number;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/annotation/${annotationId}`, body, { headers: this.getHeaders() });
  }

  deleteClipAnnotation(annotationId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/annotation/${annotationId}`, { headers: this.getHeaders() });
  }

  // ── Presentations ──

  createPresentation(body: {
    clubId: number; createdBy: number; playlistId: number;
    title: string; description?: string; shareType: string;
    shareTargetIds?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/presentation`, body, { headers: this.getHeaders() });
  }

  listPresentations(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/club/${clubId}/presentations`, { headers: this.getHeaders() });
  }

  getPresentation(presentationId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/presentation/${presentationId}`, { headers: this.getHeaders() });
  }

  deletePresentation(presentationId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/presentation/${presentationId}`, { headers: this.getHeaders() });
  }

  // ── AI Reports ──

  generateAiReport(projectId: number, body: {
    clubId: number; userId: number; eventsSummary: any; options: any;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/project/${projectId}/ai-report`, body, { headers: this.getHeaders() });
  }

  getAiReport(reportId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/report/${reportId}`, { headers: this.getHeaders() });
  }

  listAiReports(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/project/${projectId}/reports`, { headers: this.getHeaders() });
  }
}
