import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  // FORM STATE
  const [formData, setFormData] = useState({
    customerId: '',
    saleId: '',
    invoiceType: 'E_ARSIV',
    notes: '',
    dueDate: '',
    paymentMethod: 'CASH',
  });

  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    productId: '',
    name: '',
    quantity: 1,
    unitPrice: 0,
    unit: 'Adet',
    taxRate: 20,
  });

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, productsRes, salesRes] = await Promise.all([
        api.get('/customers'),
        api.get('/products'),
        api.get('/sales'),
      ]);

      setCustomers(customersRes?.data?.customers || customersRes?.data?.data || []);
      setProducts(productsRes?.data?.products || productsRes?.data?.data || []);
      setSales(salesRes?.data?.sales || salesRes?.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const addItem = () => {
    if (!currentItem.name || currentItem.quantity <= 0 || currentItem.unitPrice < 0) {
      alert('Lütfen tüm alanları doldurunuz');
      return;
    }

    setItems([...items, { ...currentItem, id: Date.now() }]);
    setCurrentItem({
      productId: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      unit: 'Adet',
      taxRate: 20,
    });
  };

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleProductSelect = (e) => {
    const product = products.find((p) => p._id === e.target.value);
    if (product) {
      setCurrentItem({
        ...currentItem,
        productId: product._id,
        name: product.name,
        unitPrice: product.salePrice || 0,
        unit: product.unit || 'Adet',
        taxRate: product.vat || 20,
      });
    }
  };

  const handleSaleSelect = (e) => {
    const sale = sales.find((s) => s._id === e.target.value);
    if (sale) {
      // Sale'den müşteri bilgisini al
      setFormData({
        ...formData,
        saleId: sale._id,
        customerId: sale.customerId?._id || sale.customerId || '',
      });

      // Sale items'ları faturaya ekle
      if (sale.items && sale.items.length > 0) {
        const saleItems = sale.items.map((item, idx) => ({
          id: `sale-${idx}`,
          productId: item.productId?._id || item.productId || '',
          name: item.productId?.name || 'Ürün',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.productId?.unit || 'Adet',
          taxRate: item.productId?.vat || 20,
        }));
        setItems(saleItems);
      }
    }
  };

  const calculateTotals = () => {
    let subTotal = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = itemSubtotal * (item.taxRate / 100);
      subTotal += itemSubtotal;
      taxTotal += itemTax;
    });

    return {
      subTotal: subTotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      grandTotal: (parseFloat(subTotal) + parseFloat(taxTotal)).toFixed(2),
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      alert('Lütfen müşteri seçiniz');
      return;
    }

    if (items.length === 0) {
      alert('Lütfen en az bir ürün ekleyiniz');
      return;
    }

    setLoading(true);

    try {
      const invoiceData = {
        customerId: formData.customerId,
        saleId: formData.saleId || undefined,
        invoiceType: formData.invoiceType,
        notes: formData.notes,
        dueDate: formData.dueDate || null,
        paymentMethod: formData.paymentMethod,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
          taxRate: item.taxRate,
        })),
      };

      const res = await api.post('/invoices', invoiceData);

      if (res.data?.success) {
        alert('✅ Fatura başarıyla oluşturuldu!');
        navigate(`/invoices/${res.data.invoice._id}`);
      }
    } catch (error) {
      console.error(error);
      alert('❌ Fatura oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  if (preview) {
    // PREVIEW VIEW
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
        <button
          onClick={() => setPreview(false)}
          style={{
            marginBottom: 16,
            padding: '8px 16px',
            background: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ← Geri Dön
        </button>

        <div
          style={{
            background: '#fff',
            border: '2px solid #d1d5db',
            borderRadius: 8,
            padding: 40,
            lineHeight: 1.6,
            fontSize: 13,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>AKN PLATFORM</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Vergi No: 1234567890</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>FATURA ÖDEYECİ</div>
              <div>
                {customers.find((c) => c._id === formData.customerId)?.companyName ||
                  customers.find((c) => c._id === formData.customerId)?.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>FATURA</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Tarih: {new Date().toLocaleDateString('tr-TR')}
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #1f2937' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Ürün</th>
                <th style={{ padding: 8, textAlign: 'center' }}>Adet</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Birim Fiyat</th>
                <th style={{ padding: 8, textAlign: 'right' }}>KDV %</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const itemTotal = item.quantity * item.unitPrice;
                const itemTax = itemTotal * (item.taxRate / 100);
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: idx % 2 === 0 ? '#f9fafb' : '#fff',
                    }}
                  >
                    <td style={{ padding: 8 }}>{item.name}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>₺{item.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>%{item.taxRate}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                      ₺{(itemTotal + itemTax).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <div style={{ display: 'inline-block', minWidth: 200 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <div>Mal Toplamı:</div>
                <div>₺{totals.subTotal}</div>
                <div>Toplam KDV:</div>
                <div>₺{totals.taxTotal}</div>
                <div style={{ borderTop: '2px solid #1f2937', paddingTop: 12, fontWeight: 700 }}>
                  GENEL TOPLAM:
                </div>
                <div style={{ borderTop: '2px solid #1f2937', paddingTop: 12, fontWeight: 700 }}>
                  ₺{totals.grandTotal}
                </div>
              </div>
            </div>
          </div>

          {formData.notes && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Notlar</div>
              <div>{formData.notes}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* BAŞLIK */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #16a34a 100%)',
          color: '#fff',
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>📄 Fatura Oluştur</h2>
        <p style={{ margin: '6px 0 0', opacity: 0.95 }}>
          Müşteri, ürün ve muhasebe akışını tek ekrandan yönetin
        </p>
      </div>

      {/* KARTLAR */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard title="Ürün Sayısı" value={items.length} accent="#3b82f6" />
        <StatCard title="Ara Toplam" value={`₺${totals.subTotal}`} accent="#16a34a" />
        <StatCard title="Toplam KDV" value={`₺${totals.taxTotal}`} accent="#8b5cf6" />
        <StatCard title="Genel Toplam" value={`₺${totals.grandTotal}`} accent="#dc2626" />
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        {/* MÜŞTERİ & TARİH */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: '0 0 16px', color: '#1f2937' }}>👤 Müşteri Bilgileri</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Satıştan Oluştur (İsteğe Bağlı)
              </label>
              <select
                value={formData.saleId}
                onChange={handleSaleSelect}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
              >
                <option value="">Seçiniz</option>
                {sales.map((sale) => (
                  <option key={sale._id} value={sale._id}>
                    {sale.saleNumber || sale._id} -{' '}
                    {sale.customerId?.companyName || 'Müşteri'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Müşteri *
              </label>
              <select
                value={formData.customerId}
                onChange={(e) =>
                  setFormData({ ...formData, customerId: e.target.value })
                }
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
                required
              >
                <option value="">Seçiniz</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.companyName || customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Fatura Türü
              </label>
              <select
                value={formData.invoiceType}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceType: e.target.value })
                }
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
              >
                <option value="E_FATURA">E-Fatura</option>
                <option value="E_ARSIV">E-Arşiv</option>
                <option value="NORMAL">Normal Fatura</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Vade Tarihi
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Ödeme Yöntemi
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
              >
                <option value="CASH">Nakit</option>
                <option value="BANK">Banka Transferi</option>
                <option value="CARD">Kredi Kartı</option>
                <option value="CHECK">Çek</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Notlar
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="İsteğe bağlı not"
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
              />
            </div>
          </div>
        </div>

        {/* ÜRÜN EKLEMİ */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: '0 0 16px', color: '#1f2937' }}>📦 Ürün Ekle</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                Ürün
              </label>
              <select
                value={currentItem.productId}
                onChange={handleProductSelect}
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12 }}
              >
                <option value="">Seçiniz veya manuel gir</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ürün adı"
                value={currentItem.name}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, name: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: 6,
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  marginTop: 4,
                  fontSize: 12,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                Adet
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={currentItem.quantity}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    quantity: parseFloat(e.target.value),
                  })
                }
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #d1d5db' }}
              />
              <input
                type="text"
                placeholder="Birim"
                value={currentItem.unit}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, unit: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: 6,
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  marginTop: 4,
                  fontSize: 12,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                Birim Fiyat
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={currentItem.unitPrice}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    unitPrice: parseFloat(e.target.value),
                  })
                }
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #d1d5db' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                KDV %
              </label>
              <select
                value={currentItem.taxRate}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    taxRate: parseInt(e.target.value),
                  })
                }
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #d1d5db' }}
              >
                <option value="0">%0</option>
                <option value="8">%8</option>
                <option value="18">%18</option>
                <option value="20">%20</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={addItem}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                ➕ Ekle
              </button>
            </div>
          </div>
        </div>

        {/* ÜRÜN LİSTESİ */}
        {items.length > 0 && (
          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: '0 0 12px', color: '#1f2937' }}>📋 Fatura Kalemleri</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#e5e7eb', borderRadius: 4 }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Ürün</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Adet</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Birim Fiyat</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>KDV %</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Toplam</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const itemTotal = item.quantity * item.unitPrice;
                  const itemTax = itemTotal * (item.taxRate / 100);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #d1d5db',
                        background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                      }}
                    >
                      <td style={{ padding: 8 }}>{item.name}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>₺{item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>%{item.taxRate}</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                        ₺{(itemTotal + itemTax).toFixed(2)}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          style={{
                            padding: '2px 8px',
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* BUTTONS */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setPreview(true)}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            👁️ Önizleme
          </button>
          <button
            type="button"
            onClick={() => navigate('/accounting')}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Geri Dön
          </button>
          <button
            type="submit"
            disabled={loading || items.length === 0}
            style={{
              padding: '10px 20px',
              background: items.length === 0 ? '#ccc' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? '⏳ Oluşturuluyor...' : '✅ Fatura Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceCreate;
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <label>
          Müşteri
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} required>
            <option value="">Seçiniz</option>
            {customers.map((customer) => (
              <option key={customer._id || customer.id} value={customer._id || customer.id}>{customer.companyName || customer.name}</option>
            ))}
          </select>
        </label>

        <label>
          Fatura Türü
          <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }}>
            <option value="E_FATURA">E-Fatura</option>
            <option value="E_ARSIV">E-Arşiv</option>
          </select>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
          <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} style={{ padding: 8 }}>
            <option value="">Ürün seç</option>
            {products.map((product) => (
              <option key={product._id || product.id} value={product._id || product.id}>{product.name}</option>
            ))}
          </select>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ padding: 8 }} />
          <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={{ padding: 8 }} />
          <button type="button" onClick={addItem} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Ekle</button>
        </div>

        <div style={{ marginTop: 8 }}>
          {items.length === 0 ? <p>Henüz kalem eklenmedi.</p> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((item, index) => (
                <div key={`${item.productId}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', padding: 10, borderRadius: 8 }}>
                  <div>
                    <strong>{item.name}</strong>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{item.quantity} x {item.unitPrice} TL</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{item.totalPrice} TL</span>
                    <button type="button" onClick={() => removeItem(index)} style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, textAlign: 'right' }}>Toplam: {total} TL</div>
        <button type="submit" disabled={loading || items.length === 0} style={{ padding: '10px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {loading ? 'Oluşturuluyor...' : 'Faturayı Oluştur'}
        </button>
      </form>
    </div>
  );
};

export default InvoiceCreate;
