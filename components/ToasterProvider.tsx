'use client';

import { Toaster as SonnerToaster } from 'sonner';

export default function ToasterProvider() {
  return (
    <SonnerToaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      theme="system"
      toastOptions={{
        style: {
          borderRadius: '12px',
          border: '1px solid var(--color-border, #e2e8f0)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
      }}
    />
  );
}
