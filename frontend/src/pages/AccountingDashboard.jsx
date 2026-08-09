import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';

const AccountingDashboard = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices/reports/accounting', {
        params: dateRange,
      });
      setReport(res.data?.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>⏳ Raporlar yükleniyor...</div>
    );

  if (!report)
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>
        ❌ Rapor yüklenemedi
      </div>
    );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* BAŞLIK */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
          color: '#fff',
          padding: 24,
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>📊 Muhasebe Paneli</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Satış, KDV ve ödeme durumu raporları
        </p>
      </div>

      {/* TARİH SEÇİCİ */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: 'auto auto auto',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            Başlangıç Tarihi
          </label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            Bitiş Tarihi
          </label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, endDate: e.target.value })
            }
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <button
          onClick={fetchReport}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          🔄 Rapor Yenile
        </button>
      </div>

      {/* ÖZET KARTLARı */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="💰 Toplam Satış"
          value={`₺${report.metrics.totalRevenue.toFixed(2)}`}
          accent="#16a34a"
        />
        <StatCard
          title="✅ Ödenen Tutar"
          value={`₺${report.metrics.paidAmount.toFixed(2)}`}
          accent="#3b82f6"
        />
        <StatCard
          title="⏳ Ödenmemiş Tutar"
          value={`₺${report.metrics.unpaidAmount.toFixed(2)}`}
          accent="#f59e0b"
        />
        <StatCard
          title="🏛️ Toplam KDV"
          value={`₺${report.metrics.totalTax.toFixed(2)}`}
          accent="#8b5cf6"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="📄 Toplam Fatura"
          value={report.metrics.totalInvoices}
          accent="#1f2937"
        />
        <StatCard
          title="✅ Ödenen Faturalar"
          value={report.metrics.paidInvoices}
          accent="#16a34a"
        />
        <StatCard
          title="❌ Ödenmemiş Faturalar"
          value={report.metrics.unpaidInvoices}
          accent="#dc2626"
        />
        <StatCard
          title="💵 Ort. Fatura Değeri"
          value={`₺${report.metrics.averageOrderValue.toFixed(2)}`}
          accent="#3b82f6"
        />
      </div>

      {/* KDV DAĞILIŞI */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ margin: '0 0 16px', color: '#1f2937' }}>🏛️ KDV Dağılımı</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          {[
            {
              label: '%0 KDV',
              value: report.taxBreakdown.tax0Percent,
              color: '#6b7280',
            },
            {
              label: '%8 KDV',
              value: report.taxBreakdown.tax8Percent,
              color: '#3b82f6',
            },
            {
              label: '%18 KDV',
              value: report.taxBreakdown.tax18Percent,
              color: '#f59e0b',
            },
            {
              label: '%20 KDV',
              value: report.taxBreakdown.tax20Percent,
              color: '#16a34a',
            },
          ].map((tax, idx) => (
            <div
              key={idx}
              style={{
                background: `${tax.color}15`,
                border: `2px solid ${tax.color}`,
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                {tax.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: tax.color }}>
                ₺{tax.value.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP ÜRÜNLER */}
      {report.topProducts && report.topProducts.length > 0 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 16px', color: '#1f2937' }}>🏆 En Çok Satılan Ürünler</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Ürün Adı</th>
                <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Adet</th>
                <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Ciro</th>
                <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Oranı</th>
              </tr>
            </thead>
            <tbody>
              {report.topProducts.map((product, idx) => {
                const ratio =
                  ((product.revenue / report.metrics.totalRevenue) * 100).toFixed(1) || 0;
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                    }}
                  >
                    <td style={{ padding: 12 }}>{product.name}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>{product.quantity}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>
                      ₺{product.revenue.toFixed(2)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <div
                        style={{
                          background: '#3b82f6',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        %{ratio}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TOP MÜŞTERİLER */}
      {report.topCustomers && report.topCustomers.length > 0 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 16px', color: '#1f2937' }}>👥 En Fazla Ciro Yapan Müşteriler</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Müşteri Adı</th>
                <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Fatura Sayısı</th>
                <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Toplam Ciro</th>
                <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Oranı</th>
              </tr>
            </thead>
            <tbody>
              {report.topCustomers.map((customer, idx) => {
                const ratio =
                  ((customer.totalRevenue / report.metrics.totalRevenue) * 100).toFixed(1) ||
                  0;
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                    }}
                  >
                    <td style={{ padding: 12 }}>{customer.name}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      {customer.invoiceCount}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>
                      ₺{customer.totalRevenue.toFixed(2)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <div
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        %{ratio}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* BUTTONS */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 24,
        }}
      >
        <button
          onClick={() => navigate('/invoices')}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          📄 Tüm Faturaları Gör
        </button>
        <button
          onClick={() => navigate('/invoices/create')}
          style={{
            padding: '12px 24px',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ➕ Yeni Fatura Oluştur
        </button>
      </div>
    </div>
  );
};

export default AccountingDashboard;
