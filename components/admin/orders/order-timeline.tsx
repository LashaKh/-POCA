import { formatBusinessDateTime } from "@/lib/datetime/format";

export function OrderTimeline({
  events,
}: {
  events: Array<{
    id: number;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    actor_class: string;
    occurred_at: string;
  }>;
}) {
  return (
    <section className="admin-panel" aria-labelledby="timeline-title">
      <h2 id="timeline-title">Immutable timeline</h2>
      {events.length ? (
        <ol className="order-timeline">
          {events.map((event) => (
            <li key={event.id}>
              <time dateTime={event.occurred_at}>
                {formatBusinessDateTime(event.occurred_at)}
              </time>
              <strong>{event.event_type}</strong>
              <span>
                {event.from_status ?? "start"} →{" "}
                {event.to_status ?? "unchanged"}
              </span>
              <small>{event.actor_class}</small>
            </li>
          ))}
        </ol>
      ) : (
        <p>No events yet.</p>
      )}
    </section>
  );
}
