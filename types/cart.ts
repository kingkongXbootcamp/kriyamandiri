export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
}

export interface CartItemWithSubtotal extends CartItem {
  subtotal: number;
}

export interface SessionCartData {
  storeId: string;
  storeSlug: string;
  storeName: string;
  items: CartItem[];
  updatedAt: string;
}

export interface CartSummary {
  items: CartItemWithSubtotal[];
  totalItems: number;
  subtotalAmount: number;
  totalAmount: number;
}

export interface ServerCartItemInput {
  productId: string;
  quantity: number;
}

export interface VerifiedCartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ServerCartVerificationResult {
  valid: boolean;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  items: VerifiedCartItem[];
  subtotalAmount: number;
  totalAmount: number;
  errors: string[];
}