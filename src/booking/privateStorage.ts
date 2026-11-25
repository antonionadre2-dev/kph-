/** Only anonymous service configuration may survive a reload. Contact data stays in memory. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const PRIVATE_CART_KEY = 'kraken_cart_persistent';
export const PRIVATE_CONTACT_KEY = 'kraken_consultation_data_v2';
export const PRIVATE_CART_TTL_MS = 24 * 60 * 60 * 1000;
export interface PrivateCartItem { type: string; details?: Record<string, number | boolean | string> }
const TYPES = new Set(['end-of-tenancy', 'endOfTenancy', 'end', 'regular', 'daily-cleaning', 'deep', 'deep-cleaning', 'windows', 'window-cleaning', 'moving', 'moving-furniture', 'construction']);
const NUMBER_FIELDS = new Set(['rooms', 'roomsCount', 'bedrooms', 'bathrooms', 'bathroomsCount', 'storageRooms', 'storageCount', 'carpetRooms', 'carpetCount', 'areaM2', 'hours', 'ironingHours', 'guestWcs', 'slatBlinds', 'rollerShutters', 'smallBalconies', 'largeBalconies', 'garages', 'standard', 'double', 'balconyDoors', 'roof']);
const BOOLEAN_FIELDS = new Set(['materials', 'oven', 'ovenInterior', 'fridge', 'fridgeFreezer', 'ironing', 'heavySoiling', 'difficultAccess', 'winterGarden']);
const ENUM_FIELDS: Record<string, readonly string[]> = { frequency: ['weekly', 'fortnightly', 'monthly', 'once', 'Weekly', 'Bi-Weekly', 'Monthly'], mode: ['fixed', 'hourly', 'area'], propertyType: ['apartment', 'house'], level: ['light', 'full'] };
function browserStorage(): StorageLike | null { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function remove(storage: StorageLike | null, key: string) { try { storage?.removeItem(key); } catch { /* A blocked store does not block the current calculation. */ } }
function anonymousCart(cart: unknown): PrivateCartItem[] {
  if (!Array.isArray(cart)) return [];
  return cart.slice(0, 12).flatMap(item => {
    if (!record(item) || typeof item.type !== 'string' || !TYPES.has(item.type)) return [];
    const details: NonNullable<PrivateCartItem['details']> = {};
    if (record(item.details)) for (const [field, value] of Object.entries(item.details)) {
      if (NUMBER_FIELDS.has(field) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10_000) details[field] = value;
      if (BOOLEAN_FIELDS.has(field) && typeof value === 'boolean') details[field] = value;
      if (ENUM_FIELDS[field]?.includes(String(value)) && typeof value === 'string') details[field] = value;
    }
    return [{ type: item.type, ...(Object.keys(details).length ? { details } : {}) }];
  });
}
export function writePrivateCart(cart: unknown, storage: StorageLike | null = browserStorage()): PrivateCartItem[] {
  const items = anonymousCart(cart);
  remove(storage, PRIVATE_CONTACT_KEY);
  if (!items.length) { remove(storage, PRIVATE_CART_KEY); return []; }
  const now = Date.now();
  try { storage?.setItem(PRIVATE_CART_KEY, JSON.stringify({ version: 1, savedAt: now, expiresAt: now + PRIVATE_CART_TTL_MS, items })); } catch { /* State in memory remains usable. */ }
  return items;
}
export function readPrivateCart(storage: StorageLike | null = browserStorage()): PrivateCartItem[] {
  remove(storage, PRIVATE_CONTACT_KEY);
  let raw: string | null;
  try { raw = storage?.getItem(PRIVATE_CART_KEY) || null; } catch { return []; }
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    // Migrate anonymous configuration only; immediately discard legacy customer fields and amounts.
    if (Array.isArray(value)) return writePrivateCart(value, storage);
    const now = Date.now();
    if (!record(value) || value.version !== 1 || typeof value.savedAt !== 'number' || typeof value.expiresAt !== 'number'
      || !Number.isFinite(value.savedAt) || !Number.isFinite(value.expiresAt) || value.savedAt > now || value.expiresAt <= now
      || value.expiresAt - value.savedAt > PRIVATE_CART_TTL_MS || value.expiresAt <= value.savedAt || !Array.isArray(value.items)) throw Error('Expired or malformed draft');
    const items = anonymousCart(value.items);
    // Rewrite at the original expiry, so a read never extends retention.
    if (!items.length) remove(storage, PRIVATE_CART_KEY);
    else { try { storage?.setItem(PRIVATE_CART_KEY, JSON.stringify({ version: 1, savedAt: value.savedAt, expiresAt: value.expiresAt, items })); } catch { /* A readable draft remains usable when writes are disabled. */ } }
    return items;
  } catch { remove(storage, PRIVATE_CART_KEY); return []; }
}
export function clearPrivateDrafts(storage: StorageLike | null = browserStorage()): void {
  remove(storage, PRIVATE_CONTACT_KEY); remove(storage, PRIVATE_CART_KEY);
  if (storage === browserStorage()) {
    try { window.sessionStorage.removeItem('kraken_kai_calculator_transfer_v1'); } catch { /* No booking capability or payment session is removed. */ }
  }
}
