# Notification System Design (High-level)

This document outlines a minimal notification system for the AffordMedicals notification app.

## Goals
- Single API fetch on frontend load (as requested).
- Client-side filtering, pagination, and top-N priority view.
- Simple authentication for the frontend (token stored in localStorage).
- Logging middleware for backend to record request/response metadata.

## Components

- Backend (notification_app_be): exposes `/notifications` endpoint returning JSON array.
  - Implement `logging_middleware` to log request method, URL, timestamp, response status, duration, and a small body preview.
  - Support query params: `page`, `limit`, `type` for filtering.

- Frontend (notification_app_fe): React + Vite
  - On app mount, fetch the notifications feed once and keep the data in memory.
  - Provide views: dashboard (recent + priority), full feed (paged), and priority center (top-N).
  - Provide simple auth gate (login form) — no server-side auth required for prototype. Store a token in `localStorage`.
  - Logging of user interactions (view clicks, mark-as-seen) should be sent to a `/log` endpoint optionally.

## Data model (example)

{
  "notifications": [
    { "id": "abc123", "type": "Event", "message": "Placement drive at 10AM", "timestamp": "2026-05-02T10:00:00Z" }
  ]
}

## Security & Privacy
- Redact sensitive fields in logs (`password`, `ssn`, `token`)
- Keep token storage limited to localStorage in the prototype. For production, use secure HTTP-only cookies.

## Next steps
- Implement backend endpoints and connect to frontend fetch.
- Add persistent storage for viewed/unread state when needed.
