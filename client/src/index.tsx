import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Button } from '@client/src/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import RoutesComponent from './app';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

const CLIENT_BASE_PATH = (import.meta.env.BASE_URL as string) || '/';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const runtimeError = error instanceof Error ? error : new Error(String(error));

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-panel-strong border-primary/20 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-sm bg-[hsl(0_72%_58%)]/10 text-[hsl(0_72%_58%)]">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <div className="font-semibold">页面出错了</div>
            <div className="text-xs text-muted-foreground">
              {runtimeError.name || 'Runtime Error'}
            </div>
          </div>
        </div>
        <pre className="text-xs bg-black/40 p-3 rounded-sm overflow-auto max-h-56 text-muted-foreground whitespace-pre-wrap">
          {runtimeError.stack || runtimeError.message}
        </pre>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => {
              resetErrorBoundary();
              window.location.reload();
            }}
          >
            <RefreshCw className="size-4 mr-2" />
            刷新重试
          </Button>
        </div>
      </div>
    </div>
  );
}

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <RoutesComponent />
        {createPortal(
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{ classNames: { toast: '!glass-panel-strong' } }}
          />,
          document.body,
        )}
      </ErrorBoundary>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
