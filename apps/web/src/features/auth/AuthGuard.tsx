/**
 * AuthGuard — Route Protection Component
 *
 * Wraps the authenticated app. If the user is not logged in, renders the
 * login page. If auth is still loading, renders a full-screen spinner.
 *
 * WHY a guard component rather than a route-level check?
 * Grounded is a single-page app with no URL-based routing in MVP — the entire
 * app is one "screen" (the map). A guard component is simpler than configuring
 * a router just to protect the one page.
 */

import { useAuth } from "./useAuth";
import { LoginPage } from "./LoginPage";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-land-bg">
        <div className="flex flex-col items-center gap-4">
          {/* Simple spinner — replace with branded loading screen later */}
          <div className="w-8 h-8 border-2 border-land-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-land-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
