import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { getStoredUser } from "../services/permissions";

function SuperAdmin() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser() || {}, []);
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [overview, setOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [approving, setApproving] = useState(false);
  const [currentAccountInfo, setCurrentAccountInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingCompanyId, setSavingCompanyId] = useState("");
  const [savingUserId, setSavingUserId] = useState("");
  const [message, setMessage] = useState("");
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [roleOptions, setRoleOptions] = useState(["owner", "admin", "manager", "sales", "cashier", "accounting", "dealer", "SUPER_ADMIN"]);
  const [userEdits, setUserEdits] = useState({});

  const [companyFilters, setCompanyFilters] = useState({
    q: "",
    status: "",
  });

  const [userFilters, setUserFilters] = useState({
    q: "",
    companyId: "",
  });

  const [logCompanyId, setLogCompanyId] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [overviewRes, companiesRes, usersRes, logsRes, candidatesRes] = await Promise.all([
        api.get("/super-admin/overview"),
        api.get("/super-admin/companies", { params: { ...companyFilters, limit: 50 } }),
        api.get("/super-admin/users", { params: { ...userFilters, limit: 50 } }),
        api.get("/activity-logs", { params: { companyId: logCompanyId || undefined, limit: 50 } }),
        api.get("/auth/super-admin/candidates"),
      ]);

      setOverview(overviewRes.data || null);
      setCompanies(companiesRes.data?.items || []);
      setUsers(usersRes.data?.items || []);
      setAvailableProfiles(usersRes.data?.availableProfiles || []);
      setRoleOptions(usersRes.data?.roleOptions || ["owner", "admin", "manager", "sales", "cashier", "accounting", "dealer", "SUPER_ADMIN"]);
      setLogs(logsRes.data?.items || []);
      setCandidates(candidatesRes.data?.users || []);
      const nextEdits = {};
      (usersRes.data?.items || []).forEach((user) => {
        nextEdits[user._id] = {
          role: user.role || "sales",
          isActive: Boolean(user.isActive),
          permissionProfileId: user.permissionProfileId?._id || "",
        };
      });
      setUserEdits(nextEdits);
      setCurrentAccountInfo({
        id: currentUser?._id || currentUser?.id || "",
        email: currentUser?.email || "",
        name: currentUser?.name || "",
        role: currentUser?.role || "",
      });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Super admin verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadAll();
  }, []);

  const updateCompanySubscription = async (companyId, payload) => {
    setSavingCompanyId(companyId);
    setMessage("");
    try {
      await api.patch(`/super-admin/companies/${companyId}/subscription`, payload);
      await loadAll();
      setMessage("Firma abonelik durumu guncellendi.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Abonelik guncellenemedi.");
    } finally {
      setSavingCompanyId("");
    }
  };

  const getProfilesForUser = (user) => {
    const companyId = user?.company?._id || "";
    return availableProfiles.filter((profile) => String(profile.companyId) === String(companyId));
  };

  const onChangeUserEdit = (userId, field, value) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: value,
      },
    }));
  };

  const saveUserAccess = async (user) => {
    const edit = userEdits[user._id];
    if (!edit) return;

    setSavingUserId(user._id);
    setMessage("");
    try {
      await api.patch(`/super-admin/users/${user._id}/access`, {
        role: edit.role,
        isActive: Boolean(edit.isActive),
        permissionProfileId: edit.permissionProfileId || null,
      });
      await loadAll();
      setMessage("Kullanıcı yetkisi güncellendi.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Kullanıcı yetkisi güncellenemedi.");
    } finally {
      setSavingUserId("");
    }
  };

  const approveSuperAdmin = async () => {
    const ownId = currentAccountInfo?.id;
    if (!ownId) {
      setMessage("Mevcut hesap bilgisi bulunamadı.");
      return;
    }

    if (!selectedCandidateId || selectedCandidateId !== ownId) {
      setMessage("Sadece kendi hesabınızı seçip onaylayabilirsiniz.");
      return;
    }

    setApproving(true);
    setMessage("");
    try {
      await api.post("/super-admin/approve-super-admin", { userId: selectedCandidateId, approved: true });
      await loadAll();
      setMessage("Seçilen hesap Super Admin olarak onaylandı.");
      setSelectedCandidateId("");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Super Admin onayı yapılamadı.");
    } finally {
      setApproving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Yetkisiz Erisim</h2>
          <p>Bu alana sadece SUPER_ADMIN erisebilir.</p>
          <button onClick={() => navigate("/dashboard")} style={buttonStyle}>Dashboard'a Don</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ background: "linear-gradient(120deg, #0f172a 0%, #14532d 100%)", color: "#fff", borderRadius: 18, padding: 20 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>Super Admin Paneli</h2>
          <div style={{ opacity: 0.9 }}>Firma abonelikleri, global kullanicilar ve audit loglar tek ekranda.</div>
        </div>

        {message ? <div style={noticeStyle}>{message}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <StatCard label="Toplam Firma" value={overview?.stats?.companyCount || 0} />
          <StatCard label="Aktif Firma" value={overview?.stats?.activeCompanyCount || 0} />
          <StatCard label="Pasif Firma" value={overview?.stats?.passiveCompanyCount || 0} />
          <StatCard label="Toplam Kullanici" value={overview?.stats?.userCount || 0} />
        </div>

        <section style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Super Admin Onayı</h3>
          <p style={{ marginTop: 4, color: "#64748b" }}>Bu alan yalnızca mevcut hesabın görünümü ve güvenlik bilgileri için kullanılabilir. Rol atama işlemi frontend üzerinden kapalıdır.</p>
          <div style={{ marginTop: 10, padding: 12, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
            <div><strong>Mevcut hesap:</strong> {currentAccountInfo?.name || "-"}</div>
            <div><strong>E-posta:</strong> {currentAccountInfo?.email || "-"}</div>
            <div><strong>Kullanıcı ID:</strong> {currentAccountInfo?.id || "-"}</div>
            <div><strong>Mevcut rol:</strong> {currentAccountInfo?.role || "-"}</div>
          </div>
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
            <p style={{ margin: 0, color: "#64748b" }}>Rol atama işlemi bu panel üzerinden devre dışıdır. Super Admin yetkisi yalnızca backend tarafında, tanımlı yönetici hesabı için verilir.</p>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Tüm Firmalar</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="Firma ara"
                value={companyFilters.q}
                onChange={(e) => setCompanyFilters((prev) => ({ ...prev, q: e.target.value }))}
                style={inputStyle}
              />
              <select
                value={companyFilters.status}
                onChange={(e) => setCompanyFilters((prev) => ({ ...prev, status: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Tüm Durumlar</option>
                <option value="TRIAL">TRIAL</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PASSIVE">PASSIVE</option>
              </select>
              <button onClick={loadAll} style={buttonStyle} disabled={loading}>Yenile</button>
            </div>
          </div>

          <div className="table-scroll" style={{ marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 840 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Firma</th>
                  <th style={thStyle}>Durum</th>
                  <th style={thStyle}>Aktif</th>
                  <th style={thStyle}>Trial Bitis</th>
                  <th style={thStyle}>Abonelik Bitis</th>
                  <th style={thStyle}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company._id}>
                    <td style={tdStyle}>{company.companyName || "-"}</td>
                    <td style={tdStyle}>{company.subscriptionStatus || "-"}</td>
                    <td style={tdStyle}>{company.isActive ? "Evet" : "Hayır"}</td>
                    <td style={tdStyle}>{company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString("tr-TR") : "-"}</td>
                    <td style={tdStyle}>{company.subscriptionEndsAt ? new Date(company.subscriptionEndsAt).toLocaleDateString("tr-TR") : "-"}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          disabled={savingCompanyId === company._id}
                          onClick={() => updateCompanySubscription(company._id, { subscriptionStatus: "ACTIVE", months: 1, isActive: true })}
                          style={smallButtonStyle}
                        >
                          ACTIVE
                        </button>
                        <button
                          disabled={savingCompanyId === company._id}
                          onClick={() => updateCompanySubscription(company._id, { subscriptionStatus: "PASSIVE", isActive: false })}
                          style={{ ...smallButtonStyle, background: "#fee2e2", borderColor: "#fecaca" }}
                        >
                          PASSIVE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Tüm Kullanıcılar</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="Kullanıcı ara"
                value={userFilters.q}
                onChange={(e) => setUserFilters((prev) => ({ ...prev, q: e.target.value }))}
                style={inputStyle}
              />
              <select
                value={userFilters.companyId}
                onChange={(e) => setUserFilters((prev) => ({ ...prev, companyId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Tüm Firmalar</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>{company.companyName}</option>
                ))}
              </select>
              <button onClick={loadAll} style={buttonStyle} disabled={loading}>Yenile</button>
            </div>
          </div>

          <div className="table-scroll" style={{ marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Ad</th>
                  <th style={thStyle}>E-posta</th>
                  <th style={thStyle}>Telefon</th>
                  <th style={thStyle}>Kayıt</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Yetki Profili</th>
                  <th style={thStyle}>Firma</th>
                  <th style={thStyle}>Durum</th>
                  <th style={thStyle}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td style={tdStyle}>{user.name || "-"}</td>
                    <td style={tdStyle}>{user.email || "-"}</td>
                    <td style={tdStyle}>{user.phone || "-"}</td>
                    <td style={tdStyle}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR") : "-"}</td>
                    <td style={tdStyle}>
                      <select
                        value={userEdits[user._id]?.role || user.role || "sales"}
                        onChange={(e) => onChangeUserEdit(user._id, "role", e.target.value)}
                        style={inputStyle}
                        disabled={user.role === "SUPER_ADMIN"}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={userEdits[user._id]?.permissionProfileId || ""}
                        onChange={(e) => onChangeUserEdit(user._id, "permissionProfileId", e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Profil Yok (Rol Varsayılanı)</option>
                        {getProfilesForUser(user).map((profile) => (
                          <option key={profile._id} value={profile._id}>{profile.name} ({profile.role})</option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>{user.company?.companyName || "-"}</td>
                    <td style={tdStyle}>
                      <select
                        value={userEdits[user._id]?.isActive ? "active" : "passive"}
                        onChange={(e) => onChangeUserEdit(user._id, "isActive", e.target.value === "active")}
                        style={inputStyle}
                      >
                        <option value="active">Aktif</option>
                        <option value="passive">Pasif</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          style={smallButtonStyle}
                          disabled={savingUserId === user._id}
                          onClick={() => saveUserAccess(user)}
                        >
                          {savingUserId === user._id ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Şüpheli / Hatalı İşlemler</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={logCompanyId} onChange={(e) => setLogCompanyId(e.target.value)} style={inputStyle}>
                <option value="">Tüm Firmalar</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>{company.companyName}</option>
                ))}
              </select>
              <button onClick={loadAll} style={buttonStyle} disabled={loading}>Yenile</button>
            </div>
          </div>

          <div className="table-scroll" style={{ marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Zaman</th>
                  <th style={thStyle}>Modul</th>
                  <th style={thStyle}>Aksiyon</th>
                  <th style={thStyle}>Kullanıcı</th>
                  <th style={thStyle}>Firma</th>
                  <th style={thStyle}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={tdStyle}>{log.createdAt ? new Date(log.createdAt).toLocaleString("tr-TR") : "-"}</td>
                    <td style={tdStyle}>{log.module || "-"}</td>
                    <td style={tdStyle}>{log.action || "-"}</td>
                    <td style={tdStyle}>{log.userId?.name || log.userId?.email || "-"}</td>
                    <td style={tdStyle}>{log.companyId || "-"}</td>
                    <td style={tdStyle}>{log.action?.includes("ERROR") ? "Dikkat" : "Normal"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Sistem Genel Durumu</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Platform</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>Açık</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Firma Kontrol</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{overview?.stats?.activeCompanyCount || 0} aktif</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Abonelik</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>Aktif deneme/abonelik</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Yetki Yönetimi</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>Rol bazlı kontrol</div>
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Kullanıcı Yetkileri</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
            {[
              { label: "Firma Yönetimi", value: "Aktif" },
              { label: "Kullanıcı Yönetimi", value: "Aktif" },
              { label: "Raporlama", value: "Aktif" },
              { label: "Satış", value: "Aktif" },
            ].map((item) => (
              <div key={item.label} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 13, color: "#64748b" }}>{item.label}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Abonelik ve Deneme Süresi</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
            {companies.slice(0, 4).map((company) => (
              <div key={company._id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{company.companyName || "-"}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Durum: {company.subscriptionStatus || "-"}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>Trial: {company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString("tr-TR") : "-"}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>Abonelik: {company.subscriptionEndsAt ? new Date(company.subscriptionEndsAt).toLocaleDateString("tr-TR") : "-"}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Firma Aktif / Pasif Kontrol</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
            {companies.slice(0, 6).map((company) => (
              <div key={company._id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{company.companyName || "-"}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Durum: {company.isActive ? "Aktif" : "Pasif"}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>Abonelik: {company.subscriptionStatus || "-"}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
      <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 800, fontSize: 26, color: "#0f172a" }}>{Number(value || 0)}</div>
    </div>
  );
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
};

const inputStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "8px 10px",
  minWidth: 140,
};

const buttonStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "8px 12px",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButtonStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: 8,
  padding: "6px 10px",
  background: "#dcfce7",
  borderColor: "#bbf7d0",
  fontWeight: 700,
  cursor: "pointer",
};

const noticeStyle = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0",
  padding: "8px",
  color: "#334155",
  fontSize: 13,
};

const tdStyle = {
  borderBottom: "1px solid #f1f5f9",
  padding: "8px",
  color: "#0f172a",
  fontSize: 14,
};

export default SuperAdmin;
