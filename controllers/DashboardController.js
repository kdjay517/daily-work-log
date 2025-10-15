// controllers/DashboardController.js
// Dashboard Controller for Monthly Summary, Historical Data, and Export Options

class DashboardController {
    constructor(dataService, analyticsService, exportService) {
        this.dataService = dataService;
        this.analyticsService = analyticsService;
        this.exportService = exportService;
        this.elements = {};
        this.eventListeners = [];
        this.updateInterval = null;
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Monthly Summary
            daysWorked: document.getElementById('daysWorked'),
            totalHours: document.getElementById('totalHours'),
            avgHours: document.getElementById('avgHours'),
            totalEntries: document.getElementById('totalEntries'),
            uniqueProjects: document.getElementById('uniqueProjects'),
            monthProgress: document.getElementById('monthProgress'),

            // Historical Data
            historicalList: document.getElementById('historicalList'),

            // Export Options
            exportCurrentMonthBtn: document.getElementById('exportCurrentMonthBtn'),
            exportAllDataBtn: document.getElementById('exportAllDataBtn'),
            exportBackupBtn: document.getElementById('exportBackupBtn'),
            importBackupBtn: document.getElementById('importBackupBtn'),
            guestModeNotice: document.getElementById('guestModeNotice'),
            backupFileInput: document.getElementById('backupFileInput'),

            // Analytics Modal
            analyticsBtn: document.getElementById('analyticsBtn'),
            analyticsModal: document.getElementById('analyticsModal'),
            closeAnalyticsBtn: document.getElementById('closeAnalyticsBtn'),
            analyticsContent: document.getElementById('analyticsContent'),

            // Export Modal
            exportBtn: document.getElementById('exportBtn'),
            exportModal: document.getElementById('exportModal'),
            closeExportModalBtn: document.getElementById('closeExportModalBtn'),
            exportFormat: document.getElementById('exportFormat'),
            exportRange: document.getElementById('exportRange'),
            customDateRange: document.getElementById('customDateRange'),
            exportStartDate: document.getElementById('exportStartDate'),
            exportEndDate: document.getElementById('exportEndDate'),
            executeExportBtn: document.getElementById('executeExportBtn'),
            cancelExportBtn: document.getElementById('cancelExportBtn')
        };
    }

    /**
     * Initialize dashboard
     */
    initialize() {
        this.setupEventListeners();
        this.refreshDashboard();
        
        // Set up auto-refresh
        this.updateInterval = setInterval(() => {
            this.refreshDashboard();
        }, 300000); // Refresh every 5 minutes
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Export buttons
        if (this.elements.exportCurrentMonthBtn) {
            this.addEventListenerWithCleanup(this.elements.exportCurrentMonthBtn, 'click', () => {
                this.handleExportCurrentMonth();
            });
        }

        if (this.elements.exportAllDataBtn) {
            this.addEventListenerWithCleanup(this.elements.exportAllDataBtn, 'click', () => {
                this.handleExportAllData();
            });
        }

        if (this.elements.exportBackupBtn) {
            this.addEventListenerWithCleanup(this.elements.exportBackupBtn, 'click', () => {
                this.handleExportBackup();
            });
        }

        if (this.elements.importBackupBtn) {
            this.addEventListenerWithCleanup(this.elements.importBackupBtn, 'click', () => {
                this.handleImportBackup();
            });
        }

        // Backup file input
        if (this.elements.backupFileInput) {
            this.addEventListenerWithCleanup(this.elements.backupFileInput, 'change', (e) => {
                this.handleFileImport(e.target.files[0]);
            });
        }

        // Analytics modal
        if (this.elements.analyticsBtn) {
            this.addEventListenerWithCleanup(this.elements.analyticsBtn, 'click', () => {
                this.showAnalyticsModal();
            });
        }

        if (this.elements.closeAnalyticsBtn) {
            this.addEventListenerWithCleanup(this.elements.closeAnalyticsBtn, 'click', () => {
                this.hideAnalyticsModal();
            });
        }

        // Export modal
        if (this.elements.exportBtn) {
            this.addEventListenerWithCleanup(this.elements.exportBtn, 'click', () => {
                this.showExportModal();
            });
        }

        if (this.elements.closeExportModalBtn) {
            this.addEventListenerWithCleanup(this.elements.closeExportModalBtn, 'click', () => {
                this.hideExportModal();
            });
        }

        if (this.elements.exportRange) {
            this.addEventListenerWithCleanup(this.elements.exportRange, 'change', () => {
                this.handleExportRangeChange();
            });
        }

        if (this.elements.executeExportBtn) {
            this.addEventListenerWithCleanup(this.elements.executeExportBtn, 'click', () => {
                this.handleCustomExport();
            });
        }

        if (this.elements.cancelExportBtn) {
            this.addEventListenerWithCleanup(this.elements.cancelExportBtn, 'click', () => {
                this.hideExportModal();
            });
        }

        // Listen for data changes
        document.addEventListener('data:updated', () => {
            this.refreshDashboard();
        });

        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });

        // Close modals on overlay click
        [this.elements.analyticsModal, this.elements.exportModal].forEach(modal => {
            if (modal) {
                this.addEventListenerWithCleanup(modal, 'click', (e) => {
                    if (e.target === modal) {
                        this.hideAllModals();
                    }
                });
            }
        });
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListenerWithCleanup(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.push({ element, event, handler });
        }
    }

    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        try {
            await Promise.all([
                this.updateMonthlySummary(),
                this.updateHistoricalData()
            ]);
        } catch (error) {
            console.error('Dashboard refresh error:', error);
        }
    }

    /**
     * Update monthly summary section
     */
    async updateMonthlySummary() {
        try {
            const summary = this.analyticsService.calculateMonthlySummary();
            
            if (this.elements.daysWorked) {
                this.elements.daysWorked.textContent = summary.daysWorked;
            }
            
            if (this.elements.totalHours) {
                this.elements.totalHours.textContent = summary.totalHours.toFixed(2);
            }
            
            if (this.elements.avgHours) {
                this.elements.avgHours.textContent = summary.avgHours.toFixed(2);
            }
            
            if (this.elements.totalEntries) {
                this.elements.totalEntries.textContent = summary.totalEntries;
            }
            
            if (this.elements.uniqueProjects) {
                this.elements.uniqueProjects.textContent = summary.uniqueProjects;
            }
            
            if (this.elements.monthProgress) {
                this.elements.monthProgress.textContent = `${summary.monthProgress}%`;
            }
            
        } catch (error) {
            console.error('Monthly summary update error:', error);
            this.showErrorInSummary();
        }
    }

    /**
     * Update historical data section
     */
    async updateHistoricalData() {
        try {
            const historicalData = this.analyticsService.getHistoricalData();
            
            if (!this.elements.historicalList) return;
            
            if (historicalData.length === 0) {
                this.elements.historicalList.innerHTML = `
                    <div class="no-data-state">
                        <div class="no-data-icon">📊</div>
                        <div class="no-data-message">No historical data available</div>
                        <div class="no-data-hint">Start logging work entries to see historical trends</div>
                    </div>
                `;
                return;
            }
            
            const historicalHTML = historicalData.map(item => `
                <div class="historical-item">
                    <div class="historical-period">${item.period}</div>
                    <div class="historical-stats">
                        <div class="historical-stat">
                            <span>📅</span>
                            <span>${item.daysWorked} days</span>
                        </div>
                        <div class="historical-stat">
                            <span>⏰</span>
                            <span>${item.totalHours}h</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            this.elements.historicalList.innerHTML = historicalHTML;
            
        } catch (error) {
            console.error('Historical data update error:', error);
            if (this.elements.historicalList) {
                this.elements.historicalList.innerHTML = `
                    <div class="no-data-state">
                        <div class="no-data-icon">⚠️</div>
                        <div class="no-data-message">Error loading historical data</div>
                    </div>
                `;
            }
        }
    }

    /**
     * Handle export current month
     */
    async handleExportCurrentMonth() {
        try {
            this.showLoadingState('Exporting current month...');
            
            const result = await this.exportService.exportCurrentMonthCSV();
            
            this.showToast('✅ Export successful! ' + result.message);
            
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('❌ Export failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Handle export all data
     */
    async handleExportAllData() {
        try {
            this.showLoadingState('Exporting all data...');
            
            const result = await this.exportService.exportAllDataCSV();
            
            this.showToast('✅ Export successful! ' + result.message);
            
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('❌ Export failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Handle export backup
     */
    async handleExportBackup() {
        try {
            this.showLoadingState('Creating backup...');
            
            const result = await this.exportService.exportDataBackup();
            
            this.showToast('✅ Backup created! ' + result.message);
            
        } catch (error) {
            console.error('Backup error:', error);
            this.showToast('❌ Backup failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Handle import backup
     */
    handleImportBackup() {
        if (this.elements.backupFileInput) {
            this.elements.backupFileInput.click();
        }
    }

    /**
     * Handle file import
     */
    async handleFileImport(file) {
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            this.showToast('❌ Please select a valid JSON backup file');
            return;
        }
        
        try {
            this.showLoadingState('Importing backup...');
            
            const result = await this.exportService.importDataBackup(file);
            
            this.showToast('✅ Import successful! ' + result.message);
            
            // Refresh dashboard and trigger app refresh
            this.refreshDashboard();
            document.dispatchEvent(new CustomEvent('data:imported', { detail: result }));
            
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('❌ Import failed: ' + error.message);
        } finally {
            this.hideLoadingState();
            // Clear the file input
            if (this.elements.backupFileInput) {
                this.elements.backupFileInput.value = '';
            }
        }
    }

    /**
     * Show analytics modal
     */
    showAnalyticsModal() {
        if (this.elements.analyticsModal) {
            this.elements.analyticsModal.classList.remove('hidden');
            this.loadAnalyticsContent();
        }
    }

    /**
     * Hide analytics modal
     */
    hideAnalyticsModal() {
        if (this.elements.analyticsModal) {
            this.elements.analyticsModal.classList.add('hidden');
        }
    }

    /**
     * Show export modal
     */
    showExportModal() {
        if (this.elements.exportModal) {
            this.elements.exportModal.classList.remove('hidden');
            this.initializeExportModal();
        }
    }

    /**
     * Hide export modal
     */
    hideExportModal() {
        if (this.elements.exportModal) {
            this.elements.exportModal.classList.add('hidden');
        }
    }

    /**
     * Hide all modals
     */
    hideAllModals() {
        this.hideAnalyticsModal();
        this.hideExportModal();
    }

    /**
     * Load analytics content
     */
    loadAnalyticsContent() {
        if (!this.elements.analyticsContent) return;
        
        try {
            const productivity = this.analyticsService.getProductivityTrends(6);
            const projects = this.analyticsService.getProjectAnalytics();
            const summary = this.analyticsService.calculateMonthlySummary();
            
            this.elements.analyticsContent.innerHTML = `
                <div class="analytics-overview">
                    <h3>📊 Overview</h3>
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <h4>Current Month</h4>
                            <p>${summary.daysWorked} days worked</p>
                            <p>${summary.totalHours} total hours</p>
                            <p>${summary.avgHours.toFixed(2)} avg hours/day</p>
                        </div>
                        <div class="analytics-card">
                            <h4>Productivity</h4>
                            <p>${summary.monthProgress.toFixed(1)}% month complete</p>
                            <p>${summary.uniqueProjects} active projects</p>
                            <p>${summary.totalEntries} total entries</p>
                        </div>
                    </div>
                    
                    <h4>🚀 Top Projects</h4>
                    <div class="project-analytics">
                        ${projects.slice(0, 5).map(project => `
                            <div class="project-stat">
                                <div class="project-name">${this.getProjectDisplayName(project.project)}</div>
                                <div class="project-hours">${project.totalHours.toFixed(2)}h</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Analytics content error:', error);
            this.elements.analyticsContent.innerHTML = `
                <div class="error-state">
                    <p>⚠️ Error loading analytics data</p>
                </div>
            `;
        }
    }

    /**
     * Initialize export modal
     */
    initializeExportModal() {
        if (this.elements.exportStartDate && this.elements.exportEndDate) {
            const today = new Date().toISOString().split('T')[0];
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                .toISOString().split('T')[0];
                
            this.elements.exportStartDate.value = firstDayOfMonth;
            this.elements.exportEndDate.value = today;
        }
        
        this.handleExportRangeChange();
    }

    /**
     * Handle export range change
     */
    handleExportRangeChange() {
        if (!this.elements.exportRange || !this.elements.customDateRange) return;
        
        const isCustom = this.elements.exportRange.value === 'custom';
        this.elements.customDateRange.style.display = isCustom ? 'flex' : 'none';
    }

    /**
     * Handle custom export
     */
    async handleCustomExport() {
        try {
            const format = this.elements.exportFormat?.value || 'csv';
            const range = this.elements.exportRange?.value || 'current-month';
            
            let startDate, endDate;
            
            if (range === 'custom') {
                startDate = new Date(this.elements.exportStartDate?.value);
                endDate = new Date(this.elements.exportEndDate?.value);
                
                if (!this.elements.exportStartDate?.value || !this.elements.exportEndDate?.value) {
                    this.showToast('❌ Please select both start and end dates');
                    return;
                }
                
                if (startDate > endDate) {
                    this.showToast('❌ Start date must be before end date');
                    return;
                }
            } else {
                // Calculate date range based on selection
                const dateRange = this.calculateDateRange(range);
                startDate = dateRange.start;
                endDate = dateRange.end;
            }
            
            this.showLoadingState('Preparing export...');
            
            const result = await this.exportService.exportCustomRange(startDate, endDate, format);
            
            this.showToast('✅ Export successful! ' + result.message);
            this.hideExportModal();
            
        } catch (error) {
            console.error('Custom export error:', error);
            this.showToast('❌ Export failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Calculate date range based on selection
     */
    calculateDateRange(range) {
        const today = new Date();
        let start, end;
        
        switch (range) {
            case 'current-month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today);
                break;
                
            case 'last-month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
                
            case 'last-3-months':
                start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                end = new Date(today);
                break;
                
            case 'all-data':
                const dateRange = this.exportService.getDateRange();
                start = dateRange.earliest ? new Date(dateRange.earliest) : new Date();
                end = dateRange.latest ? new Date(dateRange.latest) : new Date();
                break;
                
            default:
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today);
        }
        
        return { start, end };
    }

    /**
     * Get project display name
     */
    getProjectDisplayName(projectValue) {
        if (!projectValue) return 'Unknown Project';
        
        const project = this.dataService.findProjectByValue(projectValue);
        return project ? `${project.projectId} - ${project.projectTitle}` : projectValue;
    }

    /**
     * Show error in summary
     */
    showErrorInSummary() {
        const summaryElements = [
            this.elements.daysWorked,
            this.elements.totalHours,
            this.elements.avgHours,
            this.elements.totalEntries,
            this.elements.uniqueProjects,
            this.elements.monthProgress
        ];
        
        summaryElements.forEach(element => {
            if (element) {
                element.textContent = '--';
            }
        });
    }

    /**
     * Show loading state
     */
    showLoadingState(message = 'Loading...') {
        document.dispatchEvent(new CustomEvent('app:loading', {
            detail: { message }
        }));
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        document.dispatchEvent(new CustomEvent('app:loaded'));
    }

    /**
     * Show toast message
     */
    showToast(message) {
        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message }
        }));
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

export default DashboardController;
