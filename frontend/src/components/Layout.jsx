import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--layout-bg)" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Navbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

        <main
          style={{
            flex: 1,
            padding: "24px",
            background: "var(--layout-bg-grad)",
          }}
        >
          <div style={{ maxWidth: 1500, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

export default Layout;