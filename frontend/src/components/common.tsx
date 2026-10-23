import type { PlanStatus } from "../types";
import { FLAG_LABELS, STATUS_LABELS } from "../types";

export function StatusPill({ status }: { status: PlanStatus }) {
  return <span className={`pill status-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function Flags({ flags }: { flags: string[] }) {
  return (
    <>
      {flags.map((f) => (
        <span key={f} className={`chip flag-${f}`}>{FLAG_LABELS[f] ?? f}</span>
      ))}
    </>
  );
}

export function IssueCounts({ errors, warnings }: { errors: number; warnings: number }) {
  if (!errors && !warnings) return <span className="ok">✓ No issues</span>;
  return (
    <>
      {errors > 0 && <span className="badge error">{errors} error{errors > 1 ? "s" : ""}</span>}
      {warnings > 0 && <span className="badge warning">{warnings} warning{warnings > 1 ? "s" : ""}</span>}
    </>
  );
}

export const gradeRange = (grades: number[]) => grades.join("/");
