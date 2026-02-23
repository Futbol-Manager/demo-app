import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ErpService {

  private baseUrl = environment.apiUrl + 'erp';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Setup ──
  initErp(clubId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/setup/init?clubId=${clubId}`, {}, { headers: this.headers() });
  }

  // ── Fiscal Years ──
  getFiscalYears(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/fiscal-years?clubId=${clubId}`, { headers: this.headers() });
  }
  createFiscalYear(fy: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/fiscal-years`, fy, { headers: this.headers() });
  }
  activateFiscalYear(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/fiscal-years/${id}/activate?clubId=${clubId}`, {}, { headers: this.headers() });
  }

  // ── Accounts ──
  getAccounts(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/accounts?clubId=${clubId}`, { headers: this.headers() });
  }
  getLeafAccounts(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/accounts/leaf?clubId=${clubId}`, { headers: this.headers() });
  }
  createAccount(account: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/accounts`, account, { headers: this.headers() });
  }
  updateAccount(id: number, clubId: number, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/accounts/${id}?clubId=${clubId}`, updates, { headers: this.headers() });
  }

  // ── Cost Centers ──
  getCostCenters(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cost-centers?clubId=${clubId}`, { headers: this.headers() });
  }
  createCostCenter(cc: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cost-centers`, cc, { headers: this.headers() });
  }
  updateCostCenter(id: number, clubId: number, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/cost-centers/${id}?clubId=${clubId}`, updates, { headers: this.headers() });
  }

  // ── Journal Entries ──
  getJournalEntries(clubId: number, status?: string): Observable<any> {
    let url = `${this.baseUrl}/journal-entries?clubId=${clubId}`;
    if (status) url += `&status=${status}`;
    return this.http.get<any>(url, { headers: this.headers() });
  }
  getJournalEntry(id: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/journal-entries/${id}?clubId=${clubId}`, { headers: this.headers() });
  }
  createJournalEntry(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/journal-entries`, body, { headers: this.headers() });
  }
  postJournalEntry(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/journal-entries/${id}/post?clubId=${clubId}`, {}, { headers: this.headers() });
  }
  cancelJournalEntry(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/journal-entries/${id}/cancel?clubId=${clubId}`, {}, { headers: this.headers() });
  }

  // ── Customers ──
  getCustomers(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/customers?clubId=${clubId}`, { headers: this.headers() });
  }
  createCustomer(c: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/customers`, c, { headers: this.headers() });
  }
  updateCustomer(id: number, clubId: number, u: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/customers/${id}?clubId=${clubId}`, u, { headers: this.headers() });
  }

  // ── Suppliers ──
  getSuppliers(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/suppliers?clubId=${clubId}`, { headers: this.headers() });
  }
  createSupplier(s: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/suppliers`, s, { headers: this.headers() });
  }
  updateSupplier(id: number, clubId: number, u: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/suppliers/${id}?clubId=${clubId}`, u, { headers: this.headers() });
  }

  // ── Sales Invoices ──
  getSalesInvoices(clubId: number, status?: string): Observable<any> {
    let url = `${this.baseUrl}/sales-invoices?clubId=${clubId}`;
    if (status) url += `&status=${status}`;
    return this.http.get<any>(url, { headers: this.headers() });
  }
  getSalesInvoice(id: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/sales-invoices/${id}?clubId=${clubId}`, { headers: this.headers() });
  }
  createSalesInvoice(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sales-invoices`, body, { headers: this.headers() });
  }
  submitSalesInvoice(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/sales-invoices/${id}/submit?clubId=${clubId}`, {}, { headers: this.headers() });
  }
  cancelSalesInvoice(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/sales-invoices/${id}/cancel?clubId=${clubId}`, {}, { headers: this.headers() });
  }

  // ── Purchase Invoices ──
  getPurchaseInvoices(clubId: number, status?: string): Observable<any> {
    let url = `${this.baseUrl}/purchase-invoices?clubId=${clubId}`;
    if (status) url += `&status=${status}`;
    return this.http.get<any>(url, { headers: this.headers() });
  }
  getPurchaseInvoice(id: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/purchase-invoices/${id}?clubId=${clubId}`, { headers: this.headers() });
  }
  createPurchaseInvoice(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/purchase-invoices`, body, { headers: this.headers() });
  }
  submitPurchaseInvoice(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/purchase-invoices/${id}/submit?clubId=${clubId}`, {}, { headers: this.headers() });
  }
  cancelPurchaseInvoice(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/purchase-invoices/${id}/cancel?clubId=${clubId}`, {}, { headers: this.headers() });
  }

  // ── Payments ──
  getPayments(clubId: number, type?: string): Observable<any> {
    let url = `${this.baseUrl}/payments?clubId=${clubId}`;
    if (type) url += `&type=${type}`;
    return this.http.get<any>(url, { headers: this.headers() });
  }
  getPayment(id: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/payments/${id}?clubId=${clubId}`, { headers: this.headers() });
  }
  createPayment(payment: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payments`, payment, { headers: this.headers() });
  }
  submitPayment(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/payments/${id}/submit?clubId=${clubId}`, {}, { headers: this.headers() });
  }
  cancelPayment(id: number, clubId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/payments/${id}/cancel?clubId=${clubId}`, {}, { headers: this.headers() });
  }

  // ── Budgets ──
  getBudgets(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/budgets?clubId=${clubId}`, { headers: this.headers() });
  }
  getBudget(id: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/budgets/${id}?clubId=${clubId}`, { headers: this.headers() });
  }
  createBudget(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/budgets`, body, { headers: this.headers() });
  }
  deleteBudget(id: number, clubId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/budgets/${id}?clubId=${clubId}`, { headers: this.headers() });
  }

  // ── Reports ──
  getDashboardKpis(clubId: number, from: string, to: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/dashboard?clubId=${clubId}&from=${from}&to=${to}`, { headers: this.headers() });
  }
  getProfitLoss(clubId: number, from: string, to: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/profit-loss?clubId=${clubId}&from=${from}&to=${to}`, { headers: this.headers() });
  }
  getBalanceSheet(clubId: number, asOf: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/balance-sheet?clubId=${clubId}&asOf=${asOf}`, { headers: this.headers() });
  }
  getGeneralLedger(clubId: number, from: string, to: string, accountId?: number): Observable<any> {
    let url = `${this.baseUrl}/reports/general-ledger?clubId=${clubId}&from=${from}&to=${to}`;
    if (accountId) url += `&accountId=${accountId}`;
    return this.http.get<any>(url, { headers: this.headers() });
  }
  getTrialBalance(clubId: number, from: string, to: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/trial-balance?clubId=${clubId}&from=${from}&to=${to}`, { headers: this.headers() });
  }

  // ── AI Consent ──
  checkAiConsent(userId: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ai/consent/status?userId=${userId}&clubId=${clubId}`, { headers: this.headers() });
  }
  saveAiConsent(userId: number, clubId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/consent`, { userId, clubId }, { headers: this.headers() });
  }

  // ── AI Document Scan ──
  /**
   * Envía un fichero (imagen o PDF) al backend para ser analizado por GPT-4o Vision.
   * @param file         Fichero seleccionado por el usuario
   * @param type         Tipo de documento: sales_invoice | purchase_invoice | customer | supplier
   * @param clubId       ID del club (para matching con entidades existentes)
   */
  scanDocument(file: File, type: string, clubId: number): Observable<any> {
    const token = sessionStorage.getItem('token') || '';
    const userId = sessionStorage.getItem('userId') || '0';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('clubId', String(clubId));
    formData.append('userId', userId);
    return this.http.post<any>(
      `${this.baseUrl}/ai/scan-document`,
      formData,
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
    );
  }
}
