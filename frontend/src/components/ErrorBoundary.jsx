import React from 'react';

/**
 * Enterprise Railway OCC Error Boundary
 * Catches JavaScript runtime exceptions in child components and prevents full-screen blank pages.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 rounded-xl bg-white border border-red-200 shadow-md space-y-3 m-2 font-sans">
          <div className="flex items-center gap-2 text-red-700">
            <span className="material-symbols-outlined text-xl">report_problem</span>
            <h4 className="font-bold text-xs uppercase tracking-wide">
              {this.props.title || 'Component Display Diagnostics'}
            </h4>
          </div>

          <p className="text-[11px] text-slate-600 leading-snug">
            {this.props.description ||
              'A temporary telemetry parsing error occurred. The map engine and corridor tracking remain fully operational.'}
          </p>

          {this.state.error?.message && (
            <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-700 break-all select-all">
              {this.state.error.message}
            </div>
          )}

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Recover Component</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
