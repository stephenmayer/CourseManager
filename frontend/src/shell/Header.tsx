import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

import { api } from "../api/client";
import type { Theme } from "../theme";

const sisDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type SisDate = { state: "loading" } | { state: "ready"; text: string } | { state: "failed" };

// The current import's time (S12), not a fixed sample date.
function useSisDate(): SisDate {
  const [sisDate, setSisDate] = useState<SisDate>({ state: "loading" });

  useEffect(() => {
    let live = true;
    api.currentImport().then(
      (sisImport) => {
        if (live) {
          setSisDate({ state: "ready", text: sisDateFormat.format(new Date(sisImport.received_at)) });
        }
      },
      () => {
        if (live) setSisDate({ state: "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return sisDate;
}

function sisDateLabel(sisDate: SisDate): string {
  switch (sisDate.state) {
    case "ready":
      return `SIS data as of ${sisDate.text}`;
    case "failed":
      return "SIS data date unavailable";
    case "loading":
      return "SIS data as of …";
  }
}

function NavItem({ to, current, children }: { to: string; current: boolean; children: string }) {
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
  const { pathname } = useLocation();
  const onCourses = pathname.startsWith("/courses");
  const sisDate = useSisDate();
  const dark = theme === "dark";

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
        <NavItem to="/" current={!onCourses}>
          Students
        </NavItem>
        <NavItem to="/courses" current={onCourses}>
          Courses
        </NavItem>
      </nav>
      <div className="app-header-spacer" />
      <span className="muted">2027–28 course requests · {sisDateLabel(sisDate)}</span>
      {/* Placeholder until there is sign-in. */}
      <span className="app-user">Ms. Lee · Counselor</span>
      <button
        type="button"
        className="theme-toggle"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={onToggleTheme}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
        <span>{dark ? "Light" : "Dark"}</span>
      </button>
    </header>
  );
}
