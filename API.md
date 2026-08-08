# AKN Platform - API Envanteri

Temel API adresi: /api

## 1) Sistem

- GET /api/health

## 2) Auth (/api/auth)

- POST /register
- POST /login

## 3) Company (/api/company)

- POST /
- GET /
- GET /me
- PUT /me
- GET /backup

## 4) Products (/api/products)

- POST /
- GET /
- GET /:id
- PUT /:id
- DELETE /:id

## 5) Customers (/api/customers)

- POST /
- GET /
- GET /:id
- PUT /:id
- DELETE /:id
- GET /:id/ledger
- POST /portal/bulk
- GET /:id/portal/link
- POST /:id/portal/link/refresh
- POST /:id/portal/deactivate
- GET /:id/statement/pdf
- POST /:id/share/whatsapp
- POST /:id/share/mail
- POST /:id/reminder
- POST /:id/reminder/debt
- GET /:id/share/history
- POST /:id/transactions

## 6) Sales (/api/sales)

- POST /
- GET /

## 7) Accounts (/api/accounts)

- GET /transactions
- GET /cash-report
- GET /customer-statement/:customerId

## 8) Invoices (/api/invoices)

- POST /
- GET /
- POST /send/:id

## 9) Permissions (/api/permissions)

- GET /
- GET /roles
- GET /users
- POST /users
- PUT /users/:id
- POST /
- PUT /:id
- POST /assign

## 10) ERP (/api/erp)

- GET /overview

## 11) Orders (/api/orders)

- GET /products
- GET /
- POST /
- PUT /:id/status

## 12) Cash (/api/cash)

- POST /transactions
- GET /transactions

## 13) Bank (/api/bank)

- POST /accounts
- GET /accounts
- POST /transactions
- GET /transactions

## 14) Stock (/api/stock)

- GET /overview
- GET /warehouses
- POST /warehouses
- GET /movements
- POST /movements

## 15) Activity Logs (/api/activity-logs)

- GET /

## 16) Master Data (/api/master)

- GET /:resource
- GET /:resource/:id
- POST /:resource
- PUT /:resource/:id
- DELETE /:resource/:id

## 17) Dealer Portal (/api/dealer)

### 17.1 Kimlik

- POST /auth/login

### 17.2 Public Token Erişimi (/public/:secureToken)

- GET /dashboard
- GET /statement
- GET /statement/pdf
- POST /statement/whatsapp
- POST /statement/mail
- GET /purchases
- GET /payments
- GET /returns
- GET /orders
- GET /invoices
- GET /invoices/:id/pdf
- GET /notifications
- GET /history
- GET /profile

### 17.3 Bayi Yetkili Erişimi

- GET /dashboard
- GET /statement
- GET /statement/pdf
- POST /statement/whatsapp
- POST /statement/mail
- GET /purchases
- GET /payments
- GET /returns
- GET /orders
- GET /invoices
- GET /invoices/:id/pdf
- GET /notifications
- GET /history
- GET /profile
- PUT /profile/password

## 18) Imports (/api/imports)

- GET /templates/:module
- POST /:module/validate
- POST /:module/commit

## 19) Route Dosyası Mevcut, Mount Edilmeyenler

- storeProductRoutes.js
- accountingRoutes.js

Not: Bu endpointler backend/server.js içinde app.use ile bağlanmadığı için aktif API yüzeyinde değillerdir.
