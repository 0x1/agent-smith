// Starts the mock supplier for the live demo.
// PORT defaults to 7200. SUPPLIER_VERSION sets the starting version (default v1).
import { createSupplier, isVersion } from "./supplier.ts";

const port = Number(process.env.PORT ?? 7200);
const start = process.env.SUPPLIER_VERSION ?? "v1";
if (!isVersion(start)) throw new Error(`SUPPLIER_VERSION must be v1, v1.1 or v2, got ${start}`);

const { server } = createSupplier(start);
server.listen(port, "127.0.0.1", () => {
  console.log(`supplier-mock on http://127.0.0.1:${port} serving ${start}`);
});
