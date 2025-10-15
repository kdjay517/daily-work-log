// controllers/ToastController.js
// Toast Controller - Manages toast notifications and messages

class ToastController {
    constructor() {
        this.elements = {};
        this.toastQueue = [];
        this.currentToast = null;
        this.defaultDuration = 3000;
        this.isVisible = false;
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage'),
            toastIcon: document.getElementById('toastIcon'),
            toastClose: document.getElementById('toastClose'),
            toastContainer: document.getElementById('toastContainer')
        };

        // Create toast elements if they don't exist
        if (!this.elements.toast) {
            this.createToastElements();
        }
    }

    /**
     * Create toast elements if they don't exist in DOM
     */
    createToastElements() {
        // Create toast container if it doesn't exist
        if (!this.elements.toastContainer) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
            this.elements.toastContainer = container;
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast hidden';
        toast.style.cssText = `
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-base);
            box-shadow: var(--shadow-lg);
            padding: 12px 16px;
            margin-bottom: 8px;
            max-width: 400px;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        // Create toast icon
        const toastIcon = document.createElement('span');
        toastIcon.id = 'toastIcon';
        toastIcon.className = 'toast-icon';
        toastIcon.style.cssText = `
            font-size: 16px;
            flex-shrink: 0;
        `;

        // Create toast message
        const toastMessage = document.createElement('span');
        toastMessage.id = 'toastMessage';
        toastMessage.className = 'toast-message';
        toastMessage.style.cssText = `
            flex: 1;
            font-size: var(--font-size-sm);
            color: var(--color-text);
        `;

        // Create close button
        const toastClose = document.createElement('button');
        toastClose.id = 'toastClose';
        toastClose.className = 'toast-close';
        toastClose.innerHTML = '×';
        toastClose.style.cssText = `
            background: none;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
            flex-shrink: 0;
        `;

        // Assemble toast
        toast.appendChild(toastIcon);
        toast.appendChild(toastMessage);
        toast.appendChild(toastClose);
        
        this.elements.toastContainer.appendChild(toast);
        
        // Update element references
        this.elements.toast = toast;
        this.elements.toastMessage = toastMessage;
        this.elements.toastIcon = toastIcon;
        this.elements.toastClose = toastClose;
    }

    /**
     * Initialize toast controller
     */
    initialize() {
        this.setupEventListeners();
        console.log('ToastController: Initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button click
        if (this.elements.toastClose) {
            this.elements.toastClose.addEventListener('click', () => {
                this.hide();
            });
        }

        // Toast click to dismiss
        if (this.elements.toast) {
            this.elements.toast.addEventListener('click', () => {
                this.hide();
            });
        }

        // Listen for app toast events
        document.addEventListener('app:toast', (event) => {
            const { message, type = 'info', duration = this.defaultDuration } = event.detail;
            this.show(message, type, duration);
        });

        // Listen for keyboard events (ESC to close)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        console.log('ToastController: Event listeners set up');
    }

    /**
     * Show toast message
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Display duration in milliseconds
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        // Queue the toast if one is already visible
        if (this.isVisible) {
            this.toastQueue.push({ message, type, duration });
            return;
        }

        this.currentToast = { message, type, duration };
        this.displayToast();
    }

    /**
     * Display the current toast
     */
    displayToast() {
        if (!this.currentToast || !this.elements.toast) return;

        const { message, type, duration } = this.currentToast;

        // Set message content
        if (this.elements.toastMessage) {
            this.elements.toastMessage.textContent = message;
        }

        // Set icon and styling based on type
        this.setToastTypeStyles(type);

        // Show toast
        this.elements.toast.classList.remove('hidden');
        
        // Trigger animation
        setTimeout(() => {
            this.elements.toast.style.opacity = '1';
            this.elements.toast.style.transform = 'translateX(0)';
        }, 10);

        this.isVisible = true;

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    /**
     * Set toast styling based on type
     * @param {string} type - Toast type
     */
    setToastTypeStyles(type) {
        const typeConfig = {
            success: {
                icon: '✅',
                borderColor: 'var(--color-success)',
                backgroundColor: 'rgba(var(--color-success-rgb), 0.1)'
            },
            error: {
                icon: '❌',
                borderColor: 'var(--color-error)',
                backgroundColor: 'rgba(var(--color-error-rgb), 0.1)'
            },
            warning: {
                icon: '⚠️',
                borderColor: 'var(--color-warning)',
                backgroundColor: 'rgba(var(--color-warning-rgb), 0.1)'
            },
            info: {
                icon: 'ℹ️',
                borderColor: 'var(--color-info)',
                backgroundColor: 'rgba(var(--color-info-rgb), 0.1)'
            }
        };

        const config = typeConfig[type] || typeConfig.info;

        if (this.elements.toastIcon) {
            this.elements.toastIcon.textContent = config.icon;
        }

        if (this.elements.toast) {
            this.elements.toast.style.borderLeftColor = config.borderColor;
            this.elements.toast.style.borderLeftWidth = '4px';
            this.elements.toast.style.backgroundColor = config.backgroundColor;
        }
    }

    /**
     * Hide current toast
     */
    hide() {
        if (!this.isVisible || !this.elements.toast) return;

        // Animate out
        this.elements.toast.style.opacity = '0';
        this.elements.toast.style.transform = 'translateX(100%)';

        // Hide after animation
        setTimeout(() => {
            if (this.elements.toast) {
                this.elements.toast.classList.add('hidden');
            }
            this.isVisible = false;
            this.currentToast = null;

            // Process queue
            this.processQueue();
        }, 300);
    }

    /**
     * Process toast queue
     */
    processQueue() {
        if (this.toastQueue.length > 0) {
            const nextToast = this.toastQueue.shift();
            setTimeout(() => {
                this.show(nextToast.message, nextToast.type, nextToast.duration);
            }, 100);
        }
    }

    /**
     * Clear all queued toasts
     */
    clearQueue() {
        this.toastQueue = [];
    }

    /**
     * Show success toast
     * @param {string} message - Success message
     * @param {number} duration - Display duration
     */
    success(message, duration = this.defaultDuration) {
        this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message - Error message
     * @param {number} duration - Display duration (0 = permanent)
     */
    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     * @param {string} message - Warning message
     * @param {number} duration - Display duration
     */
    warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     * @param {string} message - Info message
     * @param {number} duration - Display duration
     */
    info(message, duration = this.defaultDuration) {
        this.show(message, 'info', duration);
    }

    /**
     * Show brief success message
     * @param {string} message - Brief success message
     */
    brief(message) {
        this.show(message, 'success', 2000);
    }

    /**
     * Show persistent toast (no auto-hide)
     * @param {string} message - Persistent message
     * @param {string} type - Toast type
     */
    persistent(message, type = 'info') {
        this.show(message, type, 0);
    }

    /**
     * Show loading toast
     * @param {string} message - Loading message
     * @returns {Function} - Function to hide the loading toast
     */
    loading(message = 'Loading...') {
        this.show(`⏳ ${message}`, 'info', 0);
        
        return () => {
            this.hide();
        };
    }

    /**
     * Show confirmation toast with action
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Confirmation callback
     * @param {string} confirmText - Confirm button text
     */
    confirm(message, onConfirm, confirmText = 'Confirm') {
        // For simple implementation, use browser confirm
        // In a more advanced version, this could create a custom toast with buttons
        if (confirm(message)) {
            onConfirm();
        }
    }

    /**
     * Show toast for authentication events
     * @param {string} eventType - Auth event type
     * @param {Object} details - Event details
     */
    authEvent(eventType, details = {}) {
        const messages = {
            login: '✅ Successfully logged in',
            logout: '👋 Logged out successfully',
            register: '🎉 Account created successfully',
            guest: '👤 Continuing in guest mode',
            error: '❌ Authentication error',
            expired: '⏰ Session expired - please login again'
        };

        const message = details.message || messages[eventType] || 'Authentication event';
        const type = eventType === 'error' || eventType === 'expired' ? 'error' : 'success';
        
        this.show(message, type);
    }

    /**
     * Show toast for data events
     * @param {string} eventType - Data event type
     * @param {Object} details - Event details
     */
    dataEvent(eventType, details = {}) {
        const messages = {
            saved: '💾 Data saved successfully',
            synced: '☁️ Data synced to cloud',
            loaded: '📊 Data loaded successfully',
            exported: '📁 Data exported successfully',
            imported: '📥 Data imported successfully',
            error: '❌ Data operation failed',
            offline: '📡 Working offline - data saved locally'
        };

        const message = details.message || messages[eventType] || 'Data event';
        const type = eventType === 'error' ? 'error' : 
                    eventType === 'offline' ? 'warning' : 'success';
        
        this.show(message, type);
    }

    /**
     * Show toast for project events
     * @param {string} eventType - Project event type
     * @param {Object} details - Event details
     */
    projectEvent(eventType, details = {}) {
        const messages = {
            added: '📋 Project added successfully',
            updated: '✏️ Project updated successfully',
            deleted: '🗑️ Project deleted successfully',
            activated: '▶️ Project activated',
            deactivated: '⏸️ Project deactivated',
            error: '❌ Project operation failed'
        };

        const message = details.message || messages[eventType] || 'Project event';
        const type = eventType === 'error' ? 'error' : 'success';
        
        this.show(message, type);
    }

    /**
     * Show toast for entry events
     * @param {string} eventType - Entry event type
     * @param {Object} details - Event details
     */
    entryEvent(eventType, details = {}) {
        const messages = {
            added: '✅ Entry added successfully',
            updated: '✏️ Entry updated successfully',
            deleted: '🗑️ Entry deleted successfully',
            error: '❌ Entry operation failed'
        };

        const message = details.message || messages[eventType] || 'Entry event';
        const type = eventType === 'error' ? 'error' : 'success';
        
        this.show(message, type);
    }

    /**
     * Get current toast status
     * @returns {Object} - Toast status
     */
    getStatus() {
        return {
            isVisible: this.isVisible,
            currentToast: this.currentToast,
            queueLength: this.toastQueue.length
        };
    }

    /**
     * Update default duration
     * @param {number} duration - New default duration
     */
    setDefaultDuration(duration) {
        this.defaultDuration = duration;
    }

    /**
     * Destroy toast controller and cleanup
     */
    destroy() {
        this.clearQueue();
        if (this.elements.toast) {
            this.elements.toast.remove();
        }
        if (this.elements.toastContainer && this.elements.toastContainer.children.length === 0) {
            this.elements.toastContainer.remove();
        }
        this.isVisible = false;
        this.currentToast = null;
    }

    /**
     * Show multiple toasts in sequence
     * @param {Array} toasts - Array of toast objects {message, type, duration}
     * @param {number} delay - Delay between toasts
     */
    showSequence(toasts, delay = 500) {
        toasts.forEach((toast, index) => {
            setTimeout(() => {
                this.show(toast.message, toast.type, toast.duration);
            }, index * delay);
        });
    }

    /**
     * Show toast with custom styling
     * @param {string} message - Message to display
     * @param {Object} style - Custom style object
     * @param {number} duration - Display duration
     */
    showCustom(message, style = {}, duration = this.defaultDuration) {
        this.show(message, 'info', duration);
        
        // Apply custom styles
        if (this.elements.toast) {
            Object.assign(this.elements.toast.style, style);
        }
    }
}

export default ToastController;
