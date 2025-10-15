// models/User.js
// User Model with Authentication Logic

class User {
    constructor(firebaseConfig) {
        this.firebaseConfig = firebaseConfig;
        this.currentUser = null;
        this.isGuestMode = false;
    }

    /**
     * Login user with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<firebase.User>} - Authenticated user
     */
    async login(email, password) {
        if (!this.firebaseConfig.isInitialized()) {
            throw new Error('Firebase is not available. Please use Guest mode.');
        }

        if (!email || !password) {
            throw new Error('Please fill in all fields');
        }

        const auth = this.firebaseConfig.getAuth();
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        this.currentUser = userCredential.user;
        this.isGuestMode = false;
        
        return this.currentUser;
    }

    /**
     * Register new user
     * @param {Object} userData - User registration data
     * @returns {Promise<firebase.User>} - Created user
     */
    async register(userData) {
        const { name, email, password, confirmPassword } = userData;
        
        if (!this.firebaseConfig.isInitialized()) {
            throw new Error('Firebase is not available. Please use Guest mode.');
        }

        // Validation
        const errors = [];
        if (!name) errors.push('Full name is required');
        if (!email) errors.push('Email is required');
        if (!password) errors.push('Password is required');
        if (password.length < 6) errors.push('Password must be at least 6 characters');
        if (password !== confirmPassword) errors.push('Passwords do not match');

        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const auth = this.firebaseConfig.getAuth();
        const db = this.firebaseConfig.getDatabase();
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });

        // Initialize user document in Firestore
        const docRef = db.collection('workLogs').doc(userCredential.user.uid);
        await docRef.set({
            entries: {},
            projects: [],
            userInfo: {
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.currentUser = userCredential.user;
        this.isGuestMode = false;
        
        return this.currentUser;
    }

    /**
     * Logout current user
     */
    async logout() {
        if (this.currentUser && this.firebaseConfig.isInitialized()) {
            const auth = this.firebaseConfig.getAuth();
            await auth.signOut();
        }
        
        this.currentUser = null;
        this.isGuestMode = false;
    }

    /**
     * Continue as guest user
     * @returns {boolean} - Success status
     */
    continueAsGuest() {
        this.isGuestMode = true;
        this.currentUser = null;
        return true;
    }

    /**
     * Get current authenticated user
     * @returns {firebase.User|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is in guest mode
     * @returns {boolean}
     */
    isGuest() {
        return this.isGuestMode;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Get user display name
     * @returns {string}
     */
    getUserDisplayName() {
        if (this.currentUser) {
            return this.currentUser.displayName || this.currentUser.email;
        }
        return 'Guest';
    }

    /**
     * Get user email
     * @returns {string|null}
     */
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    /**
     * Get user ID
     * @returns {string|null}
     */
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    /**
     * Set up authentication state change listener
     * @param {Function} callback - Callback function
     * @returns {Function|null} - Unsubscribe function
     */
    onAuthStateChanged(callback) {
        if (this.firebaseConfig.isInitialized()) {
            const auth = this.firebaseConfig.getAuth();
            return auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (!user) {
                    this.isGuestMode = false;
                }
                callback(user);
            });
        }
        return null;
    }

    /**
     * Get human-readable error message from Firebase error code
     * @param {string} errorCode - Firebase error code
     * @returns {string} - Human-readable error message
     */
    getAuthErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email address';
            case 'auth/wrong-password':
                return 'Invalid password';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later';
            case 'auth/user-disabled':
                return 'This account has been disabled';
            case 'auth/operation-not-allowed':
                return 'Operation not allowed. Please contact support';
            default:
                return 'An error occurred. Please try again';
        }
    }

    /**
     * Get user profile information
     * @returns {Object} - User profile data
     */
    getUserProfile() {
        if (!this.currentUser) {
            return {
                isAuthenticated: false,
                isGuest: this.isGuestMode,
                displayName: 'Guest',
                email: null,
                uid: null
            };
        }

        return {
            isAuthenticated: true,
            isGuest: false,
            displayName: this.currentUser.displayName,
            email: this.currentUser.email,
            uid: this.currentUser.uid,
            emailVerified: this.currentUser.emailVerified,
            photoURL: this.currentUser.photoURL,
            creationTime: this.currentUser.metadata?.creationTime,
            lastSignInTime: this.currentUser.metadata?.lastSignInTime
        };
    }
}

export default User;
