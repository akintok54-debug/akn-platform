const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = String(process.env.MONGO_URI || "").trim();
const isValidMongoUri = /^mongodb(\+srv)?:\/\//i.test(mongoUri) && !/your_username|your_password|your_cluster/i.test(mongoUri);

if (!isValidMongoUri) {
  test("API integration suite skipped because a valid MONGO_URI is not configured", { skip: true }, () => {});
} else {

const testPort = 5600 + Math.floor(Math.random() * 200);
process.env.PORT = String(testPort);

const { startServer } = require("../server");

let server;
let token;

let createdBrandId;
let createdCustomerId;
let createdProductId;
let portalToken;

const baseUrl = `http://127.0.0.1:${testPort}/api`;

const request = async ({ method = "GET", path = "/", body, authToken }) => {
  const headers = { "Content-Type": "application/json" };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();
  return { status: response.status, payload };
};

test.before(async () => {
  server = await startServer({ port: testPort });
});

test.after(async () => {
  await new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
  await mongoose.disconnect();
});

test("API health endpoint should respond successfully", async () => {
  const result = await request({ path: "/health" });
  assert.equal(result.status, 200);
  assert.equal(result.payload.success, true);
});

test("Auth register + login should produce JWT token", async () => {
  const stamp = Date.now();
  const email = `itest.${stamp}@akn.local`;
  const password = "Test1234!";

  const register = await request({
    method: "POST",
    path: "/auth/register",
    body: {
      companyName: `Integration ${stamp}`,
      name: "Integration User",
      phone: "5550001122",
      email,
      password,
    },
  });

  assert.equal(register.status, 201);
  assert.equal(register.payload.success, true);

  const login = await request({
    method: "POST",
    path: "/auth/login",
    body: { email, password },
  });

  assert.equal(login.status, 200);
  assert.equal(login.payload.success, true);
  assert.ok(login.payload.token);
  token = login.payload.token;
});

test("Customer list should work with auth, filter and pagination", async () => {
  assert.ok(token);

  const result = await request({
    method: "GET",
    path: "/customers?page=1&limit=5&q=integration",
    authToken: token,
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.success, true);
  assert.ok(result.payload.pagination);
  assert.equal(typeof result.payload.pagination.total, "number");
});

test("Customer module should support CRUD + statement/pdf/share + portal link", async () => {
  assert.ok(token);
  const stamp = Date.now();

  const created = await request({
    method: "POST",
    path: "/customers",
    authToken: token,
    body: {
      customerCode: `CR-IT-${stamp}`,
      companyName: `Customer ${stamp}`,
      type: "customer",
      phone: "5551000000",
      mobilePhone: "5552000000",
      email: `customer.${stamp}@akn.local`,
      taxOffice: "Kadikoy",
      taxNumber: `VN${stamp}`,
      city: "Istanbul",
      district: "Kadikoy",
      balance: 0,
      riskLimit: 10000,
      discountRate: 0,
      customerCategory: "retail",
      note: "integration",
    },
  });

  assert.equal(created.status, 201);
  assert.equal(created.payload.success, true);
  createdCustomerId = created.payload.customer?._id;
  assert.ok(createdCustomerId);

  const readOne = await request({
    path: `/customers/${createdCustomerId}`,
    authToken: token,
  });
  assert.equal(readOne.status, 200);
  assert.equal(readOne.payload.success, true);

  const updated = await request({
    method: "PUT",
    path: `/customers/${createdCustomerId}`,
    authToken: token,
    body: {
      companyName: `Customer ${stamp} Updated`,
      type: "customer",
      phone: "5551000001",
      mobilePhone: "5552000001",
      email: `customer.updated.${stamp}@akn.local`,
      taxOffice: "Kadikoy",
      taxNumber: `VN${stamp}`,
      city: "Istanbul",
      district: "Besiktas",
      balance: 1200,
      riskLimit: 15000,
      discountRate: 3,
      customerCategory: "dealer",
      note: "updated",
      active: true,
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.payload.success, true);

  const tx = await request({
    method: "POST",
    path: `/customers/${createdCustomerId}/transactions`,
    authToken: token,
    body: {
      type: "INVOICE",
      amount: 1000,
      description: "Integration invoice",
    },
  });
  assert.equal(tx.status, 200);
  assert.equal(tx.payload.success, true);

  const ledger = await request({
    path: `/customers/${createdCustomerId}/ledger`,
    authToken: token,
  });
  assert.equal(ledger.status, 200);
  assert.equal(ledger.payload.success, true);

  const portal = await request({
    path: `/customers/${createdCustomerId}/portal/link`,
    authToken: token,
  });
  assert.equal(portal.status, 200);
  assert.equal(portal.payload.success, true);
  portalToken = portal.payload.secureToken;
  assert.ok(portalToken);

  const refreshedPortal = await request({
    method: "POST",
    path: `/customers/${createdCustomerId}/portal/link/refresh`,
    authToken: token,
  });
  assert.equal(refreshedPortal.status, 200);
  assert.equal(refreshedPortal.payload.success, true);
  portalToken = refreshedPortal.payload.secureToken;

  const statementPdf = await fetch(`${baseUrl}/customers/${createdCustomerId}/statement/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(statementPdf.status, 200);
  assert.equal(statementPdf.headers.get("content-type")?.includes("application/pdf"), true);
  await statementPdf.arrayBuffer();

  const wa = await request({
    method: "POST",
    path: `/customers/${createdCustomerId}/share/whatsapp`,
    authToken: token,
  });
  assert.equal(wa.status, 200);
  assert.equal(wa.payload.success, true);
  assert.ok(typeof wa.payload.url === "string");

  const mail = await request({
    method: "POST",
    path: `/customers/${createdCustomerId}/share/mail`,
    authToken: token,
  });
  assert.equal(mail.status, 200);
  assert.equal(mail.payload.success, true);

  const history = await request({
    path: `/customers/${createdCustomerId}/share/history`,
    authToken: token,
  });
  assert.equal(history.status, 200);
  assert.equal(history.payload.success, true);

});

test("Product module should support full CRUD", async () => {
  assert.ok(token);
  const stamp = Date.now();

  const created = await request({
    method: "POST",
    path: "/products",
    authToken: token,
    body: {
      name: `Product ${stamp}`,
      barcode: `BR-${stamp}`,
      purchasePrice: 100,
      salePrice: 150,
      stock: 20,
      vat: 20,
    },
  });

  assert.equal(created.status, 201);
  assert.equal(created.payload.success, true);
  createdProductId = created.payload?.data?._id;
  assert.ok(createdProductId);

  const listed = await request({
    path: "/products",
    authToken: token,
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.payload.success, true);

  const readOne = await request({
    path: `/products/${createdProductId}`,
    authToken: token,
  });
  assert.equal(readOne.status, 200);
  assert.equal(readOne.payload.success, true);

  const updated = await request({
    method: "PUT",
    path: `/products/${createdProductId}`,
    authToken: token,
    body: {
      salePrice: 175,
      stock: 30,
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.payload.success, true);

  const removed = await request({
    method: "DELETE",
    path: `/products/${createdProductId}`,
    authToken: token,
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.payload.success, true);
});

test("Import module should validate and commit products/customers/transactions/stock", async () => {
  assert.ok(token);
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const templateResponse = await fetch(`${baseUrl}/imports/templates/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(templateResponse.status, 200);
  assert.equal(templateResponse.headers.get("content-type")?.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), true);
  await templateResponse.arrayBuffer();

  const productRows = [
    {
      name: `Import Product ${seed}`,
      sku: `IMP-SKU-${seed}`,
      barcode: `IMP-BRC-${seed}`,
      purchasePrice: 25,
      salePrice: 50,
      stock: 10,
      vat: 20,
      minStock: 2,
      active: true,
    },
    {
      name: `Import Product 2 ${seed}`,
      sku: `IMP-SKU2-${seed}`,
      barcode: `IMP-BRC2-${seed}`,
      purchasePrice: 35,
      salePrice: 65,
      stock: 15,
      vat: 20,
      minStock: 3,
      active: true,
    },
  ];

  const productValidate = await request({
    method: "POST",
    path: "/imports/products/validate",
    authToken: token,
    body: { rows: productRows },
  });
  assert.equal(productValidate.status, 200, JSON.stringify(productValidate.payload));
  assert.equal(productValidate.payload.success, true);
  assert.equal(productValidate.payload.summary.failedRows, 0);

  const productCommit = await request({
    method: "POST",
    path: "/imports/products/commit",
    authToken: token,
    body: { rows: productRows },
  });
  assert.equal(productCommit.status, 200, JSON.stringify(productCommit.payload));
  assert.equal(productCommit.payload.success, true);
  assert.equal(productCommit.payload.summary.validRows, 2);

  const customerRows = [
    {
      customerCode: `IMP-CR-${seed}`,
      companyName: `Import Customer ${seed}`,
      type: "customer",
      phone: "02120001122",
      mobilePhone: "05550001122",
      email: `import.customer.${seed}@akn.local`,
      city: "Istanbul",
      district: "Besiktas",
      balance: 0,
      riskLimit: 20000,
      discountRate: 2,
      customerCategory: "retail",
    },
  ];

  const customerCommit = await request({
    method: "POST",
    path: "/imports/customers/commit",
    authToken: token,
    body: { rows: customerRows },
  });
  assert.equal(customerCommit.status, 200, JSON.stringify(customerCommit.payload));
  assert.equal(customerCommit.payload.success, true);

  const transactionRows = [
    {
      customerCode: `IMP-CR-${seed}`,
      type: "INVOICE",
      amount: 300,
      description: "Import transaction",
      date: "2026-08-07",
    },
    {
      customerCode: "UNKNOWN-CODE",
      type: "INVOICE",
      amount: 200,
      description: "Invalid row",
      date: "2026-08-07",
    },
  ];

  const transactionValidate = await request({
    method: "POST",
    path: "/imports/transactions/validate",
    authToken: token,
    body: { rows: transactionRows },
  });
  assert.equal(transactionValidate.status, 200, JSON.stringify(transactionValidate.payload));
  assert.equal(transactionValidate.payload.success, true);
  assert.equal(transactionValidate.payload.summary.failedRows, 1);
  assert.equal(Array.isArray(transactionValidate.payload.errorRows), true);

  const transactionCommit = await request({
    method: "POST",
    path: "/imports/transactions/commit",
    authToken: token,
    body: { rows: transactionRows },
  });
  assert.equal(transactionCommit.status, 200, JSON.stringify(transactionCommit.payload));
  assert.equal(transactionCommit.payload.success, true);
  assert.equal(transactionCommit.payload.summary.validRows, 1);
  assert.equal(transactionCommit.payload.summary.failedRows, 1);

  const stockRows = [
    {
      barcode: `IMP-BRC-${seed}`,
      movementType: "IN",
      quantity: 8,
      description: "Import stock in",
      date: "2026-08-07",
    },
  ];

  const stockCommit = await request({
    method: "POST",
    path: "/imports/stock/commit",
    authToken: token,
    body: { rows: stockRows },
  });
  assert.equal(stockCommit.status, 200, JSON.stringify(stockCommit.payload));
  assert.equal(stockCommit.payload.success, true);
  assert.equal(stockCommit.payload.summary.validRows, 1);
});

test("Public dealer portal token endpoints should respond", async () => {
  assert.ok(portalToken);

  const dash = await fetch(`${baseUrl}/dealer/public/${portalToken}/dashboard`);
  assert.equal(dash.status, 200);

  const statement = await fetch(`${baseUrl}/dealer/public/${portalToken}/statement`);
  assert.equal(statement.status, 200);

  const statementPdf = await fetch(`${baseUrl}/dealer/public/${portalToken}/statement/pdf`);
  assert.equal(statementPdf.status, 200);
  assert.equal(statementPdf.headers.get("content-type")?.includes("application/pdf"), true);
  await statementPdf.arrayBuffer();
});

test("Customer cleanup should soft delete integration customer", async () => {
  assert.ok(token);
  assert.ok(createdCustomerId);

  const removed = await request({
    method: "DELETE",
    path: `/customers/${createdCustomerId}`,
    authToken: token,
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.payload.success, true);
});

test("Master data brands should support full CRUD", async () => {
  assert.ok(token);

  const stamp = Date.now();

  const created = await request({
    method: "POST",
    path: "/master/brands",
    authToken: token,
    body: { name: `Brand-${stamp}` },
  });

  assert.equal(created.status, 201);
  assert.equal(created.payload.success, true);
  assert.ok(created.payload.item && created.payload.item._id);
  createdBrandId = created.payload.item._id;

  const updated = await request({
    method: "PUT",
    path: `/master/brands/${createdBrandId}`,
    authToken: token,
    body: { name: `BrandU-${stamp}` },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.payload.success, true);

  const listed = await request({
    method: "GET",
    path: `/master/brands?page=1&limit=10&q=BrandU-${stamp}`,
    authToken: token,
  });

  assert.equal(listed.status, 200);
  assert.equal(listed.payload.success, true);
  assert.ok(Array.isArray(listed.payload.items));

  const removed = await request({
    method: "DELETE",
    path: `/master/brands/${createdBrandId}`,
    authToken: token,
  });

  assert.equal(removed.status, 200);
  assert.equal(removed.payload.success, true);
});

  }
