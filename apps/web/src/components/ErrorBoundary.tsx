/**
 * ErrorBoundary — Panel-Level Error Fallback
 *
 * Catches render errors in any child subtree and shows a minimal fallback UI
 * instead of crashing the whole application. Panels fail independently —
 * a broken sidebar doesn't take down the map.
 *
 * Must be a class component (React's error boundary API requires lifecycle
 * methods that cannot be replicated with hooks).
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional label for the error message, e.g. "sidebar" or "left panel". */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return { hasError: true, message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] Caught error in ${this.props.label ?? "panel"}:`, error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-land-text">
              {this.props.label ? `${this.props.label} unavailable` : "Something went wrong"}
            </p>
            <p className="text-xs text-land-muted mt-1">{this.state.message}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="text-xs text-land-accent hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
