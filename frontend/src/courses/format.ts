export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** "9/10" as on the Courses table. */
export function gradeList(grades: number[]): string {
  return grades.join("/");
}

/** "grade 12" or "grades 11/12" as in the course dialog. */
export function gradesLabel(grades: number[]): string {
  return `${grades.length === 1 ? "grade" : "grades"} ${gradeList(grades)}`;
}
