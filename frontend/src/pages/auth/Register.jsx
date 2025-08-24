import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Code2, Sparkles, UserPlus, Star, MessageSquare, Phone, Terminal, FolderOpen } from 'lucide-react';
import './register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { signUp, signInWithGoogle } = useAuthContext();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    const result = await signUp(formData.email, formData.password, formData.displayName);
    
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      toast.success('Account created successfully with Google!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    
    setGoogleLoading(false);
  };

  return (
    <div className="register-ultra-modern">
      {/* Animated Background Elements */}
      <div className="register-floating-elements">
        <div className="floating-star star-1">
          <Star className="star-icon" />
        </div>
        <div className="floating-star star-2">
          <Star className="star-icon" />
        </div>
        <div className="floating-star star-3">
          <Star className="star-icon" />
        </div>
        <div className="floating-orb reg-orb-1"></div>
        <div className="floating-orb reg-orb-2"></div>
        <div className="floating-orb reg-orb-3"></div>
      </div>

      {/* Top Branding Section */}
      <div className="register-top-branding">
        <div className="brand-logo-floating">
          <Code2 className="brand-icon" />
          <div className="brand-sparkle">
            <Sparkles className="sparkle-icon" />
          </div>
        </div>
        <h1 className="brand-title">CollabHub</h1>
        <p className="brand-subtitle">Where innovation meets collaboration</p>
      </div>

      {/* Main Content Grid */}
      <div className="register-main-grid">
        {/* Left Side - Features Showcase */}
        <div className="register-features-section">
          <div className="features-header">
            <h2 className="features-title">Join the Future of Collaboration</h2>
            <p className="features-subtitle">
              Transform your ideas into reality with our cutting-edge platform
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <MessageSquare className="feature-icon" />
              </div>
              <h3 className="feature-title">Real-time Chat</h3>
              <p className="feature-description">
                Communicate seamlessly with your team through instant messaging, code sharing, and real-time notifications
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Phone className="feature-icon" />
              </div>
              <h3 className="feature-title">Voice & Video Calls</h3>
              <p className="feature-description">
                Connect face-to-face with crystal clear audio and video quality for productive team discussions
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Terminal className="feature-icon" />
              </div>
              <h3 className="feature-title">Shared Terminal</h3>
              <p className="feature-description">
                Collaborate on command-line tasks with shared terminal sessions and real-time command execution
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FolderOpen className="feature-icon" />
              </div>
              <h3 className="feature-title">Smart Folder Structure</h3>
              <p className="feature-description">
                Organize projects with intelligent file management, version control, and collaborative editing
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="register-form-section">
          <div className="register-form-card">
            <div className="form-card-glow"></div>
            
            <div className="form-header">
              <div className="form-header-icon">
                <div className="form-icon-wrapper">
                  <UserPlus className="form-icon" />
                </div>
              </div>
              <h2 className="form-title">Create Your Account</h2>
              <p className="form-subtitle">
                Already have an account?{' '}
                <Link to="/login" className="form-link">
                  Sign in here
                </Link>
              </p>
            </div>
            
            <form className="register-form" onSubmit={handleSubmit}>
              <div className="form-fields">
                {/* Display Name Field */}
                <div className="form-field-group">
                  <label htmlFor="displayName" className="form-field-label">Full Name</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon-wrapper">
                      <User className="form-input-icon" />
                    </div>
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.displayName}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="form-field-group">
                  <label htmlFor="email" className="form-field-label">Email Address</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon-wrapper">
                      <Mail className="form-input-icon" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
                
                {/* Password Field */}
                <div className="form-field-group">
                  <label htmlFor="password" className="form-field-label">Password</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon-wrapper">
                      <Lock className="form-input-icon" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
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

                {/* Confirm Password Field */}
                <div className="form-field-group">
                  <label htmlFor="confirmPassword" className="form-field-label">Confirm Password</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon-wrapper">
                      <Lock className="form-input-icon" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="toggle-icon" />
                      ) : (
                        <Eye className="toggle-icon" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn-register-primary" disabled={loading}>
                              {loading ? (
                <div className="btn-loading-wave">
                  <div className="btn-wave-bar"></div>
                  <div className="btn-wave-bar"></div>
                  <div className="btn-wave-bar"></div>
                </div>
              ) : (
                  <>
                    <span>Create Account</span>
                    <UserPlus className="btn-register-icon" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="form-divider">
              <div className="divider-line"></div>
              <span className="divider-text">Or continue with</span>
              <div className="divider-line"></div>
            </div>

            {/* Google Sign Up */}
            <button
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="btn-register-google"
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
                  <span>Sign up with Google</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 