'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Plus, Calendar, Globe, Pencil, Trash2, Users, MessageCircle } from 'lucide-react';

interface EventWithCounts {
  id: string;
  title: string;
  date: string;
  createdAt: string;
  speakerCount: number;
  questionCount: number;
}

interface EventsResponse {
  events: EventWithCounts[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminEventsPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<EventsResponse>('/api/events', fetcher);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authed = sessionStorage.getItem('admin_authenticated');
      if (!authed) {
        router.push('/admin');
      }
    }
  }, [router]);

  async function handleDelete(eventId: string) {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
    mutate();
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const events = data?.events ?? [];

  return (
    <div className="min-h-[80vh] py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold font-serif text-primary">Your Events</h1>
        <Link
          href="/admin/create"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-btnPrimary text-white font-medium text-sm hover:bg-btnHover transition-colors"
        >
          <Plus className="w-6 h-6" />
          Create Event
        </Link>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
          <svg
            className="animate-spin h-8 w-8 text-primary mb-3"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-secondary">Loading events...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && events.length === 0 && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
          <Calendar className="w-14 h-14 text-disabled mb-3" />
          <p className="text-secondary font-medium">No events yet</p>
          <p className="text-tertiary text-sm mt-1">Create your first event</p>
          <Link
            href="/admin/create"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-btnPrimary text-white font-medium text-sm hover:bg-btnHover transition-colors"
          >
            <Plus className="w-6 h-6" />
            Create Event
          </Link>
        </div>
      )}

      {/* Event list */}
      {!isLoading && events.length > 0 && (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-surface rounded-2xl shadow-sm border border-border p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold font-serif text-primary truncate">
                      {event.title}
                    </h2>
                    <Globe className="w-4 h-4 text-gold flex-shrink-0" />
                  </div>
                  <p className="text-sm text-secondary mt-1">{formatDate(event.date)}</p>
                  <div className="flex items-center gap-3 mt-2.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary bg-cream px-2.5 py-1 rounded-full">
                      <Users className="w-5 h-5" />
                      {event.speakerCount} speaker{event.speakerCount !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary bg-cream px-2.5 py-1 rounded-full">
                      <MessageCircle className="w-5 h-5" />
                      {event.questionCount} question{event.questionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/admin/events/${event.id}/edit`)}
                    className="p-2 rounded-xl border border-border text-secondary hover:text-primary hover:bg-cream transition-colors"
                    title="Edit event"
                  >
                    <Pencil className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 rounded-xl border border-border text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete event"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
