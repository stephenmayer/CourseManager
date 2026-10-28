// Stand-in until the screen lands (#6 Student list), and the not-found page.
import { Link } from "react-router";

export function StudentListPage() {
  return <h1>Students</h1>;
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
