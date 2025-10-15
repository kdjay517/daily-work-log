// controllers/ToastController.js
// Toast Notification Controller - Handles toast notifications

class ToastController {
    constructor() {
        this.elements = {};
        this.toastQueue = [];
        this.currentToast = null;
        this.toastTimeout = null;
        this.defaultDuration = 3000;
        this.maxToasts = 5;
        
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
            toastClose: document.getElementById('toastClose')
        };
    }

    /**
     * Initialize toast controller
     */
    initialize() {
        this.setupEventListeners();
        this.createToastElements();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for toast events from other components
        document.addEventListener('app:toast', (event) => {
            this.handleToastEvent(event.detail);
        });

        // Close button click
        if (this.elements.toastClose) {
            this.elements.toastClose.addEventListener('click', () => {
                this.hide();
            });
        }

        // Click toast to dismiss
        if (this.elements.toast) {
            this.elements.toast.addEventListener('click', () => {
                this.hide();
            });
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
            }
        });

        // Pause on hover
        if (this.elements.toast) {
            this.elements.toast.addEventListener('mouseenter', () => {
                this.pauseTimeout();
            });

            this.elements.toast.addEventListener('mouseleave', () => {
                this.resumeTimeout();
            });
        }
    }

    /**
     * Create toast elements if they don't exist
     */
    createToastElements() {
        if (this.elements.toast) return;

        // Create toast container
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast';
        toastContainer.className = 'toast hidden';
        toastContainer.setAttribute('role', 'alert');
        toastContainer.setAttribute('aria-live', 'polite');

        // Create toast content
        const toastContent = document.createElement('div');
        toastContent.className = 'toast-content';

        // Create icon
        const toastIcon = document.createElement('span');
        toastIcon.id = 'toastIcon';
        toastIcon.className = 'toast-icon';
        toastIcon.setAttribute('aria-hidden', 'true');

        // Create message
        const toastMessage = document.createElement('span');
        toastMessage.id = 'toastMessage';
        toastMessage.className = 'toast-message';

        // Create close button
        const toastClose = document.createElement('button');
        toastClose.id = 'toastClose';
        toastClose.className = 'toast-close';
        toastClose.innerHTML = '×';
        toastClose.setAttribute('aria-label', 'Close notification');
        toastClose.type = 'button';

        // Assemble toast
        toastContent.appendChild(toastIcon);
        toastContent.appendChild(toastMessage);
        toastContent.appendChild(toastClose);
        toastContainer.appendChild(toastContent);

        // Add to body
        document.body.appendChild(toastContainer);

        // Update cached elements
        this.cacheElements();

        // Re-setup event listeners for new elements
        this.setupEventListeners();
    }

    /**
     * Handle toast event from other components
     * @param {Object} detail - Event detail
     */
    handleToastEvent(detail) {
        if (typeof detail === 'string') {
            this.show(detail);
        } else if (detail && detail.message) {
            this.show(detail.message, detail.type, detail.duration);
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        if (!message) return;

        // Create toast data
        const toastData = {
            message,
            type: this.normalizeType(type),
            duration,
            timestamp: Date.now(),
            id: this.generateId()
        };

        // Add to queue if toast is currently showing
        if (this.isVisible()) {
            this.addToQueue(toastData);
            return;
        }

        // Show toast immediately
        this.displayToast(toastData);
    }

    /**
     * Display toast notification
     * @param {Object} toastData - Toast data object
     */
    displayToast(toastData) {
        if (!this.elements.toast || !this.elements.toastMessage) {
            console.warn('Toast elements not found');
            return;
        }

        this.currentToast = toastData;

        // Set message
        this.elements.toastMessage.textContent = toastData.message;

        // Set icon based on type
        this.setToastIcon(toastData.type);

        // Set toast class for styling
        this.setToastClass(toastData.type);

        // Show toast with animation
        this.elements.toast.classList.remove('hidden');
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.elements.toast.classList.add('show');
        });

        // Set up auto-hide timeout
        this.setAutoHideTimeout(toastData.duration);

        // Update accessibility
        this.updateAccessibility(toastData);

        // Dispatch shown event
        this.dispatchToastEvent('shown', toastData);
    }

    /**
     * Hide toast notification
     */
    hide() {
        if (!this.elements.toast || !this.isVisible()) {
            return;
        }

        // Clear timeout
        this.clearTimeout();

        // Hide with animation
        this.elements.toast.classList.remove('show');

        // Wait for animation to complete
        setTimeout(() => {
            this.elements.toast.classList.add('hidden');
            this.resetToastState();
            
            // Dispatch hidden event
            this.dispatchToastEvent('hidden', this.currentToast);
            
            this.currentToast = null;
            
            // Show next toast in queue
            this.showNextToast();
        }, 300);
    }

    /**
     * Add toast to queue
     * @param {Object} toastData - Toast data
     */
    addToQueue(toastData) {
        // Limit queue size
        if (this.toastQueue.length >= this.maxToasts) {
            this.toastQueue.shift(); // Remove oldest
        }
        
        this.toastQueue.push(toastData);
    }

    /**
     * Show next toast from queue
     */
    showNextToast() {
        if (this.toastQueue.length > 0) {
            const nextToast = this.toastQueue.shift();
            setTimeout(() => {
                this.displayToast(nextToast);
            }, 100);
        }
    }

    /**
     * Set toast icon based on type
     * @param {string} type - Toast type
     */
    setToastIcon(type) {
        if (!this.elements.toastIcon) return;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        this.elements.toastIcon.textContent = icons[type] || icons.info;
    }

    /**
     * Set toast CSS class based on type
     * @param {string} type - Toast type
     */
    setToastClass(type) {
        if (!this.elements.toast) return;

        // Remove all type classes
        this.elements.toast.classList.remove('toast--success', 'toast--error', 'toast--warning', 'toast--info');
        
        // Add current type class
        this.elements.toast.classList.add(`toast--${type}`);
    }

    /**
     * Set auto-hide timeout
     * @param {number} duration - Duration in milliseconds
     */
    setAutoHideTimeout(duration) {
        this.clearTimeout();
        
        if (duration > 0) {
            this.toastTimeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    /**
     * Pause timeout (on hover)
     */
    pauseTimeout() {
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
    }

    /**
     * Resume timeout (on mouse leave)
     */
    resumeTimeout() {
        if (this.currentToast && this.currentToast.duration > 0) {
            const elapsed = Date.now() - this.currentToast.timestamp;
            const remaining = Math.max(0, this.currentToast.duration - elapsed);
            
            if (remaining > 0) {
                this.setAutoHideTimeout(remaining);
            } else {
                this.hide();
            }
        }
    }

    /**
     * Clear timeout
     */
    clearTimeout() {
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
    }

    /**
     * Reset toast state
     */
    resetToastState() {
        if (this.elements.toast) {
            this.elements.toast.classList.remove('toast--success', 'toast--error', 'toast--warning', 'toast--info');
        }
        
        if (this.elements.toastMessage) {
            this.elements.toastMessage.textContent = '';
        }
        
        if (this.elements.toastIcon) {
            this.elements.toastIcon.textContent = '';
        }
    }

    /**
     * Update accessibility attributes
     * @param {Object} toastData - Toast data
     */
    updateAccessibility(toastData) {
        if (!this.elements.toast) return;

        // Set appropriate role and aria attributes
        const isError = toastData.type === 'error';
        this.elements.toast.setAttribute('role', isError ? 'alert' : 'status');
        this.elements.toast.setAttribute('aria-live', isError ? 'assertive' : 'polite');
        this.elements.toast.setAttribute('aria-atomic', 'true');
    }

    /**
     * Normalize toast type
     * @param {string} type - Raw type
     * @returns {string} - Normalized type
     */
    normalizeType(type) {
        const validTypes = ['success', 'error', 'warning', 'info'];
        const normalized = type?.toLowerCase();
        
        if (validTypes.includes(normalized)) {
            return normalized;
        }

        // Map common variations
        const typeMap = {
            'ok': 'success',
            'good': 'success',
            'done': 'success',
            'fail': 'error',
            'bad': 'error',
            'danger': 'error',
            'warn': 'warning',
            'caution': 'warning',
            'information': 'info',
            'note': 'info'
        };

        return typeMap[normalized] || 'info';
    }

    /**
     * Generate unique ID
     * @returns {string} - Unique ID
     */
    generateId() {
        return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if toast is visible
     * @returns {boolean} - Visibility state
     */
    isVisible() {
        return this.elements.toast && !this.elements.toast.classList.contains('hidden');
    }

    /**
     * Dispatch toast event
     * @param {string} eventType - Event type
     * @param {Object} toastData - Toast data
     */
    dispatchToastEvent(eventType, toastData) {
        const event = new CustomEvent(`toast:${eventType}`, {
            detail: toastData,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Convenience methods

    /**
     * Show success toast
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     */
    success(message, duration) {
        this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds
     */
    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     * @param {string} message - Warning message
     * @param {number} duration - Duration in milliseconds
     */
    warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     * @param {string} message - Info message
     * @param {number} duration - Duration in milliseconds
     */
    info(message, duration) {
        this.show(message, 'info', duration);
    }

    /**
     * Clear all toasts including queue
     */
    clearAll() {
        this.toastQueue = [];
        this.hide();
    }

    /**
     * Get queue length
     * @returns {number} - Number of queued toasts
     */
    getQueueLength() {
        return this.toastQueue.length;
    }

    /**
     * Get current toast data
     * @returns {Object|null} - Current toast data
     */
    getCurrentToast() {
        return this.currentToast;
    }

    // Static convenience method

    /**
     * Show toast message (static method)
     * @param {string} message - Message to show
     * @param {string} type - Toast type
     * @param {number} duration - Duration in milliseconds
     */
    static showMessage(message, type = 'info', duration = 3000) {
        const event = new CustomEvent('app:toast', {
            detail: { message, type, duration }
        });
        document.dispatchEvent(event);
    }

    /**
     * Show success message (static method)
     * @param {string} message - Success message
     */
    static success(message) {
        ToastController.showMessage(message, 'success');
    }

    /**
     * Show error message (static method)
     * @param {string} message - Error message
     */
    static error(message) {
        ToastController.showMessage(message, 'error', 5000);
    }

    /**
     * Show warning message (static method)
     * @param {string} message - Warning message
     */
    static warning(message) {
        ToastController.showMessage(message, 'warning', 4000);
    }

    /**
     * Show info message (static method)
     * @param {string} message - Info message
     */
    static info(message) {
        ToastController.showMessage(message, 'info');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearAll();
        this.clearTimeout();
    }
}

export default ToastController;
