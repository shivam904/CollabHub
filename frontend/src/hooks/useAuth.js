import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { userAPI } from '../services/api';
import { jwtDecode } from 'jwt-decode';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Always fetch a fresh token on login/state change
        const idToken = await user.getIdToken(true);
        setUser(user);
        setToken(idToken);
        console.log('[useAuth] Fetched fresh token:', idToken);
        // --- Token expiry proactive refresh ---
        if (idToken) {
          const decoded = jwtDecode(idToken);
          if (decoded.exp) {
            const expiryMs = decoded.exp * 1000 - Date.now();
            if (expiryMs > 0) {
              if (window.__tokenExpiryTimeout) clearTimeout(window.__tokenExpiryTimeout);
              // Set a timeout to refresh token 10 seconds before expiry
              window.__tokenExpiryTimeout = setTimeout(async () => {
                try {
                  const refreshedToken = await user.getIdToken(true);
                  setToken(refreshedToken);
                  console.log('[useAuth] Proactively refreshed token before expiry:', refreshedToken);
                } catch (err) {
                  console.error('[useAuth] Failed to proactively refresh token:', err);
                  signOut(auth);
                  setUser(null);
                  setToken(null);
                  setLoading(false);
                  alert('Session expired. Please log in again.');
                }
              }, expiryMs - 10000 > 0 ? expiryMs - 10000 : 1000); // 10s before expiry, or 1s if too close
            }
          }
        }
      } else {
        setUser(null);
        setToken(null);
        if (window.__tokenExpiryTimeout) clearTimeout(window.__tokenExpiryTimeout);
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      if (window.__tokenExpiryTimeout) clearTimeout(window.__tokenExpiryTimeout);
    };
  }, []);

  // Refresh token if user changes or after a period
  useEffect(() => {
    let isMounted = true;
    const refreshToken = async () => {
      if (user) {
        const idToken = await user.getIdToken(true);
        if (isMounted) setToken(idToken);
      }
    };
    if (user) {
      // Listen for token refresh
      const interval = setInterval(refreshToken, 10 * 60 * 1000); // every 10 minutes
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [user]);

  const signUp = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        createdAt: new Date(),
        projects: [],
        collaborators: []
      });
      
      // Create user in backend MongoDB
      try {
        await userAPI.createUser({
          uid: user.uid,
          email: user.email,
          displayName,
          profilePhoto: ''
        });
        console.log('User created in backend successfully');
      } catch (backendError) {
        console.error('Failed to create user in backend:', backendError);
        // Don't fail the signup if backend creation fails
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('🔐 Attempting sign in with:', { email, passwordLength: password?.length });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Sign in successful:', userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('❌ Sign in error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return { success: false, error: `${error.code}: ${error.message}` };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create user document in Firestore for new Google users
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profilePhoto: user.photoURL || '',
          createdAt: new Date(),
          projects: [],
          collaborators: []
        });
      }
      // Always try to create user in backend (idempotent)
      try {
        await userAPI.createUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profilePhoto: user.photoURL || ''
        });
        console.log('Google user created in backend successfully');
      } catch (backendError) {
        if (backendError.response && backendError.response.status === 409) {
          // User already exists, ignore
          console.log('Google user already exists in backend');
        } else {
          console.error('Failed to create Google user in backend:', backendError);
        }
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return { user, token, loading, signUp, signIn, signInWithGoogle, logout, resetPassword };
}; 