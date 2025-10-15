// main.js
// Main Application Entry Point - Object-Oriented Architecture

// Import all classes
import FirebaseConfig from './config/firebase.js';
import User from './models/User.js';
import WorkEntry from './models/WorkEntry.js';
import Project from './models/Project.js';
import DataService from './services/DataService.js';
import CalendarView from './views/CalendarView.js';
import AuthController from './controllers/AuthController.js';
import EntryController from './controllers/EntryController.js';
import ProjectController from './controllers/ProjectController.js';
import ToastController from './controllers/ToastController.js';

/**
 * Main Work Log Application Class
 * Orchestrates all components and manages application lifecycle
 */
class WorkLogApp {
    constructor() {
        // Core components
        this.firebaseConfig = null;
        this.user = null;
        this.dataService = null;
        
        // Controllers and Views
        this.authController = null;
        this.entryController = null;
        this.projectController = null;
        this.calendarView = null;
        this.toastController = null;
        
        // Application state
        this.isInitialized = false;
        this.isShuttingDown = false;
        this.version = '2.0.0';
        this.buildDate = new Date().toISOString();
        
        // Error tracking
        this.errorCount = 0;
        this.maxErrors = 10;
    }

    /**
     * Initialize the application
     * @returns {Promise<boolean>} - Success status
     */
    async initialize() {
        console.log(`🚀 Initializing Work Log Application v${this.version}...`);
        
        try {
            // Set up global error handling
            this.setupGlobalErrorHandling();
            
            // Show loading state
            this.showLoadingState();
            
            // Initialize core services
            await this.initializeCoreServices();
            
            // Initialize UI components
            this.initializeUIComponents();
            
            // Set up global references (for inline event handlers)
            this.setupGlobalReferences();
            
            // Set up inter-component communication
            this.setupEventListeners();
            
            // Initialize UI state
            await this.initializeUI();
            
            // Setup application features
            this.setupApplicationFeatures();
            
            // Hide loading state
            this.hideLoadingState();
            
            this.isInitialized = true;
            
            console.log(`✅ Work Log Application v${this.version} initialized successfully!`);
            
            // Dispatch ready event
            this.dispatchAppEvent('ready', {
                version: this.version,
                buildDate: this.buildDate,
                features: this.getEnabledFeatures()
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showInitializationError(error);
            return false;
        }
    }

    /**
     * Initialize core services (Firebase, User, DataService)
     */
    async initializeCoreServices() {
        console.log('📡 Initializing core services...');
        
        // Initialize Firebase
        this.firebaseConfig = new FirebaseConfig();
        const firebaseInitialized = this.firebaseConfig.initialize();
        
        if (firebaseInitialized) {
            console.log('✅ Firebase initialized');
        } else {
            console.warn('⚠️ Firebase initialization failed - running in offline mode');
        }
        
        // Initialize User model
        this.user = new User(this.firebaseConfig);
        console.log('✅ User service initialized');
        
        // Initialize Data Service
        this.dataService = new DataService(this.firebaseConfig, this.user);
        console.log('✅ Data service initialized');
    }

    /**
     * Initialize UI components (Views and Controllers)
     */
    initializeUIComponents() {
        console.log('🎨 Initializing UI components...');
        
        // Initialize Calendar View
        this.calendarView = new CalendarView(this.dataService);
        console.log('✅ Calendar view initialized');
        
        // Initialize Controllers
        this.toastController = new ToastController();
        console.log('✅ Toast controller initialized');
        
        this.authController = new AuthController(this.user);
        console.log('✅ Auth controller initialized');
        
        this.projectController = new ProjectController(this.dataService);
        console.log('✅ Project controller initialized');
        
        this.entryController = new EntryController(this.dataService, this.calendarView);
        console.log('✅ Entry controller initialized');
    }

    /**
     * Set up global references for inline event handlers
     */
    setupGlobalReferences() {
        // Make controllers available globally for inline event handlers
        window.entryController = this.entryController;
        window.projectController = this.projectController;
        window.authController = this.authController;
        window.app = this;
        
        // Make models available globally for validation and utilities
        window.WorkEntry = WorkEntry;
        window.Project = Project;
        window.User = User;
        
        console.log('🌐 Global references configured');
    }

    /**
     * Set up inter-component communication
     */
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Authentication events
        document.addEventListener('auth:authenticated', async (event) => {
            console.log('🔑 User authenticated, loading data...');
            try {
                await this.dataService.loadData();
                this.calendarView.refresh();
                this.entryController.updateProjectDropdown();
                this.showToast('✅ Data synced from cloud');
                
                // Track user login
                this.trackEvent('user_login', { method: 'firebase' });
                
            } catch (error) {
                console.error('Error loading user data:', error);
                this.showToast('⚠️ Error loading cloud data, using local data');
            }
        });

        document.addEventListener('auth:guest', async (event) => {
            console.log('👤 Guest mode activated, loading local data...');
            this.dataService.loadFromLocal();
            this.calendarView.refresh();
            this.entryController.updateProjectDropdown();
            
            // Track guest usage
            this.trackEvent('guest_mode_activated');
        });

        document.addEventListener('auth:logout', (event) => {
            console.log('👋 User logged out, clearing data...');
            this.dataService.clearData();
            this.calendarView.refresh();
            this.entryController.updateProjectDropdown();
            
            // Track logout
            this.trackEvent('user_logout');
        });

        // Project events
        document.addEventListener('projects:updated', (event) => {
            console.log('📋 Projects updated, refreshing dropdowns...');
            this.entryController.updateProjectDropdown();
        });

        // Calendar events
        document.addEventListener('calendar:dateSelected', (event) => {
            console.log('📅 Date selected:', event.detail.dateKey);
            this.trackEvent('date_selected', { date: event.detail.dateKey });
        });

        // Entry events
        document.addEventListener('entry:added', (event) => {
            this.trackEvent('entry_added', { type: event.detail.type });
        });

        document.addEventListener('entry:updated', (event) => {
            this.trackEvent('entry_updated', { type: event.detail.type });
        });

        document.addEventListener('entry:deleted', (event) => {
            this.trackEvent('entry_deleted', { type: event.detail.type });
        });

        // Export functionality
        this.setupExportEvents();
        
        // Application lifecycle events
        this.setupLifecycleEvents();
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
    }

    /**
     * Set up export functionality
     */
    setupExportEvents() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportMonthData();
                this.trackEvent('data_exported', { 
                    format: 'csv',
                    month: this.calendarView.getCurrentDate().getMonth(),
                    year: this.calendarView.getCurrentDate().getFullYear()
                });
            });
        }
    }

    /**
     * Set up application lifecycle events
     */
    setupLifecycleEvents() {
        // Before unload
        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
            this.trackEvent('app_unload');
        });

        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('app_hidden');
                this.pauseApplication();
            } else {
                this.trackEvent('app_visible');
                this.resumeApplication();
            }
        });

        // Online/offline events
        window.addEventListener('online', () => {
            this.showToast('🌐 Back online - attempting to sync data');
            this.handleOnlineStateChange(true);
        });

        window.addEventListener('offline', () => {
            this.showToast('📡 You are now offline - data will be saved locally');
            this.handleOnlineStateChange(false);
        });
    }

    /**
     * Set up performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.duration > 100) {
                            console.warn(`Long task detected: ${entry.duration}ms`);
                            this.trackEvent('performance_warning', {
                                type: 'long_task',
                                duration: entry.duration
                            });
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.warn('Performance monitoring not available:', error);
            }
        }

        // Monitor memory usage (if available)
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
                    console.warn('High memory usage detected');
                    this.trackEvent('performance_warning', {
                        type: 'high_memory',
                        usage: memory.usedJSHeapSize
                    });
                }
            }, 60000); // Check every minute
        }
    }

    /**
     * Initialize UI state
     */
    async initializeUI() {
        console.log('🎯 Initializing UI state...');
        
        // Initialize calendar view
        this.calendarView.initialize();
        
        // Load initial data if user is already authenticated
        if (this.user.isAuthenticated() && !this.user.isGuest()) {
            try {
                await this.dataService.loadData();
                this.calendarView.refresh();
                this.entryController.updateProjectDropdown();
                console.log('📊 Initial data loaded from cloud');
            } catch (error) {
                console.warn('Error loading initial data:', error);
                this.showToast('⚠️ Using local data - sync will retry when online');
            }
        } else if (this.user.isGuest()) {
            this.dataService.loadFromLocal();
            this.calendarView.refresh();
            this.entryController.updateProjectDropdown();
            console.log('💾 Initial data loaded from local storage');
        }
    }

    /**
     * Set up additional application features
     */
    setupApplicationFeatures() {
        console.log('🔧 Setting up application features...');
        
        // Set up auto-save
        this.setupAutoSave();
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Set up theme management
        this.setupThemeManagement();
        
        // Set up data validation
        this.setupDataValidation();
        
        // Set up backup system
        this.setupBackupSystem();
    }

    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        // Auto-save every 30 seconds if there are changes
        setInterval(async () => {
            if (this.hasUnsavedChanges()) {
                try {
                    await this.dataService.saveData();
                    console.log('💾 Auto-saved data');
                } catch (error) {
                    console.warn('Auto-save failed:', error);
                }
            }
        }, 30000);
    }

    /**
     * Set up global keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.forceSave();
            }
            
            // Ctrl/Cmd + Shift + E to export
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.exportMonthData();
            }
            
            // Ctrl/Cmd + Shift + D to toggle debug mode
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleDebugMode();
            }
            
            // Ctrl/Cmd + Shift + ? to show help
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '?') {
                e.preventDefault();
                this.showHelpDialog();
            }
        });
    }

    /**
     * Set up theme management
     */
    setupThemeManagement() {
        // Respect system theme preference
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
            console.log(`System theme changed to: ${e.matches ? 'dark' : 'light'}`);
            this.trackEvent('theme_changed', { theme: e.matches ? 'dark' : 'light', source: 'system' });
        });
    }

    /**
     * Set up data validation
     */
    setupDataValidation() {
        // Validate data integrity periodically
        setInterval(() => {
            this.validateDataIntegrity();
        }, 300000); // Every 5 minutes
    }

    /**
     * Set up backup system
     */
    setupBackupSystem() {
        // Create backup every hour
        setInterval(() => {
            this.createDataBackup();
        }, 3600000); // Every hour
    }

    /**
     * Export month data functionality
     */
    exportMonthData() {
        try {
            const currentDate = this.calendarView.getCurrentDate();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentDate);

            // Collect all entries for the current month
            const monthEntries = this.collectMonthEntries(year, month);

            if (monthEntries.length === 0) {
                this.showToast('📊 No data to export for this month');
                return false;
            }

            // Show export format dialog
            const exportFormat = confirm('Click OK for CSV format, Cancel for JSON format');

            if (exportFormat) {
                // Export as CSV
                this.exportToCSV(monthEntries, `work-log-${monthName}-${year}.csv`);
            } else {
                // Export as JSON
                const exportData = {
                    metadata: {
                        month: monthName,
                        year: year,
                        totalEntries: monthEntries.length,
                        exportDate: new Date().toISOString(),
                        version: this.version,
                        user: this.user.getUserDisplayName()
                    },
                    entries: monthEntries
                };
                this.downloadJSON(exportData, `work-log-${monthName}-${year}.json`);
            }

            this.showToast('📁 Monthly data exported successfully');
            return true;
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('❌ Export failed. Please try again.');
            return false;
        }
    }

    /**
     * Collect entries for a specific month
     * @param {number} year - Year
     * @param {number} month - Month (0-11)
     * @returns {Array} - Array of entries
     */
    collectMonthEntries(year, month) {
        const monthEntries = [];
        const workLogData = this.dataService.getWorkLogData();

        Object.keys(workLogData).forEach(dateKey => {
            const date = new Date(dateKey);
            if (date.getFullYear() === year && date.getMonth() === month) {
                workLogData[dateKey].forEach(entry => {
                    const workEntry = new WorkEntry(entry);
                    const project = this.projectController.findProjectByValue(entry.project);
                    
                    monthEntries.push({
                        date: dateKey,
                        dayOfWeek: new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' }),
                        type: workEntry.getTypeInfo().label,
                        project: project ? project.getDisplayName() : entry.project || 'N/A',
                        projectCategory: project ? project.category : 'N/A',
                        hours: workEntry.getHours(),
                        halfDayPeriod: entry.halfDayPeriod || 'N/A',
                        comments: entry.comments || 'N/A',
                        timestamp: entry.timestamp || 'N/A',
                        createdDate: new Date(entry.timestamp).toLocaleDateString()
                    });
                });
            }
        });

        // Sort by date
        return monthEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Export data to CSV format
     * @param {Array} data - Data to export
     * @param {string} filename - Output filename
     */
    exportToCSV(data, filename) {
        const headers = [
            'Date', 'Day of Week', 'Entry Type', 'Project', 'Project Category', 
            'Hours', 'Half Day Period', 'Comments', 'Created Date', 'Timestamp'
        ];
        
        const csvContent = [
            headers.join(','),
            ...data.map(entry => [
                entry.date,
                entry.dayOfWeek,
                entry.type,
                `"${entry.project.replace(/"/g, '""')}"`,
                entry.projectCategory,
                entry.hours,
                entry.halfDayPeriod,
                `"${entry.comments.replace(/"/g, '""')}"`,
                entry.createdDate,
                entry.timestamp
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    /**
     * Download JSON data
     * @param {Object} data - Data to download
     * @param {string} filename - Output filename
     */
    downloadJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    /**
     * Download file utility
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Application lifecycle methods

    /**
     * Handle online state change
     * @param {boolean} isOnline - Whether online
     */
    async handleOnlineStateChange(isOnline) {
        if (isOnline && this.user.isAuthenticated() && !this.user.isGuest()) {
            try {
                await this.dataService.saveData();
                this.showToast('☁️ Data synced successfully');
            } catch (error) {
                console.error('Sync failed after going online:', error);
                this.showToast('⚠️ Sync failed - will retry automatically');
            }
        }
    }

    /**
     * Pause application (when hidden)
     */
    pauseApplication() {
        // Reduce activity when app is hidden
        console.log('⏸️ Application paused');
    }

    /**
     * Resume application (when visible)
     */
    resumeApplication() {
        console.log('▶️ Application resumed');
        
        // Refresh data if needed
        if (this.user.isAuthenticated() && !this.user.isGuest()) {
            this.dataService.loadData().catch(error => {
                console.warn('Failed to refresh data on resume:', error);
            });
        }
    }

    /**
     * Force save data
     */
    async forceSave() {
        try {
            const result = await this.dataService.saveData();
            this.showToast(result.message || '💾 Data saved');
        } catch (error) {
            console.error('Force save failed:', error);
            this.showToast('❌ Save failed');
        }
    }

    /**
     * Check if there are unsaved changes
     * @returns {boolean} - Whether there are unsaved changes
     */
    hasUnsavedChanges() {
        // Simple heuristic - could be more sophisticated
        return Date.now() - (this.dataService.lastSyncTime?.getTime() || 0) > 300000; // 5 minutes
    }

    /**
     * Validate data integrity
     */
    validateDataIntegrity() {
        try {
            const workLogData = this.dataService.getWorkLogData();
            const projects = this.dataService.getProjects();
            
            // Basic validation checks
            let issues = 0;
            
            // Check for orphaned entries
            Object.values(workLogData).forEach(entries => {
                entries.forEach(entry => {
                    if (entry.project && !this.projectController.findProjectByValue(entry.project)) {
                        console.warn('Orphaned project reference:', entry.project);
                        issues++;
                    }
                });
            });
            
            // Check for duplicate projects
            const projectKeys = new Set();
            projects.forEach(project => {
                const key = `${project.projectId}-${project.subCode}`;
                if (projectKeys.has(key)) {
                    console.warn('Duplicate project found:', key);
                    issues++;
                } else {
                    projectKeys.add(key);
                }
            });
            
            if (issues > 0) {
                console.warn(`Data validation found ${issues} issues`);
                this.trackEvent('data_validation_issues', { count: issues });
            }
            
        } catch (error) {
            console.error('Data validation failed:', error);
        }
    }

    /**
     * Create data backup
     */
    createDataBackup() {
        try {
            const backupData = this.dataService.exportData();
            const backupKey = `backup_${new Date().toISOString().split('T')[0]}`;
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            
            // Keep only last 7 backups
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith('backup_'))
                .sort()
                .reverse();
                
            backupKeys.slice(7).forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('📦 Data backup created');
            
        } catch (error) {
            console.error('Backup creation failed:', error);
        }
    }

    /**
     * Set up global error handling
     */
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'global_error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'unhandled_rejection');
        });
    }

    /**
     * Handle application errors
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context = 'unknown') {
        this.errorCount++;
        
        console.error(`Application error (${context}):`, error);
        
        this.trackEvent('app_error', {
            context,
            message: error.message,
            stack: error.stack?.substring(0, 500),
            errorCount: this.errorCount
        });

        // Show user-friendly error message
        if (this.errorCount < this.maxErrors) {
            this.showToast('⚠️ An error occurred. The application will continue running.');
        } else {
            this.showToast('❌ Multiple errors detected. Consider refreshing the page.');
        }
    }

    /**
     * Toggle debug mode
     */
    toggleDebugMode() {
        const isDebug = document.body.classList.toggle('debug-mode');
        console.log(`Debug mode: ${isDebug ? 'enabled' : 'disabled'}`);
        this.showToast(`🐛 Debug mode ${isDebug ? 'enabled' : 'disabled'}`);
    }

    /**
     * Show help dialog
     */
    showHelpDialog() {
        const helpContent = `
        📊 Daily Work Log Tracker - Help
        
        🔑 Keyboard Shortcuts:
        • Ctrl/Cmd + S: Save data
        • Ctrl/Cmd + Shift + E: Export month data
        • Ctrl/Cmd + Shift + P: Manage projects
        • Ctrl/Cmd + Shift + D: Toggle debug mode
        • Escape: Close modals
        
        📅 Calendar Navigation:
        • Arrow keys: Navigate dates
        • Home: Go to first day of month
        • End: Go to last day of month
        • Page Up/Down: Navigate months
        
        📝 Quick Tips:
        • Data is auto-saved every 30 seconds
        • Use guest mode for temporary usage
        • Export your data regularly for backup
        `;
        
        alert(helpContent);
        this.trackEvent('help_viewed');
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const loadingEl = document.getElementById('loadingIndicator');
        if (loadingEl) {
            loadingEl.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loadingEl = document.getElementById('loadingIndicator');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }
    }

    /**
     * Show initialization error
     * @param {Error} error - Error object
     */
    showInitializationError(error) {
        console.error('Application initialization failed:', error);
        
        // Show error message in DOM
        const errorDiv = document.createElement('div');
        errorDiv.className = 'initialization-error';
        errorDiv.innerHTML = `
            <div style="padding: 2rem; max-width: 600px; margin: 2rem auto; background: var(--color-surface, #fff); border: 1px solid var(--color-error, #e53e3e); border-radius: 8px; text-align: center;">
                <h2 style="color: var(--color-error, #e53e3e); margin: 0 0 1rem 0;">⚠️ Application Error</h2>
                <p style="margin: 0 0 1rem 0;">Failed to initialize the Work Log Tracker. This might be due to:</p>
                <ul style="text-align: left; margin: 1rem 0; padding-left: 2rem;">
                    <li>Network connectivity issues</li>
                    <li>Browser compatibility problems</li>
                    <li>Local storage limitations</li>
                    <li>JavaScript execution errors</li>
                </ul>
                <p style="margin: 1rem 0;"><strong>Error:</strong> ${error.message}</p>
                <div style="margin-top: 1.5rem;">
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin-right: 0.5rem; background: var(--color-primary, #007acc); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🔄 Refresh Page
                    </button>
                    <button onclick="localStorage.clear(); location.reload()" style="padding: 0.5rem 1rem; background: var(--color-error, #e53e3e); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🗑️ Clear Data & Refresh
                    </button>
                </div>
                <p style="font-size: 0.875rem; color: var(--color-text-secondary, #666); margin-top: 1rem;">
                    If the problem persists, please check your browser's console for detailed error messages.
                </p>
            </div>
        `;
        
        document.body.innerHTML = '';
        document.body.appendChild(errorDiv);
        
        this.trackEvent('app_initialization_failed', {
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });
    }

    // Utility methods

    /**
     * Show toast message
     * @param {string} message - Message to show
     */
    showToast(message) {
        if (this.toastController) {
            this.toastController.show(message);
        } else {
            // Fallback if toast controller not initialized
            console.log('Toast:', message);
        }
    }

    /**
     * Dispatch application event
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     */
    dispatchAppEvent(eventName, data) {
        const event = new CustomEvent(`app:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Track application events (placeholder for analytics)
     * @param {string} eventName - Event name
     * @param {Object} properties - Event properties
     */
    trackEvent(eventName, properties = {}) {
        // This could be connected to analytics service
        console.log('📊 Event:', eventName, properties);
        
        // Store in local analytics if needed
        try {
            const analytics = JSON.parse(localStorage.getItem('app_analytics') || '[]');
            analytics.push({
                event: eventName,
                properties,
                timestamp: new Date().toISOString(),
                session: this.getSessionId()
            });
            
            // Keep only last 100 events
            if (analytics.length > 100) {
                analytics.splice(0, analytics.length - 100);
            }
            
            localStorage.setItem('app_analytics', JSON.stringify(analytics));
        } catch (error) {
            // Ignore analytics errors
        }
    }

    /**
     * Get session ID
     * @returns {string} - Session ID
     */
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.sessionId;
    }

    /**
     * Get enabled features list
     * @returns {Array} - List of enabled features
     */
    getEnabledFeatures() {
        return [
            'calendar_navigation',
            'work_entries',
            'project_management',
            'data_export',
            'cloud_sync',
            'guest_mode',
            'auto_save',
            'keyboard_shortcuts',
            'theme_support',
            'offline_mode'
        ];
    }

    // Public API methods

    /**
     * Get application version
     * @returns {string} - Version string
     */
    getVersion() {
        return this.version;
    }

    /**
     * Get application status
     * @returns {Object} - Application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            version: this.version,
            buildDate: this.buildDate,
            user: this.user?.getUserProfile(),
            dataService: this.dataService?.getSyncStatus(),
            errorCount: this.errorCount,
            features: this.getEnabledFeatures()
        };
    }

    /**
     * Get user instance
     * @returns {User} - User instance
     */
    getUser() {
        return this.user;
    }

    /**
     * Get data service instance
     * @returns {DataService} - DataService instance
     */
    getDataService() {
        return this.dataService;
    }

    /**
     * Get calendar view instance
     * @returns {CalendarView} - CalendarView instance
     */
    getCalendarView() {
        return this.calendarView;
    }

    /**
     * Check if application is ready
     * @returns {boolean} - Ready state
     */
    isReady() {
        return this.isInitialized && !this.isShuttingDown;
    }

    /**
     * Shutdown application
     */
    async shutdown() {
        if (this.isShuttingDown) return;
        
        console.log('🛑 Shutting down application...');
        this.isShuttingDown = true;
        
        try {
            // Save data before shutdown
            if (this.dataService) {
                await this.dataService.saveData();
            }
            
            // Cleanup resources
            if (this.calendarView) this.calendarView.destroy();
            if (this.authController) this.authController.destroy();
            if (this.entryController) this.entryController.destroy();
            if (this.projectController) this.projectController.destroy();
            if (this.toastController) this.toastController.destroy();
            
            // Clear global references
            delete window.entryController;
            delete window.projectController;
            delete window.authController;
            delete window.app;
            
            this.trackEvent('app_shutdown');
            console.log('✅ Application shutdown complete');
            
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 DOM loaded, starting Work Log Application...');
    
    const app = new WorkLogApp();
    const success = await app.initialize();
    
    if (success) {
        // Make app instance available globally for debugging
        window.workLogApp = app;
        
        // Log successful initialization
        console.log(`🎉 Work Log Application v${app.getVersion()} is ready!`);
        
        // Show welcome message
        setTimeout(() => {
            app.showToast(`🎉 Welcome to Work Log Tracker v${app.getVersion()}!`);
        }, 1000);
    }
});

export default WorkLogApp;
