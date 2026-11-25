import React from 'react';
import AccountForm from './auth/AccountForm';
export default function RegisterPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return <AccountForm mode="register" onNavigate={onNavigate} />;
}
