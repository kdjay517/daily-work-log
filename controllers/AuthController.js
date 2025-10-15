// controllers/AuthController.js
// Authentication Controller - Manages user authentication flow

class AuthController {
    constructor(user) {
        this.user = user;
        this.activeTab = 'login';
        this.elements = {};
        this.eventListeners = [];
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Main containers
            authScreen: document.getElementById('authScreen'),
            mainApp: document.getElementById('mainApp'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            
            // Auth tabs
            loginTab: document.getElementById('loginTab'),
            registerTab: document.getElementById('registerTab'),
            guestTab: document.getElementById('guestTab'),
            
            // Forms
            loginForm: document.getElementById('loginForm'),
            registerForm: document.getElementById('registerForm'),
            guestForm: document.getElementById('guestForm'),
            
            // Login form elements
            loginEmail: document.getElementById('loginEmail'),
            loginPassword: document.getElementById('loginPassword'),
            loginBtn: document.getElementById('loginBtn'),
            loginErrors: document.getElementById('loginErrors'),
            
            // Register form elements
            registerName: document.getElementById('registerName'),
            registerEmail: document.getElementById('registerEmail'),
            registerPassword: document.getElementById('registerPassword'),
            confirmPassword: document.getElementById('confirmPassword'),
            registerBtn: document.getElementById('registerBtn'),
            registerErrors: document.getElementById('registerErrors'),
            
            // Guest form elements
            continueGuestBtn: document.getElementById('continueGuestBtn'),
            
            // Main app elements
            userWelcome: document.getElementById('userWelcome'),
            userMode: document.getElementById('userMode'),
            logoutBtn: document.getElementById('logoutBtn')
        };
    }

    /**
     * Initialize authentication controller
     */
    initialize() {
        this.setupEventListeners();
        this.setupAuthStateListener();
        this.showAuthScreen();
        
        // Check for remembered credentials
        this.loadRememberedCredentials();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Tab switching
        this.addEventListenerWithCleanup(this.elements.loginTab, 'click', () => {
            this.showAuthTab('login');
        });

        this.addEventListenerWithCleanup(this.elements.registerTab, 'click', () => {
            this.showAuthTab('register');
        });

        this.addEventListenerWithCleanup(this.elements.guestTab, 'click', () => {
            this.showAuthTab('guest');
        });

        // Form submissions
        this.addEventListenerWithCleanup(this.elements.loginBtn, 'click', async () => {
            await this.handleLogin();
        });

        this.addEventListenerWithCleanup(this.elements.registerBtn, 'click', async () => {
            await this.handleRegister();
        });

        this.addEventListenerWithCleanup(this.elements.continueGuestBtn, 'click', () => {
            this.handleGuestMode();
        });

        this.addEventListenerWithCleanup(this.elements.logoutBtn, 'click', async () => {
            await this.handleLogout();
        });

        // Enter key handling for forms
        if (this.elements.loginPassword) {
            this.addEventListenerWithCleanup(this.elements.loginPassword, 'keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }

        if (this.elements.confirmPassword) {
            this.addEventListenerWithCleanup(this.elements.confirmPassword, 'keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleRegister();
                }
            });
        }

        // Form validation on input
        this.setupFormValidation();

        // Password visibility toggle
        this.setupPasswordToggles();
    }

    /**
     * Add event listener with cleanup tracking
     * @param {HTMLElement} element - Element to attach listener to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    addEventListenerWithCleanup(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.push({ element, event, handler });
        }
    }

    /**
     * Set up form validation
     */
    setupFormValidation() {
        // Email validation
        if (this.elements.loginEmail) {
            this.addEventListenerWithCleanup(this.elements.loginEmail, 'blur', () => {
                this.validateEmail(this.elements.loginEmail);
            });
        }

        if (this.elements.registerEmail) {
            this.addEventListenerWithCleanup(this.elements.registerEmail, 'blur', () => {
                this.validateEmail(this.elements.registerEmail);
            });
        }

        // Password validation
        if (this.elements.registerPassword) {
            this.addEventListenerWithCleanup(this.elements.registerPassword, 'input', () => {
                this.validatePassword(this.elements.registerPassword);
            });
        }

        // Confirm password validation
        if (this.elements.confirmPassword) {
            this.addEventListenerWithCleanup(this.elements.confirmPassword, 'input', () => {
                this.validateConfirmPassword();
            });
        }
    }

    /**
     * Set up password visibility toggles
     */
    setupPasswordToggles() {
        const passwordFields = [
            this.elements.loginPassword,
            this.elements.registerPassword,
            this.elements.confirmPassword
        ];

        passwordFields.forEach(field => {
            if (field) {
                // Create toggle button
                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'password-toggle';
                toggleBtn.innerHTML = '👁️';
                toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
                
                // Position toggle button
                const wrapper = document.createElement('div');
                wrapper.className = 'password-input-wrapper';
                field.parentNode.insertBefore(wrapper, field);
                wrapper.appendChild(field);
                wrapper.appendChild(toggleBtn);

                // Toggle functionality
                this.addEventListenerWithCleanup(toggleBtn, 'click', () => {
                    const isPassword = field.type === 'password';
                    field.type = isPassword ? 'text' : 'password';
                    toggleBtn.innerHTML = isPassword ? '🙈' : '👁️';
                    toggleBtn.setAttribute('aria-label', 
                        isPassword ? 'Hide password' : 'Show password'
                    );
                });
            }
        });
    }

    /**
     * Set up authentication state listener
     */
    setupAuthStateListener() {
        this.user.onAuthStateChanged(async (user) => {
            this.hideLoadingIndicator();
            
            if (user && !this.user.isGuest()) {
                this.showMainApp();
                this.dispatchAuthEvent('authenticated', user);
                this.saveCredentials(user.email);
            } else if (!this.user.isGuest()) {
                this.showAuthScreen();
                this.dispatchAuthEvent('unauthenticated', null);
            }
        });
    }

    /**
     * Show authentication tab
     * @param {string} tabName - Tab name ('login', 'register', 'guest')
     */
    showAuthTab(tabName) {
        this.activeTab = tabName;

        // Clear any existing errors
        this.hideAuthErrors('loginErrors');
        this.hideAuthErrors('registerErrors');

        // Update tab states
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Hide all forms
        const forms = [this.elements.loginForm, this.elements.registerForm, this.elements.guestForm];
        forms.forEach(form => {
            if (form) form.classList.add('hidden');
        });

        // Show active tab and form
        switch (tabName) {
            case 'login':
                if (this.elements.loginTab) this.elements.loginTab.classList.add('active');
                if (this.elements.loginForm) {
                    this.elements.loginForm.classList.remove('hidden');
                    // Focus email field
                    setTimeout(() => {
                        if (this.elements.loginEmail) this.elements.loginEmail.focus();
                    }, 100);
                }
                break;
            case 'register':
                if (this.elements.registerTab) this.elements.registerTab.classList.add('active');
                if (this.elements.registerForm) {
                    this.elements.registerForm.classList.remove('hidden');
                    // Focus name field
                    setTimeout(() => {
                        if (this.elements.registerName) this.elements.registerName.focus();
                    }, 100);
                }
                break;
            case 'guest':
                if (this.elements.guestTab) this.elements.guestTab.classList.add('active');
                if (this.elements.guestForm) {
                    this.elements.guestForm.classList.remove('hidden');
                    // Focus guest button
                    setTimeout(() => {
                        if (this.elements.continueGuestBtn) this.elements.continueGuestBtn.focus();
                    }, 100);
                }
                break;
        }
    }

    /**
     * Handle user login
     */
    async handleLogin() {
        const email = this.elements.loginEmail?.value.trim() || '';
        const password = this.elements.loginPassword?.value || '';

        // Validate inputs
        if (!this.validateLoginForm(email, password)) {
            return;
        }

        this.showLoadingIndicator();
        this.setButtonLoading(this.elements.loginBtn, true);

        try {
            await this.user.login(email, password);
            this.hideAuthErrors('loginErrors');
            this.showToast('✅ Login successful');
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = this.user.getAuthErrorMessage(error.code) || error.message;
            this.showAuthErrors('loginErrors', [errorMessage]);
            
            // Focus email field for retry
            if (this.elements.loginEmail) {
                this.elements.loginEmail.focus();
            }
        } finally {
            this.hideLoadingIndicator();
            this.setButtonLoading(this.elements.loginBtn, false);
        }
    }

    /**
     * Handle user registration
     */
    async handleRegister() {
        const userData = {
            name: this.elements.registerName?.value.trim() || '',
            email: this.elements.registerEmail?.value.trim() || '',
            password: this.elements.registerPassword?.value || '',
            confirmPassword: this.elements.confirmPassword?.value || ''
        };

        // Validate inputs
        if (!this.validateRegisterForm(userData)) {
            return;
        }

        this.showLoadingIndicator();
        this.setButtonLoading(this.elements.registerBtn, true);

        try {
            await this.user.register(userData);
            this.hideAuthErrors('registerErrors');
            this.showToast('✅ Account created successfully');
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = this.user.getAuthErrorMessage(error.code) || error.message;
            this.showAuthErrors('registerErrors', [errorMessage]);
        } finally {
            this.hideLoadingIndicator();
            this.setButtonLoading(this.elements.registerBtn, false);
        }
    }

    /**
     * Handle guest mode activation
     */
    handleGuestMode() {
        this.hideLoadingIndicator();
        
        this.user.continueAsGuest();
        this.showMainApp();
        this.showToast('👤 Continuing in guest mode - data will be stored locally only');
        this.dispatchAuthEvent('guest', null);
    }

    /**
     * Handle user logout
     */
    async handleLogout() {
        const confirmLogout = confirm('Are you sure you want to logout?');
        if (!confirmLogout) return;

        try {
            await this.user.logout();
            this.clearSavedCredentials();
            this.showAuthScreen();
            this.showToast('👋 Logged out successfully');
            this.dispatchAuthEvent('logout', null);
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('❌ Error during logout');
        }
    }

    /**
     * Show authentication screen
     */
    showAuthScreen() {
        this.hideLoadingIndicator();
        
        if (this.elements.authScreen) {
            this.elements.authScreen.classList.remove('hidden');
        }
        if (this.elements.mainApp) {
            this.elements.mainApp.classList.add('hidden');
        }
        
        // Show default tab
        this.showAuthTab('login');
    }

    /**
     * Show main application
     */
    showMainApp() {
        this.hideLoadingIndicator();
        
        if (this.elements.authScreen) {
            this.elements.authScreen.classList.add('hidden');
        }
        if (this.elements.mainApp) {
            this.elements.mainApp.classList.remove('hidden');
        }
        
        this.updateUserInfo();
    }

    /**
     * Update user information display
     */
    updateUserInfo() {
        if (this.elements.userWelcome) {
            const displayName = this.user.getUserDisplayName();
            const greeting = this.getTimeBasedGreeting();
            this.elements.userWelcome.textContent = `${greeting}, ${displayName}!`;
        }

        if (this.elements.userMode) {
            if (this.user.isAuthenticated()) {
                this.elements.userMode.textContent = '☁️ Cloud Sync Enabled';
                this.elements.userMode.className = 'status status--success';
            } else {
                this.elements.userMode.textContent = '💾 Local Storage Only';
                this.elements.userMode.className = 'status status--warning';
            }
        }
    }

    /**
     * Get time-based greeting
     * @returns {string} - Greeting message
     */
    getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }

    // Form validation methods

    /**
     * Validate login form
     * @param {string} email - Email address
     * @param {string} password - Password
     * @returns {boolean} - Validation result
     */
    validateLoginForm(email, password) {
        const errors = [];

        if (!email) errors.push('Email is required');
        else if (!this.isValidEmail(email)) errors.push('Please enter a valid email address');

        if (!password) errors.push('Password is required');

        if (errors.length > 0) {
            this.showAuthErrors('loginErrors', errors);
            return false;
        }

        return true;
    }

    /**
     * Validate registration form
     * @param {Object} userData - User data
     * @returns {boolean} - Validation result
     */
    validateRegisterForm(userData) {
        const { name, email, password, confirmPassword } = userData;
        const errors = [];

        if (!name) errors.push('Full name is required');
        else if (name.length < 2) errors.push('Name must be at least 2 characters');

        if (!email) errors.push('Email is required');
        else if (!this.isValidEmail(email)) errors.push('Please enter a valid email address');

        if (!password) errors.push('Password is required');
        else if (password.length < 6) errors.push('Password must be at least 6 characters');

        if (!confirmPassword) errors.push('Please confirm your password');
        else if (password !== confirmPassword) errors.push('Passwords do not match');

        if (errors.length > 0) {
            this.showAuthErrors('registerErrors', errors);
            return false;
        }

        return true;
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} - Whether email is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate individual email field
     * @param {HTMLElement} emailField - Email input field
     */
    validateEmail(emailField) {
        const email = emailField.value.trim();
        const isValid = !email || this.isValidEmail(email);
        
        emailField.classList.toggle('invalid', !isValid);
        
        if (!isValid) {
            emailField.setCustomValidity('Please enter a valid email address');
        } else {
            emailField.setCustomValidity('');
        }
    }

    /**
     * Validate password field
     * @param {HTMLElement} passwordField - Password input field
     */
    validatePassword(passwordField) {
        const password = passwordField.value;
        const isValid = password.length >= 6;
        
        passwordField.classList.toggle('invalid', password.length > 0 && !isValid);
        
        if (password.length > 0 && !isValid) {
            passwordField.setCustomValidity('Password must be at least 6 characters');
        } else {
            passwordField.setCustomValidity('');
        }
    }

    /**
     * Validate confirm password field
     */
    validateConfirmPassword() {
        const password = this.elements.registerPassword?.value || '';
        const confirmPassword = this.elements.confirmPassword?.value || '';
        const isValid = !confirmPassword || password === confirmPassword;
        
        this.elements.confirmPassword.classList.toggle('invalid', !isValid);
        
        if (!isValid) {
            this.elements.confirmPassword.setCustomValidity('Passwords do not match');
        } else {
            this.elements.confirmPassword.setCustomValidity('');
        }
    }

    // UI helper methods

    /**
     * Show loading indicator
     */
    showLoadingIndicator() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.remove('hidden');
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Set button loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Loading state
     */
    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            button.setAttribute('data-original-text', button.textContent);
            button.textContent = 'Loading...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.textContent = originalText;
                button.removeAttribute('data-original-text');
            }
        }
    }

    /**
     * Show authentication errors
     * @param {string} elementId - Error element ID
     * @param {Array} errors - Array of error messages
     */
    showAuthErrors(elementId, errors) {
        const errorElement = this.elements[elementId];
        if (errorElement) {
            errorElement.innerHTML = errors.join('<br>');
            errorElement.classList.add('show');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                this.hideAuthErrors(elementId);
            }, 10000);
        }
    }

    /**
     * Hide authentication errors
     * @param {string} elementId - Error element ID
     */
    hideAuthErrors(elementId) {
        const errorElement = this.elements[elementId];
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    /**
     * Remember credentials in localStorage
     * @param {string} email - Email to remember
     */
    saveCredentials(email) {
        try {
            localStorage.setItem('rememberedEmail', email);
        } catch (error) {
            console.warn('Could not save credentials:', error);
        }
    }

    /**
     * Load remembered credentials
     */
    loadRememberedCredentials() {
        try {
            const rememberedEmail = localStorage.getItem('rememberedEmail');
            if (rememberedEmail && this.elements.loginEmail) {
                this.elements.loginEmail.value = rememberedEmail;
            }
        } catch (error) {
            console.warn('Could not load remembered credentials:', error);
        }
    }

    /**
     * Clear saved credentials
     */
    clearSavedCredentials() {
        try {
            localStorage.removeItem('rememberedEmail');
        } catch (error) {
            console.warn('Could not clear saved credentials:', error);
        }
    }

    /**
     * Dispatch authentication event
     * @param {string} type - Event type
     * @param {*} data - Event data
     */
    dispatchAuthEvent(type, data) {
        const event = new CustomEvent(`auth:${type}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Show toast message
     * @param {string} message - Message to show
     */
    showToast(message) {
        const event = new CustomEvent('app:toast', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    // Public API methods

    /**
     * Get current user
     * @returns {*} - Current user
     */
    getCurrentUser() {
        return this.user.getCurrentUser();
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - Authentication status
     */
    isAuthenticated() {
        return this.user.isAuthenticated();
    }

    /**
     * Check if user is in guest mode
     * @returns {boolean} - Guest mode status
     */
    isGuest() {
        return this.user.isGuest();
    }

    /**
     * Get user profile
     * @returns {Object} - User profile
     */
    getUserProfile() {
        return this.user.getUserProfile();
    }

    /**
     * Force logout (for admin purposes)
     */
    forceLogout() {
        this.handleLogout();
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

export default AuthController;
