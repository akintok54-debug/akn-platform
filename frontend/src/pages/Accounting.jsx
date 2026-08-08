import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Accounting = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [cashMovements, setCashMovements] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [statement, setStatement] = useState(null);
  const [formData, setFormData] = useState({
    accountId: '',
    type: 'BORC',
    amount: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [accountsRes, customersRes, transactionsRes, cashRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/customers'),
        api.get('/accounts/transactions'),
        api.get('/cash/transactions')
      ]);

      const accountList = Array.isArray(accountsRes.data) ? accountsRes.data : [];
      const customerList = customersRes?.data?.customers || customersRes?.data?.data || customersRes?.data || [];
      const transactionList = transactionsRes?.data?.transactions || [];
      const cashReport = cashRes?.data || {};

      setAccounts(accountList);
      setCustomers(customerList);
      setTransactions(transactionList);
      setCashBalance(Number(cashReport.cashBalance || 0));
      setBankBalance(Number(cashReport.bankBalance || 0));
      setCashMovements(Array.isArray(cashReport.transactions) ? cashReport.transactions.slice(-8).reverse() : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetStatement = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    try {
      const response = await api.get(`/accounts/customer-statement/${selectedCustomerId}`);
      setStatement(response.data || {});
    } catch (error) {
      console.error(error);
      alert('Cari ekstre alınamadı.');
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/accounts/transaction', {
        ...formData,
        customerId: selectedCustomerId || undefined,
        amount: Number(formData.amount || 0),
      });
      setFormData({ accountId: '', type: 'BORC', amount: '', description: '' });
      setSelectedCustomerId('');
      await fetchData();
      alert('Muhasebe hareketi kaydedildi.');
    } catch (error) {
      console.error(error);
      alert('Hareket kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)', color: '#fff', padding: 20, borderRadius: 18, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Ön Muhasebe</h2>
        <p style={{ margin: '6px 0 0', opacity: 0.95 }}>Hesaplar, cari hareketler ve temel raporlar burada yönetilir.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
        <div style={{ background: '#eff6ff', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#4b5563' }}>Kasa Bakiyesi</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{cashBalance} TL</div>
        </div>
        <div style={{ background: '#ecfeff', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#4b5563' }}>Banka Bakiyesi</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{bankBalance} TL</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#4b5563' }}>Hesap Sayısı</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{accounts.length}</div>
        </div>
        <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#4b5563' }}>Cari Hareket</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{transactions.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/cash')} style={{ padding: '10px 14px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Kasa Modülüne Git
        </button>
        <button onClick={() => navigate('/invoices/create')} style={{ padding: '10px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          + Fatura Oluştur
        </button>
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr', marginTop: 24 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3>Yeni Hareket</h3>
          <form onSubmit={handleCreateTransaction} style={{ display: 'grid', gap: 12 }}>
            <label>
              Hesap
              <select name="accountId" value={formData.accountId} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="">Seçiniz</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>{account.name}</option>
                ))}
              </select>
            </label>

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
              Tür
              <select name="type" value={formData.type} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="BORC">Borç</option>
                <option value="ALACAK">Alacak</option>
              </select>
            </label>

            <label>
              Tutar (TL)
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Açıklama
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <button type="submit" disabled={loading} style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {loading ? 'Kaydediliyor...' : 'Hareket Kaydet'}
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3>Cari Ekstre</h3>
          <form onSubmit={handleGetStatement} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option value="">Müşteri seç</option>
              {customers.map((customer) => (
                <option key={customer._id || customer.id} value={customer._id || customer.id}>{customer.companyName || customer.name}</option>
              ))}
            </select>
            <button type="submit" style={{ padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Ekstre Getir
            </button>
          </form>
          {statement && (
            <div style={{ marginTop: 12, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
              <div><strong>{statement.customer?.companyName || statement.customer?.name || '-'}</strong></div>
              <div style={{ marginTop: 6, color: '#4b5563' }}>Hareket Sayısı: {statement.transactions?.length || 0}</div>
              <div style={{ marginTop: 6, color: '#4b5563' }}>Fatura Sayısı: {statement.invoices?.length || 0}</div>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3>Hesaplar</h3>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {accounts.map((account) => (
              <div key={account._id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 700 }}>{account.name}</div>
                <div style={{ color: '#4b5563', fontSize: 14 }}>{account.type} • {account.balance || 0} TL</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h3>Son Hareketler</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Tür</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Tutar</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Açıklama</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Müşteri</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={transaction._id || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>{transaction.type}</td>
                <td style={{ padding: 8 }}>{transaction.amount || 0} TL</td>
                <td style={{ padding: 8 }}>{transaction.description || '-'}</td>
                <td style={{ padding: 8 }}>{transaction.customerId?.companyName || transaction.customerId?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h3>Son Kasa Hareketleri</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Tarih</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Belge No</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Açıklama</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Giriş</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Çıkış</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {cashMovements.length > 0 ? cashMovements.map((movement) => (
              <tr key={movement._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>{new Date(movement.date).toLocaleDateString('tr-TR')}</td>
                <td style={{ padding: 8 }}>{movement.documentNo || '-'}</td>
                <td style={{ padding: 8 }}>{movement.description || '-'}</td>
                <td style={{ padding: 8, color: '#166534', fontWeight: 700 }}>{movement.cashIn > 0 ? `${movement.cashIn} TL` : '-'}</td>
                <td style={{ padding: 8, color: '#b91c1c', fontWeight: 700 }}>{movement.cashOut > 0 ? `${movement.cashOut} TL` : '-'}</td>
                <td style={{ padding: 8, fontWeight: 700 }}>{movement.balance} TL</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ padding: 10, color: '#6b7280' }}>Henüz kasa hareketi yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Accounting;