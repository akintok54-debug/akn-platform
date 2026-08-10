const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getIdeaSoftConfig,
  validateIdeaSoftConfig,
  buildIdeaSoftAuthUrl,
  createIdeaSoftStateToken,
  verifyIdeaSoftStateToken,
  mapIdeaSoftProductToLocal,
  mapIdeaSoftCustomerToLocal,
  mapIdeaSoftSupplierToLocal,
  mapIdeaSoftOrderToLocal,
  mapIdeaSoftInvoiceToLocal,
  mapIdeaSoftStockToLocal,
  mapIdeaSoftPriceToLocal,
} = require("../services/ideasoftService");

test("IdeaSoft config validates required environment variables", () => {
  const config = getIdeaSoftConfig({
    IDEASOFT_CLIENT_ID: "client-id",
    IDEASOFT_CLIENT_SECRET: "client-secret",
    IDEASOFT_CALLBACK_URL: "https://akn.local/api/erp/ideasoft/callback",
  });

  const result = validateIdeaSoftConfig(config);
  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
});

test("IdeaSoft auth URL includes client, callback and state", () => {
  const config = getIdeaSoftConfig({
    IDEASOFT_CLIENT_ID: "client-id",
    IDEASOFT_CLIENT_SECRET: "client-secret",
    IDEASOFT_CALLBACK_URL: "https://akn.local/api/erp/ideasoft/callback",
    IDEASOFT_BASE_URL: "https://api.ideasoft.test",
  });
  const state = createIdeaSoftStateToken({ companyId: "cmp1", userId: "usr1" }, "secret");
  const url = new URL(buildIdeaSoftAuthUrl({ state, config }));

  assert.equal(url.searchParams.get("client_id"), "client-id");
  assert.equal(url.searchParams.get("redirect_uri"), "https://akn.local/api/erp/ideasoft/callback");
  assert.equal(url.searchParams.get("state"), state);
});

test("IdeaSoft state token roundtrips company and user", () => {
  const token = createIdeaSoftStateToken({ companyId: "cmp1", userId: "usr1" }, "secret");
  const decoded = verifyIdeaSoftStateToken(token, "secret");
  assert.equal(decoded.companyId, "cmp1");
  assert.equal(decoded.userId, "usr1");
});

test("IdeaSoft product mapper normalizes catalog data", () => {
  const mapped = mapIdeaSoftProductToLocal({
    id: 12,
    title: "Zincir",
    stockCode: "ZN-1",
    barcode: "123",
    price: "15.5",
    stockQuantity: 8,
    vatRate: 20,
    imageUrl: "https://cdn.example.com/main.jpg",
    images: [{ url: "https://cdn.example.com/one.jpg" }, "https://cdn.example.com/two.jpg"],
  });
  assert.equal(mapped.externalId, "12");
  assert.equal(mapped.name, "Zincir");
  assert.equal(mapped.sku, "ZN-1");
  assert.equal(mapped.salePrice, 15.5);
  assert.equal(mapped.stock, 8);
  assert.equal(mapped.image, "https://cdn.example.com/main.jpg");
  assert.equal(mapped.images.length, 3);
});

test("IdeaSoft customer mapper normalizes customer data", () => {
  const mapped = mapIdeaSoftCustomerToLocal({ id: 8, companyName: "AKN Bayi", emailAddress: "x@a.com", phoneNumber: "555" });
  assert.equal(mapped.externalId, "8");
  assert.equal(mapped.companyName, "AKN Bayi");
  assert.equal(mapped.email, "x@a.com");
  assert.equal(mapped.phone, "555");
});

test("IdeaSoft supplier mapper normalizes supplier data", () => {
  const mapped = mapIdeaSoftSupplierToLocal({ id: 5, supplierCode: "SUP-5", supplierName: "Parca A.S.", isActive: false });
  assert.equal(mapped.code, "SUP-5");
  assert.equal(mapped.name, "Parca A.S.");
  assert.equal(mapped.status, "inactive");
});

test("IdeaSoft order mapper normalizes order lines", () => {
  const mapped = mapIdeaSoftOrderToLocal({ id: 7, customerName: "Musteri", totalAmount: 100, items: [{ sku: "A1", quantity: 2, unitPrice: 50, total: 100 }] });
  assert.equal(mapped.externalId, "7");
  assert.equal(mapped.items.length, 1);
  assert.equal(mapped.items[0].sku, "A1");
});

test("IdeaSoft invoice mapper normalizes invoice data", () => {
  const mapped = mapIdeaSoftInvoiceToLocal({ invoiceId: 3, invoiceNumber: "INV-3", total: 120, vatTotal: 20 });
  assert.equal(mapped.externalId, "3");
  assert.equal(mapped.invoiceNumber, "INV-3");
  assert.equal(mapped.grandTotal, 120);
  assert.equal(mapped.taxTotal, 20);
});

test("IdeaSoft stock and price mappers normalize inventory data", () => {
  const stock = mapIdeaSoftStockToLocal({ productId: 4, sku: "STK-4", quantity: 9, location: "A1" });
  const price = mapIdeaSoftPriceToLocal({ productId: 4, sku: "STK-4", sellingPrice: 99, costPrice: 70, taxRate: 20 });

  assert.equal(stock.stock, 9);
  assert.equal(stock.shelf, "A1");
  assert.equal(price.salePrice, 99);
  assert.equal(price.purchasePrice, 70);
});