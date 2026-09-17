import { NotificationList } from "../components/notifications/NotificationsPanel";

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4 sm:px-4">
      <section className="flex flex-col overflow-hidden rounded-card bg-surface pt-3 shadow-card">
        <h1 className="px-gutter pb-2 text-2xl font-bold text-ink">Notifications</h1>
        <NotificationList />
      </section>
    </div>
  );
}
