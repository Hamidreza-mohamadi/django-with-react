import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin-comments")({
  component: AdminCommentsPage,
});

function AdminCommentsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">مدیریت دیدگاه‌ها</h1>
        <p className="mt-2 text-sm text-muted-foreground">این بخش در مرحله بعد تکمیل می‌شود.</p>
      </div>
    </main>
  );
}
