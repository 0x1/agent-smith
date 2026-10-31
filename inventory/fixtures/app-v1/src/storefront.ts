import { getStock } from "./supplier.ts";

// What the product page shows for a SKU.
export async function availabilityLabel(sku: string): Promise<string> {
  const units = await getStock(sku);
  if (units <= 0) return "Out of stock";
  if (units < 3) return `Only ${units} left`;
  return "In stock";
}
