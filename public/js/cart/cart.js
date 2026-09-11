const STORAGE_KEY = 'ecom.cart';

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch (err) {
    return [];
  }
}

function write(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart:changed', { detail: { items } }));
  return items;
}

export function getCart() {
  return read();
}

export function addItem(product, quantity = 1) {
  const items = read();
  const maxQty = typeof product.stock === 'number' && product.stock >= 0 ? product.stock : Infinity;
  const existing = items.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity = Math.max(1, Math.min(existing.quantity + quantity, maxQty));
    existing.stock = product.stock;
    existing.price = product.price;
    existing.discountPrice = product.discountPrice ?? null;
  } else {
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice ?? null,
      image: product.image || null,
      stock: product.stock,
      quantity: Math.max(1, Math.min(quantity, maxQty)),
    });
  }

  return write(items);
}

export function updateQuantity(id, quantity) {
  const items = read();
  const item = items.find((i) => i.id === id);
  if (!item) {
    return items;
  }
  const maxQty = typeof item.stock === 'number' && item.stock >= 0 ? item.stock : Infinity;
  item.quantity = Math.max(1, Math.min(quantity, maxQty));
  return write(items);
}

export function removeItem(id) {
  const items = read().filter((item) => item.id !== id);
  return write(items);
}

export function clearCart() {
  return write([]);
}

export function getTotals() {
  const items = read();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    const unitPrice = item.discountPrice !== null && item.discountPrice !== undefined ? item.discountPrice : item.price;
    return sum + unitPrice * item.quantity;
  }, 0);
  return { totalItems, subtotal, total: subtotal };
}
