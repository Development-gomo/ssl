import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container entry-header">
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist or has moved.</p>
      <p><Link href="/" className="button">Back to home</Link></p>
    </div>
  );
}
