// main.js
// Enhanced Daily Work Log Tracker - Main Application Entry Point
// Fixed version with all missing dependencies resolved

// Import Firebase configuration
import { firebaseApp, auth, db, isInitialized as firebaseIsInitialized } from './config/firebase.js';

// Import Models
import User from './models/User.js';
import WorkEntry from './models/WorkEntry.js';
import Project from './models/Project.js';

// Import Services
import DataService from './services/DataService.js';
import ExportService from './services/ExportService.js';
import AnalyticsService from './services/AnalyticsService.js';

// Import Controllers
import AuthController from './controllers/AuthController.js';
import DashboardController from './controllers/DashboardController.js';
import EntryController from './controllers/EntryController.js';
import ProjectController from './controllers/ProjectController.js';
import ToastController from './controllers/ToastController.js';

// Import Views
import CalendarView from './views/CalendarView.js';

/**
 * Enhanced Daily Work Log Tracker Application
 * Professional-grade work logging with cloud sync and offline support
 */
class DailyWorkLogApp {
    constructor() {
        this.isInitialized = false;
        this.firebaseConfig = null;
        this.user = null;
        this.dataService = null;
        this.exportService = null;
        this.analyticsService = null;
        this.controllers = {};
        this.views = {};
        
        console.log('🚀 Daily Work Log Tracker - Initializing...');
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading state
            this.showLoadingState('Initializing application...');
            
            // Initialize Firebase configuration wrapper
            this.initFirebaseConfig();
            
            // Initialize core services
            await this.initCoreServices();
            
            // Initialize controllers and views
            await this.initUI();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Expose global references for HTML onclick handlers
            this.exposeGlobalReferences();
            
            // Complete initialization
            this.isInitialized = true;
            this.hideLoadingState();
            
            console.log('✅ Daily Work Log Tracker - Initialized successfully');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize Firebase configuration wrapper
     */
    initFirebaseConfig() {
        this.firebaseConfig = {
            getApp: () => firebaseApp,
            getAuth: () => auth,
            getDatabase: () => db,
            isInitialized: () => firebaseIsInitialized()
        };
        
        console.log('🔥 Firebase configuration initialized');
    }

    /**
     * Initialize core services
     */
    async initCoreServices() {
        // Initialize User service
        this.user = new User(this.firebaseConfig);
        console.log('👤 User service initialized');
        
        // Initialize DataService
        this.dataService = new DataService(this.firebaseConfig, this.user);
        console.log('💾 Data service initialized');
        
        // Initialize ExportService
        this.exportService = new ExportService(this.dataService);
        console.log('📁 Export service initialized');
        
        // Initialize AnalyticsService
        this.analyticsService = new AnalyticsService(this.dataService);
        console.log('📊 Analytics service initialized');
        
        // Load initial data
        await this.dataService.loadData();
        console.log('📋 Initial data loaded');
    }

    /**
     * Initialize UI controllers and views
     */
    async initUI() {
        // Initialize Toast Controller first (used by other controllers)
        this.controllers.toast = new ToastController();
        console.log('🍞 Toast controller initialized');
        
        // Initialize Calendar View
        this.views.calendar = new CalendarView(this.dataService);
        console.log('📅 Calendar view initialized');
        
        // Initialize Controllers
        this.controllers.auth = new AuthController(this.user, this.dataService);
        this.controllers.dashboard = new DashboardController(this.dataService, this.analyticsService);
        this.controllers.entry = new EntryController(this.dataService, this.views.calendar);
        this.controllers.project = new ProjectController(this.dataService);
        
        console.log('🎮 Controllers initialized');
        
        // Set up authentication flow
        this.setupAuthenticationFlow();
    }

    /**
     * Setup authentication flow
     */
    setupAuthenticationFlow() {
        // Listen for authentication state changes
        this.user.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('👤 User authenticated:', user.email);
                await this.handleUserAuthenticated(user);
            } else {
                console.log('👤 User not authenticated');
                this.handleUserNotAuthenticated();
            }
        });
    }

    /**
     * Handle user authentication
     * @param {Object} user - Authenticated user object
     */
    async handleUserAuthenticated(user) {
        try {
            // Load user-specific data
            await this.dataService.loadData();
            
            // Update all controllers
            this.controllers.dashboard.refresh();
            this.controllers.project.updateProjectDropdown();
            this.views.calendar.refresh();
            
            // Show main application
            this.showMainApplication();
            
            // Show welcome toast
            this.controllers.toast.authEvent('login', {
                message: `Welcome back, ${user.displayName || user.email}!`
            });
            
        } catch (error) {
            console.error('Error handling user authentication:', error);
            this.controllers.toast.error('Failed to load user data');
        }
    }

    /**
     * Handle user not authenticated
     */
    handleUserNotAuthenticated() {
        // Clear sensitive data
        this.dataService.clearData();
        
        // Show authentication screen
        this.showAuthenticationScreen();
        
        // Clear calendar selection
        this.views.calendar.selectedDate = null;
        this.views.calendar.refresh();
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Network status monitoring
        window.addEventListener('online', () => {
            this.controllers.toast.info('🌐 Back online - syncing data...');
            this.dataService.handleNetworkChange(true);
        });

        window.addEventListener('offline', () => {
            this.controllers.toast.warning('📡 Working offline - data will sync when reconnected');
            this.dataService.handleNetworkChange(false);
        });

        // Unload warning for unsaved changes
        window.addEventListener('beforeunload', (e) => {
            const syncStatus = this.dataService.getSyncStatus();
            if (syncStatus.pendingChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Quick save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.quickSave();
            }
            
            // Ctrl/Cmd + E: Quick export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.quickExport();
            }
        });

        // Custom application events
        document.addEventListener('app:refresh', () => {
            this.refreshAllComponents();
        });

        document.addEventListener('app:export', (e) => {
            this.handleExportRequest(e.detail);
        });

        console.log('🎯 Global event listeners setup complete');
    }

    /**
     * Expose global references for HTML onclick handlers
     */
    exposeGlobalReferences() {
        // Expose controllers globally
        window.authController = this.controllers.auth;
        window.dashboardController = this.controllers.dashboard;
        window.entryController = this.controllers.entry;
        window.projectController = this.controllers.project;
        window.toastController = this.controllers.toast;
        
        // Expose views globally
        window.calendarView = this.views.calendar;
        
        // Expose services globally
        window.dataService = this.dataService;
        window.exportService = this.exportService;
        window.analyticsService = this.analyticsService;
        
        // Expose main app
        window.dailyWorkLogApp = this;
        
        console.log('🌐 Global references exposed');
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoadingState(message = 'Loading...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
        
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Show authentication screen
     */
    showAuthenticationScreen() {
        const authContainer = document.getElementById('authContainer');
        const appContainer = document.getElementById('appContainer');
        
        if (authContainer) authContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
    }

    /**
     * Show main application
     */
    showMainApplication() {
        const authContainer = document.getElementById('authContainer');
        const appContainer = document.getElementById('appContainer');
        
        if (authContainer) authContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    }

    /**
     * Handle initialization error
     * @param {Error} error - Initialization error
     */
    handleInitializationError(error) {
        this.hideLoadingState();
        
        const errorMessage = `
            <div style="padding: 20px; text-align: center; color: var(--color-error);">
                <h2>🚨 Application Failed to Initialize</h2>
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Please refresh the page or contact support if the problem persists.</p>
                <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Reload Application
                </button>
            </div>
        `;
        
        document.body.innerHTML = errorMessage;
    }

    /**
     * Quick save functionality
     */
    async quickSave() {
        try {
            this.controllers.toast.loading('Saving...');
            const result = await this.dataService.saveData();
            
            if (result.success) {
                this.controllers.toast.brief('💾 Saved');
            } else {
                this.controllers.toast.warning(result.message);
            }
        } catch (error) {
            console.error('Quick save failed:', error);
            this.controllers.toast.error('Save failed');
        }
    }

    /**
     * Quick export functionality
     */
    async quickExport() {
        try {
            const result = await this.exportService.exportCurrentMonth('csv');
            this.controllers.toast.success(result.message);
        } catch (error) {
            console.error('Quick export failed:', error);
            this.controllers.toast.error('Export failed');
        }
    }

    /**
     * Refresh all components
     */
    refreshAllComponents() {
        console.log('🔄 Refreshing all components...');
        
        // Refresh controllers
        Object.values(this.controllers).forEach(controller => {
            if (controller.refresh) {
                controller.refresh();
            }
        });
        
        // Refresh views
        Object.values(this.views).forEach(view => {
            if (view.refresh) {
                view.refresh();
            }
        });
        
        this.controllers.toast.brief('🔄 Refreshed');
    }

    /**
     * Handle export request
     * @param {Object} exportOptions - Export options
     */
    async handleExportRequest(exportOptions) {
        try {
            const result = await this.exportService.export(
                exportOptions.format,
                exportOptions.options
            );
            
            this.controllers.toast.dataEvent('exported', {
                message: result.message
            });
            
        } catch (error) {
            console.error('Export request failed:', error);
            this.controllers.toast.error('Export failed: ' + error.message);
        }
    }

    /**
     * Get application status
     * @returns {Object} - Application status
     */
    getAppStatus() {
        return {
            initialized: this.isInitialized,
            firebase: this.firebaseConfig ? this.firebaseConfig.isInitialized() : false,
            user: this.user ? this.user.getUserProfile() : null,
            syncStatus: this.dataService ? this.dataService.getSyncStatus() : null,
            controllers: Object.keys(this.controllers),
            views: Object.keys(this.views)
        };
    }

    /**
     * Cleanup application
     */
    destroy() {
        console.log('🧹 Cleaning up application...');
        
        // Cleanup controllers
        Object.values(this.controllers).forEach(controller => {
            if (controller.destroy) {
                controller.destroy();
            }
        });
        
        // Cleanup views
        Object.values(this.views).forEach(view => {
            if (view.destroy) {
                view.destroy();
            }
        });
        
        // Clear global references
        delete window.authController;
        delete window.dashboardController;
        delete window.entryController;
        delete window.projectController;
        delete window.toastController;
        delete window.calendarView;
        delete window.dataService;
        delete window.exportService;
        delete window.analyticsService;
        delete window.dailyWorkLogApp;
        
        console.log('✅ Application cleanup complete');
    }

    /**
     * Restart application
     */
    async restart() {
        console.log('🔄 Restarting application...');
        this.destroy();
        await this.init();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM Content Loaded - Starting Daily Work Log Tracker');
    
    try {
        // Create and initialize application
        const app = new DailyWorkLogApp();
        await app.init();
        
        // Expose app globally for debugging
        window.dailyWorkLogApp = app;
        
        console.log('🎉 Daily Work Log Tracker ready!');
        console.log('📊 App Status:', app.getAppStatus());
        
    } catch (error) {
        console.error('💥 Failed to start Daily Work Log Tracker:', error);
    }
});

// Handle page visibility changes (for sync optimization)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.dailyWorkLogApp) {
        // Page became visible, refresh data if needed
        const syncStatus = window.dailyWorkLogApp.dataService?.getSyncStatus();
        if (syncStatus && syncStatus.pendingChanges) {
            window.dailyWorkLogApp.dataService.saveData();
        }
    }
});

export default DailyWorkLogApp;
