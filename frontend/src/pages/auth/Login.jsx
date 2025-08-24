import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, Code2, Sparkles, ArrowRight } from 'lucide-react';
import './auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { signIn, signInWithGoogle, user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect param from query string
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn(email, password);
    
    if (result.success) {
      toast.success('Successfully logged in!');
      // Redirect after login
      if (redirect) {
        navigate(redirect, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      toast.success('Successfully signed in with Google!');
      // Redirect after login
      if (redirect) {
        navigate(redirect, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } else {
      toast.error(result.error);
    }
    
    setGoogleLoading(false);
  };

  useEffect(()=>{
    if(user){
      if (redirect) {
        navigate(redirect, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  },[user,navigate,redirect]);

  return (
    <div className="auth-ultra-modern">
      {/* Floating Elements Background */}
      <div className="auth-floating-elements">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
        <div className="floating-orb orb-4"></div>
      </div>

      {/* Main Content */}
      <div className="auth-container-modern">
        {/* Branding Section */}
        <div className="auth-brand-section">
          <div className="brand-logo-floating">
            <Code2 className="brand-icon" />
            <div className="brand-sparkle">
              <Sparkles className="sparkle-icon" />
            </div>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">CollabHub</h1>
            <p className="brand-subtitle">Where innovation meets collaboration</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="auth-card-modern">
          <div className="card-glow"></div>
          
          <div className="auth-header-modern">
            <div className="header-icon">
              <div className="icon-wrapper">
                <ArrowRight className="login-icon" />
              </div>
            </div>
            <h2 className="auth-title-modern">Welcome Back</h2>
            <p className="auth-subtitle-modern">
              Ready to create something amazing?{' '}
              <Link to="/register" className="auth-link-modern">
                Join us instead
              </Link>
            </p>
          </div>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            <div className="form-fields-modern">
              {/* Email Field */}
              <div className="field-group-modern">
                <label htmlFor="email" className="field-label-auth">Email Address</label>
                <div className="input-wrapper-modern">
                  <div className="input-icon-wrapper">
                    <Mail className="input-icon" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-modern"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="field-group-modern">
                <label htmlFor="password" className="field-label-auth">Password</label>
                <div className="input-wrapper-modern">
                  <div className="input-icon-wrapper">
                    <Lock className="input-icon" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-modern"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle-modern"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="toggle-icon" />
                    ) : (
                      <Eye className="toggle-icon" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="auth-extras">
                <Link to="/forgot-password" className="forgot-link-modern">
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-auth-primary" disabled={loading}>
                          {loading ? (
              <div className="btn-loading-wave">
                <div className="btn-wave-bar"></div>
                <div className="btn-wave-bar"></div>
                <div className="btn-wave-bar"></div>
              </div>
            ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="btn-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider-modern">
            <div className="divider-line"></div>
            <span className="divider-text">Or continue with</span>
            <div className="divider-line"></div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="btn-auth-google"
          >
            {googleLoading ? (
              <div className="btn-loading-wave">
                <div className="btn-wave-bar"></div>
                <div className="btn-wave-bar"></div>
                <div className="btn-wave-bar"></div>
              </div>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;