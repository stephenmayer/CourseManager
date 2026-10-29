import { Route, Routes } from "react-router";

import CourseDialog from "./courses/CourseDialog";
import CoursesPage from "./pages/Courses";
import NotFoundPage from "./pages/NotFound";
import SettingsPage from "./pages/Settings";
import StudentDetailPage from "./pages/StudentDetail";
import StudentListPage from "./pages/StudentList";
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
          <Route path="/students/:id" element={<StudentDetailPage courseDialog={CourseDialog} />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
