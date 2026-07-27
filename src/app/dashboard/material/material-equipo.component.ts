import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as XLSX from 'xlsx';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { PdfExportService } from 'src/app/core/services/pdf-export/pdf-export.service';
import {
  MaterialService,
  MaterialBundle,
  MaterialCategory,
  MaterialItem,
  MaterialSubcategory,
  MaterialPlayer,
  MaterialMovement,
  MaterialOrder,
  MaterialOrderStatus,
  MaterialItemUnit,
  AlbaranScanResult,
  AlbaranUnmatchedLine
} from 'src/app/core/services/material/material.service';

interface OrderLineForm { itemId: number; name: string; category: MaterialCategory; quantity: number; }
interface OrderForm { orderId: number | null; name: string; notes: string; lines: OrderLineForm[]; }
interface ReceiveLineForm {
  lineId: number; itemId: number; itemName: string; category: MaterialCategory | null;
  ordered: number; received: number; pending: number; qty: number | null; expiryDate: string | null;
}

interface TabDef { code: MaterialCategory; labelKey: string; icon: string; }

interface ItemForm {
  itemId: number | null;
  category: MaterialCategory;
  subcategoryId: number | null;
  name: string;
  unit: string;
  minStock: number | null;
  expiryDate: string | null;
  notes: string;
  initialQuantity: number | null;
  photoUrl: string | null;
}

interface MovementForm {
  item: MaterialItem | null;
  type: 'IN' | 'OUT';
  quantity: number | null;
  reason: string;
  playerId: number | null;
}

/**
 * Pantalla "Material" (menú de Fisio).
 *
 * <p>Permite al staff (fisio/médico) llevar el control del material en tres
 * pestañas — Fisioterapia, Fármacos y Nutrición — con subcategorías editables.
 * Cada artículo tiene stock, unidad, stock mínimo, caducidad y notas. Los
 * pedidos (entradas) y extracciones (salidas) actualizan el stock y quedan
 * registrados en un historial de trazabilidad con fecha, usuario, motivo y
 * jugador asociado.
 *
 * Ruta: /dashboard/material-equipo/:teamId
 */
@Component({
  selector: 'app-material-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mat-page">
      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i><span>{{ 'COMMON.BACK' | translate }}</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="page-title"><i class="bi bi-box-seam me-2"></i>{{ 'MATERIAL.TITLE' | translate }}</h2>
          <p class="page-subtitle">{{ 'MATERIAL.SUBTITLE' | translate }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Tabs principales + cambio de vista -->
        <div class="tabs-bar">
          <div class="tabs">
            <button *ngFor="let t of tabs" class="tab" [class.active]="section === 'inventory' && activeTab === t.code"
                    (click)="selectTab(t.code)">
              <i class="bi" [ngClass]="t.icon"></i>
              <span>{{ t.labelKey | translate }}</span>
            </button>
          </div>
          <button class="tab tab-orders tab-orders-center" [class.active]="section === 'orders'" (click)="openOrders()">
            <i class="bi bi-clipboard-check"></i>
            <span>{{ 'MATERIAL.TAB_ORDERS' | translate }}</span>
            <span class="tab-badge" *ngIf="openOrdersCount() > 0">{{ openOrdersCount() }}</span>
          </button>
          <div class="tabs-right-spacer" *ngIf="section !== 'inventory'"></div>
          <div class="right-actions" *ngIf="section === 'inventory'">
            <div class="view-switch">
              <button class="vbtn" [class.active]="view === 'items'" (click)="setView('items')">
                <i class="bi bi-grid"></i> {{ 'MATERIAL.VIEW_ITEMS' | translate }}
              </button>
              <button class="vbtn" [class.active]="view === 'restock'" (click)="setView('restock')">
                <i class="bi bi-cart-plus"></i> {{ 'MATERIAL.VIEW_RESTOCK' | translate }}
                <span class="vbtn-badge" *ngIf="lowStockCount() > 0">{{ lowStockCount() }}</span>
              </button>
              <button class="vbtn" [class.active]="view === 'history'" (click)="setView('history')">
                <i class="bi bi-clock-history"></i> {{ 'MATERIAL.VIEW_HISTORY' | translate }}
              </button>
            </div>
            <button class="btn-export" (click)="exportExcel()" [disabled]="exporting"
                    [title]="'MATERIAL.EXPORT' | translate">
              <span *ngIf="exporting" class="spinner-border spinner-border-sm"></span>
              <i class="bi bi-file-earmark-excel" *ngIf="!exporting"></i>
              <span class="btn-export-lbl">{{ 'MATERIAL.EXPORT' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="empty-state">
          <div class="spinner-border spinner-sphaira" role="status"></div>
          <p class="mt-2 mb-0 text-soft">{{ 'MATERIAL.LOADING' | translate }}</p>
        </div>

        <!-- ════════ VISTA ARTÍCULOS ════════ -->
        <ng-container *ngIf="!loading && section === 'inventory' && view === 'items'">

          <!-- Subcategorías + acciones -->
          <div class="subcat-bar">
            <div class="chips">
              <button class="chip" [class.active]="activeSubcatId === null" (click)="selectSubcat(null)">
                {{ 'MATERIAL.ALL' | translate }}
              </button>
              <button *ngFor="let s of currentSubcats()" class="chip"
                      [class.active]="activeSubcatId === s.subcategoryId" (click)="selectSubcat(s.subcategoryId)">
                {{ s.name }}
              </button>
            </div>
            <div class="subcat-actions">
              <button class="btn-soft" (click)="openSubcatManager()">
                <i class="bi bi-tags"></i> {{ 'MATERIAL.MANAGE_SUBCATS' | translate }}
              </button>
              <button class="btn-primary-sph" (click)="openItemModal(null)">
                <i class="bi bi-plus-lg"></i> {{ 'MATERIAL.NEW_ITEM' | translate }}
              </button>
            </div>
          </div>

          <!-- Buscador + filtros rápidos -->
          <div class="filter-bar">
            <div class="search-box">
              <i class="bi bi-search"></i>
              <input type="text" [(ngModel)]="searchText" (ngModelChange)="onSearchChange()"
                     [placeholder]="'MATERIAL.SEARCH_PLACEHOLDER' | translate" />
              <button class="search-clear" *ngIf="searchText" (click)="clearSearch()"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="filter-toggles">
              <button class="ftoggle low" [class.active]="filterLow" (click)="toggleFilterLow()">
                <i class="bi bi-exclamation-triangle-fill"></i> {{ 'MATERIAL.FILTER_LOW' | translate }}
                <span class="ftoggle-count" *ngIf="lowStockCount() > 0">{{ lowStockCount() }}</span>
              </button>
              <button class="ftoggle soon" [class.active]="filterExpiring" (click)="toggleFilterExpiring()">
                <i class="bi bi-hourglass-split"></i> {{ 'MATERIAL.FILTER_EXPIRING' | translate }}
                <span class="ftoggle-count" *ngIf="expiringSoonCount() > 0">{{ expiringSoonCount() }}</span>
              </button>
              <button class="ftoggle expired" [class.active]="filterExpired" (click)="toggleFilterExpired()">
                <i class="bi bi-x-octagon-fill"></i> {{ 'MATERIAL.FILTER_EXPIRED' | translate }}
                <span class="ftoggle-count" *ngIf="expiredCount() > 0">{{ expiredCount() }}</span>
              </button>
            </div>
          </div>

          <!-- Vacío -->
          <div *ngIf="currentItems().length === 0" class="empty-state">
            <i class="bi bi-inboxes display-5 mb-2"></i>
            <p class="mb-0" *ngIf="!hasActiveFilters()">{{ 'MATERIAL.EMPTY_ITEMS' | translate }}</p>
            <p class="mb-0" *ngIf="hasActiveFilters()">{{ 'MATERIAL.EMPTY_FILTER' | translate }}</p>
            <button class="btn-soft mt-2" *ngIf="hasActiveFilters()" (click)="searchText=''; filterLow=false; filterExpiring=false; filterExpired=false; onSearchChange()">
              <i class="bi bi-x-circle"></i> {{ 'MATERIAL.CLEAR_FILTERS' | translate }}
            </button>
          </div>

          <!-- Tabla de artículos -->
          <div *ngIf="currentItems().length > 0" class="table-card">
            <div class="table-responsive">
              <table class="sph-table">
                <thead>
                  <tr>
                    <th class="sortable" [class.sorted]="sortKey === 'name'" (click)="sortBy('name')">
                      {{ 'MATERIAL.COL_NAME' | translate }} <i class="bi sort-ic" [ngClass]="sortIcon('name')"></i>
                    </th>
                    <th class="sortable" [class.sorted]="sortKey === 'subcat'" (click)="sortBy('subcat')">
                      {{ 'MATERIAL.COL_SUBCAT' | translate }} <i class="bi sort-ic" [ngClass]="sortIcon('subcat')"></i>
                    </th>
                    <th class="sortable" [class.sorted]="sortKey === 'stock'" (click)="sortBy('stock')">
                      {{ 'MATERIAL.COL_STOCK' | translate }} <i class="bi sort-ic" [ngClass]="sortIcon('stock')"></i>
                    </th>
                    <th class="sortable" [class.sorted]="sortKey === 'expiry'" (click)="sortBy('expiry')">
                      {{ 'MATERIAL.COL_EXPIRY' | translate }} <i class="bi sort-ic" [ngClass]="sortIcon('expiry')"></i>
                    </th>
                    <th class="th-actions">{{ 'MATERIAL.COL_ACTIONS' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let it of currentItems(); trackBy: trackByItem">
                    <td>
                      <div class="name-cell">
                        <span class="item-thumb" [class.is-empty]="!it.photoUrl">
                          <img *ngIf="it.photoUrl" [src]="it.photoUrl" [alt]="it.name" loading="lazy" />
                          <i *ngIf="!it.photoUrl" class="bi bi-box-seam"></i>
                        </span>
                        <span class="name-text">
                          <button type="button" class="item-name-btn" (click)="openUnits(it)"
                                  [title]="'MATERIAL.MANAGE_UNITS' | translate">
                            <span class="item-name">{{ it.name }}</span>
                            <i class="bi bi-calendar2-week unit-hint"></i>
                          </button>
                          <span class="item-notes" *ngIf="it.notes">{{ it.notes }}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span class="subcat-tag" *ngIf="subcatName(it.subcategoryId)">{{ subcatName(it.subcategoryId) }}</span>
                      <span class="text-soft" *ngIf="!subcatName(it.subcategoryId)">—</span>
                    </td>
                    <td>
                      <span class="stock-pill" [class.low]="it.lowStock">
                        {{ formatQty(it.quantity) }}<span class="unit" *ngIf="it.unit"> {{ it.unit }}</span>
                      </span>
                      <span class="low-badge" *ngIf="it.lowStock" [title]="'MATERIAL.LOW_STOCK' | translate">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                      </span>
                    </td>
                    <td>
                      <span *ngIf="it.expiryDate" class="expiry"
                            [class.expired]="isExpired(it.expiryDate)"
                            [class.soon]="isExpiringSoon(it.expiryDate)">{{ formatDate(it.expiryDate) }}</span>
                      <span class="soon-badge" *ngIf="isExpiringSoon(it.expiryDate)" [title]="'MATERIAL.EXPIRING_SOON' | translate">
                        <i class="bi bi-hourglass-split"></i>
                      </span>
                      <span class="exp-badge" *ngIf="isExpired(it.expiryDate)" [title]="'MATERIAL.EXPIRED' | translate">
                        <i class="bi bi-x-octagon-fill"></i>
                      </span>
                      <span class="text-soft" *ngIf="!it.expiryDate">—</span>
                    </td>
                    <td class="col-actions">
                      <button class="act in" (click)="openMovement(it, 'IN')" [title]="'MATERIAL.ORDER' | translate">
                        <i class="bi bi-plus-circle"></i>
                      </button>
                      <button class="act out" (click)="openMovement(it, 'OUT')" [title]="'MATERIAL.WITHDRAW' | translate">
                        <i class="bi bi-dash-circle"></i>
                      </button>
                      <button class="act edit" (click)="openItemModal(it)" [title]="'MATERIAL.EDIT' | translate">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="act del" (click)="deleteItem(it)" [title]="'COMMON.DELETE' | translate">
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>

        <!-- ════════ VISTA REPOSICIÓN ════════ -->
        <ng-container *ngIf="!loading && section === 'inventory' && view === 'restock'">
          <div class="restock-head restock-head-row">
            <p class="restock-hint">
              <i class="bi bi-info-circle"></i>
              {{ 'MATERIAL.RESTOCK_HINT' | translate }}
            </p>
            <button class="btn-primary-sph btn-sm-sph" *ngIf="restockItems().length > 0" (click)="createOrderFromRestock()">
              <i class="bi bi-clipboard-plus"></i> {{ 'MATERIAL.CREATE_ORDER_RESTOCK' | translate }}
            </button>
          </div>
          <div *ngIf="restockItems().length === 0" class="empty-state">
            <i class="bi bi-check2-circle display-5 mb-2"></i>
            <p class="mb-0">{{ 'MATERIAL.RESTOCK_EMPTY' | translate }}</p>
          </div>
          <div *ngIf="restockItems().length > 0" class="table-card">
            <div class="table-responsive">
              <table class="sph-table">
                <thead>
                  <tr>
                    <th>{{ 'MATERIAL.COL_NAME' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_CATEGORY' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_STOCK' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_MIN' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_SUGGESTED' | translate }}</th>
                    <th class="th-actions">{{ 'MATERIAL.COL_ACTIONS' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let it of restockItems(); trackBy: trackByItem">
                    <td>
                      <div class="item-name">{{ it.name }}</div>
                      <span class="subcat-tag" *ngIf="subcatName(it.subcategoryId)">{{ subcatName(it.subcategoryId) }}</span>
                    </td>
                    <td><span class="cat-tag">{{ tabLabel(it.category) | translate }}</span></td>
                    <td>
                      <span class="stock-pill low">
                        {{ formatQty(it.quantity) }}<span class="unit" *ngIf="it.unit"> {{ it.unit }}</span>
                      </span>
                    </td>
                    <td>{{ it.minStock !== null ? formatQty(it.minStock) : '—' }}</td>
                    <td><strong class="suggested-qty">+{{ formatQty(suggestedOrder(it)) }}</strong></td>
                    <td class="col-actions">
                      <button class="btn-primary-sph btn-sm-sph" (click)="openMovement(it, 'IN', suggestedOrder(it))">
                        <i class="bi bi-cart-plus"></i> {{ 'MATERIAL.ORDER' | translate }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>

        <!-- ════════ VISTA HISTORIAL ════════ -->
        <ng-container *ngIf="!loading && section === 'inventory' && view === 'history'">
          <div *ngIf="loadingHistory" class="empty-state">
            <div class="spinner-border spinner-sphaira" role="status"></div>
          </div>
          <div *ngIf="!loadingHistory && historyMovements().length === 0" class="empty-state">
            <i class="bi bi-clock-history display-5 mb-2"></i>
            <p class="mb-0">{{ 'MATERIAL.EMPTY_HISTORY' | translate }}</p>
          </div>
          <div *ngIf="!loadingHistory && historyMovements().length > 0" class="table-card">
            <div class="table-responsive">
              <table class="sph-table">
                <thead>
                  <tr>
                    <th>{{ 'MATERIAL.COL_DATE' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_TYPE' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_ITEM' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_QTY' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_PLAYER' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_USER' | translate }}</th>
                    <th>{{ 'MATERIAL.COL_REASON' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of historyMovements()">
                    <td class="nowrap">{{ formatDateTime(m.createdAt) }}</td>
                    <td>
                      <span class="type-pill"
                            [class.in]="m.type === 'IN'"
                            [class.out]="m.type === 'OUT'"
                            [class.init]="isInitialMovement(m)">
                        <i class="bi" [ngClass]="movementTypeIcon(m)"></i>
                        {{ movementTypeKey(m) | translate }}
                      </span>
                    </td>
                    <td>{{ m.itemName || '—' }}</td>
                    <td><strong>{{ formatQty(m.quantity) }}</strong></td>
                    <td>{{ m.playerName || '—' }}</td>
                    <td>{{ m.userName || '—' }}</td>
                    <td class="reason-cell">{{ m.reason || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>

        <!-- ════════ VISTA PEDIDOS ════════ -->
        <ng-container *ngIf="!loading && section === 'orders'">
          <div class="orders-head">
            <p class="restock-hint"><i class="bi bi-info-circle"></i> {{ 'MATERIAL.ORDERS_HINT' | translate }}</p>
            <button class="btn-primary-sph" (click)="openCreateOrder()">
              <i class="bi bi-plus-lg"></i> {{ 'MATERIAL.NEW_ORDER' | translate }}
            </button>
          </div>

          <div *ngIf="loadingOrders" class="empty-state">
            <div class="spinner-border spinner-sphaira" role="status"></div>
          </div>

          <div *ngIf="!loadingOrders && orders.length === 0" class="empty-state">
            <i class="bi bi-clipboard-x display-5 mb-2"></i>
            <p class="mb-0">{{ 'MATERIAL.ORDERS_EMPTY' | translate }}</p>
          </div>

          <div *ngIf="!loadingOrders && orders.length > 0" class="orders-list">
            <div class="order-card" *ngFor="let o of orders; trackBy: trackByOrder" [class.cancelled]="o.status === 'CANCELLED'">
              <div class="order-card-head" (click)="toggleOrder(o.orderId)">
                <div class="order-id">
                  <i class="bi" [ngClass]="expandedOrderId === o.orderId ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
                  <strong>{{ orderTitle(o) }}</strong>
                  <button class="order-rename-btn" (click)="openRename(o, $event)" [title]="'MATERIAL.RENAME' | translate">
                    <i class="bi bi-pencil"></i>
                  </button>
                </div>
                <span class="order-date"><i class="bi bi-calendar3"></i> {{ formatDateTime(o.createdAt) }}</span>
                <span class="ostatus" [ngClass]="'ost-' + o.status.toLowerCase()">{{ orderStatusKey(o.status) | translate }}</span>
                <span class="order-progress" [title]="'MATERIAL.RECEIVED' | translate">
                  <i class="bi bi-box-seam"></i> {{ formatQty(o.totalReceived) }} / {{ formatQty(o.totalOrdered) }}
                </span>
              </div>
              <div class="order-card-body" *ngIf="expandedOrderId === o.orderId">
                <p class="order-notes" *ngIf="o.notes"><i class="bi bi-card-text"></i> {{ o.notes }}</p>
                <p class="order-meta" *ngIf="o.createdByName">
                  <i class="bi bi-person"></i> {{ o.createdByName }}
                </p>
                <div class="table-responsive">
                  <table class="sph-table compact">
                    <thead>
                      <tr>
                        <th>{{ 'MATERIAL.COL_ITEM' | translate }}</th>
                        <th>{{ 'MATERIAL.COL_CATEGORY' | translate }}</th>
                        <th>{{ 'MATERIAL.ORDERED' | translate }}</th>
                        <th>{{ 'MATERIAL.RECEIVED' | translate }}</th>
                        <th>{{ 'MATERIAL.PENDING' | translate }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let l of o.lines">
                        <td>{{ l.itemName || '—' }}</td>
                        <td><span class="cat-tag" *ngIf="l.category">{{ catLabel(l.category) | translate }}</span></td>
                        <td>{{ formatQty(l.quantityOrdered) }}</td>
                        <td>{{ formatQty(l.quantityReceived) }}</td>
                        <td>
                          <span class="pending-pill" [class.done]="l.pending <= 0">
                            <i class="bi" [ngClass]="l.pending <= 0 ? 'bi-check2' : 'bi-hourglass-split'"></i>
                            {{ formatQty(l.pending) }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="order-actions">
                  <button class="btn-primary-sph btn-sm-sph" *ngIf="o.status === 'PENDING' || o.status === 'PARTIAL'"
                          (click)="openReceive(o)">
                    <i class="bi bi-box-arrow-in-down"></i> {{ 'MATERIAL.RECEIVE' | translate }}
                  </button>
                  <button class="btn-soft btn-sm-sph" *ngIf="o.status !== 'CANCELLED'" (click)="openEditOrder(o)">
                    <i class="bi bi-pencil"></i> {{ 'MATERIAL.EDIT' | translate }}
                  </button>
                  <button class="btn-soft btn-sm-sph" (click)="duplicateOrder(o)">
                    <i class="bi bi-files"></i> {{ 'MATERIAL.DUPLICATE' | translate }}
                  </button>
                  <button class="btn-soft btn-sm-sph" [disabled]="exportingOrderId === o.orderId" (click)="exportOrderPdf(o)">
                    <span *ngIf="exportingOrderId === o.orderId" class="spinner-border spinner-border-sm"></span>
                    <i class="bi bi-file-earmark-pdf" *ngIf="exportingOrderId !== o.orderId"></i> {{ 'MATERIAL.EXPORT_PDF' | translate }}
                  </button>
                  <button class="btn-soft btn-sm-sph" (click)="openRename(o, $event)">
                    <i class="bi bi-tag"></i> {{ 'MATERIAL.RENAME' | translate }}
                  </button>
                  <button class="btn-soft btn-sm-sph danger" *ngIf="o.status === 'PENDING' || o.status === 'PARTIAL'"
                          (click)="cancelOrderConfirm(o)">
                    <i class="bi bi-x-circle"></i> {{ 'MATERIAL.CANCEL_ORDER' | translate }}
                  </button>
                  <button class="btn-soft btn-sm-sph danger" (click)="deleteOrderConfirm(o, $event)">
                    <i class="bi bi-trash"></i> {{ 'MATERIAL.DELETE_ORDER' | translate }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

      </div>

      <!-- ════════ MODAL CREAR/EDITAR PEDIDO ════════ -->
      <div class="modal-backdrop-sph" *ngIf="orderModalOpen" (click)="closeOrderModal()">
        <div class="modal-sph modal-wide" (click)="$event.stopPropagation()">
          <div class="modal-head head-in">
            <h4>
              <i class="bi bi-clipboard-plus"></i>
              {{ (orderForm.orderId ? 'MATERIAL.EDIT_ORDER' : 'MATERIAL.NEW_ORDER') | translate }}
            </h4>
            <button class="modal-x" (click)="closeOrderModal()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <p class="receive-hint" *ngIf="orderForm.orderId && editOrderHasReceptions">
              <i class="bi bi-info-circle"></i> {{ 'MATERIAL.EDIT_RECEIVED_HINT' | translate }}
            </p>
            <div class="fld">
              <span>{{ 'MATERIAL.ORDER_NAME' | translate }}</span>
              <input type="text" [(ngModel)]="orderForm.name" maxlength="160"
                     [placeholder]="'MATERIAL.ORDER_NAME_PH' | translate" />
            </div>
            <div class="fld">
              <span>{{ 'MATERIAL.ADD_PRODUCTS' | translate }}</span>
              <div class="search-box modal-search">
                <i class="bi bi-search"></i>
                <input type="text" [(ngModel)]="orderProductSearch"
                       [placeholder]="'MATERIAL.SEARCH_PLACEHOLDER' | translate" />
                <button class="search-clear" *ngIf="orderProductSearch" (click)="orderProductSearch=''"><i class="bi bi-x-lg"></i></button>
              </div>
              <div class="product-picker" *ngIf="orderProductSearch.trim()">
                <button type="button" class="picker-item" *ngFor="let it of pickableItems()"
                        (click)="addOrderLine(it)">
                  <span class="picker-name">{{ it.name }}</span>
                  <span class="cat-tag">{{ catLabel(it.category) | translate }}</span>
                  <span class="picker-stock">{{ 'MATERIAL.COL_STOCK' | translate }}: {{ formatQty(it.quantity) }}</span>
                  <i class="bi bi-plus-circle"></i>
                </button>
                <p class="picker-empty" *ngIf="pickableItems().length === 0">{{ 'MATERIAL.NO_PRODUCTS' | translate }}</p>
              </div>
            </div>

            <div class="order-lines" *ngIf="orderForm.lines.length > 0">
              <div class="order-line" *ngFor="let l of orderForm.lines; let i = index">
                <div class="ol-info">
                  <span class="ol-name">{{ l.name }}</span>
                  <span class="cat-tag">{{ catLabel(l.category) | translate }}</span>
                </div>
                <div class="ol-qty">
                  <button type="button" (click)="stepOrderLine(i, -1)"><i class="bi bi-dash"></i></button>
                  <input type="number" min="1" step="1" [(ngModel)]="l.quantity" />
                  <button type="button" (click)="stepOrderLine(i, 1)"><i class="bi bi-plus"></i></button>
                </div>
                <button type="button" class="ol-remove" (click)="removeOrderLine(i)"><i class="bi bi-trash"></i></button>
              </div>
            </div>
            <p class="order-empty-lines" *ngIf="orderForm.lines.length === 0">
              <i class="bi bi-cart"></i> {{ 'MATERIAL.ORDER_NO_LINES' | translate }}
            </p>

            <div class="fld">
              <span>{{ 'MATERIAL.F_NOTES' | translate }}</span>
              <textarea rows="2" [(ngModel)]="orderForm.notes"
                        [placeholder]="'MATERIAL.ORDER_NOTES_PH' | translate"></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-soft" (click)="closeOrderModal()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn-primary-sph" [disabled]="orderForm.lines.length === 0 || savingOrder" (click)="saveOrder()">
              <span *ngIf="savingOrder" class="spinner-border spinner-border-sm"></span>
              <i class="bi bi-check-lg" *ngIf="!savingOrder"></i> {{ 'COMMON.SAVE' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ════════ MODAL RENOMBRAR PEDIDO ════════ -->
      <div class="modal-backdrop-sph" *ngIf="renameModalOpen" (click)="closeRename()">
        <div class="modal-sph" (click)="$event.stopPropagation()">
          <div class="modal-head head-in">
            <h4><i class="bi bi-tag"></i> {{ 'MATERIAL.RENAME_ORDER' | translate }}</h4>
            <button class="modal-x" (click)="closeRename()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="fld">
              <span>{{ 'MATERIAL.ORDER_NAME' | translate }}</span>
              <input type="text" [(ngModel)]="renameValue" maxlength="160"
                     [placeholder]="'MATERIAL.ORDER_NAME_PH' | translate"
                     (keyup.enter)="confirmRename()" />
              <small class="fld-hint">{{ 'MATERIAL.RENAME_HINT' | translate }}</small>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-soft" (click)="closeRename()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn-primary-sph" [disabled]="savingRename" (click)="confirmRename()">
              <span *ngIf="savingRename" class="spinner-border spinner-border-sm"></span>
              <i class="bi bi-check-lg" *ngIf="!savingRename"></i> {{ 'COMMON.SAVE' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ════════ MODAL RECIBIR PEDIDO ════════ -->
      <div class="modal-backdrop-sph" *ngIf="receiveModalOpen" (click)="closeReceive()">
        <div class="modal-sph modal-wide" (click)="$event.stopPropagation()">
          <div class="modal-head head-in">
            <h4><i class="bi bi-box-arrow-in-down"></i> {{ 'MATERIAL.RECEIVE_ORDER' | translate }} #{{ receiveOrderRef?.orderId }}</h4>
            <button class="modal-x" (click)="closeReceive()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <p class="receive-hint"><i class="bi bi-info-circle"></i> {{ 'MATERIAL.RECEIVE_HINT' | translate }}</p>

            <!-- Escaneo IA del albarán -->
            <div class="albaran-scan">
              <input type="file" #albaranInput accept="image/*,application/pdf" multiple hidden
                     (change)="onAlbaranFiles($event)" />
              <button class="btn-scan-albaran" [disabled]="scanningAlbaran" (click)="albaranInput.click()">
                <span *ngIf="scanningAlbaran" class="spinner-border spinner-border-sm"></span>
                <i class="bi bi-camera" *ngIf="!scanningAlbaran"></i>
                {{ (scanningAlbaran ? 'MATERIAL.SCANNING' : 'MATERIAL.SCAN_ALBARAN') | translate }}
              </button>
              <small class="albaran-hint">{{ 'MATERIAL.SCAN_ALBARAN_HINT' | translate }}</small>
            </div>
            <p class="albaran-warning" *ngIf="albaranWarning">
              <i class="bi bi-exclamation-triangle"></i> {{ albaranWarning }}
            </p>

            <div class="receive-line" *ngFor="let rl of receiveLines">
              <div class="rl-head">
                <span class="rl-name">{{ rl.itemName }}</span>
                <span class="rl-pending">{{ 'MATERIAL.PENDING' | translate }}: <strong>{{ formatQty(rl.pending) }}</strong></span>
              </div>
              <div class="rl-fields">
                <div class="fld">
                  <span>{{ 'MATERIAL.UNITS_ARRIVED' | translate }}</span>
                  <input type="number" min="0" step="1" [(ngModel)]="rl.qty" />
                </div>
                <div class="fld">
                  <span>{{ 'MATERIAL.NEW_EXPIRY' | translate }}</span>
                  <input type="date" [(ngModel)]="rl.expiryDate" />
                </div>
              </div>
            </div>

            <!-- Productos del albarán que no casan con el pedido -->
            <div class="albaran-unmatched" *ngIf="albaranUnmatched.length > 0">
              <p class="au-title"><i class="bi bi-question-circle"></i> {{ 'MATERIAL.ALBARAN_UNMATCHED' | translate }}</p>
              <div class="au-row" *ngFor="let u of albaranUnmatched; let i = index">
                <div class="au-info">
                  <span class="au-desc">{{ u.description }}</span>
                  <span class="au-qty" *ngIf="u.quantity > 0">× {{ formatQty(u.quantity) }}</span>
                  <span class="au-exp" *ngIf="u.expiryDate"><i class="bi bi-calendar-event"></i> {{ u.expiryDate }}</span>
                </div>
                <button *ngIf="u.suggestedItemId != null" class="btn-add-unmatched"
                        [disabled]="addingUnmatchedIdx !== null" (click)="addUnmatchedToOrder(u, i)">
                  <span *ngIf="addingUnmatchedIdx === i" class="spinner-border spinner-border-sm"></span>
                  <i class="bi bi-plus-circle" *ngIf="addingUnmatchedIdx !== i"></i>
                  {{ 'MATERIAL.ADD_AS' | translate }} "{{ u.suggestedItemName }}"
                </button>
                <button *ngIf="u.suggestedItemId == null" class="btn-add-unmatched ghost"
                        [disabled]="addingUnmatchedIdx !== null" (click)="findProductForOrder()">
                  <i class="bi bi-search"></i> {{ 'MATERIAL.FIND_PRODUCT' | translate }}
                </button>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-soft" (click)="closeReceive()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn-primary-sph" [disabled]="savingOrder || !hasReceiveInput()" (click)="confirmReceive()">
              <span *ngIf="savingOrder" class="spinner-border spinner-border-sm"></span>
              <i class="bi bi-check-lg" *ngIf="!savingOrder"></i> {{ 'MATERIAL.CONFIRM_RECEIPT' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ════════ MODAL UNIDADES (caducidad por unidad) ════════ -->
      <div class="modal-backdrop-sph" *ngIf="unitsModalOpen" (click)="closeUnits()">
        <div class="modal-sph modal-wide" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h4><i class="bi bi-calendar2-week"></i> {{ 'MATERIAL.UNITS_TITLE' | translate }}</h4>
            <button class="modal-x" (click)="closeUnits()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="units-head">
              <span class="units-item-name">{{ unitsItemRef?.name }}</span>
              <span class="units-count">{{ unitsList.length }} {{ 'MATERIAL.UNITS_WORD' | translate }}</span>
            </div>
            <p class="receive-hint"><i class="bi bi-info-circle"></i> {{ 'MATERIAL.UNITS_HINT' | translate }}</p>

            <div class="units-loading" *ngIf="loadingUnits">
              <span class="spinner-border spinner-border-sm"></span> {{ 'COMMON.LOADING' | translate }}
            </div>

            <div class="units-empty" *ngIf="!loadingUnits && unitsList.length === 0">
              <i class="bi bi-inbox"></i> {{ 'MATERIAL.UNITS_EMPTY' | translate }}
            </div>

            <!-- Aplicar misma caducidad a todas -->
            <div class="units-bulk" *ngIf="!loadingUnits && unitsList.length > 1">
              <span>{{ 'MATERIAL.UNITS_BULK' | translate }}</span>
              <input type="date" [(ngModel)]="unitsBulkDate" />
              <button type="button" class="btn-soft btn-sm-sph" [disabled]="!unitsBulkDate" (click)="applyBulkExpiry()">
                <i class="bi bi-arrows-fullscreen"></i> {{ 'MATERIAL.UNITS_BULK_APPLY' | translate }}
              </button>
            </div>

            <div class="units-list" *ngIf="!loadingUnits && unitsList.length > 0">
              <div class="unit-row" *ngFor="let u of unitsList; let idx = index"
                   [class.expired]="isExpired(u.expiryDate)"
                   [class.soon]="isExpiringSoon(u.expiryDate)">
                <span class="unit-idx">#{{ idx + 1 }}</span>
                <input type="date" [(ngModel)]="u.expiryDate" />
                <button type="button" class="unit-clear" *ngIf="u.expiryDate"
                        [title]="'MATERIAL.UNITS_CLEAR' | translate" (click)="u.expiryDate = null">
                  <i class="bi bi-x-circle"></i>
                </button>
                <span class="unit-flag soon" *ngIf="isExpiringSoon(u.expiryDate)"><i class="bi bi-hourglass-split"></i></span>
                <span class="unit-flag exp" *ngIf="isExpired(u.expiryDate)"><i class="bi bi-x-octagon-fill"></i></span>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-soft" (click)="closeUnits()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn-primary-sph" [disabled]="savingUnits || loadingUnits" (click)="saveUnits()">
              <span *ngIf="savingUnits" class="spinner-border spinner-border-sm me-1"></span>
              <i class="bi bi-check-lg" *ngIf="!savingUnits"></i> {{ 'COMMON.SAVE' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ════════ MODAL ARTÍCULO ════════ -->
      <div class="modal-backdrop-sph" *ngIf="itemModalOpen" (click)="closeItemModal()">
        <div class="modal-sph" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h4>{{ (itemForm.itemId ? 'MATERIAL.EDIT_ITEM' : 'MATERIAL.NEW_ITEM') | translate }}</h4>
            <button class="modal-x" (click)="closeItemModal()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <!-- Foto del artículo -->
            <div class="photo-block">
              <div class="photo-preview" [class.is-empty]="!itemForm.photoUrl">
                <img *ngIf="itemForm.photoUrl" [src]="itemForm.photoUrl" [alt]="itemForm.name" />
                <i *ngIf="!itemForm.photoUrl" class="bi bi-image"></i>
                <div class="photo-loading" *ngIf="uploadingPhoto">
                  <span class="spinner-border spinner-border-sm"></span>
                </div>
              </div>
              <div class="photo-actions" *ngIf="itemForm.itemId">
                <input #photoInput type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                       (change)="onPhotoSelected($event)" hidden />
                <button type="button" class="btn-soft btn-sm-sph" [disabled]="uploadingPhoto"
                        (click)="triggerPhotoInput(photoInput)">
                  <i class="bi bi-camera"></i>
                  {{ (itemForm.photoUrl ? 'MATERIAL.CHANGE_PHOTO' : 'MATERIAL.ADD_PHOTO') | translate }}
                </button>
                <button type="button" class="btn-soft btn-sm-sph danger" *ngIf="itemForm.photoUrl"
                        [disabled]="uploadingPhoto" (click)="removePhoto()">
                  <i class="bi bi-trash"></i> {{ 'MATERIAL.REMOVE_PHOTO' | translate }}
                </button>
              </div>
              <p class="photo-hint" *ngIf="!itemForm.itemId">
                <i class="bi bi-info-circle"></i> {{ 'MATERIAL.PHOTO_AFTER_SAVE' | translate }}
              </p>
            </div>
            <label class="fld">
              <span>{{ 'MATERIAL.F_NAME' | translate }} *</span>
              <input type="text" [(ngModel)]="itemForm.name" maxlength="160" />
            </label>
            <label class="fld">
              <span>{{ 'MATERIAL.F_SUBCAT' | translate }}</span>
              <select [(ngModel)]="itemForm.subcategoryId">
                <option [ngValue]="null">{{ 'MATERIAL.NO_SUBCAT' | translate }}</option>
                <option *ngFor="let s of currentSubcats()" [ngValue]="s.subcategoryId">{{ s.name }}</option>
              </select>
            </label>
            <div class="fld-row">
              <label class="fld">
                <span>{{ 'MATERIAL.F_UNIT' | translate }}</span>
                <input type="text" [(ngModel)]="itemForm.unit" maxlength="30" [placeholder]="'MATERIAL.UNIT_PLACEHOLDER' | translate" />
              </label>
              <label class="fld">
                <span>{{ 'MATERIAL.F_MIN_STOCK' | translate }}</span>
                <input type="number" min="0" step="any" [(ngModel)]="itemForm.minStock" />
              </label>
            </div>
            <div class="fld-row">
              <label class="fld" *ngIf="!itemForm.itemId">
                <span>{{ 'MATERIAL.F_INITIAL_QTY' | translate }}</span>
                <input type="number" min="0" step="any" [(ngModel)]="itemForm.initialQuantity" />
              </label>
              <label class="fld">
                <span>{{ 'MATERIAL.F_EXPIRY' | translate }}</span>
                <input type="date" [(ngModel)]="itemForm.expiryDate" />
              </label>
            </div>
            <label class="fld">
              <span>{{ 'MATERIAL.F_NOTES' | translate }}</span>
              <textarea rows="2" [(ngModel)]="itemForm.notes"></textarea>
            </label>
          </div>
          <div class="modal-foot">
            <button class="btn-soft" (click)="closeItemModal()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn-primary-sph" [disabled]="saving || !itemForm.name.trim()" (click)="saveItem()">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ 'COMMON.SAVE' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ════════ MODAL MOVIMIENTO ════════ -->
      <div class="modal-backdrop-sph" *ngIf="movementModalOpen" (click)="closeMovement()">
        <div class="modal-sph" (click)="$event.stopPropagation()">
          <div class="modal-head" [class.head-in]="movementForm.type === 'IN'" [class.head-out]="movementForm.type === 'OUT'">
            <h4>
              <i class="bi" [ngClass]="movementForm.type === 'IN' ? 'bi-plus-circle' : 'bi-dash-circle'"></i>
              {{ (movementForm.type === 'IN' ? 'MATERIAL.ORDER_TITLE' : 'MATERIAL.WITHDRAW_TITLE') | translate }}
            </h4>
            <button class="modal-x" (click)="closeMovement()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="mv-item">
              <span class="mv-item-name">{{ movementForm.item?.name }}</span>
              <span class="mv-item-stock">{{ 'MATERIAL.CURRENT_STOCK' | translate }}:
                <strong>{{ formatQty(movementForm.item?.quantity || 0) }}<span *ngIf="movementForm.item?.unit"> {{ movementForm.item?.unit }}</span></strong>
              </span>
            </div>
            <label class="fld">
              <span>{{ 'MATERIAL.F_QTY' | translate }} *</span>
              <input type="number" min="0" step="any" [(ngModel)]="movementForm.quantity" />
            </label>
            <label class="fld">
              <span>{{ 'MATERIAL.F_PLAYER' | translate }}</span>
              <select [(ngModel)]="movementForm.playerId">
                <option [ngValue]="null">{{ 'MATERIAL.NO_PLAYER' | translate }}</option>
                <option *ngFor="let p of players" [ngValue]="p.playerId">{{ p.name }}</option>
              </select>
            </label>
            <label class="fld">
              <span>{{ 'MATERIAL.F_REASON' | translate }}</span>
              <textarea rows="2" [(ngModel)]="movementForm.reason" [placeholder]="'MATERIAL.REASON_PLACEHOLDER' | translate"></textarea>
            </label>
          </div>
          <div class="modal-foot">
            <button class="btn-soft" (click)="closeMovement()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn-primary-sph" [class.btn-out]="movementForm.type === 'OUT'"
                    [disabled]="saving || !movementForm.quantity || movementForm.quantity <= 0" (click)="saveMovement()">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ (movementForm.type === 'IN' ? 'MATERIAL.CONFIRM_ORDER' : 'MATERIAL.CONFIRM_WITHDRAW') | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ════════ MODAL SUBCATEGORÍAS ════════ -->
      <div class="modal-backdrop-sph" *ngIf="subcatModalOpen" (click)="closeSubcatManager()">
        <div class="modal-sph" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h4><i class="bi bi-tags me-2"></i>{{ 'MATERIAL.MANAGE_SUBCATS' | translate }} · {{ tabLabel(activeTab) | translate }}</h4>
            <button class="modal-x" (click)="closeSubcatManager()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <ul class="subcat-edit-list">
              <li *ngFor="let s of currentSubcats()">
                <input type="text" [(ngModel)]="s.name" (blur)="renameSubcat(s)" />
                <button class="act del" (click)="deleteSubcat(s)" [title]="'COMMON.DELETE' | translate">
                  <i class="bi bi-trash"></i>
                </button>
              </li>
              <li *ngIf="currentSubcats().length === 0" class="subcat-empty">{{ 'MATERIAL.NO_SUBCATS' | translate }}</li>
            </ul>
            <div class="subcat-add">
              <input type="text" [(ngModel)]="newSubcatName" [placeholder]="'MATERIAL.NEW_SUBCAT_PLACEHOLDER' | translate"
                     (keyup.enter)="addSubcat()" maxlength="120" />
              <button class="btn-primary-sph" [disabled]="!newSubcatName.trim()" (click)="addSubcat()">
                <i class="bi bi-plus-lg"></i> {{ 'MATERIAL.ADD' | translate }}
              </button>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-soft" (click)="closeSubcatManager()">{{ 'COMMON.CLOSE' | translate }}</button>
          </div>
        </div>
      </div>

      <!-- ════════ STAGE OCULTO PARA PDF DE PEDIDO ════════ -->
      <div class="pdf-stage-host" aria-hidden="true">
        <div #orderPdfStage class="order-pdf-stage" *ngIf="pdfOrder">
          <div class="opdf-meta">
            <div class="opdf-meta-row">
              <span class="opdf-label">{{ 'MATERIAL.ORDER_N' | translate }}</span>
              <span class="opdf-value">#{{ pdfOrder.orderId }}</span>
            </div>
            <div class="opdf-meta-row">
              <span class="opdf-label">{{ 'MATERIAL.COL_DATE' | translate }}</span>
              <span class="opdf-value">{{ formatDateTime(pdfOrder.createdAt) }}</span>
            </div>
            <div class="opdf-meta-row" *ngIf="pdfOrder.notes">
              <span class="opdf-label">{{ 'MATERIAL.F_NOTES' | translate }}</span>
              <span class="opdf-value">{{ pdfOrder.notes }}</span>
            </div>
          </div>
          <table class="opdf-table">
            <thead>
              <tr>
                <th class="opdf-th-name">{{ 'MATERIAL.COL_ITEM' | translate }}</th>
                <th class="opdf-th-qty">{{ 'MATERIAL.UNITS_WORD' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let l of pdfOrder.lines">
                <td class="opdf-td-name">{{ l.itemName }}</td>
                <td class="opdf-td-qty">{{ formatQty(l.quantityOrdered) }}<span class="opdf-unit" *ngIf="unitForItem(l.itemId)"> {{ unitForItem(l.itemId) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .mat-page { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background: #f4f4f4; min-height: 100vh; padding-bottom: 40px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; gap: 12px; border-bottom: 1px solid #e9ecef; background: #fff; }
    .header-center { text-align: center; flex: 1; }
    .page-title { margin: 0; font-weight: 700; color: #002c40; display: inline-flex; align-items: center; }
    .page-title i { color: #31b270; }
    .page-subtitle { margin: 4px 0 0; color: #636363; font-size: 0.92rem; }
    .btn-back-clean { display: inline-flex; align-items: center; gap: 8px; background: rgba(49,178,112,0.08); border: 0; color: #002c40; padding: 0.4rem 0.75rem; border-radius: 8px; cursor: pointer; transition: background .2s, transform .15s; font-weight: 600; }
    .btn-back-clean:hover { background: rgba(49,178,112,0.18); transform: translateX(-2px); }
    .page-header-spacer { width: 110px; }
    .spinner-sphaira { color: #31b270; }
    .text-soft { color: #636363; }
    .nowrap { white-space: nowrap; }

    /* Tabs */
    .tabs-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 18px 0 10px; }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; flex: 1 1 0; min-width: 0; }
    /* "Pedidos" centrado en la pantalla, a la misma altura que el resto de pestañas. */
    .tab-orders-center { flex: 0 0 auto; }
    .tabs-right-spacer { flex: 1 1 0; }
    .tab { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e3e9ed; color: #002c40; padding: 9px 16px; border-radius: 999px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all .15s; }
    .tab i { color: #31b270; }
    .tab:hover { border-color: #31b270; }
    .tab.active { background: linear-gradient(135deg, #002c40, #013a52); color: #fff; border-color: #002c40; }
    .tab.active i { color: #6fe0a6; }
    .right-actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; flex: 1 1 0; min-width: 0; }
    .view-switch { display: inline-flex; background: #fff; border: 1px solid #e3e9ed; border-radius: 10px; padding: 3px; gap: 2px; }
    .vbtn { background: transparent; border: 0; color: #636363; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 0.84rem; cursor: pointer; }
    .vbtn.active { background: #c4e8d6; color: #002c40; }
    .btn-export { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #1d6f42; color: #15663f; padding: 8px 14px; border-radius: 10px; font-weight: 700; font-size: 0.84rem; cursor: pointer; transition: all .15s; }
    .btn-export:hover { background: #15663f; color: #fff; }
    .btn-export:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Subcat bar */
    .subcat-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 6px 0 14px; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { background: #fff; border: 1px solid #e3e9ed; color: #002c40; padding: 6px 14px; border-radius: 999px; font-weight: 600; font-size: 0.82rem; cursor: pointer; transition: all .15s; }
    .chip:hover { border-color: #31b270; }
    .chip.active { background: #31b270; border-color: #31b270; color: #fff; }
    .subcat-actions { display: flex; gap: 8px; }
    .btn-soft { display: inline-flex; align-items: center; gap: 6px; background: rgba(0,44,64,0.06); border: 0; color: #002c40; padding: 8px 14px; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .btn-soft:hover { background: rgba(0,44,64,0.12); }
    .btn-primary-sph { display: inline-flex; align-items: center; gap: 6px; background: #31b270; border: 0; color: #fff; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: background .15s; }
    .btn-primary-sph:hover { background: #2a9c61; }
    .btn-primary-sph:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary-sph.btn-out { background: #d9772e; }
    .btn-primary-sph.btn-out:hover { background: #c3651f; }

    .empty-state { padding: 48px 16px; text-align: center; color: #636363; background: #fff; border-radius: 12px; margin-top: 8px; box-shadow: 0 1px 3px rgba(0,44,64,0.04); }
    .empty-state i { color: #31b270; }

    /* Tabla */
    .table-card { background: #fff; border-radius: 14px; margin: 4px 0 24px; box-shadow: 0 1px 3px rgba(0,44,64,0.06); border: 1px solid #eef1f3; overflow: hidden; }
    .table-responsive { overflow-x: auto; }
    .sph-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 820px; }
    .sph-table thead th { position: sticky; top: 0; z-index: 2; background: linear-gradient(135deg, #002c40 0%, #013a52 100%); color: #fff; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 14px; text-align: left; white-space: nowrap; }
    .th-actions { text-align: right; }
    .sph-table th.sortable { cursor: pointer; user-select: none; transition: color 0.15s ease; }
    .sph-table th.sortable:hover { color: #6fe0a6; }
    .sort-ic { font-size: 0.7rem; opacity: 0.45; margin-left: 4px; vertical-align: baseline; }
    .sph-table th.sorted .sort-ic { opacity: 1; color: #6fe0a6; }
    .sph-table tbody td { padding: 12px 14px; border-bottom: 1px solid #eef1f3; vertical-align: middle; color: #002c40; }
    .sph-table tbody tr:nth-child(even) { background: #f9fbfc; }
    .sph-table tbody tr:hover { background: #f1f8f4; }
    .item-name { font-weight: 700; color: #002c40; }
    .item-name-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; color: inherit; }
    .item-name-btn:hover .item-name { color: #31b270; text-decoration: underline; }
    .item-name-btn .unit-hint { font-size: 0.78rem; color: #b6c6cd; opacity: 0; transition: opacity .15s; }
    .item-name-btn:hover .unit-hint { opacity: 1; color: #31b270; }
    .item-notes { font-size: 0.78rem; color: #636363; margin-top: 2px; }
    .name-cell { display: flex; align-items: center; gap: 10px; }
    .name-text { display: flex; flex-direction: column; min-width: 0; }
    .item-thumb { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 9px; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; background: #eef4f1; border: 1px solid #e3e9ed; }
    .item-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .item-thumb.is-empty i { color: #b6c6cd; font-size: 1rem; }
    .subcat-tag { display: inline-block; background: #eef4f1; color: #15663f; border-radius: 999px; padding: 2px 10px; font-size: 0.78rem; font-weight: 600; }
    .stock-pill { display: inline-flex; align-items: center; min-width: 40px; justify-content: center; background: #c4e8d6; color: #002c40; border-radius: 999px; padding: 3px 12px; font-weight: 800; font-size: 0.88rem; }
    .stock-pill.low { background: #ffe0d6; color: #9a3412; }
    .stock-pill .unit { font-weight: 600; margin-left: 3px; font-size: 0.78rem; }
    .low-badge { color: #d9772e; margin-left: 6px; }
    .expiry { font-weight: 600; }
    .expiry.expired { color: #b1231b; }
    .col-actions { text-align: right; white-space: nowrap; }
    .act { background: none; border: 1px solid #e3e9ed; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; margin-left: 4px; transition: all .15s; }
    .act i { font-size: 0.95rem; }
    .act.in { color: #15663f; } .act.in:hover { background: #c4e8d6; border-color: #31b270; }
    .act.out { color: #d9772e; } .act.out:hover { background: #ffe7d6; border-color: #d9772e; }
    .act.edit { color: #013a52; } .act.edit:hover { background: #e6eef2; }
    .act.del { color: #b1231b; } .act.del:hover { background: #fde2e0; }
    .reason-cell { max-width: 260px; white-space: normal; }

    .type-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 0.78rem; }
    .type-pill.in { background: #c4e8d6; color: #15663f; }
    .type-pill.out { background: #ffe0d6; color: #9a3412; }
    .type-pill.init { background: #e6eef2; color: #013a52; }

    /* Badge en conmutador de vista */
    .vbtn { position: relative; display: inline-flex; align-items: center; gap: 5px; }
    .vbtn-badge { background: #d9772e; color: #fff; border-radius: 999px; font-size: 0.66rem; font-weight: 800; min-width: 17px; height: 17px; display: inline-flex; align-items: center; justify-content: center; padding: 0 5px; }
    .vbtn.active .vbtn-badge { background: #fff; color: #9a3412; }

    /* Buscador + filtros */
    .filter-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 14px; }
    .search-box { position: relative; display: flex; align-items: center; flex: 1; min-width: 220px; max-width: 380px; }
    .search-box > i { position: absolute; left: 12px; color: #94a3b8; font-size: 0.9rem; pointer-events: none; }
    .search-box input { width: 100%; border: 1px solid #d4dde2; border-radius: 10px; padding: 9px 34px 9px 34px; color: #002c40; font-size: 0.9rem; font-family: inherit; background: #fff; }
    .search-box input:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49,178,112,0.15); outline: none; }
    .search-clear { position: absolute; right: 8px; background: none; border: 0; color: #94a3b8; cursor: pointer; width: 22px; height: 22px; border-radius: 6px; }
    .search-clear:hover { background: #eef1f3; color: #002c40; }
    .filter-toggles { display: flex; gap: 8px; flex-wrap: wrap; }
    .ftoggle { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e3e9ed; color: #636363; padding: 8px 14px; border-radius: 999px; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all .15s; }
    .ftoggle i { font-size: 0.85rem; }
    .ftoggle.low.active { background: #ffe0d6; border-color: #d9772e; color: #9a3412; }
    .ftoggle.soon.active { background: #fff3d6; border-color: #d99e2e; color: #8a6204; }
    .ftoggle.expired.active { background: #ffe0de; border-color: #d96b5e; color: #b1231b; }
    .ftoggle:hover { border-color: #31b270; }
    .ftoggle-count { background: rgba(0,0,0,0.08); border-radius: 999px; padding: 0 6px; font-size: 0.7rem; font-weight: 800; }

    /* Badges de caducidad */
    .expiry.soon { color: #8a6204; }
    .soon-badge { color: #d99e2e; margin-left: 6px; }
    .exp-badge { color: #b1231b; margin-left: 6px; }

    /* Reposición */
    .restock-head { margin: 2px 0 12px; }
    .restock-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .restock-head-row .restock-hint { margin: 0; }
    .restock-hint { display: inline-flex; align-items: center; gap: 8px; background: #fff3d6; color: #8a6204; border: 1px solid #f1dca0; border-radius: 10px; padding: 8px 14px; font-size: 0.84rem; font-weight: 600; margin: 0; }
    .restock-hint i { color: #d99e2e; }
    .cat-tag { display: inline-block; background: #e6eef2; color: #013a52; border-radius: 999px; padding: 2px 10px; font-size: 0.78rem; font-weight: 700; }
    .suggested-qty { color: #15663f; font-size: 0.95rem; }
    .btn-sm-sph { padding: 6px 12px; font-size: 0.8rem; }

    /* Pestaña Pedidos */
    .tab-orders { position: relative; }
    .tab-badge { background: #31b270; color: #fff; border-radius: 999px; padding: 0 6px; font-size: 0.68rem; font-weight: 800; margin-left: 4px; }
    .orders-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 2px 0 14px; flex-wrap: wrap; }
    .orders-list { display: flex; flex-direction: column; gap: 10px; }
    .order-card { background: #fff; border: 1px solid #e3e9ed; border-radius: 12px; overflow: hidden; transition: box-shadow .15s; }
    .order-card:hover { box-shadow: 0 4px 16px rgba(0,44,64,0.08); }
    .order-card.cancelled { opacity: 0.6; }
    .order-card-head { display: flex; align-items: center; gap: 14px; padding: 12px 16px; cursor: pointer; flex-wrap: wrap; }
    .order-id { display: inline-flex; align-items: center; gap: 8px; color: #002c40; }
    .order-id strong { font-size: 0.95rem; }
    .order-rename-btn { background: transparent; border: 0; color: #9aa4ab; cursor: pointer; padding: 2px 4px; border-radius: 6px; line-height: 1; transition: color .15s, background .15s; }
    .order-rename-btn:hover { color: #31b270; background: rgba(49,178,112,0.10); }
    .fld-hint { display: block; margin-top: 6px; color: #9aa4ab; font-size: 0.78rem; }
    .order-date { color: #636363; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 5px; }
    .order-progress { color: #002c40; font-weight: 700; font-size: 0.84rem; display: inline-flex; align-items: center; gap: 5px; margin-left: auto; }
    .ostatus { border-radius: 999px; padding: 3px 12px; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: .3px; }
    .ostatus.ost-pending { background: #fff3d6; color: #8a6204; }
    .ostatus.ost-partial { background: #dbeafe; color: #1e5fa8; }
    .ostatus.ost-received { background: #d8f3e3; color: #15663f; }
    .ostatus.ost-cancelled { background: #f1f1f1; color: #777; }
    .order-card-body { padding: 4px 16px 16px; border-top: 1px solid #eef1f3; }
    .order-notes, .order-meta { margin: 10px 0 4px; color: #636363; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; }
    .order-meta { color: #002c40; }
    .sph-table.compact th, .sph-table.compact td { padding: 7px 10px; font-size: 0.85rem; }
    .pending-pill { display: inline-flex; align-items: center; gap: 4px; background: #fff3d6; color: #8a6204; border-radius: 999px; padding: 2px 9px; font-weight: 700; font-size: 0.8rem; }
    .pending-pill.done { background: #d8f3e3; color: #15663f; }
    .order-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

    /* Modal pedido */
    .modal-wide { max-width: 620px; }
    .modal-search { margin-top: 2px; }
    .product-picker { margin-top: 8px; border: 1px solid #e3e9ed; border-radius: 10px; max-height: 220px; overflow-y: auto; background: #fff; }
    .picker-item { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: none; border-bottom: 1px solid #f1f4f6; padding: 9px 12px; cursor: pointer; text-align: left; }
    .picker-item:last-child { border-bottom: 0; }
    .picker-item:hover { background: #f4faf7; }
    .picker-name { font-weight: 600; color: #002c40; flex: 1; }
    .picker-stock { color: #636363; font-size: 0.78rem; }
    .picker-item .bi-plus-circle { color: #31b270; font-size: 1.05rem; }
    .picker-empty { padding: 12px; margin: 0; text-align: center; color: #636363; font-size: 0.85rem; }
    .order-lines { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
    .order-line { display: flex; align-items: center; gap: 10px; background: #f4f7f9; border-radius: 10px; padding: 8px 12px; }
    .ol-info { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
    .ol-name { font-weight: 700; color: #002c40; font-size: 0.88rem; }
    .ol-qty { display: inline-flex; align-items: center; gap: 4px; }
    .ol-qty button { width: 28px; height: 28px; border: 1px solid #d4dde2; background: #fff; border-radius: 7px; color: #002c40; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .ol-qty button:hover { border-color: #31b270; color: #31b270; }
    .ol-qty input { width: 56px; text-align: center; border: 1px solid #d4dde2; border-radius: 7px; padding: 6px 4px; color: #002c40; }
    .ol-remove { border: 0; background: none; color: #b1231b; cursor: pointer; width: 30px; height: 30px; border-radius: 7px; }
    .ol-remove:hover { background: rgba(177,35,27,0.1); }
    .order-empty-lines { text-align: center; color: #94a3b8; font-size: 0.86rem; padding: 14px; margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .order-empty-lines .bi { font-size: 1.4rem; }
    .receive-hint { display: inline-flex; align-items: center; gap: 8px; background: #eef6ff; color: #1e5fa8; border-radius: 10px; padding: 8px 12px; font-size: 0.82rem; margin: 0 0 4px; }
    .receive-line { background: #f4f7f9; border-radius: 10px; padding: 10px 12px; }
    .rl-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
    .rl-name { font-weight: 700; color: #002c40; }
    .rl-pending { color: #636363; font-size: 0.82rem; }
    .rl-fields { display: flex; gap: 12px; } .rl-fields .fld { flex: 1; }
    .text-done { color: #15663f; font-weight: 700; }

    /* Escaneo IA del albarán */
    .albaran-scan { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding: 4px 0 6px; }
    .btn-scan-albaran { display: inline-flex; align-items: center; gap: 8px; border: 0; cursor: pointer;
      background: linear-gradient(135deg, #31b270, #002c40); color: #fff; font-weight: 600; font-size: 0.85rem;
      border-radius: 10px; padding: 9px 16px; transition: opacity .15s; }
    .btn-scan-albaran:disabled { opacity: .6; cursor: default; }
    .albaran-hint { color: #636363; font-size: 0.76rem; flex: 1 1 180px; }
    .albaran-warning { display: inline-flex; align-items: center; gap: 8px; background: #fff4e5; color: #a35a00;
      border-radius: 10px; padding: 8px 12px; font-size: 0.82rem; margin: 0 0 4px; }
    .albaran-unmatched { border-top: 1px dashed #d5dde2; margin-top: 6px; padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
    .au-title { font-weight: 700; color: #002c40; font-size: 0.86rem; margin: 0; display: inline-flex; align-items: center; gap: 6px; }
    .au-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
      background: #fbf7ef; border-radius: 10px; padding: 8px 12px; }
    .au-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
    .au-desc { font-weight: 600; color: #002c40; }
    .au-qty { color: #636363; font-size: 0.82rem; }
    .au-exp { color: #636363; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; }
    .btn-add-unmatched { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #31b270; cursor: pointer;
      background: #eafaf1; color: #15663f; font-weight: 600; font-size: 0.8rem; border-radius: 9px; padding: 7px 12px; }
    .btn-add-unmatched.ghost { border-color: #c3ccd2; background: #fff; color: #002c40; }
    .btn-add-unmatched:disabled { opacity: .6; cursor: default; }

    /* Unidades (caducidad por unidad) */
    .units-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    .units-item-name { font-weight: 800; color: #002c40; font-size: 1.02rem; }
    .units-count { font-size: 0.82rem; color: #636363; font-weight: 600; }
    .units-loading { display: inline-flex; align-items: center; gap: 8px; color: #636363; padding: 10px 0; }
    .units-empty { text-align: center; color: #93a4ac; padding: 18px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .units-empty .bi { font-size: 1.5rem; }
    .units-bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #f4f7f9; border-radius: 10px; padding: 8px 12px; }
    .units-bulk > span { font-size: 0.82rem; color: #636363; font-weight: 600; }
    .units-bulk input[type=date] { padding: 6px 8px; border: 1px solid #d6e0e5; border-radius: 8px; }
    .units-list { display: flex; flex-direction: column; gap: 8px; }
    .unit-row { display: flex; align-items: center; gap: 10px; background: #f9fbfc; border: 1px solid #eef2f4; border-radius: 10px; padding: 8px 12px; }
    .unit-row.soon { background: #fff7ea; border-color: #f3d8a0; }
    .unit-row.expired { background: #ffece5; border-color: #f3b8a0; }
    .unit-row .unit-idx { flex: 0 0 auto; width: 38px; font-weight: 800; color: #002c40; font-size: 0.84rem; }
    .unit-row input[type=date] { flex: 1; padding: 7px 10px; border: 1px solid #d6e0e5; border-radius: 8px; }
    .unit-clear { background: none; border: 0; color: #b6c6cd; cursor: pointer; padding: 2px; font-size: 1rem; }
    .unit-clear:hover { color: #d9772e; }
    .unit-flag { font-size: 0.95rem; }
    .unit-flag.soon { color: #d9772e; }
    .unit-flag.exp { color: #c0392b; }

    /* Stage oculto para PDF de pedido (capturado por html2canvas) */
    .pdf-stage-host { position: absolute; left: -10000px; top: 0; width: 760px; opacity: 0; pointer-events: none; }
    .order-pdf-stage { width: 760px; background: #fff; padding: 6px 4px; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color: #002c40; }
    .opdf-meta { margin-bottom: 16px; }
    .opdf-meta-row { display: flex; gap: 8px; font-size: 14px; margin-bottom: 5px; }
    .opdf-label { font-weight: 700; color: #15663f; min-width: 90px; }
    .opdf-value { color: #002c40; }
    .opdf-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .opdf-table thead th { background: #002c40; color: #fff; text-align: left; padding: 10px 12px; font-weight: 700; }
    .opdf-th-qty { text-align: center; width: 160px; text-transform: capitalize; }
    .opdf-table tbody td { padding: 9px 12px; border-bottom: 1px solid #e3e9ed; }
    .opdf-td-name { font-weight: 600; }
    .opdf-td-qty { text-align: right; font-weight: 700; }
    .opdf-unit { font-weight: 600; color: #636363; }
    .opdf-table tbody tr:nth-child(even) td { background: #f4f7f9; }
    .opdf-table tfoot td { padding: 10px 12px; border-top: 2px solid #002c40; font-weight: 800; }
    .opdf-foot-label { color: #15663f; }
    .opdf-foot-total { text-align: right; }

    /* Modales */
    .modal-backdrop-sph { position: fixed; inset: 0; background: rgba(0,20,30,0.55); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 16px; }
    .modal-sph { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; animation: pop .15s ease; }
    @keyframes pop { from { transform: scale(.96); opacity: .6; } to { transform: scale(1); opacity: 1; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: linear-gradient(135deg, #002c40, #013a52); color: #fff; }
    .modal-head.head-in { background: linear-gradient(135deg, #15663f, #31b270); }
    .modal-head.head-out { background: linear-gradient(135deg, #9a3412, #d9772e); }
    .modal-head h4 { margin: 0; font-size: 1.05rem; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }
    .modal-x { background: rgba(255,255,255,0.15); border: 0; color: #fff; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; }
    .modal-x:hover { background: rgba(255,255,255,0.28); }
    .modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; max-height: 70vh; overflow-y: auto; }
    .fld { display: flex; flex-direction: column; gap: 4px; }
    .fld > span { font-size: 0.74rem; color: #636363; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    .fld input, .fld select, .fld textarea { border: 1px solid #d4dde2; border-radius: 8px; padding: 8px 10px; color: #002c40; font-size: 0.9rem; font-family: inherit; }
    .fld input:focus, .fld select:focus, .fld textarea:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49,178,112,0.15); outline: none; }
    .fld-row { display: flex; gap: 12px; } .fld-row .fld { flex: 1; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #eef1f3; }
    .mv-item { background: #f4f7f9; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px; }
    .mv-item-name { font-weight: 700; color: #002c40; }
    .mv-item-stock { font-size: 0.82rem; color: #636363; }

    /* Bloque de foto en modal */
    .photo-block { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-bottom: 4px; border-bottom: 1px solid #eef1f3; }
    .photo-preview { position: relative; width: 120px; height: 120px; border-radius: 14px; overflow: hidden; background: #eef4f1; border: 1px solid #e3e9ed; display: flex; align-items: center; justify-content: center; }
    .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
    .photo-preview.is-empty i { color: #b6c6cd; font-size: 2.2rem; }
    .photo-loading { position: absolute; inset: 0; background: rgba(0,44,64,0.45); display: flex; align-items: center; justify-content: center; color: #fff; }
    .photo-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .btn-soft.danger { color: #b1231b; background: rgba(177,35,27,0.08); }
    .btn-soft.danger:hover { background: rgba(177,35,27,0.16); }
    .photo-hint { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 0.78rem; color: #636363; }
    .photo-hint i { color: #31b270; }

    .subcat-edit-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .subcat-edit-list li { display: flex; gap: 8px; align-items: center; }
    .subcat-edit-list input { flex: 1; border: 1px solid #d4dde2; border-radius: 8px; padding: 8px 10px; color: #002c40; }
    .subcat-empty { color: #636363; font-size: 0.85rem; justify-content: center; }
    .subcat-add { display: flex; gap: 8px; margin-top: 12px; }
    .subcat-add input { flex: 1; border: 1px solid #d4dde2; border-radius: 8px; padding: 8px 10px; color: #002c40; }

    @media (max-width: 640px) { .page-header-spacer { display: none; } .tabs-bar { flex-direction: column; align-items: stretch; } }

    /* Dark mode */
    :host-context(body.dark) .mat-page { background: #00131c; }
    :host-context(body.dark) .page-header { background: #001e2e; border-bottom-color: #00405c; }
    :host-context(body.dark) .page-title { color: #c4e8d6; }
    :host-context(body.dark) .page-subtitle, :host-context(body.dark) .text-soft { color: #94a3b8; }
    :host-context(body.dark) .tab, :host-context(body.dark) .chip, :host-context(body.dark) .view-switch { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .table-card, :host-context(body.dark) .empty-state { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .sph-table tbody td { color: #c4e8d6; border-bottom-color: #00405c; }
    :host-context(body.dark) .sph-table tbody tr:nth-child(even) { background: #00161f; }
    :host-context(body.dark) .sph-table tbody tr:hover { background: #002b3d; }
    :host-context(body.dark) .item-name { color: #c4e8d6; }
    :host-context(body.dark) .modal-sph { background: #001e2e; }
    :host-context(body.dark) .modal-body .fld input, :host-context(body.dark) .modal-body .fld select, :host-context(body.dark) .modal-body .fld textarea,
    :host-context(body.dark) .subcat-edit-list input, :host-context(body.dark) .subcat-add input { background: #00131c; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .modal-foot { border-top-color: #00405c; }
    :host-context(body.dark) .mv-item { background: #00131c; }
    :host-context(body.dark) .order-card { background: #001e2e; border-color: #00405c; }
    :host-context(body.dark) .order-id, :host-context(body.dark) .order-progress, :host-context(body.dark) .ol-name, :host-context(body.dark) .picker-name, :host-context(body.dark) .rl-name { color: #c4e8d6; }
    :host-context(body.dark) .order-card-body { border-top-color: #00405c; }
    :host-context(body.dark) .order-line, :host-context(body.dark) .receive-line { background: #00131c; }
    :host-context(body.dark) .product-picker { background: #001e2e; border-color: #00405c; }
    :host-context(body.dark) .picker-item { border-bottom-color: #002b3d; }
    :host-context(body.dark) .picker-item:hover { background: #002b3d; }
    :host-context(body.dark) .ol-qty input, :host-context(body.dark) .ol-qty button { background: #00131c; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .receive-hint { background: #0a2a44; color: #8fc1f0; }
    :host-context(body.dark) .albaran-warning { background: #3a2a10; color: #f0c98f; }
    :host-context(body.dark) .albaran-hint, :host-context(body.dark) .au-qty, :host-context(body.dark) .au-exp { color: #8aa0ab; }
    :host-context(body.dark) .au-row { background: #00131c; }
    :host-context(body.dark) .au-title, :host-context(body.dark) .au-desc { color: #c4e8d6; }
    :host-context(body.dark) .btn-add-unmatched { background: #0a3320; border-color: #1f7a4d; color: #8fe0b3; }
    :host-context(body.dark) .btn-add-unmatched.ghost { background: #00131c; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .units-item-name { color: #c4e8d6; }
    :host-context(body.dark) .units-bulk, :host-context(body.dark) .unit-row { background: #00131c; border-color: #00405c; }
    :host-context(body.dark) .unit-row.soon { background: #2a2008; border-color: #6b5520; }
    :host-context(body.dark) .unit-row.expired { background: #2e1410; border-color: #6b3420; }
    :host-context(body.dark) .unit-row .unit-idx { color: #c4e8d6; }
    :host-context(body.dark) .units-bulk input[type=date], :host-context(body.dark) .unit-row input[type=date] { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .subcat-tag { background: #002b3d; color: #6fe0a6; }
    :host-context(body.dark) .act { border-color: #00405c; }
    :host-context(body.dark) .search-box input, :host-context(body.dark) .ftoggle { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .cat-tag { background: #002b3d; color: #c4e8d6; }
    :host-context(body.dark) .restock-hint { background: #2a2410; color: #f1dca0; border-color: #5a4d1c; }
    :host-context(body.dark) .btn-export { background: #001e2e; border-color: #1d6f42; color: #6fe0a6; }
    :host-context(body.dark) .btn-export:hover { background: #15663f; color: #fff; }
    :host-context(body.dark) .item-thumb, :host-context(body.dark) .photo-preview { background: #002b3d; border-color: #00405c; }
    :host-context(body.dark) .photo-block { border-bottom-color: #00405c; }
    :host-context(body.dark) .photo-hint { color: #94a3b8; }
  `]
})
export class MaterialEquipoComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  teamId = 0;
  clubId = 0;
  userId = 0;
  registeredByName: string | null = null;

  loading = false;
  loadingHistory = false;
  saving = false;
  exporting = false;
  uploadingPhoto = false;

  tabs: TabDef[] = [
    { code: 'PHYSIO', labelKey: 'MATERIAL.TAB_PHYSIO', icon: 'bi-bandaid' },
    { code: 'DRUGS', labelKey: 'MATERIAL.TAB_DRUGS', icon: 'bi-capsule' },
    { code: 'NUTRITION', labelKey: 'MATERIAL.TAB_NUTRITION', icon: 'bi-egg-fried' }
  ];
  activeTab: MaterialCategory = 'PHYSIO';
  activeSubcatId: number | null = null;
  view: 'items' | 'restock' | 'history' = 'items';
  /** Sección de nivel superior: inventario (3 categorías) o pedidos (global). */
  section: 'inventory' | 'orders' = 'inventory';

  /** Días de antelación para marcar un artículo como "caduca pronto". */
  readonly expirySoonDays = 15;

  searchText = '';
  filterLow = false;
  filterExpiring = false;
  filterExpired = false;

  // Ordenación de la tabla de inventario por columna.
  sortKey: 'name' | 'subcat' | 'stock' | 'expiry' | null = null;
  sortDir: 'asc' | 'desc' = 'asc';

  subcategories: MaterialSubcategory[] = [];
  items: MaterialItem[] = [];
  players: MaterialPlayer[] = [];
  movements: MaterialMovement[] = [];

  itemModalOpen = false;
  movementModalOpen = false;
  subcatModalOpen = false;
  newSubcatName = '';

  itemForm: ItemForm = this.emptyItemForm('PHYSIO');
  movementForm: MovementForm = { item: null, type: 'IN', quantity: null, reason: '', playerId: null };

  // ── Pedidos ───────────────────────────────────────────────
  orders: MaterialOrder[] = [];
  loadingOrders = false;
  ordersLoadedOnce = false;
  expandedOrderId: number | null = null;
  savingOrder = false;

  orderModalOpen = false;
  orderProductSearch = '';
  orderForm: OrderForm = { orderId: null, name: '', notes: '', lines: [] };
  /** True al editar un pedido que ya tenía recepciones (muestra aviso en el modal). */
  editOrderHasReceptions = false;

  // Renombrar pedido (modal ligero, funciona en cualquier estado)
  renameModalOpen = false;
  renameOrderRef: MaterialOrder | null = null;
  renameValue = '';
  savingRename = false;

  receiveModalOpen = false;
  receiveOrderRef: MaterialOrder | null = null;
  receiveLines: ReceiveLineForm[] = [];

  // Escaneo IA de albarán
  scanningAlbaran = false;
  addingUnmatchedIdx: number | null = null;
  albaranUnmatched: AlbaranUnmatchedLine[] = [];
  albaranWarning: string | null = null;

  // Unidades (caducidad por unidad)
  unitsModalOpen = false;
  unitsItemRef: MaterialItem | null = null;
  unitsList: MaterialItemUnit[] = [];
  loadingUnits = false;
  savingUnits = false;
  unitsBulkDate: string | null = null;

  // PDF de pedido
  @ViewChild('orderPdfStage') orderPdfStageRef?: ElementRef<HTMLElement>;
  pdfOrder: MaterialOrder | null = null;
  exportingOrderId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private clubService: ClubService,
    private notification: NotificationService,
    private materialService: MaterialService,
    private translate: TranslateService,
    private pdfExport: PdfExportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.teamId = Number(params.get('teamId') ?? 0);
      this.bootstrap();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private bootstrap(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = user?.userId ?? 0;
      this.registeredByName = this.buildUserName(user);
      this.load();
    });
  }

  private buildUserName(user: any): string | null {
    if (!user) return null;
    // El modelo User usa firstName/secondName/mail (no nombre/apellido/email).
    const n = (user.firstName ?? user.nombre ?? user.name ?? '').toString().trim();
    const a = (user.secondName ?? user.apellido ?? user.lastName ?? '').toString().trim();
    const full = (n + ' ' + a).trim();
    return full || (user.mail ?? user.email ?? null);
  }

  private load(): void {
    if (!this.teamId) { this.loading = false; this.cdr.markForCheck(); return; }
    this.loading = true;
    this.cdr.markForCheck();
    this.materialService.getBundle(this.teamId).subscribe({
      next: (b: MaterialBundle) => {
        this.clubId = b.clubId;
        this.subcategories = b.subcategories;
        this.items = b.items;
        this.players = b.players;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notification.error('MATERIAL.ERR_LOAD');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Navegación de vistas ──────────────────────────────────
  selectTab(code: MaterialCategory): void {
    this.section = 'inventory';
    this.activeTab = code;
    this.activeSubcatId = null;
    this.cdr.markForCheck();
  }
  selectSubcat(id: number | null): void { this.activeSubcatId = id; this.cdr.markForCheck(); }
  setView(v: 'items' | 'restock' | 'history'): void {
    this.view = v;
    if (v === 'history') this.loadHistory();
    this.cdr.markForCheck();
  }

  // ── Pedidos ───────────────────────────────────────────────
  openOrders(): void {
    this.section = 'orders';
    if (!this.ordersLoadedOnce) this.loadOrders();
    this.cdr.markForCheck();
  }

  private loadOrders(): void {
    if (!this.teamId) return;
    this.loadingOrders = true;
    this.cdr.markForCheck();
    this.materialService.getOrders(this.teamId).subscribe(list => {
      this.orders = list;
      this.ordersLoadedOnce = true;
      this.loadingOrders = false;
      this.cdr.markForCheck();
    });
  }

  /** Nº de pedidos abiertos (pendientes o parciales) para el badge de la pestaña. */
  openOrdersCount(): number {
    return this.orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL').length;
  }

  trackByOrder(_i: number, o: MaterialOrder): number { return o.orderId; }
  toggleOrder(id: number): void {
    this.expandedOrderId = this.expandedOrderId === id ? null : id;
    this.cdr.markForCheck();
  }

  orderStatusKey(status: MaterialOrderStatus): string {
    switch (status) {
      case 'PENDING': return 'MATERIAL.OST_PENDING';
      case 'PARTIAL': return 'MATERIAL.OST_PARTIAL';
      case 'RECEIVED': return 'MATERIAL.OST_RECEIVED';
      case 'CANCELLED': return 'MATERIAL.OST_CANCELLED';
      default: return status;
    }
  }
  catLabel(cat: MaterialCategory | null): string {
    if (!cat) return '';
    return this.tabs.find(t => t.code === cat)?.labelKey ?? '';
  }

  // -- Crear / editar pedido --
  openCreateOrder(): void {
    this.orderForm = { orderId: null, name: '', notes: '', lines: [] };
    this.editOrderHasReceptions = false;
    this.orderProductSearch = '';
    this.orderModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditOrder(o: MaterialOrder): void {
    this.orderForm = {
      orderId: o.orderId,
      name: o.name ?? '',
      notes: o.notes ?? '',
      lines: o.lines.map(l => ({
        itemId: l.itemId,
        name: l.itemName ?? this.items.find(i => i.itemId === l.itemId)?.name ?? '—',
        category: (l.category ?? this.items.find(i => i.itemId === l.itemId)?.category ?? 'PHYSIO') as MaterialCategory,
        quantity: l.quantityOrdered
      }))
    };
    this.editOrderHasReceptions = o.lines.some(l => l.quantityReceived > 0);
    this.orderProductSearch = '';
    this.orderModalOpen = true;
    this.cdr.markForCheck();
  }

  duplicateOrder(o: MaterialOrder): void {
    this.orderForm = {
      orderId: null,
      name: o.name ? this.tr('MATERIAL.COPY_OF') + ' ' + o.name : '',
      notes: o.notes ?? '',
      lines: o.lines.map(l => ({
        itemId: l.itemId,
        name: l.itemName ?? this.items.find(i => i.itemId === l.itemId)?.name ?? '—',
        category: (l.category ?? this.items.find(i => i.itemId === l.itemId)?.category ?? 'PHYSIO') as MaterialCategory,
        quantity: l.quantityOrdered
      }))
    };
    this.editOrderHasReceptions = false;
    this.orderProductSearch = '';
    this.orderModalOpen = true;
    this.cdr.markForCheck();
  }

  /** Crea un pedido prerelleno con las cantidades sugeridas de reposición. */
  createOrderFromRestock(): void {
    const lines: OrderLineForm[] = this.restockItems().map(it => ({
      itemId: it.itemId, name: it.name, category: it.category, quantity: this.suggestedOrder(it) || 1
    }));
    this.orderForm = { orderId: null, name: '', notes: '', lines };
    this.editOrderHasReceptions = false;
    this.orderProductSearch = '';
    this.section = 'orders';
    this.orderModalOpen = true;
    this.cdr.markForCheck();
  }

  closeOrderModal(): void { this.orderModalOpen = false; this.cdr.markForCheck(); }

  /** Artículos seleccionables en el buscador del pedido (no añadidos ya). */
  pickableItems(): MaterialItem[] {
    const q = this.orderProductSearch.trim().toLowerCase();
    if (!q) return [];
    const added = new Set(this.orderForm.lines.map(l => l.itemId));
    return this.items
      .filter(i => !added.has(i.itemId) && i.name.toLowerCase().includes(q))
      .slice(0, 30);
  }

  addOrderLine(it: MaterialItem): void {
    if (this.orderForm.lines.some(l => l.itemId === it.itemId)) return;
    this.orderForm.lines = [...this.orderForm.lines, { itemId: it.itemId, name: it.name, category: it.category, quantity: 1 }];
    this.orderProductSearch = '';
    this.cdr.markForCheck();
  }

  removeOrderLine(index: number): void {
    this.orderForm.lines = this.orderForm.lines.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  stepOrderLine(index: number, delta: number): void {
    const l = this.orderForm.lines[index];
    if (!l) return;
    const next = Math.max(1, (Number(l.quantity) || 0) + delta);
    l.quantity = next;
    this.cdr.markForCheck();
  }

  saveOrder(): void {
    const lines = this.orderForm.lines
      .map(l => ({ itemId: l.itemId, quantity: Number(l.quantity) || 0 }))
      .filter(l => l.quantity > 0);
    if (lines.length === 0) { this.notification.warning('MATERIAL.ORDER_NO_LINES'); return; }
    this.savingOrder = true;
    this.cdr.markForCheck();
    const name = this.orderForm.name.trim() || null;
    const notes = this.orderForm.notes.trim() || null;
    const done = (saved: MaterialOrder | null) => {
      this.savingOrder = false;
      if (!saved) { this.notification.error('MATERIAL.ERR_SAVE'); this.cdr.markForCheck(); return; }
      this.upsertOrder(saved);
      this.orderModalOpen = false;
      this.expandedOrderId = saved.orderId;
      this.notification.success('MATERIAL.ORDER_SAVED');
      this.cdr.markForCheck();
    };
    if (this.orderForm.orderId) {
      this.materialService.updateOrder(this.orderForm.orderId, { name, notes, lines }).subscribe(done);
    } else {
      this.materialService.createOrder(this.teamId, {
        clubId: this.clubId, name, notes, userId: this.userId, userName: this.registeredByName || '', lines
      }).subscribe(done);
    }
  }

  // -- Renombrar pedido --
  /** Nombre a mostrar en la cabecera: el personalizado o "Pedido #id". */
  orderTitle(o: MaterialOrder): string {
    return (o.name && o.name.trim()) ? o.name : this.tr('MATERIAL.ORDER_N') + o.orderId;
  }

  openRename(o: MaterialOrder, ev?: Event): void {
    if (ev) ev.stopPropagation();
    this.renameOrderRef = o;
    this.renameValue = o.name ?? '';
    this.renameModalOpen = true;
    this.cdr.markForCheck();
  }

  closeRename(): void { this.renameModalOpen = false; this.renameOrderRef = null; this.cdr.markForCheck(); }

  confirmRename(): void {
    const o = this.renameOrderRef;
    if (!o) return;
    const name = this.renameValue.trim() || null;
    this.savingRename = true;
    this.cdr.markForCheck();
    this.materialService.renameOrder(o.orderId, name).subscribe(updated => {
      this.savingRename = false;
      if (!updated) { this.notification.error('MATERIAL.ERR_SAVE'); this.cdr.markForCheck(); return; }
      this.upsertOrder(updated);
      this.renameModalOpen = false;
      this.renameOrderRef = null;
      this.notification.success('MATERIAL.ORDER_RENAMED');
      this.cdr.markForCheck();
    });
  }

  // -- Borrar pedido (permanente) --
  deleteOrderConfirm(o: MaterialOrder, ev?: Event): void {
    if (ev) ev.stopPropagation();
    if (!confirm(this.tr('MATERIAL.CONFIRM_DELETE_ORDER'))) return;
    this.materialService.deleteOrder(o.orderId).subscribe(ok => {
      if (!ok) { this.notification.error('MATERIAL.ERR_DELETE'); this.cdr.markForCheck(); return; }
      this.orders = this.orders.filter(x => x.orderId !== o.orderId);
      if (this.expandedOrderId === o.orderId) this.expandedOrderId = null;
      this.notification.success('MATERIAL.ORDER_DELETED');
      this.cdr.markForCheck();
    });
  }

  cancelOrderConfirm(o: MaterialOrder): void {
    if (!confirm(this.tr('MATERIAL.CONFIRM_CANCEL_ORDER'))) return;
    this.materialService.cancelOrder(o.orderId).subscribe(updated => {
      if (!updated) { this.notification.error('MATERIAL.ERR_SAVE'); this.cdr.markForCheck(); return; }
      this.upsertOrder(updated);
      this.notification.success('MATERIAL.ORDER_CANCELLED');
      this.cdr.markForCheck();
    });
  }

  // -- Recepción --
  openReceive(o: MaterialOrder): void {
    this.receiveOrderRef = o;
    this.receiveLines = o.lines
      .filter(l => l.pending > 0)
      .map(l => ({
        lineId: l.lineId, itemId: l.itemId, itemName: l.itemName ?? '—', category: l.category,
        ordered: l.quantityOrdered, received: l.quantityReceived, pending: l.pending,
        qty: l.pending, expiryDate: null
      }));
    this.albaranUnmatched = [];
    this.albaranWarning = null;
    this.scanningAlbaran = false;
    this.addingUnmatchedIdx = null;
    this.receiveModalOpen = true;
    this.cdr.markForCheck();
  }

  closeReceive(): void {
    this.receiveModalOpen = false;
    this.receiveOrderRef = null;
    this.albaranUnmatched = [];
    this.albaranWarning = null;
    this.cdr.markForCheck();
  }

  // -- Escaneo IA de albarán --
  onAlbaranFiles(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = ''; // permitir volver a elegir el mismo fichero
    if (files.length === 0 || !this.receiveOrderRef) return;
    this.scanningAlbaran = true;
    this.albaranWarning = null;
    this.cdr.markForCheck();
    this.materialService.scanAlbaran(this.receiveOrderRef.orderId, files).subscribe(res => {
      this.scanningAlbaran = false;
      if (!res) { this.notification.error('MATERIAL.SCAN_ERROR'); this.cdr.markForCheck(); return; }
      this.applyScanResult(res);
      const n = (res.matched || []).length;
      if (n > 0) this.notification.success('MATERIAL.SCAN_OK');
      else if (!res.warning) this.notification.warning('MATERIAL.SCAN_NO_MATCH');
      this.cdr.markForCheck();
    });
  }

  private applyScanResult(res: AlbaranScanResult): void {
    const byLine = new Map(this.receiveLines.map(r => [r.lineId, r]));
    for (const m of (res.matched || [])) {
      const rl = byLine.get(m.lineId);
      if (!rl) continue;
      const qty = Math.min(Number(m.quantityReceived) || 0, rl.pending);
      if (qty > 0) rl.qty = qty;
      if (m.expiryDate) rl.expiryDate = m.expiryDate;
    }
    this.albaranUnmatched = res.unmatched || [];
    this.albaranWarning = res.warning || null;
  }

  /** Añade un producto no coincidente (con artículo sugerido) al pedido y a la recepción. */
  addUnmatchedToOrder(u: AlbaranUnmatchedLine, index: number): void {
    if (!this.receiveOrderRef || u.suggestedItemId == null) return;
    const order = this.receiveOrderRef;
    const qty = Number(u.quantity) || 1;
    const lines = order.lines.map(l => ({ itemId: l.itemId, quantity: l.quantityOrdered }));
    const found = lines.find(x => x.itemId === u.suggestedItemId);
    if (found) found.quantity += qty; else lines.push({ itemId: u.suggestedItemId, quantity: qty });
    this.addingUnmatchedIdx = index;
    this.cdr.markForCheck();
    this.materialService.updateOrder(order.orderId, { name: order.name, notes: order.notes, lines }).subscribe(updated => {
      this.addingUnmatchedIdx = null;
      if (!updated) { this.notification.error('MATERIAL.ERR_SAVE'); this.cdr.markForCheck(); return; }
      this.upsertOrder(updated);
      this.receiveOrderRef = updated;
      this.rebuildReceiveLines(updated, { itemId: u.suggestedItemId!, qty, expiryDate: u.expiryDate });
      this.albaranUnmatched = this.albaranUnmatched.filter((_, i) => i !== index);
      this.notification.success('MATERIAL.ADDED_TO_ORDER');
      this.cdr.markForCheck();
    });
  }

  /** Para productos sin sugerencia: abrir la edición del pedido para buscar/crear el artículo. */
  findProductForOrder(): void {
    if (!this.receiveOrderRef) return;
    const o = this.receiveOrderRef;
    this.closeReceive();
    this.openEditOrder(o);
  }

  /** Reconstruye las líneas de recepción conservando lo ya introducido; prerellena la nueva. */
  private rebuildReceiveLines(order: MaterialOrder,
      prefill?: { itemId: number; qty: number; expiryDate: string | null }): void {
    const prevByLine = new Map(this.receiveLines.map(r => [r.lineId, r]));
    this.receiveLines = order.lines
      .filter(l => l.pending > 0)
      .map(l => {
        const prev = prevByLine.get(l.lineId);
        let qty: number | null = prev ? prev.qty : l.pending;
        let expiry: string | null = prev ? prev.expiryDate : null;
        if (prefill && l.itemId === prefill.itemId) { qty = Math.min(prefill.qty, l.pending); expiry = prefill.expiryDate; }
        return {
          lineId: l.lineId, itemId: l.itemId, itemName: l.itemName ?? '—', category: l.category,
          ordered: l.quantityOrdered, received: l.quantityReceived, pending: l.pending, qty, expiryDate: expiry
        };
      });
  }

  hasReceiveInput(): boolean {
    return this.receiveLines.some(rl => (Number(rl.qty) || 0) > 0);
  }

  confirmReceive(): void {
    if (!this.receiveOrderRef) return;
    const lines = this.receiveLines
      .map(rl => ({ lineId: rl.lineId, quantityReceived: Number(rl.qty) || 0, expiryDate: rl.expiryDate || null }))
      .filter(l => l.quantityReceived > 0);
    if (lines.length === 0) { this.notification.warning('MATERIAL.RECEIVE_NOTHING'); return; }
    this.savingOrder = true;
    this.cdr.markForCheck();
    this.materialService.receiveOrder(this.receiveOrderRef.orderId, {
      userId: this.userId, userName: this.registeredByName || '', lines
    }).subscribe(updated => {
      this.savingOrder = false;
      if (!updated) { this.notification.error('MATERIAL.ERR_SAVE'); this.cdr.markForCheck(); return; }
      this.upsertOrder(updated);
      this.receiveModalOpen = false;
      this.receiveOrderRef = null;
      this.notification.success('MATERIAL.RECEIVE_OK');
      // El stock cambió en servidor: recargamos inventario e historial.
      this.load();
      if (this.view === 'history') this.loadHistory();
      this.cdr.markForCheck();
    });
  }

  private upsertOrder(o: MaterialOrder): void {
    const idx = this.orders.findIndex(x => x.orderId === o.orderId);
    if (idx >= 0) {
      this.orders = this.orders.map(x => x.orderId === o.orderId ? o : x);
    } else {
      this.orders = [o, ...this.orders];
    }
  }

  /** Unidad de medida del artículo (uds, Rollos…); '' si no tiene. */
  unitForItem(itemId: number): string {
    return this.items.find(i => i.itemId === itemId)?.unit || '';
  }

  /** Genera un PDF de marca Sphaira con el nombre de artículo y las unidades del pedido. */
  async exportOrderPdf(o: MaterialOrder): Promise<void> {
    if (this.exportingOrderId !== null) return;
    this.exportingOrderId = o.orderId;
    this.pdfOrder = o;
    // OnPush: render síncrono del stage oculto y margen para el layout.
    this.cdr.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve, 150));
    const el = this.orderPdfStageRef?.nativeElement;
    if (!el) { this.exportingOrderId = null; this.pdfOrder = null; this.cdr.markForCheck(); return; }
    try {
      await this.pdfExport.exportReport(el, {
        fileName: `pedido_${o.orderId}_${this.teamId}`,
        title: `${this.translate.instant('MATERIAL.ORDER_N')}${o.orderId}`,
        subtitle: this.formatDateTime(o.createdAt) || '',
        type: 'default',
        clubId: this.clubId
      });
    } catch {
      this.notification.error('MATERIAL.ERR_SAVE');
    } finally {
      this.exportingOrderId = null;
      this.pdfOrder = null;
      this.cdr.markForCheck();
    }
  }

  // -- Unidades (caducidad por unidad) --
  openUnits(item: MaterialItem): void {
    this.unitsItemRef = item;
    this.unitsList = [];
    this.unitsBulkDate = null;
    this.unitsModalOpen = true;
    this.loadingUnits = true;
    this.cdr.markForCheck();
    this.materialService.getUnits(item.itemId).subscribe(bundle => {
      this.loadingUnits = false;
      this.unitsList = bundle ? (bundle.units || []).map(u => ({ ...u })) : [];
      this.cdr.markForCheck();
    });
  }

  closeUnits(): void {
    this.unitsModalOpen = false;
    this.unitsItemRef = null;
    this.unitsList = [];
    this.cdr.markForCheck();
  }

  applyBulkExpiry(): void {
    if (!this.unitsBulkDate) return;
    this.unitsList = this.unitsList.map(u => ({ ...u, expiryDate: this.unitsBulkDate }));
    this.cdr.markForCheck();
  }

  saveUnits(): void {
    if (!this.unitsItemRef) return;
    const itemId = this.unitsItemRef.itemId;
    const payload = this.unitsList.map(u => ({ unitId: u.unitId, expiryDate: u.expiryDate || null }));
    this.savingUnits = true;
    this.cdr.markForCheck();
    this.materialService.updateUnits(itemId, payload).subscribe(res => {
      this.savingUnits = false;
      if (!res) { this.notification.error('MATERIAL.ERR_SAVE'); this.cdr.markForCheck(); return; }
      // Reflejar la nueva caducidad (la más próxima) en el artículo del listado.
      if (res.item) {
        this.items = this.items.map(it => it.itemId === itemId ? { ...it, expiryDate: res.item.expiryDate } : it);
      }
      this.unitsModalOpen = false;
      this.unitsItemRef = null;
      this.notification.success('MATERIAL.UNITS_SAVED');
      this.cdr.markForCheck();
    });
  }

  toggleFilterLow(): void { this.filterLow = !this.filterLow; this.cdr.markForCheck(); }
  toggleFilterExpiring(): void { this.filterExpiring = !this.filterExpiring; this.cdr.markForCheck(); }
  toggleFilterExpired(): void { this.filterExpired = !this.filterExpired; this.cdr.markForCheck(); }
  onSearchChange(): void { this.cdr.markForCheck(); }
  clearSearch(): void { this.searchText = ''; this.cdr.markForCheck(); }
  hasActiveFilters(): boolean { return !!this.searchText.trim() || this.filterLow || this.filterExpiring || this.filterExpired; }

  private loadHistory(): void {
    this.loadingHistory = true;
    this.cdr.markForCheck();
    this.materialService.getMovements(this.teamId).subscribe(ms => {
      this.movements = ms;
      this.loadingHistory = false;
      this.cdr.markForCheck();
    });
  }

  /**
   * Movimientos del historial filtrados por la pestaña activa
   * (Fisioterapia / Fármacos / Nutrición). Los movimientos sin categoría
   * (p. ej. de artículos ya borrados) se muestran en todas las pestañas
   * para no perder trazabilidad.
   */
  historyMovements(): MaterialMovement[] {
    return this.movements.filter(m => !m.category || m.category === this.activeTab);
  }

  /** Un movimiento es "stock inicial" si su tipo es INIT (o, para datos antiguos, IN con motivo "Stock inicial"). */
  isInitialMovement(m: MaterialMovement): boolean {
    return m.type === 'INIT' || (m.type === 'IN' && (m.reason ?? '').trim().toLowerCase() === 'stock inicial');
  }

  /** Clave i18n de la etiqueta de tipo de movimiento. */
  movementTypeKey(m: MaterialMovement): string {
    if (this.isInitialMovement(m)) return 'MATERIAL.INITIAL_STOCK';
    return m.type === 'OUT' ? 'MATERIAL.WITHDRAW' : 'MATERIAL.ORDER';
  }

  /** Icono del pill de tipo de movimiento. */
  movementTypeIcon(m: MaterialMovement): string {
    if (this.isInitialMovement(m)) return 'bi-box-seam';
    return m.type === 'OUT' ? 'bi-arrow-up-circle' : 'bi-arrow-down-circle';
  }

  // ── Exportar a Excel ──────────────────────────────────────
  /**
   * Exporta un único libro .xlsx con dos hojas: "Inventario" (todos los
   * artículos del equipo) y "Movimientos" (historial de trazabilidad).
   * Las cabeceras y etiquetas se traducen al idioma activo.
   */
  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;
    this.cdr.markForCheck();
    this.materialService.getMovements(this.teamId, 1000).subscribe(ms => {
      try {
        const wb = XLSX.utils.book_new();

        const invHeader = [
          this.t('MATERIAL.COL_CATEGORY'), this.t('MATERIAL.COL_SUBCAT'), this.t('MATERIAL.COL_NAME'),
          this.t('MATERIAL.COL_STOCK'), this.t('MATERIAL.F_UNIT'), this.t('MATERIAL.COL_MIN'),
          this.t('MATERIAL.COL_EXPIRY'), this.t('MATERIAL.COL_STATUS'), this.t('MATERIAL.F_NOTES')
        ];
        const invRows = this.items.map(i => [
          this.t(this.tabLabel(i.category)),
          this.subcatName(i.subcategoryId) ?? '',
          i.name,
          i.quantity,
          i.unit ?? '',
          i.minStock ?? '',
          i.expiryDate ? this.formatDate(i.expiryDate) : '',
          this.itemStatusLabel(i),
          i.notes ?? ''
        ]);
        const wsInv = XLSX.utils.aoa_to_sheet([invHeader, ...invRows]);
        wsInv['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 8 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 14 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsInv, this.t('MATERIAL.SHEET_INVENTORY'));

        const mvHeader = [
          this.t('MATERIAL.COL_DATE'), this.t('MATERIAL.COL_TYPE'), this.t('MATERIAL.COL_ITEM'),
          this.t('MATERIAL.COL_QTY'), this.t('MATERIAL.COL_PLAYER'), this.t('MATERIAL.COL_USER'), this.t('MATERIAL.COL_REASON')
        ];
        const mvRows = ms.map(m => [
          this.formatDateTime(m.createdAt),
          this.t(this.movementTypeKey(m)),
          m.itemName ?? '',
          m.quantity,
          m.playerName ?? '',
          m.userName ?? '',
          m.reason ?? ''
        ]);
        const wsMv = XLSX.utils.aoa_to_sheet([mvHeader, ...mvRows]);
        wsMv['!cols'] = [{ wch: 17 }, { wch: 12 }, { wch: 26 }, { wch: 9 }, { wch: 20 }, { wch: 20 }, { wch: 34 }];
        XLSX.utils.book_append_sheet(wb, wsMv, this.t('MATERIAL.SHEET_MOVEMENTS'));

        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `material_${this.teamId}_${today}.xlsx`, { bookType: 'xlsx' });
        this.notification.success('MATERIAL.EXPORT_OK');
      } catch {
        this.notification.error('MATERIAL.ERR_SAVE');
      }
      this.exporting = false;
      this.cdr.markForCheck();
    });
  }

  /** Etiqueta de estado del artículo para la hoja de inventario. */
  itemStatusLabel(it: MaterialItem): string {
    if (this.isExpired(it.expiryDate)) return this.t('MATERIAL.EXPIRED');
    if (it.lowStock) return this.t('MATERIAL.LOW_STOCK');
    if (this.isExpiringSoon(it.expiryDate)) return this.t('MATERIAL.EXPIRING_SOON');
    return this.t('MATERIAL.STATUS_OK');
  }

  private t(key: string): string { return this.translate.instant(key); }

  // ── Listados derivados ────────────────────────────────────
  currentSubcats(): MaterialSubcategory[] {
    return this.subcategories.filter(s => s.category === this.activeTab);
  }
  currentItems(): MaterialItem[] {
    const q = this.searchText.trim().toLowerCase();
    const filtered = this.items.filter(i =>
      i.category === this.activeTab &&
      (this.activeSubcatId === null || i.subcategoryId === this.activeSubcatId) &&
      (!q || i.name.toLowerCase().includes(q) || (i.notes ?? '').toLowerCase().includes(q)) &&
      (!this.filterLow || i.lowStock) &&
      this.matchesExpiryFilter(i)
    );
    return this.sortItems(filtered);
  }

  /** Alterna la columna de orden; segundo clic invierte la dirección. */
  sortBy(key: 'name' | 'subcat' | 'stock' | 'expiry'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.cdr.markForCheck();
  }

  /** Icono del indicador de orden para una columna. */
  sortIcon(key: 'name' | 'subcat' | 'stock' | 'expiry'): string {
    if (this.sortKey !== key) return 'bi-arrow-down-up';
    return this.sortDir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
  }

  /** Ordena el listado según la columna activa (los sin caducidad siempre al final). */
  private sortItems(arr: MaterialItem[]): MaterialItem[] {
    if (!this.sortKey) return arr;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const key = this.sortKey;
    return [...arr].sort((a, b) => {
      switch (key) {
        case 'name':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir;
        case 'subcat':
          return (this.subcatName(a.subcategoryId) ?? '')
            .localeCompare(this.subcatName(b.subcategoryId) ?? '', undefined, { sensitivity: 'base' }) * dir;
        case 'stock':
          return (a.quantity - b.quantity) * dir;
        case 'expiry': {
          const ta = a.expiryDate ? new Date(a.expiryDate).getTime() : null;
          const tb = b.expiryDate ? new Date(b.expiryDate).getTime() : null;
          if (ta === null && tb === null) return 0;
          if (ta === null) return 1;
          if (tb === null) return -1;
          return (ta - tb) * dir;
        }
        default:
          return 0;
      }
    });
  }

  /**
   * Filtro de caducidad. "Caduca pronto" y "Caducado" son toggles
   * independientes: si ambos están activos se muestran los que cumplen
   * cualquiera de los dos (OR); si ninguno está activo, no filtra.
   */
  private matchesExpiryFilter(i: MaterialItem): boolean {
    if (!this.filterExpiring && !this.filterExpired) return true;
    return (this.filterExpiring && this.isExpiringSoon(i.expiryDate)) ||
           (this.filterExpired && this.isExpired(i.expiryDate));
  }

  /** Artículos (de todas las pestañas) que necesitan reposición: stock bajo mínimo. */
  restockItems(): MaterialItem[] {
    return this.items
      .filter(i => i.lowStock)
      .sort((a, b) => this.deficit(b) - this.deficit(a));
  }

  /** Cantidad que falta para llegar al mínimo (0 si no aplica). */
  deficit(it: MaterialItem): number {
    if (it.minStock === null || it.minStock === undefined) return 0;
    return Math.max(it.minStock - it.quantity, 0);
  }

  /** Cantidad sugerida a pedir: reponer hasta el doble del mínimo (colchón). */
  suggestedOrder(it: MaterialItem): number {
    if (it.minStock === null || it.minStock === undefined) return 0;
    const target = it.minStock * 2;
    const suggested = target - it.quantity;
    return suggested > 0 ? parseFloat(suggested.toFixed(2)) : 0;
  }

  /** Recuentos para badges (toda la pestaña activa o global). */
  lowStockCount(): number { return this.items.filter(i => i.lowStock).length; }
  /** Solo los que caducan pronto (aún NO caducados). */
  expiringSoonCount(): number {
    return this.items.filter(i => this.isExpiringSoon(i.expiryDate)).length;
  }
  /** Los que ya están caducados. */
  expiredCount(): number {
    return this.items.filter(i => this.isExpired(i.expiryDate)).length;
  }
  subcatName(id: number | null): string | null {
    if (id === null || id === undefined) return null;
    return this.subcategories.find(s => s.subcategoryId === id)?.name ?? null;
  }
  tabLabel(code: MaterialCategory): string {
    return this.tabs.find(t => t.code === code)?.labelKey ?? '';
  }

  // ── Modal artículo ────────────────────────────────────────
  private emptyItemForm(cat: MaterialCategory): ItemForm {
    return { itemId: null, category: cat, subcategoryId: null, name: '', unit: '', minStock: null, expiryDate: null, notes: '', initialQuantity: null, photoUrl: null };
  }

  openItemModal(item: MaterialItem | null): void {
    if (item) {
      this.itemForm = {
        itemId: item.itemId, category: item.category, subcategoryId: item.subcategoryId,
        name: item.name, unit: item.unit ?? '', minStock: item.minStock, expiryDate: item.expiryDate,
        notes: item.notes ?? '', initialQuantity: null, photoUrl: item.photoUrl ?? null
      };
    } else {
      this.itemForm = this.emptyItemForm(this.activeTab);
      this.itemForm.subcategoryId = this.activeSubcatId;
    }
    this.itemModalOpen = true;
    this.cdr.markForCheck();
  }
  closeItemModal(): void { this.itemModalOpen = false; this.cdr.markForCheck(); }

  // ── Foto del artículo ─────────────────────────────────────
  /** Dispara el selector de archivo (input oculto del modal). */
  triggerPhotoInput(input: HTMLInputElement): void { input.click(); }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!file || !this.itemForm.itemId) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      this.notification.warning('MATERIAL.PHOTO_INVALID');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notification.warning('MATERIAL.PHOTO_TOO_BIG');
      return;
    }
    this.uploadingPhoto = true;
    this.cdr.markForCheck();
    this.materialService.uploadItemPhoto(this.itemForm.itemId, file).subscribe(updated => {
      this.uploadingPhoto = false;
      if (!updated) { this.notification.error('MATERIAL.ERR_PHOTO'); this.cdr.markForCheck(); return; }
      this.itemForm.photoUrl = updated.photoUrl;
      this.items = this.items.map(i => i.itemId === updated.itemId ? updated : i);
      this.notification.success('MATERIAL.PHOTO_UPDATED');
      this.cdr.markForCheck();
    });
  }

  removePhoto(): void {
    if (!this.itemForm.itemId || !this.itemForm.photoUrl) return;
    if (!confirm(this.tr('MATERIAL.CONFIRM_DELETE_PHOTO'))) return;
    this.uploadingPhoto = true;
    this.cdr.markForCheck();
    this.materialService.deleteItemPhoto(this.itemForm.itemId).subscribe(updated => {
      this.uploadingPhoto = false;
      if (!updated) { this.notification.error('MATERIAL.ERR_PHOTO'); this.cdr.markForCheck(); return; }
      this.itemForm.photoUrl = null;
      this.items = this.items.map(i => i.itemId === updated.itemId ? updated : i);
      this.notification.success('MATERIAL.PHOTO_REMOVED');
      this.cdr.markForCheck();
    });
  }

  saveItem(): void {
    const f = this.itemForm;
    if (!f.name.trim()) return;
    this.saving = true;
    this.cdr.markForCheck();
    if (f.itemId) {
      this.materialService.updateItem(f.itemId, {
        name: f.name.trim(), subcategoryId: f.subcategoryId, unit: f.unit || null,
        minStock: f.minStock, expiryDate: f.expiryDate || null, notes: f.notes || null
      }).subscribe(updated => this.afterItemSaved(updated, true));
    } else {
      this.materialService.createItem(this.teamId, {
        clubId: this.clubId, category: f.category, subcategoryId: f.subcategoryId, name: f.name.trim(),
        unit: f.unit || null, minStock: f.minStock, expiryDate: f.expiryDate || null, notes: f.notes || null,
        initialQuantity: f.initialQuantity ?? 0, userId: this.userId, userName: this.registeredByName || ''
      }).subscribe(created => this.afterItemSaved(created, false));
    }
  }

  private afterItemSaved(item: MaterialItem | null, isEdit: boolean): void {
    this.saving = false;
    if (!item) { this.notification.error('MATERIAL.ERR_SAVE'); this.cdr.markForCheck(); return; }
    if (isEdit) {
      this.items = this.items.map(i => i.itemId === item.itemId ? item : i);
    } else {
      this.items = [...this.items, item];
    }
    this.itemModalOpen = false;
    this.notification.success('MATERIAL.SAVED');
    this.cdr.markForCheck();
  }

  deleteItem(item: MaterialItem): void {
    if (!confirm(this.tr('MATERIAL.CONFIRM_DELETE_ITEM'))) return;
    this.materialService.deleteItem(item.itemId).subscribe(ok => {
      if (ok) {
        this.items = this.items.filter(i => i.itemId !== item.itemId);
        this.notification.success('MATERIAL.DELETED');
      } else {
        this.notification.error('MATERIAL.ERR_DELETE');
      }
      this.cdr.markForCheck();
    });
  }

  // ── Movimientos ───────────────────────────────────────────
  openMovement(item: MaterialItem, type: 'IN' | 'OUT', prefillQty: number | null = null): void {
    this.movementForm = { item, type, quantity: prefillQty && prefillQty > 0 ? prefillQty : null, reason: '', playerId: null };
    this.movementModalOpen = true;
    this.cdr.markForCheck();
  }
  closeMovement(): void { this.movementModalOpen = false; this.cdr.markForCheck(); }

  saveMovement(): void {
    const f = this.movementForm;
    if (!f.item || !f.quantity || f.quantity <= 0) return;
    if (f.type === 'OUT' && f.quantity > f.item.quantity) {
      this.notification.warning('MATERIAL.ERR_NO_STOCK');
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    const playerName = f.playerId ? (this.players.find(p => p.playerId === f.playerId)?.name ?? null) : null;
    this.materialService.registerMovement(f.item.itemId, {
      type: f.type, quantity: f.quantity, reason: f.reason || null,
      playerId: f.playerId, playerName, userId: this.userId, userName: this.registeredByName || ''
    }).subscribe(res => {
      this.saving = false;
      if (!res) { this.notification.error('MATERIAL.ERR_MOVEMENT'); this.cdr.markForCheck(); return; }
      this.items = this.items.map(i => i.itemId === res.item.itemId ? res.item : i);
      this.movementModalOpen = false;
      this.notification.success(f.type === 'IN' ? 'MATERIAL.ORDER_OK' : 'MATERIAL.WITHDRAW_OK');
      if (this.view === 'history') this.loadHistory();
      this.cdr.markForCheck();
    });
  }

  // ── Subcategorías ─────────────────────────────────────────
  openSubcatManager(): void { this.subcatModalOpen = true; this.newSubcatName = ''; this.cdr.markForCheck(); }
  closeSubcatManager(): void { this.subcatModalOpen = false; this.cdr.markForCheck(); }

  addSubcat(): void {
    const name = this.newSubcatName.trim();
    if (!name) return;
    this.materialService.createSubcategory(this.teamId, { clubId: this.clubId, category: this.activeTab, name }).subscribe(s => {
      if (s) {
        this.subcategories = [...this.subcategories, s];
        this.newSubcatName = '';
        this.notification.success('MATERIAL.SUBCAT_ADDED');
      } else {
        this.notification.error('MATERIAL.ERR_SAVE');
      }
      this.cdr.markForCheck();
    });
  }

  renameSubcat(s: MaterialSubcategory): void {
    const name = (s.name || '').trim();
    if (!name) return;
    this.materialService.renameSubcategory(s.subcategoryId, name).subscribe();
  }

  deleteSubcat(s: MaterialSubcategory): void {
    if (!confirm(this.tr('MATERIAL.CONFIRM_DELETE_SUBCAT'))) return;
    this.materialService.deleteSubcategory(s.subcategoryId).subscribe(ok => {
      if (ok) {
        this.subcategories = this.subcategories.filter(x => x.subcategoryId !== s.subcategoryId);
        // Los artículos quedan sin subcategoría.
        this.items = this.items.map(i => i.subcategoryId === s.subcategoryId ? { ...i, subcategoryId: null } : i);
        if (this.activeSubcatId === s.subcategoryId) this.activeSubcatId = null;
        this.notification.success('MATERIAL.DELETED');
      } else {
        this.notification.error('MATERIAL.ERR_DELETE');
      }
      this.cdr.markForCheck();
    });
  }

  // ── Utils ─────────────────────────────────────────────────
  goBack(): void { this.location.back(); }
  trackByItem(_i: number, it: MaterialItem): number { return it.itemId; }

  formatQty(q: number): string {
    if (q === null || q === undefined) return '0';
    return Number.isInteger(q) ? String(q) : String(parseFloat(q.toFixed(2)));
  }
  formatDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  formatDateTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  isExpired(iso: string | null): boolean {
    if (!iso) return false;
    return new Date(iso + 'T00:00:00') < new Date(new Date().toDateString());
  }
  /** Caduca dentro de la ventana (expirySoonDays) pero aún no ha caducado. */
  isExpiringSoon(iso: string | null): boolean {
    if (!iso) return false;
    const today = new Date(new Date().toDateString());
    const exp = new Date(iso + 'T00:00:00');
    if (exp < today) return false;
    const limit = new Date(today);
    limit.setDate(limit.getDate() + this.expirySoonDays);
    return exp <= limit;
  }

  private tr(key: string): string {
    // Fallback simple para confirm() (sin inyectar TranslateService extra en el método).
    const map: Record<string, string> = {
      'MATERIAL.CONFIRM_DELETE_ITEM': '¿Eliminar este artículo? Se conservará en el historial.',
      'MATERIAL.CONFIRM_DELETE_SUBCAT': '¿Eliminar esta subcategoría? Los artículos quedarán sin subcategoría.',
      'MATERIAL.CONFIRM_DELETE_PHOTO': '¿Quitar la foto de este artículo?',
      'MATERIAL.CONFIRM_CANCEL_ORDER': '¿Cancelar este pedido? Se mantendrá en el historial como cancelado.'
    };
    const translated = this.translate.instant(key);
    if (translated && translated !== key) return translated;
    return map[key] ?? '¿Confirmar?';
  }
}
