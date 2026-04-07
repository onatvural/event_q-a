"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import useSWR from "swr";
import { getVisitorId, getInitials, hashGradient } from "@/lib/utils";
import { Users, MessageCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EventSpeakerList() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const visitorId = useRef("");

  // Ensure visitor ID is created on mount
  useEffect(() => {
    visitorId.current = getVisitorId();
  }, []);

  // Fetch event data (with speakers)
  const { data: event, isLoading } = useSWR(
    `/api/events/${eventId}`,
    fetcher
  );

  // Poll live attendee count
  const { data: presence } = useSWR(
    `/api/events/${eventId}/presence`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Heartbeat every 10s
  useEffect(() => {
    if (!eventId) return;
    const id = getVisitorId();

    const sendHeartbeat = () => {
      fetch(`/api/events/${eventId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: id }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event || event.error) {
    return (
      <div className="text-center py-20">
        <p className="text-secondary text-lg">Event not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold font-serif text-primary">{event.title}</h1>
        <p className="text-secondary text-sm">{event.date}</p>

        {/* Live attendee count */}
        {presence && (
          <div className="inline-flex items-center gap-2 bg-btnPrimary text-white rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-medium uppercase tracking-widest">Live Now</span>
            <Users className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{presence.activeVisitors}</span>
          </div>
        )}
      </div>

      {/* View Feed button */}
      <button
        onClick={() => router.push(`/event/${eventId}/feed`)}
        className="w-full bg-surface border border-border text-primary font-medium py-3 rounded-xl hover:border-goldBorder hover:shadow-sm active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4 text-gold" />
        View Questions Feed
      </button>

      {/* Speaker cards */}
      <div className="space-y-3">
        {event.speakers?.map(
          (speaker: { id: string; name: string; topic: string }) => {
            const initials = getInitials(speaker.name);
            const gradient = hashGradient(speaker.name);

            return (
              <div
                key={speaker.id}
                className="bg-surface rounded-2xl shadow-sm border border-border p-5 hover:translate-y-[-1px] hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold font-serif text-primary truncate">
                      {speaker.name}
                    </h2>
                    <p className="text-secondary text-sm truncate">
                      {speaker.topic}
                    </p>
                  </div>
                </div>

                {/* Ask button */}
                <button
                  onClick={() =>
                    router.push(`/event/${eventId}/ask/${speaker.id}`)
                  }
                  className="mt-4 w-full bg-btnPrimary text-white font-medium py-2.5 rounded-xl hover:bg-btnHover active:scale-[0.98] transition-all duration-150"
                >
                  Ask a Question
                </button>
              </div>
            );
          }
        )}
      </div>

    </div>
  );
}
