import React from 'react';
import AccountForm from './auth/AccountForm';
export default function LoginPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return <AccountForm mode="login" onNavigate={onNavigate} />;
}
