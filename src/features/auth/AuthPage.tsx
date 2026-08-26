import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

const EMAIL_OTP_LENGTH = 6;

type AuthMode = 'signin' | 'register';
type Method = 'otp' | 'password';
type OtpState = 'email' | 'verify';

export function AuthPage({ defaultMode = 'signin' }: { defaultMode?: AuthMode }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [method, setMethod] = useState<Method>('otp');
  const [otpState, setOtpState] = useState<OtpState>('email');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  // Password validation state
  const [pwdValidations, setPwdValidations] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setPwdValidations({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    });
  }, [password]);

  const allPwdValid = Object.values(pwdValidations).every(Boolean);

  const handleError = (error: any, fallbackMessage: string) => {
    console.error("Auth error:", error);
    setMessage({ 
      text: error.message || fallbackMessage, 
      type: 'error' 
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: mode === 'register',
        }
      });

      if (error) throw error;
      
      setOtpState('verify');
      setMessage({ text: `A ${EMAIL_OTP_LENGTH}-digit code has been sent to your email.`, type: 'success' });
    } catch (error: any) {
      handleError(error, "We couldn't connect to the authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (error) throw error;
      
      if (data.session) {
        navigate('/candidate');
      }
    } catch (error: any) {
      handleError(error, "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'register' && !allPwdValid) {
      setMessage({ text: 'Please ensure your password meets all requirements.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          // Requires email confirmation
          setMethod('otp');
          setOtpState('verify');
          setMessage({ text: `Registration successful! Please enter the ${EMAIL_OTP_LENGTH}-digit code sent to your email to confirm.`, type: 'success' });
        } else if (data.session) {
          navigate('/candidate');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.session) {
          navigate('/candidate');
        }
      }
    } catch (error: any) {
      handleError(error, "We couldn't connect to the authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] p-4">
      <div className="w-full max-w-md bg-white p-8 border border-slate-200 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-[#111111] mb-6 text-center">
          {mode === 'signin' ? 'Sign In' : 'Get Started'}
        </h2>

        {message && (
          <div className={`p-3 mb-4 rounded text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {otpState === 'verify' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-slate-600">Enter the {EMAIL_OTP_LENGTH}-digit code sent to:</p>
              <p className="font-medium text-slate-900">{email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{EMAIL_OTP_LENGTH}-Digit Code</label>
              <input
                type="text"
                required
                maxLength={EMAIL_OTP_LENGTH}
                pattern={`\\d{${EMAIL_OTP_LENGTH}}`}
                value={otpCode}
                aria-label={`${EMAIL_OTP_LENGTH}-Digit Verification Code`}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedData = e.clipboardData.getData('text');
                  const digitsOnly = pastedData.replace(/\D/g, '');
                  
                  if (digitsOnly.length > EMAIL_OTP_LENGTH) {
                    setMessage({
                      text: "This code does not match the configured QWERTY verification-code length. Please request a new code.",
                      type: 'error'
                    });
                  }
                  
                  const target = e.target as HTMLInputElement;
                  const start = target.selectionStart ?? 0;
                  const end = target.selectionEnd ?? 0;
                  
                  const newValue = otpCode.slice(0, start) + digitsOnly + otpCode.slice(end);
                  setOtpCode(newValue.slice(0, EMAIL_OTP_LENGTH));
                }}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full p-2 border border-slate-300 rounded focus:border-[#0B3D2E] focus:ring-1 focus:ring-[#0B3D2E] outline-none text-center tracking-widest text-lg font-mono"
                placeholder={"0".repeat(EMAIL_OTP_LENGTH)}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || otpCode.length !== EMAIL_OTP_LENGTH}
              className="w-full bg-[#0B3D2E] text-white py-2 px-4 rounded font-semibold hover:bg-[#1E6B50] transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <div className="flex flex-col gap-2 text-center mt-4 text-sm text-slate-600">
              <button 
                type="button" 
                onClick={handleSendOtp}
                disabled={loading}
                className="hover:text-[#0B3D2E] underline underline-offset-2"
              >
                Resend code
              </button>
              <button 
                type="button" 
                onClick={() => { setOtpState('email'); setOtpCode(''); setMessage(null); }}
                className="hover:text-[#0B3D2E] underline underline-offset-2"
              >
                Change email
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Google Sign In - Disabled for Dev */}
            <button 
              disabled
              title="Google authentication is pending provider configuration."
              className="w-full mb-6 border border-slate-200 text-slate-400 bg-slate-50 py-2 px-4 rounded font-medium flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google (Coming Soon)
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-3 text-slate-500 text-sm">OR</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            {method === 'otp' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#0B3D2E] focus:ring-1 focus:ring-[#0B3D2E] outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#0B3D2E] text-white py-2 px-4 rounded font-semibold hover:bg-[#1E6B50] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send one-time code'}
                </button>
                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setMethod('password'); setMessage(null); }}
                    className="text-sm text-slate-600 hover:text-[#0B3D2E] underline underline-offset-2"
                  >
                    Use password instead
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#0B3D2E] focus:ring-1 focus:ring-[#0B3D2E] outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#0B3D2E] focus:ring-1 focus:ring-[#0B3D2E] outline-none"
                    placeholder="••••••••"
                  />
                  {mode === 'register' && (
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <p className={pwdValidations.length ? 'text-green-600' : ''}>• At least 8 characters</p>
                      <p className={pwdValidations.upper ? 'text-green-600' : ''}>• At least one uppercase letter</p>
                      <p className={pwdValidations.lower ? 'text-green-600' : ''}>• At least one lowercase letter</p>
                      <p className={pwdValidations.number ? 'text-green-600' : ''}>• At least one number</p>
                      <p className={pwdValidations.special ? 'text-green-600' : ''}>• At least one special character</p>
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={loading || (mode === 'register' && !allPwdValid)}
                  className="w-full bg-[#0B3D2E] text-white py-2 px-4 rounded font-semibold hover:bg-[#1E6B50] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>
                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setMethod('otp'); setMessage(null); }}
                    className="text-sm text-slate-600 hover:text-[#0B3D2E] underline underline-offset-2"
                  >
                    Use email one-time code instead
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 text-center text-sm border-t border-slate-200 pt-4">
              {mode === 'signin' ? (
                <p className="text-slate-600">
                  Don't have an account?{' '}
                  <button onClick={() => {setMode('register'); setMessage(null);}} className="font-semibold text-[#0B3D2E] hover:underline">Get Started</button>
                </p>
              ) : (
                <p className="text-slate-600">
                  Already have an account?{' '}
                  <button onClick={() => {setMode('signin'); setMessage(null);}} className="font-semibold text-[#0B3D2E] hover:underline">Sign In</button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
