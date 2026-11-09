import React from 'react';
import { LoginPage } from './LoginPage';
import { UserAccount } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isDarkMode,
  toggleDarkMode,
}) => {
  if (!isOpen) return null;

  return (
    <LoginPage
      isModal={true}
      onClose={onClose}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLoginSuccess={(user) => {
        onLoginSuccess(user);
        onClose();
      }}
    />
  );
};
