import React from 'react';

const StatCard = ({ title, value, accent = '#2563eb' }) => (
  <div style={{ background: '#fff', padding: 18, borderRadius: 18, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)', borderTop: `4px solid ${accent}` }}>
    <div style={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</div>
    <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#0f172a' }}>{value}</div>
  </div>
);

export default StatCard;
