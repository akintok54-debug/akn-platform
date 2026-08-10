import React from 'react';

const CustomerTable = ({ customers, onView, onEdit, onDelete, onSale, selectedCustomerIds = [], onSelectCustomer, onSelectAllPage }) => {
  const allSelected = customers.length > 0 && customers.every((customer) => selectedCustomerIds.includes(customer._id || customer.id));

  return (
    <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={thStyle}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAllPage && onSelectAllPage(e.target.checked)}
                aria-label="Tum sayfayi sec"
              />
            </th>
            <th style={thStyle}>Cari Kod</th>
            <th style={thStyle}>Firma / Cari Adı</th>
            <th style={thStyle}>Tür</th>
            <th style={thStyle}>Telefon</th>
            <th style={thStyle}>Cep</th>
            <th style={thStyle}>Vergi</th>
            <th style={thStyle}>Bakiye</th>
            <th style={thStyle}>İskonto</th>
            <th style={thStyle}>İl / İlçe</th>
            <th style={thStyle}>Yetkili</th>
            <th style={thStyle}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Kayıt bulunamadı.</td>
            </tr>
          ) : customers.map((customer, index) => {
            const id = customer._id || customer.id;
            return (
              <tr key={id || index} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.includes(id)}
                    onChange={(e) => onSelectCustomer && onSelectCustomer(id, e.target.checked)}
                    aria-label={`Musteri sec ${customer.companyName || customer.name || '-'}`}
                  />
                </td>
                <td style={tdStyle}>{customer.customerCode || customer.code || '-'}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{customer.companyName || customer.name || '-'}</td>
                <td style={tdStyle}>{formatType(customer.type)}</td>
                <td style={tdStyle}>{customer.phone || '-'}</td>
                <td style={tdStyle}>{customer.mobilePhone || '-'}</td>
                <td style={tdStyle}>{customer.taxNumber || customer.taxOffice ? `${customer.taxOffice || '-'} / ${customer.taxNumber || '-'}` : '-'}</td>
                <td style={{ ...tdStyle, color: Number(customer.balance || 0) < 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                  {Number(customer.balance || 0).toLocaleString('tr-TR')} TL
                </td>
                <td style={tdStyle}>{customer.discountRate ? `${customer.discountRate}%` : '-'}</td>
                <td style={tdStyle}>{`${customer.city || '-'} / ${customer.district || '-'}`}</td>
                <td style={tdStyle}>{customer.contactPerson || '-'}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => onView(id)} style={actionButton('#2563eb')}>Detay</button>
                    <button onClick={() => onSale && onSale(customer)} style={actionButton('#16a34a')}>Satış Yap</button>
                    <button onClick={() => onEdit(customer)} style={actionButton('#d97706')}>Düzenle</button>
                    <button onClick={() => onDelete(id)} style={actionButton('#dc2626')}>Sil</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = { padding: '12px 14px', textAlign: 'left', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle = { padding: '12px 14px', fontSize: 14, color: '#0f172a' };
const actionButton = (bg) => ({
  padding: '6px 10px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  background: bg,
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
});

const formatType = (type) => {
  if (type === 'supplier') return 'Tedarikçi';
  if (type === 'both') return 'Müşteri & Tedarikçi';
  return 'Müşteri';
};

export default CustomerTable;
