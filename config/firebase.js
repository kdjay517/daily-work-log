// config/firebase.js
// Firebase Configuration and Initialization Class

class FirebaseConfig {
    constructor() {
        this.config = {
            apiKey: "AIzaSyD0fCY4dwc0igmcTYJOU2rRGQ0ERSVz2l4",
            authDomain: "daily-work-log-tracker.firebaseapp.com",
            projectId: "daily-work-log-tracker",
            storageBucket: "daily-work-log-tracker.firebasestorage.app",
            messagingSenderId: "891051391167",
            appId: "1:891051391167:web:1050e984fa86b4d070ee0a",
            measurementId: "G-3X0E8CJX59"
        };
        
        this.auth = null;
        this.db = null;
        this.initialized = false;
    }

    /**
     * Initialize Firebase with the configuration
     * @returns {boolean} - Success status
     */
    initialize() {
        try {
            firebase.initializeApp(this.config);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.initialized = true;
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.warn('Firebase initialization failed:', error);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Get Firebase Auth instance
     * @returns {firebase.auth.Auth|null}
     */
    getAuth() {
        return this.auth;
    }

    /**
     * Get Firestore Database instance
     * @returns {firebase.firestore.Firestore|null}
     */
    getDatabase() {
        return this.db;
    }

    /**
     * Check if Firebase is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get Firebase configuration
     * @returns {Object}
     */
    getConfig() {
        return { ...this.config };
    }
}

export default FirebaseConfig;
