// Screen 4 (Q20): Settings. Its Checks section switches each warning on or off for
// everyone; errors stay on because they keep bad SIS data off the schedule (Q5).
import { type ReactNode, useId, useState } from "react";

import { api, type Check } from "../api/client";
import { useLoad } from "../api/useLoad";
import { plural } from "../courses/format";
import ErrorText from "../shell/ErrorText";

function flags(count: number): string {
  return count === 0 ? "Flags no students now" : `Flags ${plural(count, "student")} now`;
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

const SEVERITY = {
  error: { pill: "pill-error", label: "Error" },
  warning: { pill: "pill-warning", label: "Warning" },
} as const;

interface RowProps {
  check: Check;
  saving: boolean;
  error: string | null;
  onToggle: (check: Check) => void;
}

function CheckRow({ check, saving, error, onToggle }: RowProps) {
  const off = !check.enabled;
  const severity = SEVERITY[check.severity];
  return (
    <div className={`check-row${off ? " off" : ""}`}>
      <div className="check-text">
        <div className="check-name">
          {check.name} <span className={`pill ${severity.pill}`}>{severity.label}</span>
        </div>
        <div className="check-desc">
          {check.description}
          {check.note && <em> {check.note}</em>}
        </div>
        <div className="check-meta">{off ? "Off. Hidden on every screen." : flags(check.student_count)}</div>
      </div>
      {check.locked ? (
        <span className="check-lock">
          <LockIcon />
          Always on
        </span>
      ) : (
        <div className="check-switch-cell">
          <span className="check-switch-label">{check.enabled ? "On" : "Off"}</span>
          <button
            type="button"
            role="switch"
            className="check-switch"
            aria-checked={check.enabled}
            aria-label={check.name}
            disabled={saving}
            onClick={() => onToggle(check)}
          />
        </div>
      )}
      <ErrorText message={error} />
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="card check-group">
      <div className="check-group-head">
        <span id={id}>{title}</span>
        <small>{hint}</small>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [load] = useLoad(api.checks);
  const [saved, setSaved] = useState<Check[] | null>(null); // the list a successful save returned
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<{ rule: string; message: string } | null>(null); // the last failed save

  const checks = saved ?? (load.state === "ready" ? load.data : null);

  const toggle = (check: Check) => {
    setSaving(check.rule);
    setError(null);
    api
      .setCheck(check.rule, !check.enabled)
      .then(setSaved, () => {
        const state = check.enabled ? "on" : "off";
        setError({ rule: check.rule, message: `Couldn't save. ${check.name} is still ${state}. Try again.` });
      })
      .finally(() => setSaving(null));
  };

  const rows = (severity: Check["severity"]) =>
    checks
      ?.filter((c) => c.severity === severity)
      .map((c) => (
        <CheckRow
          key={c.rule}
          check={c}
          saving={saving === c.rule}
          error={error?.rule === c.rule ? error.message : null}
          onToggle={toggle}
        />
      ));

  return (
    <div className="page settings">
      <h1>Settings</h1>
      <section className="page settings-section" aria-labelledby="checks-heading">
        <div className="page-title">
          <h2 id="checks-heading">Checks</h2>
          {checks ? (
            <p className="muted">
              Checks run on every student's course requests. Switching a warning off hides it on every screen,
              for everyone. Errors always stay on because they stop bad data reaching the schedule.
            </p>
          ) : load.state === "failed" ? (
            <ErrorText message={load.message} />
          ) : (
            <p className="muted">Loading checks…</p>
          )}
        </div>
        {checks && (
          <>
            <Group title="Errors" hint="Always on, and they block Done">
              {rows("error")}
            </Group>
            <Group title="Warnings" hint="Counselors can keep them with a reason">
              {rows("warning")}
            </Group>
            <p className="muted check-footnote">
              Reasons counselors entered are kept. Switch a check back on and those warnings show as kept
              again.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
