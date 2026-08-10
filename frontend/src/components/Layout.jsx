import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const isMobile = window.innerWidth <= 900;

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 900);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 900 && sidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }

    document.body.style.overflow = "";
    return undefined;
  }, [sidebarOpen]);

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh", background: "var(--layout-bg)" }}>
      {isMobile && sidebarOpen ? <div className="app-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-shell-content" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Navbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

        <main
          className="app-main"
          style={{
            flex: 1,
            padding: "24px",
            background: "var(--layout-bg-grad)",
          }}
        >
          <div className="app-main-inner" style={{ maxWidth: 1500, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

export default Layout;