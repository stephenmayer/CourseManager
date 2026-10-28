import { Route, Routes } from "react-router";

import CourseDialog from "./courses/CourseDialog";
import CoursesPage from "./pages/Courses";
import NotFoundPage from "./pages/NotFound";
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
