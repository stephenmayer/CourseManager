import { useEffect, useState } from "react";
import { api } from "./api";
import StudentList from "./components/StudentList";
import StudentDetailView from "./components/StudentDetail";
import TallyView from "./components/Tally";

// Tiny hash router: #/students, #/students/S001, #/tally. Enough for a prototype; no dependency.
function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const onChange = () => setParts(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return parts;
}

export default function App() {
  const [section = "students", id] = useRoute();
  const [schoolYear, setSchoolYear] = useState("");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    api.meta().then((m) => setSchoolYear(m.school_year));
  }, []);

  const reset = async () => {
    await api.reset();
    setResetKey((k) => k + 1);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          Course Requests <span className="muted">· {schoolYear} school year</span>
        </div>
        <nav>
          <a href="#/students" className={section === "students" ? "active" : ""}>Students</a>
          <a href="#/tally" className={section === "tally" ? "active" : ""}>Course tally</a>
        </nav>
        <button className="link" onClick={reset} title="Restore the seed data">Reset demo data</button>
      </header>
      <main key={resetKey}>
        {section === "students" && !id && <StudentList />}
        {section === "students" && id && <StudentDetailView studentId={id} />}
        {section === "tally" && <TallyView />}
      </main>
    </div>
  );
}
