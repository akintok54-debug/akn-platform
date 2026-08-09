import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoiceData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'CASH',
    referenceNo: '',
  });

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data?.invoice) {
        setInvoiceData(res.data.invoice);
        setPayments(res.data.payments || []);
      }
    } catch (err) {
      console.error(err);
      alert('Fatura yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      alert('Geçerli bir tutar girin');
      return;
    }
    if (paymentForm.amount > invoice.remainingAmount) {
      alert('Ödeme tutarı kalan tutardan fazla');
      return;
    }

    try {
      const res = await api.post(`/invoices/${id}/payment`, paymentForm);
      if (res.data?.success) {
        alert('✅ Ödeme başarıyla kaydedildi');
        setShowPayment(false);
        fetchInvoice();
        setPaymentForm({ amount: 0, method: 'CASH', referenceNo: '' });
      }
    } catch (err) {
      console.error(err);
      alert('Ödeme kaydedilemedi');
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>⏳ Yükleniyor...</div>;
  if (!invoice)
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>
        ❌ Fatura bulunamadı
      </div>
    );

  const statusColor = {
    TASLAK: '#6b7280',
    GONDERILDI: '#3b82f6',
    ONAYLANDI: '#16a34a',
    IPTAL: '#dc2626',
  };

  const paymentStatusColor = {
    PAID: '#16a34a',
    PARTIAL: '#f59e0b',
    UNPAID: '#dc2626',
    OVERDUE: '#991b1b',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* BAŞLIK */}
      <div
        style={{
          background: '#1f2937',
          color: '#fff',
          padding: 24,
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>📄 Fatura Detay</h2>
          <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
            {invoice.invoiceNumber}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Durum</div>
          <div
            style={{
              background: statusColor[invoice.status] || '#6b7280',
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {invoice.status}
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          🖨️ Yazdır
        </button>
        <button
          onClick={() => setShowPayment(!showPayment)}
          style={{
            padding: '8px 16px',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          💰 Ödeme Kaydet
        </button>
        <button
          onClick={() => navigate('/invoices')}
          style={{
            padding: '8px 16px',
            background: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ← Geri Dön
        </button>
      </div>

      {/* FATURA IÇERIĞI (Print-Ready) */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 40,
          marginBottom: 16,
          pageBreakAfter: 'always',
        }}
      >
        {/* BAŞLIK BÖLÜMÜ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32, borderBottom: '2px solid #1f2937', paddingBottom: 20 }}>
          {/* ŞİRKET */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
              AKN PLATFORM
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              <div>Vergi No: 1234567890</div>
              <div>Adres: İstanbul, TR</div>
              <div>Tel: +90 (555) 123-45-67</div>
              <div>Email: info@aknplatform.com</div>
            </div>
          </div>

          {/* FATURA BİLGİSİ */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
              FATURA
            </div>
            <table style={{ width: '100%', fontSize: 12, textAlign: 'right' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#6b7280' }}>Fatura No:</td>
                  <td style={{ fontWeight: 600 }}>{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style={{ color: '#6b7280' }}>Tarih:</td>
                  <td>{new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}</td>
                </tr>
                {invoice.dueDate && (
                  <tr>
                    <td style={{ color: '#6b7280' }}>Vade:</td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MÜŞTERİ BİLGİSİ */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
            FATURA ÖDEYECİ
          </div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600 }}>{invoice.customerName}</div>
            {invoice.customerTaxNumber && <div>Vergi No: {invoice.customerTaxNumber}</div>}
            {invoice.customerAddress && <div>{invoice.customerAddress}</div>}
            {invoice.customerPhone && <div>Tel: {invoice.customerPhone}</div>}
            {invoice.customerEmail && <div>Email: {invoice.customerEmail}</div>}
          </div>
        </div>

        {/* ÜRÜNLER TABLOSU */}
        <div style={{ marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #1f2937' }}>
                <th style={{ padding: 8, textAlign: 'left', color: '#1f2937', fontWeight: 600 }}>
                  Satır No
                </th>
                <th style={{ padding: 8, textAlign: 'left', color: '#1f2937', fontWeight: 600 }}>
                  Ürün Adı
                </th>
                <th style={{ padding: 8, textAlign: 'center', color: '#1f2937', fontWeight: 600 }}>
                  Birim
                </th>
                <th style={{ padding: 8, textAlign: 'right', color: '#1f2937', fontWeight: 600 }}>
                  Adet
                </th>
                <th style={{ padding: 8, textAlign: 'right', color: '#1f2937', fontWeight: 600 }}>
                  Birim Fiyat
                </th>
                <th style={{ padding: 8, textAlign: 'right', color: '#1f2937', fontWeight: 600 }}>
                  KDV %
                </th>
                <th style={{ padding: 8, textAlign: 'right', color: '#1f2937', fontWeight: 600 }}>
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                  }}
                >
                  <td style={{ padding: 8 }}>{idx + 1}</td>
                  <td style={{ padding: 8 }}>
                    {item.name}
                    {item.description && (
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    {item.quantity.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    ₺{item.unitPrice.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>%{item.taxRate}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                    ₺{item.totalWithTax.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOPLAM BÖLÜMÜ */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, marginBottom: 24 }}>
          <div>{/* Notlar bölümü */}</div>

          {/* TOPLAM HESAPLARI */}
          <div style={{ fontSize: 12 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                borderTop: '1px solid #e5e7eb',
                paddingTop: 12,
              }}
            >
              <div style={{ color: '#6b7280' }}>Mal Toplamı:</div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>
                ₺{invoice.subTotal.toFixed(2)}
              </div>

              {Object.entries(invoice.taxBreakdown || {}).map(([key, value]) => {
                const rate = key.replace('tax', '').replace(/([A-Z])/g, '');
                return value > 0 ? (
                  <div key={key} style={{ color: '#6b7280' }}>
                    KDV %{rate === '0' ? '0' : rate === '8' ? '8' : rate === '18' ? '18' : '20'}:
                  </div>
                ) : null;
              })}

              {Object.entries(invoice.taxBreakdown || {}).map(([key, value]) => {
                return value > 0 ? (
                  <div key={`val-${key}`} style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₺{value.toFixed(2)}
                  </div>
                ) : null;
              })}

              <div
                style={{
                  gridColumn: '1 / -1',
                  borderTop: '2px solid #1f2937',
                  paddingTop: 12,
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1f2937',
                }}
              >
                <div>GENEL TOPLAM:</div>
                <div style={{ textAlign: 'right' }}>₺{invoice.grandTotal.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ÖDEME BİLGİSİ */}
        <div style={{ background: '#f3f4f6', padding: 12, borderRadius: 6, marginBottom: 24, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
            Ödeme Durumu
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>Ödenen Tutar</div>
              <div style={{ fontWeight: 600, color: '#16a34a' }}>
                ₺{invoice.paidAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>Kalan Tutar</div>
              <div
                style={{
                  fontWeight: 600,
                  color: invoice.remainingAmount > 0 ? '#dc2626' : '#16a34a',
                }}
              >
                ₺{invoice.remainingAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>Ödeme Yöntemi</div>
              <div style={{ fontWeight: 600 }}>{invoice.paymentMethod}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>Durum</div>
              <div
                style={{
                  background: paymentStatusColor[invoice.paymentStatus],
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: 3,
                  display: 'inline-block',
                  fontWeight: 600,
                }}
              >
                {invoice.paymentStatus}
              </div>
            </div>
          </div>
        </div>

        {/* NOTLAR */}
        {invoice.notes && (
          <div style={{ marginBottom: 24, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>Notlar</div>
            <div style={{ color: '#374151', lineHeight: 1.6 }}>{invoice.notes}</div>
          </div>
        )}

        {/* IMZA ALANI */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 32,
            marginTop: 40,
            paddingTop: 32,
            borderTop: '1px solid #d1d5db',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ height: 50, borderBottom: '1px solid #1f2937', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#1f2937' }}>Satıcı İmzası</div>
          </div>
          <div>
            <div style={{ height: 50, borderBottom: '1px solid #1f2937', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#1f2937' }}>Alıcı İmzası</div>
          </div>
          <div>
            <div style={{ height: 50, borderBottom: '1px solid #1f2937', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#1f2937' }}>Denetçi İmzası</div>
          </div>
        </div>
      </div>

      {/* ÖDEMELER LİSTESİ */}
      {payments.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 12px' }}>📋 Ödeme Geçmişi</h3>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Tarih</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Yöntem</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Tutar</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Referans</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>
                    {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                  </td>
                  <td style={{ padding: 8 }}>{payment.method}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                    ₺{payment.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: 8 }}>{payment.referenceNo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ÖDEME FORMU */}
      {showPayment && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 16, marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px' }}>💰 Ödeme Kaydet</h3>
          <form onSubmit={handlePayment} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Tutar (Kalan: ₺{invoice.remainingAmount.toFixed(2)})
              </label>
              <input
                type="number"
                step="0.01"
                max={invoice.remainingAmount}
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })
                }
                style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Yöntem
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value })
                  }
                  style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
                >
                  <option value="CASH">Nakit</option>
                  <option value="BANK">Banka Transferi</option>
                  <option value="CARD">Kredi Kartı</option>
                  <option value="CHECK">Çek</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Referans (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={paymentForm.referenceNo}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, referenceNo: e.target.value })
                  }
                  style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: 8,
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✅ Ödeme Kaydet
              </button>
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                style={{
                  flex: 1,
                  padding: 8,
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ❌ İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRINT CSS */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          div { page-break-inside: avoid; }
          button { display: none; }
          .no-print { display: none; }
        }
      `}</style>
    </div>
  );
};

export default InvoiceView;
