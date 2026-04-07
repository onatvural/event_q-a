import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="bg-surface border border-border rounded-2xl shadow-sm px-8 py-10 text-center max-w-sm w-full">
        <h1 className="text-3xl font-serif font-bold text-primary mb-2">Event Q&A</h1>
        <p className="text-secondary mb-8">
          Organize live Q&amp;A sessions for your events
        </p>
        <Link
          href="/admin"
          className="inline-block bg-btnPrimary hover:bg-btnHover text-white font-medium rounded-xl px-6 py-3 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
