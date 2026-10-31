export async function getStock(sku: string): Promise<number> {
  const res = await fetch(`${process.env.SUPPLIER_URL}/v1/inventory/${sku}`);
  const { inventory } = await res.json();
  return Math.max(0, inventory.on_hand - inventory.reserved);
}
