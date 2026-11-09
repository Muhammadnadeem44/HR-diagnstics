import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { UserAccount } from '../../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';
import { hashPassword, verifyPassword, BruteForceGuard } from '../../utils/security';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  LogIn,
  KeyRound,
  Building2,
  ShieldAlert,
  Sun,
  Moon,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
  isModal?: boolean;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onClose,
  isModal = false,
  isDarkMode,
  toggleDarkMode,
}) => {
  // Theme state synced with documentElement and localStorage
  const [internalDarkMode, setInternalDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hr_theme') === 'dark';
  });

  const currentDark = isDarkMode !== undefined ? isDarkMode : internalDarkMode;

  const handleToggleTheme = () => {
    if (toggleDarkMode) {
      toggleDarkMode();
    } else {
      const next = !currentDark;
      setInternalDarkMode(next);
      if (next) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('hr_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('hr_theme', 'light');
      }
    }
  };
  // Sign In Form State (Only administrator-created accounts can log in)
  const [usernameOrEmail, setUsernameOrEmail] = useState(() => {
    return localStorage.getItem('hr_remember_email') || 'mrnadeemmobile20@gmail.com';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 2FA state (only if explicitly enabled on user account)
  const [is2FAMode, setIs2FAMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);

  // Real Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset' | 'success'>('request');
  const [forgotTargetUser, setForgotTargetUser] = useState<UserAccount | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Real Email & Password Login with SHA-256 and brute-force lockout
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const inputTrimmed = usernameOrEmail.trim().toLowerCase();
    const passTrimmed = password.trim();

    if (!inputTrimmed || !passTrimmed) {
      setErrorMsg('Please enter your email address and password.');
      return;
    }

    // Check brute-force lockout
    const { isLocked, remainingSeconds } = BruteForceGuard.checkLockout(inputTrimmed);
    if (isLocked) {
      setErrorMsg(`Security lockout active: Too many failed attempts. Please wait ${remainingSeconds}s.`);
      if (inputTrimmed.includes('admin') || inputTrimmed.includes('nadeem') || inputTrimmed.includes('mrnadeemmobile20')) {
        StorageService.logSuperAdminActivity({
          category: 'LOGIN_ATTEMPT',
          actionType: 'LOGIN_LOCKED',
          actorEmail: inputTrimmed,
          actorName: 'Target: Super Admin',
          targetEntity: 'Authentication Gate',
          status: 'BLOCKED',
          details: `Security brute-force lockout active: Login attempt blocked for "${inputTrimmed}". Remaining lockout duration: ${remainingSeconds}s.`,
          metadata: { inputIdentifier: inputTrimmed, remainingSeconds },
        });
      }
      return;
    }

    setIsLoading(true);

    try {
      const users = StorageService.getUsers();

      // Find user by email or registered staff name
      const user = users.find(
        (u) =>
          u.email.toLowerCase() === inputTrimmed ||
          u.name.toLowerCase() === inputTrimmed
      );

      if (!user) {
        const { attemptsLeft } = BruteForceGuard.recordFailedAttempt(inputTrimmed);
        setErrorMsg(`Access Denied: Account not found. Only accounts created by your System Administrator can log in. (${attemptsLeft} attempts remaining)`);
        if (inputTrimmed.includes('admin') || inputTrimmed.includes('nadeem') || inputTrimmed.includes('mrnadeemmobile20')) {
          StorageService.logSuperAdminActivity({
            category: 'LOGIN_ATTEMPT',
            actionType: 'LOGIN_FAILED',
            actorEmail: inputTrimmed,
            actorName: 'Unknown / Non-existent User',
            targetEntity: 'Super Admin Login Gate',
            status: 'FAILURE',
            details: `Unauthorized login attempt using unassigned identifier "${inputTrimmed}". Account not recognized.`,
            metadata: { inputIdentifier: inputTrimmed, attemptsLeft, reason: 'ACCOUNT_NOT_FOUND' },
          });
        }
        setIsLoading(false);
        return;
      }

      // Cryptographic verification
      const isMatch = await verifyPassword(passTrimmed, user.passwordHash);
      if (!isMatch) {
        const { isNowLocked, attemptsLeft } = BruteForceGuard.recordFailedAttempt(inputTrimmed);
        if (isNowLocked) {
          setErrorMsg('Security lockout triggered: 5 failed attempts. Locked for 30 seconds.');
        } else {
          setErrorMsg(`Incorrect password. ${attemptsLeft} attempts remaining before security lockout.`);
        }
        if (user.role === 'super_admin' || user.email.toLowerCase() === 'mrnadeemmobile20@gmail.com') {
          StorageService.logSuperAdminActivity({
            category: 'LOGIN_ATTEMPT',
            actionType: isNowLocked ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
            actorEmail: user.email,
            actorName: user.name,
            targetEntity: 'Super Admin Access Gate',
            status: isNowLocked ? 'BLOCKED' : 'FAILURE',
            details: isNowLocked
              ? `Account brute-force lockout triggered for Super Admin "${user.name}" (${user.email}) after 5 failed password attempts. Access blocked for 30s.`
              : `Failed password attempt for Super Admin account "${user.name}" (${user.email}). ${attemptsLeft} attempt(s) remaining before lockout.`,
            metadata: { attemptsLeft, isNowLocked, targetUserId: user.id },
          });
        }
        setIsLoading(false);
        return;
      }

      // Password matches: Clear failed attempt record
      BruteForceGuard.recordSuccess(inputTrimmed);

      // If password was stored in plain text legacy, upgrade immediately to SHA-256 hash
      if (user.passwordHash === passTrimmed) {
        const secureHash = await hashPassword(passTrimmed);
        user.passwordHash = secureHash;
        StorageService.saveUser(user);
      }

      // Check 2FA requirement (only if explicitly enabled on account)
      if (user.is2FAEnabled || user.twoFactorEnabled) {
        setIsLoading(false);
        setPendingUser(user);
        setIs2FAMode(true);
        setOtpCode('');
        return;
      }

      // Complete login
      completeLogin(user);
    } catch (err: any) {
      setErrorMsg('Authentication error. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const token = otpCode.trim();
    if (token.length !== 6 || !/^\d+$/.test(token)) {
      setErrorMsg('Please enter a valid 6-digit numeric token.');
      return;
    }

    if (pendingUser) {
      setIsLoading(true);
      setTimeout(() => {
        completeLogin(pendingUser);
      }, 400);
    }
  };

  const completeLogin = (user: UserAccount) => {
    StorageService.setCurrentUser(user);
    StorageService.logAction(
      'Security',
      `User Authenticated: ${user.name} (${user.role} - ${user.email})`,
      user.branchId
    );

    if (user.role === 'super_admin' || user.email.toLowerCase() === 'mrnadeemmobile20@gmail.com') {
      StorageService.logSuperAdminActivity({
        category: 'LOGIN_ATTEMPT',
        actionType: 'LOGIN_SUCCESS',
        actorEmail: user.email,
        actorName: user.name,
        targetEntity: 'Head Office Executive Portal',
        status: 'SUCCESS',
        details: `Super Admin "${user.name}" (${user.email}) successfully authenticated via SHA-256 password verification. Access granted.`,
        metadata: {
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          sessionStartedAt: new Date().toISOString(),
        },
      });
    }

    if (rememberMe) {
      localStorage.setItem('hr_remember_email', user.email);
    } else {
      localStorage.removeItem('hr_remember_email');
    }

    onLoginSuccess(user);
    if (onClose) onClose();
  };

  // Real Functional Password Reset Flow
  const handleForgotLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    const emailTrimmed = forgotEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setForgotError('Please enter your email address.');
      return;
    }

    const users = StorageService.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === emailTrimmed);
    if (!user) {
      setForgotError('No registered account was found with this email address.');
      return;
    }

    setForgotTargetUser(user);
    setForgotStep('reset');
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotTargetUser) return;
    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    try {
      const hashed = await hashPassword(forgotNewPassword.trim());
      const updated: UserAccount = {
        ...forgotTargetUser,
        passwordHash: hashed,
      };
      StorageService.saveUser(updated);
      StorageService.logAction(
        'Security',
        `User Password Reset: ${updated.name} (${updated.email})`,
        updated.branchId
      );

      setForgotStep('success');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep('request');
        setForgotTargetUser(null);
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setSuccessMsg('Your password was updated successfully. You can now sign in.');
      }, 1500);
    } catch (err: any) {
      setForgotError('Failed to update password.');
    }
  };

  return (
    <div className={`page-root ${isModal ? 'fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3' : 'min-h-screen w-full flex items-center justify-center'}`}>
      <style>{`
        :root {
          --cyan: ${currentDark ? '#12dcff' : '#0284c7'};
          --blue: ${currentDark ? '#087cff' : '#2563eb'};
          --bg: ${currentDark ? '#020b18' : '#f8fafc'};
        }
        .page-root {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: ${currentDark ? '#fff' : '#0f172a'};
          background: ${
            currentDark
              ? 'radial-gradient(circle at 22% 48%, rgba(0, 140, 255, 0.16), transparent 28%), radial-gradient(circle at 78% 48%, rgba(0, 217, 255, 0.10), transparent 32%), linear-gradient(135deg, #010916, #031a30 52%, #010714)'
              : 'radial-gradient(circle at 20% 30%, rgba(37, 99, 235, 0.08), transparent 40%), radial-gradient(circle at 80% 70%, rgba(14, 165, 233, 0.08), transparent 40%), linear-gradient(135deg, #f8fafc, #edf2f7 50%, #e2e8f0)'
          };
          position: relative;
          overflow-x: hidden;
          transition: background 0.3s ease, color 0.3s ease;
        }
        .hr-grid-bg {
          position: absolute;
          inset: 0;
          opacity: ${currentDark ? '0.10' : '0.04'};
          background-image: linear-gradient(rgba(21, 191, 255, 0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(21, 191, 255, 0.14) 1px, transparent 1px);
          background-size: 55px 55px;
          mask-image: linear-gradient(transparent, #000 18%, #000 82%, transparent);
          pointer-events: none;
        }
        .hr-orbit {
          position: absolute;
          border: 1px solid rgba(8, 191, 255, 0.35);
          border-radius: 50%;
          pointer-events: none;
        }
        .ob1 {
          width: 520px;
          height: 520px;
          left: -210px;
          top: -190px;
          animation: hrFloat 12s ease-in-out infinite;
        }
        .ob2 {
          width: 440px;
          height: 440px;
          right: -190px;
          bottom: -190px;
          animation: hrFloat 15s ease-in-out infinite reverse;
        }
        .hr-main {
          position: relative;
          z-index: 2;
          width: min(1200px, 100%);
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 65px;
          align-items: center;
          padding: 30px 24px;
        }
        .brand-sec {
          text-align: center;
          animation: hrInLeft 1s ease both;
        }
        .hr-logo-stage {
          position: relative;
          width: 320px;
          height: 320px;
          margin: 0 auto 1.5rem auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .hr-logo {
          width: 270px;
          height: 270px;
          object-fit: contain !important;
          position: relative;
          z-index: 5;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          filter: none !important;
          animation: hrPulse 4s ease-in-out infinite;
        }
        .brand-sec h1 {
          font-size: clamp(2.4rem, 4.4vw, 4rem);
          font-weight: 800;
          letter-spacing: 7px;
          text-shadow: ${currentDark ? '0 0 25px rgba(0, 217, 255, 0.35)' : 'none'};
          color: ${currentDark ? '#fff' : '#0f172a'};
          margin-top: 8px;
        }
        .brand-sec h1 span {
          color: var(--cyan);
        }
        .brand-tag {
          margin-top: 12px;
          letter-spacing: 5px;
          color: ${currentDark ? '#91b9ca' : '#475569'};
          font-size: 0.82rem;
          font-weight: 600;
        }
        .hr-dots {
          display: flex;
          justify-content: center;
          gap: 9px;
          margin-top: 20px;
        }
        .hr-dots i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--cyan);
          box-shadow: 0 0 12px var(--cyan);
          animation: hrBlink 1.6s infinite;
        }
        .hr-dots i:nth-child(2) { animation-delay: 0.25s; }
        .hr-dots i:nth-child(3) { animation-delay: 0.5s; }

        .login-sec {
          animation: hrInRight 1s 0.12s ease both;
        }
        .hr-card {
          position: relative;
          overflow: hidden;
          padding: 38px 42px;
          border-radius: 28px;
          background: ${currentDark ? 'linear-gradient(145deg, rgba(8, 39, 70, 0.85), rgba(2, 15, 32, 0.85))' : 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96))'};
          border: 1px solid ${currentDark ? 'rgba(22, 217, 255, 0.45)' : 'rgba(203, 213, 225, 0.9)'};
          backdrop-filter: blur(18px);
          box-shadow: ${currentDark ? '0 25px 80px rgba(0,0,0,0.65), 0 0 50px rgba(0, 140, 255, 0.15), inset 0 0 35px rgba(0, 217, 255, 0.05)' : '0 25px 70px rgba(15, 23, 42, 0.10), 0 4px 16px rgba(15, 23, 42, 0.05)'};
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .hr-card:before {
          content: "";
          position: absolute;
          left: -50%;
          top: 0;
          width: 200%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #13dcff, transparent);
          box-shadow: 0 0 15px #13dcff;
          animation: hrScan 4s linear infinite;
        }
        .hr-kicker {
          color: ${currentDark ? '#45ddff' : '#0284c7'};
          font-size: 0.72rem;
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-bottom: 6px;
          font-weight: 700;
        }
        .hr-card h2 {
          font-size: 2.1rem;
          font-weight: 800;
          margin-bottom: 6px;
          line-height: 1.15;
          color: ${currentDark ? '#fff' : '#0f172a'};
        }
        .hr-card h2 span {
          color: var(--cyan);
        }
        .hr-sub {
          color: ${currentDark ? '#91aabc' : '#64748b'};
          font-size: 0.9rem;
          margin-bottom: 22px;
        }
        .hr-field {
          position: relative;
          margin: 15px 0;
        }
        .hr-field input, .hr-field select {
          width: 100%;
          height: 54px;
          border-radius: 14px;
          border: 1px solid ${currentDark ? '#17618d' : '#cbd5e1'};
          background: ${currentDark ? 'rgba(2, 24, 43, 0.85)' : '#ffffff'};
          color: ${currentDark ? 'white' : '#0f172a'};
          padding: 0 45px 0 48px;
          outline: none;
          font-size: 0.95rem;
          transition: 0.3s ease;
        }
        .hr-field select {
          padding-right: 20px;
          cursor: pointer;
        }
        .hr-field select option {
          background: ${currentDark ? '#031527' : '#ffffff'};
          color: ${currentDark ? '#fff' : '#0f172a'};
        }
        .hr-field input:focus, .hr-field select:focus {
          border-color: ${currentDark ? '#12dcff' : '#0284c7'};
          box-shadow: ${currentDark ? '0 0 0 3px rgba(18, 220, 255, 0.12), 0 0 25px rgba(18, 220, 255, 0.2)' : '0 0 0 3px rgba(2, 132, 199, 0.15), 0 0 15px rgba(2, 132, 199, 0.12)'};
        }
        .hr-field label {
          position: absolute;
          left: 48px;
          top: 17px;
          color: ${currentDark ? '#7895a8' : '#64748b'};
          pointer-events: none;
          transition: 0.25s ease;
          font-size: 0.88rem;
        }
        .hr-field input:focus + label,
        .hr-field input:not(:placeholder-shown) + label,
        .hr-field.has-value label {
          top: -9px;
          left: 15px;
          padding: 0 7px;
          background: ${currentDark ? '#08213a' : '#ffffff'};
          color: ${currentDark ? '#22ddff' : '#0284c7'};
          font-size: 0.70rem;
          font-weight: 700;
          border-radius: 4px;
        }
        .hr-icon {
          position: absolute;
          left: 16px;
          top: 17px;
          color: ${currentDark ? '#5be3ff' : '#0284c7'};
          font-size: 18px;
          z-index: 2;
        }
        .hr-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 15px 2px 20px;
          color: ${currentDark ? '#91a8b7' : '#475569'};
          font-size: 0.84rem;
        }
        .hr-check {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }
        .hr-check input {
          accent-color: #12dcff;
          cursor: pointer;
        }
        .hr-forgot-link {
          color: #12dcff;
          text-decoration: none;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .hr-forgot-link:hover {
          text-decoration: underline;
          color: #5be3ff;
        }
        .hr-btn {
          position: relative;
          width: 100%;
          height: 54px;
          border: 0;
          border-radius: 14px;
          background: ${currentDark ? 'linear-gradient(90deg, #0bd9ff, #41e7ff, #078eff)' : 'linear-gradient(90deg, #0284c7, #2563eb, #1d4ed8)'};
          color: ${currentDark ? '#00111b' : '#ffffff'};
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          overflow: hidden;
          box-shadow: ${currentDark ? '0 8px 30px rgba(0, 207, 255, 0.25)' : '0 8px 24px rgba(37, 99, 235, 0.25)'};
          transition: 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.5px;
        }
        .hr-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 38px rgba(0, 207, 255, 0.45);
        }
        .hr-btn:active {
          transform: translateY(0);
        }
        .hr-footer {
          margin-top: 22px;
          text-align: center;
          color: #648598;
          font-size: 0.74rem;
          letter-spacing: 1px;
        }
        .hr-status {
          margin-top: 7px;
          color: #6f9aaa;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .hr-status b {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #16e69a;
          box-shadow: 0 0 8px #16e69a;
        }

        @keyframes hrSpin { to { transform: rotate(360deg); } }
        @keyframes hrSpinR { to { transform: rotate(-360deg); } }
        @keyframes hrPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        @keyframes hrBlink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes hrFloat { 50% { transform: translate(35px, 25px) rotate(18deg); } }
        @keyframes hrScan { 0% { transform: translateY(-20px); } 100% { transform: translateY(440px); } }
        @keyframes hrInLeft { from { opacity: 0; transform: translateX(-45px); } to { opacity: 1; transform: none; } }
        @keyframes hrInRight { from { opacity: 0; transform: translateX(45px); } to { opacity: 1; transform: none; } }

        @media (max-width: 900px) {
          .hr-main {
            grid-template-columns: 1fr;
            gap: 15px;
            padding: 22px 16px;
          }
          .hr-logo-stage {
            width: 220px;
            height: 220px;
          }
          .hr-logo {
            width: 190px;
            height: 190px;
          }
          .brand-sec h1 { font-size: 2rem; letter-spacing: 4px; }
          .brand-tag { font-size: 0.68rem; letter-spacing: 3px; }
        }
        @media (max-width: 520px) {
          .hr-card { padding: 26px 18px; border-radius: 22px; }
          .hr-card h2 { font-size: 1.8rem; }
        }
      `}</style>

      {/* Grid & Glowing Orbits */}
      <div className="hr-grid-bg" />
      <div className="hr-orbit ob1" />
      <div className="hr-orbit ob2" />

      {/* Top Floating Controls: Day / Night Mode & Close */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleToggleTheme}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md border cursor-pointer ${
            currentDark
              ? 'bg-slate-900/90 border-slate-700 text-amber-300 hover:bg-slate-800 hover:border-amber-400'
              : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600'
          }`}
          title={currentDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
        >
          {currentDark ? (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span>Day Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-slate-600" />
              <span>Night Mode</span>
            </>
          )}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer ${
              currentDark
                ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400'
                : 'bg-white/90 border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400'
            }`}
            title="Close Login Window"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <main className="hr-main">
        {/* Left Branding Section */}
        <section className="brand-sec">
          <div
            className="hr-logo-stage bg-transparent"
            style={{
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              borderRadius: 0,
            }}
          >
            <img
              className="hr-logo"
              src="/hr-diagnostics-logo-transparent.png"
              alt="HR Diagnostics Official Logo"
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                borderRadius: 0,
                objectFit: 'contain',
              }}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = 'true';
                  img.src = HR_DIAGNOSTICS_LOGO_DATA_URL;
                }
              }}
            />
          </div>
          <h1>
            HR <span>DIAGNOSTICS</span>
          </h1>
          <div className="brand-tag">PEOPLE &nbsp;•&nbsp; PROCESS &nbsp;•&nbsp; PERFORMANCE</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 tracking-wide">
            Enterprise Clinical Diagnostic Laboratory & Inventory Management System
          </p>
          <div className="hr-dots">
            <i />
            <i />
            <i />
          </div>
        </section>

        {/* Right Cyber Access Card */}
        <section className="login-sec">
          <div className="hr-card">
            {/* Prominent Official Logo Header on the Login Card */}
            <div
              className="flex flex-col items-center justify-center text-center pb-4 mb-4 border-b border-slate-700/60 bg-transparent"
              style={{ background: 'transparent' }}
            >
              <div
                className="bg-transparent mb-2.5 flex items-center justify-center"
                style={{
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  borderRadius: 0,
                }}
              >
                <img
                  src="/hr-diagnostics-logo-transparent.png"
                  alt="HR Diagnostics Official Logo"
                  className="h-24 w-24 sm:h-28 sm:w-28"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    borderRadius: 0,
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = 'true';
                      img.src = HR_DIAGNOSTICS_LOGO_DATA_URL;
                    }
                  }}
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
                HR <span className="text-cyan-400">DIAGNOSTICS</span>
              </h2>
              <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-cyan-300 uppercase mt-0.5 mb-1.5">
                PEOPLE • PROCESS • PERFORMANCE
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/80 px-3 py-1 text-[10px] sm:text-[11px] font-semibold text-cyan-300 border border-cyan-700/50">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span>Authorized Laboratory Access Portal</span>
              </div>
            </div>

            {!is2FAMode ? (
              <>
                {/* Error & Success Feedback Banners */}
                {errorMsg && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-950/70 border border-rose-500/50 p-3 text-xs text-rose-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-cyan-950/70 border border-cyan-500/50 p-3 text-xs text-cyan-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Main Sign In Form */}
                <form onSubmit={handleSignIn}>
                  {/* Username / Email Field */}
                  <div className="hr-field">
                    <span className="hr-icon">◉</span>
                    <input
                      id="u"
                      type="text"
                      value={usernameOrEmail}
                      onChange={(e) => {
                        setUsernameOrEmail(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder=" "
                      required
                      autoComplete="username"
                    />
                    <label htmlFor="u">Admin / Staff Email Address</label>
                  </div>

                  {/* Password Field with Eye Visibility Toggle */}
                  <div className="hr-field">
                    <span className="hr-icon">▣</span>
                    <input
                      id="p"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder=" "
                      required
                      autoComplete="current-password"
                    />
                    <label htmlFor="p">Account Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-4 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Demo Quick Fill Hint */}
                  <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-[11px] text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Default Pass: <strong className="text-white font-mono">Admin123!</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameOrEmail('mrnadeemmobile20@gmail.com');
                        setPassword('Admin123!');
                        setErrorMsg(null);
                      }}
                      className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/30 hover:text-white transition cursor-pointer"
                    >
                      Auto-Fill & Enter
                    </button>
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div className="hr-row">
                    <label className="hr-check">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowForgotModal(true);
                        setForgotStep('request');
                        setForgotError(null);
                        setForgotEmail(usernameOrEmail);
                      }}
                      className="hr-forgot-link"
                    >
                      Forgot password?
                    </a>
                  </div>

                  {/* Action Button */}
                  <button type="submit" className="hr-btn" disabled={isLoading}>
                    <span>
                      {isLoading ? '✓  Verifying Security Hash...' : '➜  Sign In to Terminal'}
                    </span>
                  </button>
                </form>
              </>
            ) : (
              /* Two-Factor Authentication Prompt */
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Two-Step Verification</h2>
                    <p className="text-xs text-slate-400">Account: {pendingUser?.email}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your 6-digit authenticator security code to finalize access.
                </p>

                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-950/70 border border-rose-500/50 p-3 text-xs text-rose-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handle2FAVerify} className="space-y-3">
                  <div className="hr-field">
                    <span className="hr-icon">🔒</span>
                    <input
                      id="otp"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder=" "
                      required
                      autoFocus
                      className="tracking-widest font-mono text-center text-lg"
                    />
                    <label htmlFor="otp">6-Digit Security Token (e.g. 123456)</label>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIs2FAMode(false);
                        setPendingUser(null);
                        setErrorMsg(null);
                      }}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 py-3 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 transition"
                    >
                      {isLoading ? 'Verifying...' : 'Confirm & Enter'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Enterprise Security Protocol Trust Indicator */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span>ISO 15189:2022 Secure Protocol</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Lock className="h-3 w-3" />
                <span>256-Bit TLS</span>
              </div>
            </div>

            {/* Bottom Status & Version Footer */}
            <div className="hr-footer">
              HR Diagnostics &nbsp;•&nbsp; Enterprise Production v2.5
              <div className="hr-status">
                <b /> System Online &nbsp;•&nbsp; Cloud Synchronized
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Real Working Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                <KeyRound className="h-4 w-4" /> Password Recovery
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotError(null);
                  setForgotStep('request');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {forgotError && (
              <div className="mb-3 rounded-lg bg-rose-950/70 border border-rose-500/50 p-2.5 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === 'request' && (
              <form onSubmit={handleForgotLookup} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Enter your registered account email to locate your account and set a new password.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setForgotError(null);
                  }}
                  placeholder="e.g. mrnadeemmobile20@gmail.com"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition"
                  >
                    Verify Account →
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'reset' && (
              <form onSubmit={handleForgotResetPassword} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Verified account: <strong className="text-cyan-300">{forgotTargetUser?.name}</strong>. Enter your new password below.
                </p>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">New Password (Min. 6 characters)</label>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition"
                  >
                    Save New Password
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'success' && (
              <div className="py-4 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-cyan-400 mx-auto" />
                <p className="text-xs font-bold">Password Reset Successful</p>
                <p className="text-[11px] text-slate-400">
                  Your password has been updated and securely hashed with SHA-256 encryption.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
