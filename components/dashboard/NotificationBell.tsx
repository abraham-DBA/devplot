"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  dismissNotification,
  type NotificationItem,
  type NotificationType,
} from "@/actions/notifications";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; dot: string }> = {
  blocker_assigned: {
    dot: "bg-destructive",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-destructive">
        <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  sent_to_review: {
    dot: "bg-brand-primary",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-brand-primary">
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        <path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.239.006.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.379 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
      </svg>
    ),
  },
  dependency_blocked: {
    dot: "bg-warning",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-warning">
        <path fillRule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 1.06L6.854 10.207a2.75 2.75 0 1 1-1.414-1.414l3.474-2.768Zm-5.128 4.453a1.25 1.25 0 1 0 1.768 1.768 1.25 1.25 0 0 0-1.768-1.768Zm8-7.5a1.25 1.25 0 1 0 1.768 1.768 1.25 1.25 0 0 0-1.768-1.768Z" clipRule="evenodd" />
      </svg>
    ),
  },
  milestone_at_risk: {
    dot: "bg-warning",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-warning">
        <path d="M2 2a.75.75 0 0 1 .75.75v.75h9.25v-.75a.75.75 0 0 1 1.5 0v.75h.75a.75.75 0 0 1 0 1.5H13v9.25a.75.75 0 0 1-.75.75H3.75A.75.75 0 0 1 3 14V5H2.25a.75.75 0 0 1 0-1.5H3v-.75A.75.75 0 0 1 3.75 2h-1.75Zm1.5 3v8.5h8.5V5h-8.5Zm4.25 1.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 7.75 6.5Zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      </svg>
    ),
  },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const fetch = useCallback(() => {
    startTransition(async () => {
      const data = await getMyNotifications();
      setItems(data);
      setHasFetched(true);
    });
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) fetch();
  }

  function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (!result.success) {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
      }
    });
  }

  function handleDismiss(id: string) {
    const snapshot = items;
    setItems((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      const result = await dismissNotification(id);
      if (!result.success) {
        setItems(snapshot);
      }
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(() => markAllRead());
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.91 32.91 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z" clipRule="evenodd" />
        </svg>
        {hasFetched && unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-card shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-medium text-brand-primary transition-colors hover:opacity-80 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {!hasFetched ? (
              <div className="flex flex-col divide-y divide-border">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-1.5 size-1.5 rounded-full bg-border" />
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <div className={`h-3 animate-pulse rounded bg-border ${i === 0 ? "w-3/4" : i === 1 ? "w-2/3" : "w-4/5"}`} />
                      <div className="h-2 w-1/4 animate-pulse rounded bg-border" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-8 text-muted-foreground opacity-40">
                  <path fillRule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.91 32.91 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
                <p className="text-xs text-muted-foreground">No notifications right now.</p>
              </div>
            ) : (

              <ul>
                {items.map((n) => {
                  const cfg = typeConfig[n.type];
                  const inner = (
                    <div
                      className={[
                        "group flex items-start gap-3 px-4 py-3 transition-colors",
                        n.read ? "bg-card" : "bg-background",
                      ].join(" ")}
                    >
                      {/* Type indicator dot */}
                      <span className={`mt-1 size-1.5 shrink-0 rounded-full ${cfg.dot} ${n.read ? "opacity-40" : ""}`} />

                      {/* Icon + content */}
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <span className={n.read ? "opacity-40" : ""}>{cfg.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                            {n.message}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {formatRelativeTime(n.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleMarkRead(n.id); }}
                            title="Mark as read"
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="size-3">
                              <path fillRule="evenodd" d="M10.822 1.678a.75.75 0 0 1 0 1.06L4.5 9.061 1.178 5.74a.75.75 0 1 1 1.06-1.061l2.262 2.262 5.26-5.263a.75.75 0 0 1 1.062 0Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleDismiss(n.id); }}
                          title="Dismiss"
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="size-3">
                            <path d="M1.757 10.243a.75.75 0 0 0 1.061 1.06L6 8.122l3.182 3.181a.75.75 0 1 0 1.06-1.06L7.061 7.06l3.181-3.181a.75.75 0 0 0-1.06-1.061L6 5.999 2.818 2.818a.75.75 0 0 0-1.06 1.06L4.939 7.06 1.757 10.243Z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );

                  return (
                    <li key={n.id} className="border-b border-border last:border-b-0">
                      {n.resourceId ? (
                        <Link
                          href={n.resourceId}
                          onClick={() => { if (!n.read) handleMarkRead(n.id); setOpen(false); }}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
