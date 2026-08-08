import React from 'react';

const QuickActionCard = ({ title, description, href, accent = '#2563eb' }) => (
  <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
    <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)', borderTop: `4px solid ${accent}`, height: '100%' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{description}</div>
    </div>
  </a>
);

export default QuickActionCard;
