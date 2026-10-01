import React from 'react';
import { CustomerSettingsPage } from './CustomerSettingsPage.js';

export const CustomerRiskPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return <CustomerSettingsPage onNavigate={onNavigate} />;
};
