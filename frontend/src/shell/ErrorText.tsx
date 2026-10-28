/** A plain-language error, announced to screen readers. Renders nothing without one. */
export default function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="error-text">
      {message}
    </p>
  );
}
