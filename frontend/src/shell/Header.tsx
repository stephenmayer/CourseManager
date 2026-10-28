import { useEffect, useState } from "react";
import { Link, matchPath, useLocation } from "react-router";

import { api } from "../api/client";
import type { Theme } from "../theme";

const sisDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// The current import's time (S12), not a fixed sample date.
function useSisDateLabel(): string {
  const [label, setLabel] = useState("SIS data as of …");

  useEffect(() => {
    let live = true;
    api.currentImport().then(
      (sisImport) => {
        if (live) setLabel(`SIS data as of ${sisDateFormat.format(new Date(sisImport.received_at))}`);
      },
      () => {
        if (live) setLabel("SIS data date unavailable");
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return label;
}

// Each nav item is current on its own routes, using the router's matching.
function NavItem({ to, match, children }: { to: string; match: string[]; children: string }) {
  const { pathname } = useLocation();
  const current = match.some((pattern) => matchPath(pattern, pathname));
  return (
    <Link to={to} className="nav-link" aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export default function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const sisDateLabel = useSisDateLabel();
  const dark = theme === "dark";
  const toggleLabel = `Switch to ${dark ? "light" : "dark"} mode`;

  return (
    <header className="app-header">
      <div className="app-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2" />
          <path d="M8 7h8M8 11h6" />
        </svg>
        <span>CourseManager</span>
      </div>
      <nav aria-label="Main" className="app-nav">
        <NavItem to="/" match={["/", "/students/*"]}>
          Students
        </NavItem>
        <NavItem to="/courses" match={["/courses/*"]}>
          Courses
        </NavItem>
        <NavItem to="/settings" match={["/settings"]}>
          Settings
        </NavItem>
      </nav>
      <div className="app-header-spacer" />
      <span className="muted">2027–28 course requests · {sisDateLabel}</span>
      {/* Placeholder until there is sign-in. */}
      <span className="app-user">Ms. Lee · Counselor</span>
      <button
        type="button"
        className="theme-toggle"
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={onToggleTheme}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
        <span>{dark ? "Light" : "Dark"}</span>
      </button>
    </header>
  );
}
