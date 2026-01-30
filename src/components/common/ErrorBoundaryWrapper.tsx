import { Component, ReactNode, ErrorInfo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  error: Error | null;
  hasError: boolean;
}

export class ErrorBoundaryWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <h2 className="font-semibold mb-2">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                {this.state.error.message}
              </p>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

interface SuspenseFallbackProps {
  message?: string;
}

export function SuspenseFallback({ message = 'Loading...' }: SuspenseFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <span className="ml-3 text-muted-foreground">{message}</span>
    </div>
  );
}
