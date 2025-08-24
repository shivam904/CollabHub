import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { 
  User, 
  Mail, 
  Calendar, 
  Edit, 
  Save, 
  X,
  Key,
  Shield,
  Bell,
  Globe,
  Eye,
  EyeOff,
  Lock,
  Camera
} from 'lucide-react';
import './profile.css';

const Profile = () => {
  const { user, logout } = useAuthContext();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    profilePhoto: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Check if user signed in with Google
  const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com') || false;

  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      setError('');
      
      userAPI.getUserProfile(user.uid)
        .then(profile => {
          
          // For Google users, prioritize Google photo URL
          let defaultProfilePhoto = '';
          if (isGoogleUser) {
            // First try to use Google photo URL directly
            if (user.photoURL) {
              defaultProfilePhoto = user.photoURL;
            }
            // If no Google photo, use backend photo
            else if (profile.profilePhoto) {
              defaultProfilePhoto = profile.profilePhoto;
            }
          } else {
            // For non-Google users, use backend photo
            defaultProfilePhoto = profile.profilePhoto || '';
          }
          
          setProfile(profile);
          setFormData({
            displayName: profile.displayName || user.displayName || '',
            bio: profile.bio || '',
            location: profile.location || '',
            website: profile.website || '',
            profilePhoto: defaultProfilePhoto
          });
        })
        .catch(err => {
          console.error('Profile: Error fetching profile:', err);
          setError('Failed to load profile. ' + err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (user === null) {
      setLoading(false);
      setError('Please log in to view your profile.');
    }
  }, [user, isGoogleUser]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const updateData = {
        displayName: formData.displayName,
        bio: formData.bio,
        location: formData.location,
        website: formData.website
      };

      // Handle photo upload if there's a new file
      if (photoFile) {
        const formDataWithPhoto = new FormData();
        Object.keys(updateData).forEach(key => {
          formDataWithPhoto.append(key, updateData[key]);
        });
        formDataWithPhoto.append('profilePhoto', photoFile);
        
        await userAPI.updateUserProfile(user.uid, formDataWithPhoto);
      } else {
        await userAPI.updateUserProfile(user.uid, updateData);
      }

      setSaveSuccess('Profile updated successfully!');
      setIsEditing(false);
      setPhotoFile(null);

      // Refresh profile data
      const updatedProfile = await userAPI.getUserProfile(user.uid);
      setProfile(updatedProfile);

    } catch (err) {
      console.error('Error updating profile:', err);
      setSaveError('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPhotoFile(null);
    setSaveError('');
    setSaveSuccess('');
    
    // Reset form data to original values
    if (profile) {
      let defaultProfilePhoto = '';
      if (isGoogleUser) {
        if (user.photoURL) {
          defaultProfilePhoto = user.photoURL;
        } else if (profile.profilePhoto) {
          defaultProfilePhoto = profile.profilePhoto;
        }
      } else {
        defaultProfilePhoto = profile.profilePhoto || '';
      }
      
      setFormData({
        displayName: profile.displayName || user.displayName || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        profilePhoto: defaultProfilePhoto
      });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          profilePhoto: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordUpdate = async () => {
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      setPasswordLoading(false);
      return;
    }

    try {
      await userAPI.updateUserPassword(user.uid, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordSuccess('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        closePasswordModal();
      }, 2000);

    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError('Failed to update password: ' + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    // For Google users, prioritize Google photo URL
    let defaultProfilePhoto = '';
    if (isGoogleUser) {
      // First try to use Google photo URL directly
      if (user.photoURL) {
        defaultProfilePhoto = user.photoURL;
      }
      // If no Google photo, use backend photo
      else if (profile.profilePhoto) {
        defaultProfilePhoto = profile.profilePhoto;
      }
    } else {
      // For non-Google users, use backend photo
      defaultProfilePhoto = profile.profilePhoto || '';
    }
    
    setFormData(prev => ({
      ...prev,
      profilePhoto: defaultProfilePhoto
    }));
  };

  if (loading) {
    return (
      <div className="content bg-[#181e29] text-gray-200 min-h-screen">
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl font-light tracking-wide text-gray-400">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content bg-[#181e29] text-gray-200 min-h-screen">
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl font-light tracking-wide text-red-400">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-ultra-modern">
      {/* Floating Hero Section */}
      <div className="profile-hero">
        <div className="profile-hero-content">
          <div className="hero-avatar-section">
            <div className="avatar-floating">
              {(formData.profilePhoto && formData.profilePhoto.trim() !== '') ? (
                <img 
                  src={formData.profilePhoto} 
                  alt="Profile"
                  className="avatar-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                  }}
                />
              ) : (
                <div className="avatar-fallback">
                  <span className="avatar-letter">
                    {profile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              {isEditing && (
                <>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <label htmlFor="profile-photo-upload" className="avatar-edit-btn">
                    <Camera className="camera-icon" />
                  </label>
                </>
              )}
            </div>
            <div className="hero-user-info">
              <h1 className="hero-username">
                {profile?.displayName || user?.displayName || 'Unnamed User'}
              </h1>
              <p className="hero-email">{user?.email}</p>
              <div className="hero-joined">
                <Calendar className="calendar-icon" />
                <span>
                  Joined {profile?.createdAt 
                    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'Unknown'
                  }
                </span>
              </div>
            </div>
          </div>
          
          <div className="hero-actions">
            {!isEditing ? (
              <button className="btn-edit-floating" onClick={handleEditProfile}>
                <Edit className="edit-icon" />
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions-floating">
                <button className="btn-save-floating" onClick={handleSave} disabled={saving}>
                  <Save className="save-icon" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn-cancel-floating" onClick={handleCancel} disabled={saving}>
                  <X className="cancel-icon" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="profile-modern-layout">
        {/* Left Panel - Profile Information */}
        <div className="profile-info-panel">
          <div className="info-card">
            <div className="card-header">
              <User className="header-icon" />
              <h3 className="card-title">Personal Information</h3>
            </div>
            
            <div className="info-fields">
              <div className="field-group">
                <label className="field-label">Display Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="field-input"
                    placeholder="Your display name..."
                  />
                ) : (
                  <div className="field-value">{formData.displayName || 'Not set'}</div>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Bio</label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="field-textarea"
                    placeholder="Tell the world about yourself..."
                    rows="4"
                  />
                ) : (
                  <div className="field-value bio-text">{formData.bio || 'Share something about yourself!'}</div>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="field-input"
                    placeholder="Where are you based?"
                  />
                ) : (
                  <div className="field-value">{formData.location || 'Location not set'}</div>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Website</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="field-input"
                    placeholder="https://yourawesome.site"
                  />
                ) : (
                  <div className="field-value">
                    {formData.website ? (
                      <a 
                        href={formData.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="website-link"
                      >
                        <Globe className="globe-icon" />
                        {formData.website}
                      </a>
                    ) : 'No website'}
                  </div>
                )}
              </div>
            </div>
            
            {(saveError || saveSuccess) && (
              <div className={`status-message ${saveError ? 'error' : 'success'}`}>
                <span className="status-icon">
                  {saveError ? '⚠️' : '✅'}
                </span>
                {saveError || saveSuccess}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Settings & Actions */}
        <div className="profile-settings-modern">
          <div className="settings-card">
            <div className="card-header">
              <Shield className="header-icon" />
              <h3 className="card-title">Account Settings</h3>
            </div>
            
            <div className="settings-list">
              <button 
                className="setting-item"
                onClick={() => setShowPasswordModal(true)}
                disabled={isGoogleUser}
              >
                <div className="setting-icon-wrapper">
                  <Key className="setting-icon" />
                </div>
                <div className="setting-content">
                  <h4>Change Password</h4>
                  <p>{isGoogleUser ? 'Managed by Google' : 'Update your password'}</p>
                </div>
                <div className="setting-arrow">→</div>
              </button>
              
              <button className="setting-item">
                <div className="setting-icon-wrapper">
                  <Bell className="setting-icon" />
                </div>
                <div className="setting-content">
                  <h4>Notifications</h4>
                  <p>Manage your notification preferences</p>
                </div>
                <div className="setting-arrow">→</div>
              </button>
              
              <button className="setting-item">
                <div className="setting-icon-wrapper">
                  <Eye className="setting-icon" />
                </div>
                <div className="setting-content">
                  <h4>Privacy & Security</h4>
                  <p>Control your privacy settings</p>
                </div>
                <div className="setting-arrow">→</div>
              </button>
              
              <button 
                className="setting-item logout-item"
                onClick={logout}
              >
                <div className="setting-icon-wrapper logout-icon">
                  <Globe className="setting-icon" />
                </div>
                <div className="setting-content">
                  <h4>Sign Out</h4>
                  <p>Sign out of your account</p>
                </div>
                <div className="setting-arrow">→</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title-section">
                <Lock className="modal-icon" />
                <h3 className="modal-title">Change Password</h3>
              </div>
              <button onClick={closePasswordModal} className="modal-close">
                <X className="close-icon" />
              </button>
            </div>

            {passwordError && (
              <div className="modal-error">
                <span className="error-icon">⚠️</span>
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="modal-success">
                <span className="success-icon">✅</span>
                {passwordSuccess}
              </div>
            )}

            <div className="modal-fields">
              <div className="password-field">
                <label className="password-label">Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="password-input"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="password-toggle"
                  >
                    {showPasswords.current ? <EyeOff className="eye-icon" /> : <Eye className="eye-icon" />}
                  </button>
                </div>
              </div>

              <div className="password-field">
                <label className="password-label">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="password-input"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="password-toggle"
                  >
                    {showPasswords.new ? <EyeOff className="eye-icon" /> : <Eye className="eye-icon" />}
                  </button>
                </div>
              </div>

              <div className="password-field">
                <label className="password-label">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="password-input"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="password-toggle"
                  >
                    {showPasswords.confirm ? <EyeOff className="eye-icon" /> : <Eye className="eye-icon" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={handlePasswordUpdate}
                disabled={passwordLoading}
                className="btn-update-password"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
              <button
                onClick={closePasswordModal}
                disabled={passwordLoading}
                className="btn-cancel-modal"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;