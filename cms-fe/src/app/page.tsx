import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Insight FE — MDX + Chakra (App Router) Starter</h1>
      <ul>
        <li><Link href="/lesson/forces">View Lesson: Forces &amp; Motion</Link></li>
        <li><Link href="/editor/forces">Edit Lesson: Forces &amp; Motion</Link></li>
      </ul>
    </main>
  );
}
