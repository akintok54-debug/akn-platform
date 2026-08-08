import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [invoiceType, setInvoiceType] = useState('E_FATURA');
  const [items, setItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, productsRes] = await Promise.all([api.get('/customers'), api.get('/products')]);
        setCustomers(customersRes?.data?.customers || customersRes?.data?.data || customersRes?.data || []);
        setProducts(productsRes?.data?.products || productsRes?.data?.data || productsRes?.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const addItem = () => {
    if (!selectedProductId) return;
    const product = products.find((item) => item._id === selectedProductId || item.id === selectedProductId);
    setItems((prev) => [...prev, {
      productId: selectedProductId,
      name: product?.name || 'Ürün',
      quantity: Number(quantity || 1),
      unitPrice: Number(unitPrice || product?.salePrice || 0),
      taxRate: 20,
      totalPrice: Number(quantity || 1) * Number(unitPrice || product?.salePrice || 0),
    }]);
    setSelectedProductId('');
    setQuantity(1);
    setUnitPrice(0);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const total = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId || items.length === 0) {
      alert('Müşteri ve en az bir ürün kalemi seçmelisiniz.');
      return;
    }

    setLoading(true);
    try {
      const invoiceResponse = await api.post('/invoices', {
        customerId,
        invoiceType,
        items,
      });
      const invoice = invoiceResponse?.data?.invoice;

      if (invoice?.grandTotal) {
        await api.post('/accounts/transaction', {
          accountId: undefined,
          customerId,
          type: 'ALACAK',
          amount: Number(invoice.grandTotal || 0),
          description: `Fatura: ${invoice.invoiceNumber || 'Taslak'}`,
        });
      }

      alert('Fatura oluşturuldu ve muhasebe hareketi eklendi.');
      navigate('/accounting');
    } catch (error) {
      console.error(error);
      alert('Fatura oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/accounting')} style={{ marginBottom: 16, padding: '8px 12px' }}>← Ön Muhasebeye Dön</button>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #16a34a 100%)', color: '#fff', padding: 20, borderRadius: 18, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Fatura Oluştur</h2>
        <p style={{ margin: '6px 0 0', opacity: 0.95 }}>Müşteri, ürün ve muhasebe akışını tek ekrandan yönetin.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard title="Müşteri" value={customers.length} accent="#2563eb" />
        <StatCard title="Ürün" value={products.length} accent="#16a34a" />
        <StatCard title="Toplam Kalem" value={items.length} accent="#d97706" />
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
