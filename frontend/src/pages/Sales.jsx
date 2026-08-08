import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentType, setPaymentType] = useState('NAKIT');
  const [paymentStatus, setPaymentStatus] = useState('ODENDI');
  const [deliveryStatus, setDeliveryStatus] = useState('BEKLEMEDE');
  const [orderNumber, setOrderNumber] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [productsRes, customersRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
        api.get('/sales')
      ]);

      const productList = productsRes?.data?.products || productsRes?.data?.data || productsRes?.data || [];
      const customerList = customersRes?.data?.customers || customersRes?.data?.data || customersRes?.data || [];
      const saleList = salesRes?.data?.sales || salesRes?.data?.data || salesRes?.data || [];

      setProducts(productList);
      setCustomers(customerList);
      setSales(saleList);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id || item.productId === product.id);
      if (existing) {
        return prev.map((item) => item.productId === (product._id || product.id) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product._id || product.id, name: product.name, unitPrice: Number(product.salePrice || 0), quantity: 1 }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    setCart((prev) => prev.map((item) => item.productId === productId ? { ...item, quantity: Math.max(0, quantity) } : item).filter((item) => item.quantity > 0));
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart]);
  const vatAmount = useMemo(() => Number((subtotal * (Number(vatRate || 0) / 100)).toFixed(2)), [subtotal, vatRate]);
  const discountAmount = useMemo(() => Number(discount || 0), [discount]);
  const grandTotal = useMemo(() => Number((subtotal + vatAmount - discountAmount).toFixed(2)), [subtotal, vatAmount, discountAmount]);
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((product) => {
      const name = (product.name || '').toLowerCase();
      const sku = (product.sku || '').toLowerCase();
      const barcode = (product.barcode || '').toLowerCase();
      return name.includes(term) || sku.includes(term) || barcode.includes(term);
    });
  }, [products, searchTerm]);

  const handleSaveSale = async () => {
    if (!selectedCustomerId) {
      alert('Lütfen müşteri seçin.');
      return;
    }
    if (cart.length === 0) {
      alert('Sepet boş.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/sales', {
        customerId: selectedCustomerId,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
        paymentType,
        paymentStatus: paymentType === 'ACIK_HESAP' ? 'VERESIYE' : paymentStatus,
        deliveryStatus,
        orderNumber,
        referenceNo,
        saleDate,
        discount: Number(discount || 0),
        paidAmount: Number(paidAmount || 0),
        notes,
        vatRate: Number(vatRate || 0),
        warehouseId: '000000000000000000000000'
      });
      setCart([]);
      setSelectedCustomerId('');
      setPaymentType('NAKIT');
      setPaymentStatus('ODENDI');
      setDeliveryStatus('BEKLEMEDE');
      setOrderNumber('');
      setReferenceNo('');
      setSaleDate(new Date().toISOString().slice(0, 10));
      setDiscount(0);
      setVatRate(20);
      setPaidAmount(0);
      setNotes('');
      setSearchTerm('');
      setSearchBarcode('');
      await fetchData();
      alert('Satış kaydedildi.');
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Satış kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const barcode = searchBarcode.trim();
    if (!barcode) return;
    const matched = products.find((product) => String(product.barcode || '').toLowerCase() === barcode.toLowerCase());
    if (matched) {
      addToCart(matched);
      setSearchBarcode('');
    } else {
      alert('Barkod ile ürün bulunamadı.');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #07111f 0%, #17324e 100%)', color: '#fff', padding: 20, borderRadius: 20, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Profesyonel Satış Ekranı</h2>
        <p style={{ margin: '6px 0 0', opacity: 0.95 }}>Barkod ile hızlı ekleme, ürün arama, kart ve cari satış akışı tek panelde.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginTop: 20 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 18, border: '1px solid #e5e7eb', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)' }}>
          <h3>Ürünler</h3>
          <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              placeholder="Barkod okut / gir"
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db' }}
            />
            <button type="submit" style={{ padding: '10px 14px', borderRadius: 10, background: '#2563eb', color: '#fff' }}>Barkod</button>
          </form>
          <input
            type="text"
            placeholder="Ürün adı, SKU veya barkod ile ara"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', marginTop: 12, border: '1px solid #d1d5db', borderRadius: 10 }}
          />
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {filteredProducts.map((product) => (
              <div key={product._id || product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                <div>
                  <strong>{product.name}</strong>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{product.sku || product.barcode || '-'} • {product.salePrice || 0} TL</div>
                </div>
                <button onClick={() => addToCart(product)} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Sepete Ekle</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 18, border: '1px solid #e5e7eb', boxShadow: '0 10px 24px rgba(15,23,42,0.04)' }}>
          <h3>Satış Formu</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>
              Müşteri
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="">Seçiniz</option>
                {customers.map((customer) => (
                  <option key={customer._id || customer.id} value={customer._id || customer.id}>{customer.companyName || customer.name}</option>
                ))}
              </select>
            </label>

            <label>
              Sipariş / Belge No
              <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Örn: S-1001" style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Referans No
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="İşlem referansı" style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Satış Tarihi
              <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Ödeme Türü
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="NAKIT">Nakit</option>
                <option value="KREDI_KARTI">Kredi Kartı</option>
                <option value="ACIK_HESAP">Açık Hesap</option>
                <option value="HAVALE">Havale</option>
              </select>
            </label>

            <label>
              Ödeme Durumu
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="ODENDI">Ödendi</option>
                <option value="KISMEN_ODENDI">Kısmen Ödendi</option>
                <option value="VERESIYE">Veresiye</option>
                <option value="IPTAL">İptal</option>
              </select>
            </label>

            <label>
              Teslimat Durumu
              <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="BEKLEMEDE">Beklemede</option>
                <option value="HAZIRLANDI">Hazırlandı</option>
                <option value="TESLIM_EDILDI">Teslim Edildi</option>
              </select>
            </label>

            <label>
              İskonto (TL)
              <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              KDV Oranı (%)
              <input type="number" min="0" value={vatRate} onChange={(e) => setVatRate(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Ödenen Tutar (TL)
              <input type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Not / Açıklama
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>
          </div>

          <h4 style={{ marginTop: 16 }}>Sepet</h4>
          {cart.length === 0 ? <p>Sepet boş.</p> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {cart.map((item) => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 8, borderRadius: 6 }}>
                  <div>
                    <strong>{item.name}</strong>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{item.unitPrice} TL</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} style={{ padding: '4px 8px', border: 'none', borderRadius: 4, background: '#f59e0b', color: '#fff', cursor: 'pointer' }}>-</button>
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.productId, Number(e.target.value))} style={{ width: 50, padding: 4 }} />
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} style={{ padding: '4px 8px', border: 'none', borderRadius: 4, background: '#2563eb', color: '#fff', cursor: 'pointer' }}>+</button>
                    <span style={{ minWidth: 70, textAlign: 'right' }}>{item.unitPrice * item.quantity} TL</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ara Toplam</span><strong>{subtotal} TL</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span>KDV</span><strong>{vatAmount} TL</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span>İskonto</span><strong>{discountAmount} TL</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 18, fontWeight: 700 }}><span>Genel Toplam</span><span>{grandTotal} TL</span></div>
          </div>

          <button onClick={handleSaveSale} disabled={saving} style={{ marginTop: 12, width: '100%', padding: '10px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            {saving ? 'Kaydediliyor...' : 'Satışı Tamamla'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, background: '#fff', padding: 16, borderRadius: 18, border: '1px solid #e5e7eb', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)' }}>
        <h3>Son Satışlar</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Sipariş</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Müşteri</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Tutar</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Ödeme</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Teslimat</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale, index) => (
              <tr key={sale._id || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>{sale.orderNumber || sale.referenceNo || '-'}</td>
                <td style={{ padding: 8 }}>{sale.customerId?.companyName || sale.customerId?.name || '-'}</td>
                <td style={{ padding: 8 }}>{sale.totalAmount || 0} TL</td>
                <td style={{ padding: 8 }}>{sale.paymentType || '-'} / {sale.paymentStatus || '-'}</td>
                <td style={{ padding: 8 }}>{sale.deliveryStatus || '-'}</td>
                <td style={{ padding: 8 }}>{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;
