// Stand-ins until the screens land (#6 Student list, #7 Student detail), and the not-found page.
import { Link, useParams } from "react-router";

export function StudentListPage() {
  return <h1>Students</h1>;
}

export function StudentDetailPage() {
  const { id } = useParams();
  return <h1>Student {id}</h1>;
}

export function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Go to the student list</Link>
      </p>
    </>
  );
}
