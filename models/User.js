// models/User.js
// User Model Class - Authentication and User Management

class User {
    constructor(firebaseConfig) {
        this.firebaseConfig = firebaseConfig;
        this.currentUser = null;
        this.isGuestUser = false;
        this.profile = {};
        this.onAuthStateChangedCallbacks = [];
    }

    /**
     * Set up authentication state listener
     * @param {Function} callback - Callback function when auth state changes
     */
    onAuthStateChanged(callback) {
        this.onAuthStateChangedCallbacks.push(callback);
        
        if (this.firebaseConfig && this.firebaseConfig.isInitialized()) {
            const auth = this.firebaseConfig.getAuth();
            if (auth) {
                auth.onAuthStateChanged(callback);
            }
        }
        
        // Call immediately with current state
        callback(this.currentUser);
    }

    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} - Login result
     */
    async login(email, password) {
        if (!this.firebaseConfig || !this.firebaseConfig.isInitialized()) {
            throw new Error('Firebase not initialized');
        }

        const auth = this.firebaseConfig.getAuth();
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        this.currentUser = userCredential.user;
        this.isGuestUser = false;
        
        await this.loadUserProfile();
        return userCredential;
    }

    /**
     * Register new user with email and password
     * @param {Object} userData - User registration data
     * @returns {Promise} - Registration result
     */
    async register(userData) {
        if (!this.firebaseConfig || !this.firebaseConfig.isInitialized()) {
            throw new Error('Firebase not initialized');
        }

        const auth = this.firebaseConfig.getAuth();
        const db = this.firebaseConfig.getDatabase();
        const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const user = userCredential.user;

        // Update user profile
        await updateProfile(user, {
            displayName: userData.name
        });

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            name: userData.name,
            email: userData.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        this.currentUser = user;
        this.isGuestUser = false;
        this.profile = {
            name: userData.name,
            email: userData.email
        };

        return userCredential;
    }

    /**
     * Continue as guest user
     */
    continueAsGuest() {
        this.isGuestUser = true;
        this.currentUser = {
            uid: `guest_${Date.now()}`,
            email: 'guest@local.com',
            displayName: 'Guest User'
        };
        this.profile = {
            name: 'Guest User',
            email: 'guest@local.com'
        };

        // Notify auth state change callbacks
        this.onAuthStateChangedCallbacks.forEach(callback => {
            callback(this.currentUser);
        });
    }

    /**
     * Logout current user
     * @returns {Promise} - Logout result
     */
    async logout() {
        if (this.isGuestUser) {
            this.currentUser = null;
            this.isGuestUser = false;
            this.profile = {};
            
            // Clear guest data from localStorage
            localStorage.removeItem('guestMode');
            return true;
        }

        if (this.firebaseConfig && this.firebaseConfig.isInitialized()) {
            const auth = this.firebaseConfig.getAuth();
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(auth);
        }

        this.currentUser = null;
        this.isGuestUser = false;
        this.profile = {};
        return true;
    }

    /**
     * Load user profile from Firestore
     */
    async loadUserProfile() {
        if (!this.currentUser || this.isGuestUser) return;

        try {
            const db = this.firebaseConfig.getDatabase();
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
            if (userDoc.exists()) {
                this.profile = userDoc.data();
            } else {
                this.profile = {
                    name: this.currentUser.displayName || 'User',
                    email: this.currentUser.email
                };
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.profile = {
                name: this.currentUser.displayName || 'User',
                email: this.currentUser.email
            };
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - Authentication status
     */
    isAuthenticated() {
        return !!this.currentUser && !this.isGuestUser;
    }

    /**
     * Check if user is in guest mode
     * @returns {boolean} - Guest mode status
     */
    isGuest() {
        return this.isGuestUser;
    }

    /**
     * Get current user object
     * @returns {Object|null} - Current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get user profile
     * @returns {Object} - User profile
     */
    getUserProfile() {
        return {
            ...this.profile,
            uid: this.currentUser?.uid,
            isGuest: this.isGuestUser,
            isAuthenticated: this.isAuthenticated()
        };
    }

    /**
     * Get user display name
     * @returns {string} - Display name
     */
    getUserDisplayName() {
        if (this.isGuestUser) return 'Guest User';
        return this.profile.name || this.currentUser?.displayName || this.currentUser?.email || 'User';
    }

    /**
     * Get user email
     * @returns {string} - User email
     */
    getUserEmail() {
        if (this.isGuestUser) return 'guest@local.com';
        return this.currentUser?.email || '';
    }

    /**
     * Get authentication error message
     * @param {string} errorCode - Firebase error code
     * @returns {string} - User-friendly error message
     */
    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Invalid password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/operation-not-allowed': 'This operation is not allowed.',
            'auth/invalid-credential': 'Invalid credentials provided.',
            'auth/user-token-expired': 'Your session has expired. Please login again.',
            'auth/requires-recent-login': 'Please login again to perform this action.'
        };

        return errorMessages[errorCode] || 'An error occurred during authentication.';
    }

    /**
     * Update user profile
     * @param {Object} profileData - Profile data to update
     * @returns {Promise} - Update result
     */
    async updateUserProfile(profileData) {
        if (!this.currentUser || this.isGuestUser) {
            throw new Error('User not authenticated');
        }

        try {
            const auth = this.firebaseConfig.getAuth();
            const db = this.firebaseConfig.getDatabase();
            const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Update Firebase Auth profile
            if (profileData.displayName) {
                await updateProfile(this.currentUser, {
                    displayName: profileData.displayName
                });
            }

            // Update Firestore document
            const updateData = {
                ...profileData,
                updatedAt: serverTimestamp()
            };
            
            await updateDoc(doc(db, 'users', this.currentUser.uid), updateData);
            
            // Update local profile
            this.profile = { ...this.profile, ...profileData };
            
            return true;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Get user ID
     * @returns {string|null} - User ID
     */
    getUserId() {
        return this.currentUser?.uid || null;
    }

    /**
     * Check if user has specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean} - Whether user has permission
     */
    hasPermission(permission) {
        // Basic permission system - can be extended
        if (this.isGuestUser) {
            const guestPermissions = ['read', 'create', 'update'];
            return guestPermissions.includes(permission);
        }
        
        // Authenticated users have all permissions by default
        return true;
    }

    /**
     * Reset password
     * @param {string} email - Email to send reset link to
     * @returns {Promise} - Reset result
     */
    async resetPassword(email) {
        if (!this.firebaseConfig || !this.firebaseConfig.isInitialized()) {
            throw new Error('Firebase not initialized');
        }

        const auth = this.firebaseConfig.getAuth();
        const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        await sendPasswordResetEmail(auth, email);
        return true;
    }

    /**
     * Delete user account
     * @returns {Promise} - Deletion result
     */
    async deleteAccount() {
        if (!this.currentUser || this.isGuestUser) {
            throw new Error('No authenticated user to delete');
        }

        try {
            const db = this.firebaseConfig.getDatabase();
            const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { deleteUser } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

            // Delete user document from Firestore
            await deleteDoc(doc(db, 'users', this.currentUser.uid));
            
            // Delete Firebase Auth user
            await deleteUser(this.currentUser);
            
            // Clear local state
            this.currentUser = null;
            this.isGuestUser = false;
            this.profile = {};
            
            return true;
        } catch (error) {
            console.error('Error deleting user account:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     * @returns {Object} - User statistics
     */
    getUserStats() {
        return {
            userId: this.getUserId(),
            email: this.getUserEmail(),
            displayName: this.getUserDisplayName(),
            isGuest: this.isGuestUser,
            isAuthenticated: this.isAuthenticated(),
            accountCreated: this.profile.createdAt,
            lastLogin: new Date().toISOString(),
            permissions: ['read', 'create', 'update', 'delete']
        };
    }
}

export default User;
