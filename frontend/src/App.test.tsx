import { render, screen } from "@testing-library/react";

import App from "./App";

test("renders the app root with its name", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "CourseManager" })).toBeInTheDocument();
});
