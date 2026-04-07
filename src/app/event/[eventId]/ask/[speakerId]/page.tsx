"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { getVisitorId } from "@/lib/utils";
import { ArrowLeft } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const MAX_CHARS = 500;

export default function AskQuestion() {
  const { eventId, speakerId } = useParams<{
    eventId: string;
    speakerId: string;
  }>();
  const router = useRouter();
  const visitorId = useRef("");

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    visitorId.current = getVisitorId();
  }, []);

  // Fetch event + speakers to show context
  const { data: event } = useSWR(`/api/events/${eventId}`, fetcher);

  const speaker = event?.speakers?.find(
    (s: { id: string }) => s.id === speakerId
  );

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speakerId,
          text: text.trim(),
          authorId: visitorId.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit question");
      }

      router.push(`/event/${eventId}/feed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push(`/event/${eventId}`)}
        className="inline-flex items-center gap-1.5 text-secondary text-sm hover:text-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to speakers
      </button>

      {/* Speaker context */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
        <p className="text-xs text-secondary uppercase tracking-wide mb-1">
          Asking a question to
        </p>
        <h1 className="text-xl font-bold font-serif text-primary">
          {speaker?.name ?? "Speaker"}
        </h1>
        {speaker?.topic && (
          <p className="text-secondary text-sm mt-1">{speaker.topic}</p>
        )}
      </div>

      {/* Question form */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border p-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-primary">
            Your Question
          </span>
          <textarea
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setText(e.target.value);
              }
            }}
            placeholder="Type your question here..."
            rows={4}
            className="mt-2 w-full rounded-xl border border-border bg-voteResting px-4 py-3 text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-all resize-none"
          />
        </label>

        {/* Character count */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${
              text.length > MAX_CHARS * 0.9
                ? "text-gold font-medium"
                : "text-secondary"
            }`}
          >
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="w-full bg-btnPrimary text-white font-medium py-3 rounded-xl hover:bg-btnHover active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            "Submit Question"
          )}
        </button>
      </div>
    </div>
  );
}
