import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { TranslateService } from '@ngx-translate/core';

export interface DemoProduct {
  id: number;
  key: string;
  price: number;
  currency: string;
  image: string;
  categoryKey: string;
  badgeKey?: string;
  stock: number;
  variants?: string[];
  rating: number;
  reviews: number;
}

export interface DemoCartItem {
  product: DemoProduct;
  qty: number;
  variant?: string;
}

export type DemoOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'DELIVERED';

export interface DemoOrder {
  orderId: number;
  createdAt: Date;
  paidAt: Date | null;
  preparingAt: Date | null;
  deliveredAt: Date | null;
  items: DemoCartItem[];
  total: number;
  status: DemoOrderStatus;
}

@Component({
  selector: 'app-club-shop',
  templateUrl: './club-shop.component.html',
  styleUrls: ['./club-shop.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubShopComponent implements OnInit {
  activeTab: 'catalog' | 'cart' | 'orders' = 'catalog';
  searchQuery = '';
  selectedProduct: DemoProduct | null = null;
  selectedVariant = '';
  quantityToAdd = 1;
  cartItems: DemoCartItem[] = [];
  cartToastVisible = false;
  cartToastKey = '';

  // Checkout simulado (demo: no hay cobro real)
  processingCheckout = false;
  checkoutSuccessOrder: DemoOrder | null = null;

  // Pedidos (mock): uno de ejemplo entregado + los creados en el checkout demo
  orders: DemoOrder[] = [];
  expandedOrders = new Set<number>();
  private orderSeq = 1001;

  readonly products: DemoProduct[] = [
    {
      id: 1,
      key: 'SHIRT',
      price: 4999,
      currency: 'EUR',
      image: 'assets/images/shop/shop-camiseta.png',
      categoryKey: 'KIT',
      badgeKey: 'NEW',
      stock: 42,
      variants: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      rating: 4.8,
      reviews: 32,
    },
    {
      id: 2,
      key: 'SHORTS',
      price: 2499,
      currency: 'EUR',
      image: 'assets/images/shop/shop-pantalon.png',
      categoryKey: 'KIT',
      stock: 28,
      variants: ['XS', 'S', 'M', 'L', 'XL'],
      rating: 4.5,
      reviews: 18,
    },
    {
      id: 3,
      key: 'JACKET',
      price: 7999,
      currency: 'EUR',
      image: 'assets/images/shop/shop-chaqueta.png',
      categoryKey: 'APPAREL',
      badgeKey: 'POPULAR',
      stock: 15,
      variants: ['S', 'M', 'L', 'XL'],
      rating: 4.9,
      reviews: 54,
    },
    {
      id: 4,
      key: 'BALL',
      price: 3499,
      currency: 'EUR',
      image: 'assets/images/shop/shop-balon.png',
      categoryKey: 'EQUIPMENT',
      stock: 60,
      rating: 4.7,
      reviews: 41,
    },
    {
      id: 5,
      key: 'BACKPACK',
      price: 5999,
      currency: 'EUR',
      image: 'assets/images/shop/shop-mochila.png',
      categoryKey: 'ACCESSORIES',
      stock: 20,
      rating: 4.6,
      reviews: 22,
    },
    {
      id: 6,
      key: 'SOCKS',
      price: 1499,
      currency: 'EUR',
      image: 'assets/images/shop/shop-calcetines.png',
      categoryKey: 'KIT',
      stock: 80,
      variants: ['S/M (36-40)', 'L/XL (41-46)'],
      rating: 4.4,
      reviews: 15,
    },
    {
      id: 7,
      key: 'CAP',
      price: 1999,
      currency: 'EUR',
      image: 'assets/images/shop/shop-gorra.png',
      categoryKey: 'ACCESSORIES',
      stock: 35,
      rating: 4.3,
      reviews: 11,
    },
    {
      id: 8,
      key: 'BOTTLE',
      price: 2299,
      currency: 'EUR',
      image: 'assets/images/shop/shop-botella.png',
      categoryKey: 'ACCESSORIES',
      badgeKey: 'FEATURED',
      stock: 45,
      rating: 4.9,
      reviews: 67,
    },
  ];

  get filteredProducts(): DemoProduct[] {
    if (!this.searchQuery.trim()) return this.products;
    const q = this.searchQuery.toLowerCase();
    return this.products.filter(p => {
      const name = this.productName(p).toLowerCase();
      const description = this.productDescription(p).toLowerCase();
      const category = this.productCategory(p).toLowerCase();
      return name.includes(q) || description.includes(q) || category.includes(q);
    });
  }

  get cartCount(): number {
    return this.cartItems.reduce((sum, i) => sum + i.qty, 0);
  }

  get cartTotal(): number {
    return this.cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  }

  get categories(): string[] {
    return [...new Set(this.products.map(p => p.categoryKey))];
  }

  constructor(
    private location: Location,
    private tutorialService: TutorialService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.seedDemoOrders();
    setTimeout(() => this.tutorialService.start('tienda-club', true), 600);
  }

  /** Siembra un pedido de ejemplo ya entregado para poblar la pestaña "Pedidos". */
  private seedDemoOrders(): void {
    const jacket = this.products.find(p => p.key === 'JACKET');
    const ball = this.products.find(p => p.key === 'BALL');
    if (!jacket || !ball) return;
    const now = Date.now();
    const day = 86400000;
    const items: DemoCartItem[] = [
      { product: jacket, qty: 1, variant: 'M' },
      { product: ball, qty: 2 },
    ];
    const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    this.orders = [
      {
        orderId: this.orderSeq++,
        createdAt: new Date(now - 12 * day),
        paidAt: new Date(now - 12 * day + 3600000),
        preparingAt: new Date(now - 11 * day),
        deliveredAt: new Date(now - 9 * day),
        items,
        total,
        status: 'DELIVERED',
      },
    ];
  }

  goBack(): void { this.location.back(); }

  switchTab(tab: 'catalog' | 'cart' | 'orders'): void {
    this.activeTab = tab;
    if (this.selectedProduct) this.closeDetail();
  }

  openDetail(p: DemoProduct): void {
    this.selectedProduct = p;
    this.selectedVariant = p.variants?.[0] ?? '';
    this.quantityToAdd = 1;
    document.body.style.overflow = 'hidden';
  }

  closeDetail(): void {
    this.selectedProduct = null;
    document.body.style.overflow = '';
  }

  changeQty(delta: number): void {
    const next = this.quantityToAdd + delta;
    if (next < 1 || next > (this.selectedProduct?.stock ?? 99)) return;
    this.quantityToAdd = next;
  }

  addToCart(p: DemoProduct): void {
    const existing = this.cartItems.find(i => i.product.id === p.id && i.variant === this.selectedVariant);
    if (existing) {
      existing.qty += this.quantityToAdd;
    } else {
      this.cartItems = [...this.cartItems, { product: p, qty: this.quantityToAdd, variant: this.selectedVariant }];
    }
    this.cartToastKey = p.key;
    this.cartToastVisible = true;
    setTimeout(() => { this.cartToastVisible = false; }, 3000);
    this.closeDetail();
  }

  updateQty(item: DemoCartItem, delta: number): void {
    item.qty += delta;
    if (item.qty <= 0) this.removeItem(item);
    this.cartItems = [...this.cartItems];
  }

  removeItem(item: DemoCartItem): void {
    this.cartItems = this.cartItems.filter(i => i !== item);
  }

  formatPrice(cents: number): string {
    const lang = (this.translate.currentLang || 'es').slice(0, 2);
    const localeByLang: Record<string, string> = {
      es: 'es-ES',
      en: 'en-GB',
      fr: 'fr-FR',
      de: 'de-DE',
      pt: 'pt-PT',
      it: 'it-IT',
    };
    const locale = localeByLang[lang] ?? 'es-ES';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }

  tr(key: string): string {
    const translated = this.translate.instant(key);
    if (translated !== key) return translated;

    const esTree = (this.translate as any).translations?.es;
    if (!esTree) return key;
    const fallback = key.split('.').reduce((acc: any, part: string) => acc?.[part], esTree);
    return typeof fallback === 'string' ? fallback : key;
  }

  productName(product: DemoProduct): string {
    return this.tr(`CLUB_SHOP.PRODUCTS.${product.key}.NAME`);
  }

  productDescription(product: DemoProduct): string {
    return this.tr(`CLUB_SHOP.PRODUCTS.${product.key}.DESCRIPTION`);
  }

  productCategory(product: DemoProduct): string {
    return this.tr(`CLUB_SHOP.CATEGORIES.${product.categoryKey}`);
  }

  productBadge(product: DemoProduct): string {
    if (!product.badgeKey) return '';
    return this.tr(`CLUB_SHOP.BADGES.${product.badgeKey}`);
  }

  starArray(): number[] { return [1, 2, 3, 4, 5]; }

  // ---------------------------------------------------------------------------
  // Checkout simulado (demo): no hay cobro real, se crea un pedido "pagado"
  // ---------------------------------------------------------------------------

  checkout(): void {
    if (this.processingCheckout || this.cartItems.length === 0) return;
    this.processingCheckout = true;
    const now = new Date();
    setTimeout(() => {
      const order: DemoOrder = {
        orderId: this.orderSeq++,
        createdAt: now,
        paidAt: now,
        preparingAt: null,
        deliveredAt: null,
        items: this.cartItems.map(i => ({ product: i.product, qty: i.qty, variant: i.variant })),
        total: this.cartTotal,
        status: 'PAID',
      };
      this.orders = [order, ...this.orders];
      this.cartItems = [];
      this.processingCheckout = false;
      this.checkoutSuccessOrder = order;
      this.expandedOrders.add(order.orderId);
    }, 1400);
  }

  closeCheckoutSuccess(goToOrders = false): void {
    this.checkoutSuccessOrder = null;
    if (goToOrders) this.switchTab('orders');
  }

  toggleOrder(orderId: number): void {
    if (this.expandedOrders.has(orderId)) this.expandedOrders.delete(orderId);
    else this.expandedOrders.add(orderId);
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrders.has(orderId);
  }

  orderItemsCount(order: DemoOrder): number {
    return order.items.reduce((s, i) => s + i.qty, 0);
  }

  statusLabel(status: DemoOrderStatus): string {
    return this.tr(`CLUB_SHOP.ORDER_STATUS.${status}`);
  }

  statusClass(status: DemoOrderStatus): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  /** Índice de progreso: 0=creado, 1=pagado, 2=preparando, 3=entregado. */
  private statusStep(status: DemoOrderStatus): number {
    switch (status) {
      case 'PENDING_PAYMENT': return 0;
      case 'PAID': return 1;
      case 'PREPARING': return 2;
      case 'DELIVERED': return 3;
      default: return 0;
    }
  }

  orderTimeline(order: DemoOrder): { key: DemoOrderStatus; icon: string; date: Date | null; done: boolean; active: boolean }[] {
    const current = this.statusStep(order.status);
    const steps: { key: DemoOrderStatus; icon: string; date: Date | null }[] = [
      { key: 'PENDING_PAYMENT', icon: 'bi-cart-check', date: order.createdAt },
      { key: 'PAID', icon: 'bi-credit-card', date: order.paidAt },
      { key: 'PREPARING', icon: 'bi-box-seam', date: order.preparingAt },
      { key: 'DELIVERED', icon: 'bi-truck', date: order.deliveredAt },
    ];
    return steps.map((s, idx) => ({
      key: s.key,
      icon: s.icon,
      date: s.date,
      done: idx < current,
      active: idx === current,
    }));
  }

  trackById(_: number, p: DemoProduct): number { return p.id; }
  trackByIdx(i: number): number { return i; }
  trackByOrder(_: number, o: DemoOrder): number { return o.orderId; }
}
