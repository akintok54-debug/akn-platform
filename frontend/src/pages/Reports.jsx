import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const REPORT_TYPES = [
  { value: 'SALES', label: 'Satış Raporu' },
  { value: 'PURCHASE', label: 'Alış Raporu' },
  { value: 'CASH', label: 'Kasa Raporu' },
  { value: 'BANK', label: 'Banka Raporu' },
  { value: 'CUSTOMER_LEDGER', label: 'Cari Ekstre' },
  { value: 'STOCK', label: 'Stok Raporu' },
  { value: 'TOP_SELLERS', label: 'En Çok Satanlar' },
  { value: 'LOW_SELLERS', label: 'En Az Satanlar' },
];

const PERIODS = [
  { value: 'DAILY', label: 'Günlük' },
  { value: 'WEEKLY', label: 'Haftalık' },
  { value: 'MONTHLY', label: 'Aylık' },
  { value: 'YEARLY', label: 'Yıllık' },
];

const BORC_TYPES = new Set(['BORC', 'ORDER', 'INVOICE']);
const ALACAK_TYPES = new Set(['ALACAK', 'TAHSILAT', 'ODEME', 'COLLECTION', 'PAYMENT', 'RETURN']);

const Reports = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cashTransactions, setCashTransactions] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('SALES');
  const [period, setPeriod] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('reportTemplates') || '[]');
      setTemplates(Array.isArray(saved) ? saved : []);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salesRes, productsRes, customersRes, cashRes, bankRes, stockRes] = await Promise.all([
          api.get('/sales').catch(() => ({ data: { sales: [] } })),
          api.get('/products').catch(() => ({ data: { data: [] } })),
          api.get('/customers').catch(() => ({ data: { customers: [] } })),
          api.get('/cash/transactions').catch(() => ({ data: { transactions: [] } })),
          api.get('/bank/transactions').catch(() => ({ data: { transactions: [] } })),
          api.get('/stock/movements').catch(() => ({ data: { movements: [] } })),
        ]);

        setSales(salesRes?.data?.sales || salesRes?.data?.data || salesRes?.data || []);
        setProducts(productsRes?.data?.data || productsRes?.data?.products || productsRes?.data || []);
        setCustomers(customersRes?.data?.customers || customersRes?.data?.data || customersRes?.data || []);
        setCashTransactions(cashRes?.data?.transactions || []);
        setBankTransactions(bankRes?.data?.transactions || []);
        setStockMovements(stockRes?.data?.movements || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((item) => {
      map.set(String(item._id || item.id), item);
    });
    return map;
  }, [products]);

  const inPeriod = (rawDate) => {
    if (!rawDate) return false;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    const start = new Date(now);

    if (period === 'DAILY') {
      start.setHours(0, 0, 0, 0);
    }

    if (period === 'WEEKLY') {
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - 7);
    }

    if (period === 'MONTHLY') {
      start.setHours(0, 0, 0, 0);
      start.setMonth(now.getMonth() - 1);
    }

    if (period === 'YEARLY') {
      start.setHours(0, 0, 0, 0);
      start.setFullYear(now.getFullYear() - 1);
    }

    return date >= start && date <= now;
  };

  const inCustomRange = (rawDate) => {
    if (!startDate && !endDate) return true;
    if (!rawDate) return false;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return false;

    const onlyDate = new Date(date.toDateString());
    const start = startDate ? new Date(new Date(startDate).toDateString()) : null;
    const end = endDate ? new Date(new Date(endDate).toDateString()) : null;

    if (start && onlyDate < start) return false;
    if (end && onlyDate > end) return false;
    return true;
  };

  const filteredSales = useMemo(() => sales.filter((sale) => inPeriod(sale.saleDate || sale.createdAt)), [sales, period]);
  const filteredCash = useMemo(() => cashTransactions.filter((tx) => inPeriod(tx.date || tx.createdAt)), [cashTransactions, period]);
  const filteredBank = useMemo(() => bankTransactions.filter((tx) => inPeriod(tx.date || tx.createdAt)), [bankTransactions, period]);
  const filteredStockMovements = useMemo(() => stockMovements.filter((tx) => inPeriod(tx.movementDate || tx.createdAt)), [stockMovements, period]);

  const customerLedgerRows = useMemo(() => {
    const rows = [];
    customers.forEach((customer) => {
      (customer.transactions || []).forEach((tx, index) => {
        if (!inPeriod(tx.date || customer.updatedAt || customer.createdAt)) return;
        const type = String(tx.type || '').toUpperCase();
        const amount = Number(tx.amount || 0);
        rows.push({
          id: `${customer._id || customer.id}-${index}`,
          customerName: customer.companyName || customer.name || '-',
          date: tx.date || customer.updatedAt || customer.createdAt,
          type,
          description: tx.description || '',
          borc: BORC_TYPES.has(type) ? amount : 0,
          alacak: ALACAK_TYPES.has(type) ? amount : 0,
          bakiye: Number(customer.balance || 0),
        });
      });
    });
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [customers, period]);

  const salesByProduct = useMemo(() => {
    const map = new Map();
    filteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const name = item.productId?.name || item.productName || 'Bilinmeyen Ürün';
        const quantity = Number(item.quantity || 0);
        const total = Number(item.totalPrice || item.unitPrice * item.quantity || 0);
        const prev = map.get(name) || { productName: name, quantity: 0, total: 0 };
        map.set(name, {
          productName: name,
          quantity: prev.quantity + quantity,
          total: prev.total + total,
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [filteredSales]);

  const currentReport = useMemo(() => {
    if (reportType === 'SALES') {
      const rows = filteredSales.map((sale, index) => ({
        id: sale._id || index,
        date: sale.saleDate || sale.createdAt,
        customer: sale.customerId?.companyName || sale.customerId?.name || '-',
        paymentType: sale.paymentType || '-',
        amount: Number(sale.totalAmount || 0),
      }));

      return {
        title: 'Satış Raporu',
        columns: [
          { key: 'date', label: 'Tarih' },
          { key: 'customer', label: 'Müşteri' },
          { key: 'paymentType', label: 'Ödeme' },
          { key: 'amount', label: 'Tutar' },
        ],
        rows,
      };
    }

    if (reportType === 'PURCHASE') {
      const rows = filteredStockMovements
        .filter((item) => item.movementType === 'STOK_GIRIS')
        .map((item, index) => {
          const productId = String(item.productId?._id || item.productId || '');
          const product = productMap.get(productId);
          const purchasePrice = Number(product?.purchasePrice || 0);
          const quantity = Math.abs(Number(item.quantity || 0));
          return {
            id: item._id || index,
            date: item.movementDate || item.createdAt,
            product: item.productId?.name || product?.name || '-',
            quantity,
            unitPrice: purchasePrice,
            total: Number((quantity * purchasePrice).toFixed(2)),
          };
        });

      return {
        title: 'Alış Raporu',
        columns: [
          { key: 'date', label: 'Tarih' },
          { key: 'product', label: 'Ürün' },
          { key: 'quantity', label: 'Miktar' },
          { key: 'unitPrice', label: 'Birim Alış' },
          { key: 'total', label: 'Toplam' },
        ],
        rows,
      };
    }

    if (reportType === 'CASH') {
      const rows = filteredCash.map((item, index) => ({
        id: item._id || index,
        date: item.date || item.createdAt,
        type: item.operation || item.transactionType || '-',
        description: item.description || '-',
        giris: Number(item.cashIn || 0),
        cikis: Number(item.cashOut || 0),
        bakiye: Number(item.balance || 0),
      }));

      return {
        title: 'Kasa Raporu',
        columns: [
          { key: 'date', label: 'Tarih' },
          { key: 'type', label: 'İşlem' },
          { key: 'description', label: 'Açıklama' },
          { key: 'giris', label: 'Giriş' },
          { key: 'cikis', label: 'Çıkış' },
          { key: 'bakiye', label: 'Bakiye' },
        ],
        rows,
      };
    }

    if (reportType === 'BANK') {
      const rows = filteredBank.map((item, index) => ({
        id: item._id || index,
        date: item.date || item.createdAt,
        operation: item.operation || '-',
        from: item.fromAccountId?.name || '-',
        to: item.toAccountId?.name || '-',
        amount: Number(item.amount || 0),
      }));

      return {
        title: 'Banka Raporu',
        columns: [
          { key: 'date', label: 'Tarih' },
          { key: 'operation', label: 'İşlem' },
          { key: 'from', label: 'Kaynak' },
          { key: 'to', label: 'Hedef' },
          { key: 'amount', label: 'Tutar' },
        ],
        rows,
      };
    }

    if (reportType === 'CUSTOMER_LEDGER') {
      return {
        title: 'Cari Ekstre',
        columns: [
          { key: 'date', label: 'Tarih' },
          { key: 'customerName', label: 'Cari' },
          { key: 'type', label: 'Tür' },
          { key: 'description', label: 'Açıklama' },
          { key: 'borc', label: 'Borç' },
          { key: 'alacak', label: 'Alacak' },
          { key: 'bakiye', label: 'Bakiye' },
        ],
        rows: customerLedgerRows,
      };
    }

    if (reportType === 'STOCK') {
      const rows = products.map((item, index) => ({
        id: item._id || index,
        product: item.name || '-',
        sku: item.sku || item.barcode || '-',
        stock: Number(item.stock || 0),
        minStock: Number(item.minStock || 0),
        status: Number(item.stock || 0) <= Number(item.minStock || 0) ? 'Kritik' : 'Normal',
      }));

      return {
        title: 'Stok Raporu',
        columns: [
          { key: 'product', label: 'Ürün' },
          { key: 'sku', label: 'SKU/Barkod' },
          { key: 'stock', label: 'Stok' },
          { key: 'minStock', label: 'Min Stok' },
          { key: 'status', label: 'Durum' },
        ],
        rows,
      };
    }

    if (reportType === 'TOP_SELLERS') {
      return {
        title: 'En Çok Satanlar',
        columns: [
          { key: 'productName', label: 'Ürün' },
          { key: 'quantity', label: 'Satılan Adet' },
          { key: 'total', label: 'Toplam Tutar' },
        ],
        rows: salesByProduct.slice(0, 20),
      };
    }

    return {
      title: 'En Az Satanlar',
      columns: [
        { key: 'productName', label: 'Ürün' },
        { key: 'quantity', label: 'Satılan Adet' },
        { key: 'total', label: 'Toplam Tutar' },
      ],
      rows: [...salesByProduct].reverse().slice(0, 20),
    };
  }, [reportType, filteredSales, filteredCash, filteredBank, customerLedgerRows, products, salesByProduct, filteredStockMovements, productMap]);

  const displayedRows = useMemo(() => {
    return currentReport.rows.filter((row) => {
      const dateValue = row.date;
      const dateMatch = inCustomRange(dateValue);

      const query = searchTerm.trim().toLowerCase();
      const searchMatch = !query
        ? true
        : Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query));

      return dateMatch && searchMatch;
    });
  }, [currentReport.rows, searchTerm, startDate, endDate]);

  const totals = useMemo(() => {
    const amountKeys = ['amount', 'total', 'giris', 'cikis', 'borc', 'alacak'];
    return displayedRows.reduce(
      (acc, row) => {
        amountKeys.forEach((key) => {
          if (typeof row[key] === 'number') acc.amount += Number(row[key] || 0);
        });
        return acc;
      },
      { amount: 0 }
    );
  }, [displayedRows]);

  const persistTemplates = (nextTemplates) => {
    setTemplates(nextTemplates);
    localStorage.setItem('reportTemplates', JSON.stringify(nextTemplates));
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) {
      alert('Şablon adı giriniz.');
      return;
    }

    const payload = {
      name,
      reportType,
      period,
      startDate,
      endDate,
      searchTerm,
    };

    const filtered = templates.filter((item) => item.name !== name);
    const next = [payload, ...filtered].slice(0, 30);
    persistTemplates(next);
    setTemplateName('');
    alert('Rapor şablonu kaydedildi.');
  };

  const loadTemplate = (name) => {
    const template = templates.find((item) => item.name === name);
    if (!template) return;
    setSelectedTemplateName(name);
    setReportType(template.reportType || 'SALES');
    setPeriod(template.period || 'MONTHLY');
    setStartDate(template.startDate || '');
    setEndDate(template.endDate || '');
    setSearchTerm(template.searchTerm || '');
  };

  const deleteTemplate = (name) => {
    const next = templates.filter((item) => item.name !== name);
    persistTemplates(next);
    if (selectedTemplateName === name) {
      setSelectedTemplateName('');
    }
  };

  const exportExcel = () => {
    const header = currentReport.columns.map((column) => column.label);
    const data = displayedRows.map((row) =>
      currentReport.columns.map((column) => {
        const value = row[column.key];
        if (column.key === 'date') return formatDate(value);
        if (typeof value === 'number') return value.toFixed(2);
        return String(value ?? '');
      })
    );

    const csv = [header, ...data]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReport.title.toLowerCase().replace(/\s+/g, '-')}-${period.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const header = currentReport.columns.map((column) => `<th>${column.label}</th>`).join('');
    const rows = displayedRows
      .map((row) => {
        const cells = currentReport.columns
          .map((column) => {
            const value = row[column.key];
            if (column.key === 'date') return `<td>${formatDate(value)}</td>`;
            if (typeof value === 'number') return `<td style="text-align:right;">${Number(value || 0).toLocaleString('tr-TR')}</td>`;
            return `<td>${String(value ?? '')}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) {
      alert('PDF çıktısı için açılır pencere izni veriniz.');
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${currentReport.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 10px; }
            .meta { margin-bottom: 12px; color: #444; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${currentReport.title}</h1>
          <div class="meta">Dönem: ${PERIODS.find((item) => item.value === period)?.label || period}</div>
          <table>
            <thead><tr>${header}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1500, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1d4ed8 100%)', color: '#fff', borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.85 }}>Raporlar</div>
          <h2 style={{ margin: '8px 0' }}>Satış, Alış, Kasa, Banka, Cari ve Stok Analizi</h2>
          <p style={{ margin: 0, opacity: 0.95 }}>Dönem bazlı rapor alın, en çok ve en az satan ürünleri karşılaştırın, PDF ve Excel çıktısı oluşturun.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Card title="Rapor Satırı" value={currentReport.rows.length} accent="#2563eb" />
          <Card title="Toplam Hacim" value={formatCurrency(totals.amount)} accent="#16a34a" />
          <Card title="Dönem" value={PERIODS.find((item) => item.value === period)?.label || '-'} accent="#7c3aed" />
          <Card title="Rapor Türü" value={REPORT_TYPES.find((item) => item.value === reportType)?.label || '-'} accent="#d97706" />
        </div>

        <section style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={inputStyle}>
                {REPORT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <select value={period} onChange={(e) => setPeriod(e.target.value)} style={inputStyle}>
                {PERIODS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tabloda ara"
                style={{ ...inputStyle, minWidth: 180 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={exportPdf} style={secondaryButtonStyle}>PDF</button>
              <button type="button" onClick={exportExcel} style={secondaryButtonStyle}>Excel</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Şablon adı"
                style={inputStyle}
              />
              <button type="button" onClick={saveTemplate} style={secondaryButtonStyle}>Şablon Kaydet</button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select onChange={(e) => loadTemplate(e.target.value)} value={selectedTemplateName} style={inputStyle}>
                <option value="">Şablon yükle</option>
                {templates.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
              {templates.length > 0 && (
                <button type="button" onClick={() => deleteTemplate(selectedTemplateName)} style={secondaryButtonStyle} disabled={!selectedTemplateName}>Seçili Şablonu Sil</button>
              )}
            </div>
          </div>

          <h3 style={{ marginTop: 14, marginBottom: 10 }}>{currentReport.title}</h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#64748b' }}>
                  {currentReport.columns.map((column) => (
                    <th key={column.key} style={thStyle}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={currentReport.columns.length} style={{ padding: 12 }}>Yükleniyor...</td>
                  </tr>
                ) : displayedRows.length > 0 ? (
                  displayedRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {currentReport.columns.map((column) => {
                        const value = row[column.key];
                        const isNumeric = typeof value === 'number';
                        return (
                          <td key={`${row.id}-${column.key}`} style={{ ...tdStyle, textAlign: isNumeric ? 'right' : 'left', fontWeight: isNumeric ? 700 : 400 }}>
                            {column.key === 'date' ? formatDate(value) : isNumeric ? Number(value).toLocaleString('tr-TR') : String(value ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={currentReport.columns.length} style={{ padding: 12, color: '#64748b' }}>Bu kriterde kayıt bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

const Card = ({ title, value, accent }) => (
  <div style={{ background: '#fff', padding: 14, borderRadius: 14, boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)', borderTop: `4px solid ${accent || '#2563eb'}` }}>
    <div style={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</div>
    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: '#0f172a' }}>{value}</div>
  </div>
);

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 12px',
  background: '#fff',
};

const secondaryButtonStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  padding: '8px 12px',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 700,
  cursor: 'pointer',
};

const thStyle = {
  padding: '10px 12px',
  fontSize: 13,
};

const tdStyle = {
  padding: '10px 12px',
  fontSize: 14,
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR');
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('tr-TR')} TL`;

export default Reports;
