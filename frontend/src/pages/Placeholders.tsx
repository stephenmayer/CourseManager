// Stand-ins until the screens land (#6 Student list, #7 Student detail, #8 Courses).
import { useParams } from "react-router";

export function StudentListPage() {
  return <h1>Students</h1>;
}

export function StudentDetailPage() {
  const { id } = useParams();
  return <h1>Student {id}</h1>;
}

export function CoursesPage() {
  return <h1>Courses</h1>;
}
