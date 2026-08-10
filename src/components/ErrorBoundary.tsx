"use client";

import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
  stack: string | null;
}

/**
 * Catches render errors in tool components so the page doesn't whitescreen.
 * The "Try again" button resets the boundary and remounts the tool, which
 * recovers from transient failures (bad state, NaN in an edge case) without
 * a full page reload.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, stack: error.stack ?? null };
  }

  handleReset = () => {
    this.setState({ error: null, stack: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
            Something went wrong
          </h3>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            The tool hit an unexpected error. This is a bug — the inputs you
            typed should never cause a crash.
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-red-400 dark:text-red-500">
              Error details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-100 p-3 text-xs text-red-800 dark:bg-red-900/40 dark:text-red-300">
              {this.state.error.message}
              {"\n"}
              {this.state.stack}
            </pre>
          </details>
          <button
            onClick={this.handleReset}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
