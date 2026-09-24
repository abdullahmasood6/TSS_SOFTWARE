import { Suspense } from "react";
import { requireSession } from "@/lib/permissions";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar, TopBarFallback } from "@/components/layout/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Suspense fallback={<TopBarFallback />}>
          <TopBar />
        </Suspense>
        <main className="tss-grid-bg relative flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="relative mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
