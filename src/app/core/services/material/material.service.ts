// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – MaterialService (demo-app)
// Control de material del staff (fisio/médico) por equipo.
// En modo demo devuelve subcategorías, artículos, movimientos y pedidos
// ficticios inline; las escrituras devuelven éxito simulado.
// Backend: /rest/material/
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Categorías fijas (las tres pestañas). */
export type MaterialCategory = 'PHYSIO' | 'DRUGS' | 'NUTRITION';

export interface MaterialSubcategory {
  subcategoryId: number;
  category: MaterialCategory;
  name: string;
  sortOrder: number;
}

export interface MaterialItem {
  itemId: number;
  category: MaterialCategory;
  subcategoryId: number | null;
  name: string;
  quantity: number;
  unit: string | null;
  minStock: number | null;
  expiryDate: string | null;
  notes: string | null;
  photoUrl: string | null;
  lowStock: boolean;
}

export interface MaterialPlayer {
  playerId: number;
  name: string;
  picturePlayer: string | null;
}

export interface MaterialBundle {
  teamId: number;
  clubId: number;
  subcategories: MaterialSubcategory[];
  items: MaterialItem[];
  players: MaterialPlayer[];
}

export interface MaterialMovement {
  movementId: number;
  itemId: number;
  itemName: string | null;
  type: 'IN' | 'OUT' | 'INIT';
  category: MaterialCategory | null;
  quantity: number;
  reason: string | null;
  playerId: number | null;
  playerName: string | null;
  userId: number | null;
  userName: string | null;
  createdAt: string | null;
}

export interface MovementResult {
  item: MaterialItem;
  movement: MaterialMovement;
}

export type MaterialOrderStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface MaterialOrderLine {
  lineId: number;
  itemId: number;
  itemName: string | null;
  category: MaterialCategory | null;
  quantityOrdered: number;
  quantityReceived: number;
  pending: number;
}

export interface MaterialOrder {
  orderId: number;
  teamId: number;
  clubId: number;
  status: MaterialOrderStatus;
  name: string | null;
  notes: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  receivedAt: string | null;
  lines: MaterialOrderLine[];
  totalOrdered: number;
  totalReceived: number;
}

export interface MaterialItemUnit {
  unitId: number;
  expiryDate: string | null;
}

export interface AlbaranMatchedLine {
  itemId: number;
  lineId: number;
  itemName: string | null;
  quantityReceived: number;
  expiryDate: string | null;
}

export interface AlbaranUnmatchedLine {
  description: string;
  quantity: number;
  expiryDate: string | null;
  suggestedItemId: number | null;
  suggestedItemName: string | null;
}

export interface AlbaranScanResult {
  matched: AlbaranMatchedLine[];
  unmatched: AlbaranUnmatchedLine[];
  warning?: string | null;
}

export interface MaterialUnitsBundle {
  itemId: number;
  name: string;
  unit: string | null;
  quantity: number;
  units: MaterialItemUnit[];
}

@Injectable({ providedIn: 'root' })
export class MaterialService {

  private baseUrl = environment.apiUrl + 'material/';

  constructor(private http: HttpClient) {}

  // ── Bundle ────────────────────────────────────────────────────────
  getBundle(teamId: number): Observable<MaterialBundle> {
    if (isDemoMode()) return of(this.mockBundle(teamId));
    return this.http.get<any>(this.baseUrl + `team/${teamId}`).pipe(
      map(resp => {
        const d = resp?.data || {};
        return {
          teamId: d.teamId ?? teamId,
          clubId: d.clubId ?? 0,
          subcategories: Array.isArray(d.subcategories) ? d.subcategories : [],
          items: Array.isArray(d.items) ? d.items : [],
          players: Array.isArray(d.players) ? d.players : []
        } as MaterialBundle;
      }),
      catchError(() => of({ teamId, clubId: 0, subcategories: [], items: [], players: [] }))
    );
  }

  // ── Subcategorías ─────────────────────────────────────────────────
  createSubcategory(teamId: number, body: { clubId: number; category: MaterialCategory; name: string }): Observable<MaterialSubcategory | null> {
    if (isDemoMode()) return of({ subcategoryId: Date.now(), category: body.category, name: body.name, sortOrder: 99 });
    return this.http.post<any>(this.baseUrl + `team/${teamId}/subcategory`, body).pipe(
      map(resp => (resp?.data ?? null) as MaterialSubcategory | null),
      catchError(() => of(null))
    );
  }

  renameSubcategory(subcategoryId: number, name: string): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http.put<any>(this.baseUrl + `subcategory/${subcategoryId}`, { name }).pipe(
      map(() => true), catchError(() => of(false))
    );
  }

  deleteSubcategory(subcategoryId: number): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http.delete<any>(this.baseUrl + `subcategory/${subcategoryId}`).pipe(
      map(() => true), catchError(() => of(false))
    );
  }

  // ── Artículos ─────────────────────────────────────────────────────
  createItem(teamId: number, body: {
    clubId: number; category: MaterialCategory; subcategoryId: number | null; name: string;
    unit?: string | null; minStock?: number | null; expiryDate?: string | null; notes?: string | null;
    initialQuantity?: number; userId?: number; userName?: string;
  }): Observable<MaterialItem | null> {
    if (isDemoMode()) return of({
      itemId: Date.now(), category: body.category, subcategoryId: body.subcategoryId, name: body.name,
      quantity: body.initialQuantity ?? 0, unit: body.unit ?? null, minStock: body.minStock ?? null,
      expiryDate: body.expiryDate ?? null, notes: body.notes ?? null, photoUrl: null, lowStock: false,
    });
    return this.http.post<any>(this.baseUrl + `team/${teamId}/item`, body).pipe(
      map(resp => (resp?.data ?? null) as MaterialItem | null),
      catchError(() => of(null))
    );
  }

  updateItem(itemId: number, body: Partial<{
    name: string; subcategoryId: number | null; unit: string | null;
    minStock: number | null; expiryDate: string | null; notes: string | null;
  }>): Observable<MaterialItem | null> {
    if (isDemoMode()) return of({
      itemId, category: 'PHYSIO', subcategoryId: body.subcategoryId ?? null, name: body.name ?? 'Artículo',
      quantity: 10, unit: body.unit ?? null, minStock: body.minStock ?? null,
      expiryDate: body.expiryDate ?? null, notes: body.notes ?? null, photoUrl: null, lowStock: false,
    });
    return this.http.put<any>(this.baseUrl + `item/${itemId}`, body).pipe(
      map(resp => (resp?.data ?? null) as MaterialItem | null),
      catchError(() => of(null))
    );
  }

  deleteItem(itemId: number): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http.delete<any>(this.baseUrl + `item/${itemId}`).pipe(
      map(() => true), catchError(() => of(false))
    );
  }

  // ── Foto del artículo ─────────────────────────────────────────────
  uploadItemPhoto(itemId: number, file: File): Observable<MaterialItem | null> {
    if (isDemoMode()) return of(null);
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<any>(this.baseUrl + `item/${itemId}/photo`, form).pipe(
      map(resp => (resp?.data ?? null) as MaterialItem | null),
      catchError(() => of(null))
    );
  }

  deleteItemPhoto(itemId: number): Observable<MaterialItem | null> {
    if (isDemoMode()) return of(null);
    return this.http.delete<any>(this.baseUrl + `item/${itemId}/photo`).pipe(
      map(resp => (resp?.data ?? null) as MaterialItem | null),
      catchError(() => of(null))
    );
  }

  // ── Movimientos ───────────────────────────────────────────────────
  registerMovement(itemId: number, body: {
    type: 'IN' | 'OUT'; quantity: number; reason?: string | null;
    playerId?: number | null; playerName?: string | null; userId?: number; userName?: string;
  }): Observable<MovementResult | null> {
    if (isDemoMode()) {
      const item: MaterialItem = {
        itemId, category: 'PHYSIO', subcategoryId: 1, name: 'Vendas elásticas',
        quantity: body.type === 'IN' ? 10 + body.quantity : Math.max(0, 10 - body.quantity),
        unit: 'ud', minStock: 5, expiryDate: null, notes: null, photoUrl: null, lowStock: false,
      };
      const movement: MaterialMovement = {
        movementId: Date.now(), itemId, itemName: item.name, type: body.type, category: 'PHYSIO',
        quantity: body.quantity, reason: body.reason ?? null, playerId: body.playerId ?? null,
        playerName: body.playerName ?? null, userId: body.userId ?? null, userName: body.userName ?? 'Fisio Demo',
        createdAt: new Date().toISOString(),
      };
      return of({ item, movement });
    }
    return this.http.post<any>(this.baseUrl + `item/${itemId}/movement`, body).pipe(
      map(resp => (resp?.data ?? null) as MovementResult | null),
      catchError(() => of(null))
    );
  }

  getMovements(teamId: number, limit = 300): Observable<MaterialMovement[]> {
    if (isDemoMode()) return of(this.mockMovements());
    return this.http.get<any>(this.baseUrl + `team/${teamId}/movements?limit=${limit}`).pipe(
      map(resp => {
        const d = resp?.data || {};
        return Array.isArray(d.movements) ? d.movements : [];
      }),
      catchError(() => of([]))
    );
  }

  // ── Pedidos ───────────────────────────────────────────────────────
  getOrders(teamId: number, limit = 100): Observable<MaterialOrder[]> {
    if (isDemoMode()) return of(this.mockOrders(teamId));
    return this.http.get<any>(this.baseUrl + `team/${teamId}/orders?limit=${limit}`).pipe(
      map(resp => {
        const d = resp?.data || {};
        return Array.isArray(d.orders) ? d.orders : [];
      }),
      catchError(() => of([]))
    );
  }

  createOrder(teamId: number, body: {
    clubId: number; name?: string | null; notes?: string | null; userId?: number; userName?: string;
    lines: { itemId: number; quantity: number }[];
  }): Observable<MaterialOrder | null> {
    if (isDemoMode()) return of(this.buildOrder(teamId, body.clubId, Date.now(), 'PENDING', body.name ?? null,
      body.lines.map((l, i) => ({ lineId: i + 1, itemId: l.itemId, itemName: 'Artículo', category: 'PHYSIO' as MaterialCategory, quantityOrdered: l.quantity, quantityReceived: 0, pending: l.quantity }))));
    return this.http.post<any>(this.baseUrl + `team/${teamId}/order`, body).pipe(
      map(resp => (resp?.data ?? null) as MaterialOrder | null),
      catchError(() => of(null))
    );
  }

  updateOrder(orderId: number, body: {
    name?: string | null; notes?: string | null; lines: { itemId: number; quantity: number }[];
  }): Observable<MaterialOrder | null> {
    if (isDemoMode()) return of(this.buildOrder(101, 61, orderId, 'PENDING', body.name ?? null,
      body.lines.map((l, i) => ({ lineId: i + 1, itemId: l.itemId, itemName: 'Artículo', category: 'PHYSIO' as MaterialCategory, quantityOrdered: l.quantity, quantityReceived: 0, pending: l.quantity }))));
    return this.http.put<any>(this.baseUrl + `order/${orderId}`, body).pipe(
      map(resp => (resp?.data ?? null) as MaterialOrder | null),
      catchError(() => of(null))
    );
  }

  renameOrder(orderId: number, name: string | null): Observable<MaterialOrder | null> {
    if (isDemoMode()) return of(this.buildOrder(101, 61, orderId, 'PENDING', name, []));
    return this.http.put<any>(this.baseUrl + `order/${orderId}/name`, { name }).pipe(
      map(resp => (resp?.data ?? null) as MaterialOrder | null),
      catchError(() => of(null))
    );
  }

  cancelOrder(orderId: number): Observable<MaterialOrder | null> {
    if (isDemoMode()) return of(this.buildOrder(101, 61, orderId, 'CANCELLED', null, []));
    return this.http.delete<any>(this.baseUrl + `order/${orderId}`).pipe(
      map(resp => (resp?.data ?? null) as MaterialOrder | null),
      catchError(() => of(null))
    );
  }

  deleteOrder(orderId: number): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http.delete<any>(this.baseUrl + `order/${orderId}/permanent`).pipe(
      map(() => true), catchError(() => of(false))
    );
  }

  receiveOrder(orderId: number, body: {
    userId?: number; userName?: string;
    lines: { lineId: number; quantityReceived: number; expiryDate?: string | null }[];
  }): Observable<MaterialOrder | null> {
    if (isDemoMode()) return of(this.buildOrder(101, 61, orderId, 'RECEIVED', null,
      body.lines.map(l => ({ lineId: l.lineId, itemId: l.lineId, itemName: 'Artículo', category: 'PHYSIO' as MaterialCategory, quantityOrdered: l.quantityReceived, quantityReceived: l.quantityReceived, pending: 0 }))));
    return this.http.post<any>(this.baseUrl + `order/${orderId}/receive`, body).pipe(
      map(resp => (resp?.data ?? null) as MaterialOrder | null),
      catchError(() => of(null))
    );
  }

  scanAlbaran(orderId: number, files: File[]): Observable<AlbaranScanResult | null> {
    if (isDemoMode()) return of({
      matched: [
        { itemId: 1, lineId: 1, itemName: 'Vendas elásticas', quantityReceived: 20, expiryDate: null },
      ],
      unmatched: [
        { description: 'Spray frío 400ml', quantity: 6, expiryDate: '2027-01-31', suggestedItemId: null, suggestedItemName: null },
      ],
      warning: null,
    });
    const form = new FormData();
    for (const f of files) form.append('files', f, f.name);
    return this.http.post<any>(this.baseUrl + `order/${orderId}/scan-albaran`, form).pipe(
      map(resp => (resp?.data ?? null) as AlbaranScanResult | null),
      catchError(() => of(null))
    );
  }

  // ── Unidades (caducidad por unidad) ───────────────────────────────
  getUnits(itemId: number): Observable<MaterialUnitsBundle | null> {
    if (isDemoMode()) return of({
      itemId, name: 'Ibuprofeno 600mg', unit: 'caja', quantity: 3,
      units: [
        { unitId: 1, expiryDate: '2026-11-30' },
        { unitId: 2, expiryDate: '2027-03-31' },
        { unitId: 3, expiryDate: '2027-06-30' },
      ],
    });
    return this.http.get<any>(this.baseUrl + `item/${itemId}/units`).pipe(
      map(resp => (resp?.data ?? null) as MaterialUnitsBundle | null),
      catchError(() => of(null))
    );
  }

  updateUnits(itemId: number, units: { unitId: number; expiryDate: string | null }[])
    : Observable<{ item: MaterialItem; units: MaterialItemUnit[] } | null> {
    if (isDemoMode()) return of({
      item: { itemId, category: 'DRUGS', subcategoryId: 2, name: 'Ibuprofeno 600mg', quantity: units.length, unit: 'caja', minStock: 2, expiryDate: null, notes: null, photoUrl: null, lowStock: false },
      units: units.map(u => ({ unitId: u.unitId, expiryDate: u.expiryDate })),
    });
    return this.http.put<any>(this.baseUrl + `item/${itemId}/units`, { units }).pipe(
      map(resp => (resp?.data ?? null) as { item: MaterialItem; units: MaterialItemUnit[] } | null),
      catchError(() => of(null))
    );
  }

  // ── Datos ficticios inline ────────────────────────────────────────
  private mockBundle(teamId: number): MaterialBundle {
    const clubId = 61;
    const subcategories: MaterialSubcategory[] = [
      { subcategoryId: 1, category: 'PHYSIO', name: 'Vendajes', sortOrder: 1 },
      { subcategoryId: 2, category: 'PHYSIO', name: 'Recuperación', sortOrder: 2 },
      { subcategoryId: 3, category: 'DRUGS', name: 'Analgésicos', sortOrder: 1 },
      { subcategoryId: 4, category: 'NUTRITION', name: 'Geles y barritas', sortOrder: 1 },
    ];
    const items: MaterialItem[] = [
      { itemId: 1, category: 'PHYSIO', subcategoryId: 1, name: 'Vendas elásticas', quantity: 24, unit: 'ud', minStock: 10, expiryDate: null, notes: null, photoUrl: null, lowStock: false },
      { itemId: 2, category: 'PHYSIO', subcategoryId: 1, name: 'Tape rígido', quantity: 4, unit: 'rollo', minStock: 6, expiryDate: null, notes: 'Reponer', photoUrl: null, lowStock: true },
      { itemId: 3, category: 'PHYSIO', subcategoryId: 2, name: 'Spray frío', quantity: 8, unit: 'bote', minStock: 4, expiryDate: '2027-01-31', notes: null, photoUrl: null, lowStock: false },
      { itemId: 4, category: 'DRUGS', subcategoryId: 3, name: 'Ibuprofeno 600mg', quantity: 3, unit: 'caja', minStock: 2, expiryDate: '2026-11-30', notes: null, photoUrl: null, lowStock: false },
      { itemId: 5, category: 'NUTRITION', subcategoryId: 4, name: 'Gel energético', quantity: 30, unit: 'ud', minStock: 15, expiryDate: '2026-12-31', notes: null, photoUrl: null, lowStock: false },
    ];
    const players: MaterialPlayer[] = [
      { playerId: 2001, name: 'Lucas Martín', picturePlayer: null },
      { playerId: 2002, name: 'Hugo Navarro', picturePlayer: null },
      { playerId: 2003, name: 'Diego Romero', picturePlayer: null },
    ];
    return { teamId, clubId, subcategories, items, players };
  }

  private mockMovements(): MaterialMovement[] {
    return [
      { movementId: 1, itemId: 1, itemName: 'Vendas elásticas', type: 'INIT', category: 'PHYSIO', quantity: 30, reason: 'Stock inicial', playerId: null, playerName: null, userId: 500, userName: 'Fisio Demo', createdAt: '2026-02-01T09:00:00' },
      { movementId: 2, itemId: 1, itemName: 'Vendas elásticas', type: 'OUT', category: 'PHYSIO', quantity: 6, reason: 'Tratamiento', playerId: 2001, playerName: 'Lucas Martín', userId: 500, userName: 'Fisio Demo', createdAt: '2026-03-12T18:30:00' },
      { movementId: 3, itemId: 4, itemName: 'Ibuprofeno 600mg', type: 'OUT', category: 'DRUGS', quantity: 1, reason: 'Molestias', playerId: 2002, playerName: 'Hugo Navarro', userId: 500, userName: 'Fisio Demo', createdAt: '2026-04-02T20:15:00' },
    ];
  }

  private buildOrder(teamId: number, clubId: number, orderId: number, status: MaterialOrderStatus, name: string | null, lines: MaterialOrderLine[]): MaterialOrder {
    const totalOrdered = lines.reduce((s, l) => s + l.quantityOrdered, 0);
    const totalReceived = lines.reduce((s, l) => s + l.quantityReceived, 0);
    return {
      orderId, teamId, clubId, status, name, notes: null,
      createdByUserId: 500, createdByName: 'Fisio Demo',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      receivedAt: status === 'RECEIVED' ? new Date().toISOString() : null,
      lines, totalOrdered, totalReceived,
    };
  }

  private mockOrders(teamId: number): MaterialOrder[] {
    return [
      this.buildOrder(teamId, 61, 9001, 'PENDING', 'Pedido primavera', [
        { lineId: 1, itemId: 2, itemName: 'Tape rígido', category: 'PHYSIO', quantityOrdered: 12, quantityReceived: 0, pending: 12 },
        { lineId: 2, itemId: 5, itemName: 'Gel energético', category: 'NUTRITION', quantityOrdered: 20, quantityReceived: 0, pending: 20 },
      ]),
      this.buildOrder(teamId, 61, 9000, 'RECEIVED', 'Pedido inicial', [
        { lineId: 1, itemId: 1, itemName: 'Vendas elásticas', category: 'PHYSIO', quantityOrdered: 30, quantityReceived: 30, pending: 0 },
      ]),
    ];
  }
}
