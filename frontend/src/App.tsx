import { Route, Routes } from "react-router";

import {
  CoursesPage,
  NotFoundPage,
  StudentDetailPage,
  StudentListPage,
} from "./pages/Placeholders";
import Header from "./shell/Header";
import { useTheme } from "./theme";

export default function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<StudentListPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
