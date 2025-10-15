// controllers/DashboardController.js - UPDATED VERSION
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
     * Cache DOM elements - UPDATED with correct IDs from your HTML
     */
    cacheElements() {
        this.elements = {
            // Monthly Summary - Updated IDs to match your HTML structure
            totalDaysWorked: document.getElementById('totalDaysWorked'),
            totalHoursMonth: document.getElementById('totalHoursMonth'), 
            averageHours: document.getElementById('averageHours'),
            totalProjects: document.getElementById('totalProjects'),
            uniqueProjects: document.getElementById('uniqueProjects'),
            monthProgress: document.getElementById('monthProgress'),
            
            // Historical Data
            historicalData: document.getElementById('historicalData'),
            
            // Export Options - Updated IDs to match your HTML
            exportDaily: document.getElementById('exportDaily'),
            exportMonth: document.getElementById('exportMonth'),
            exportRange: document.getElementById('exportRange'),
            exportAll: document.getElementById('exportAll'),
            backupData: document.getElementById('backupData'),
            restoreData: document.getElementById('restoreData'),
            fileInput: document.getElementById('fileInput'),
            
            // Legacy export button
            exportBtn: document.getElementById('exportBtn'),
            
            // Guest mode notice
            guestModeNotice: document.getElementById('guestModeNotice'),
            
            // Analytics Modal (if exists)
            analyticsBtn: document.getElementById('analyticsBtn'),
            analyticsModal: document.getElementById('analyticsModal'),
            closeAnalyticsBtn: document.getElementById('closeAnalyticsBtn'),
            analyticsContent: document.getElementById('analyticsContent')
        };

        console.log('DashboardController: Elements cached', this.elements);
    }

    /**
     * Initialize dashboard
     */
    initialize() {
        this.setupEventListeners();
        this.refreshDashboard();
        
        // Set up auto-refresh every 5 minutes
        this.updateInterval = setInterval(() => {
            this.refreshDashboard();
        }, 300000);

        console.log('DashboardController: Initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Export buttons
        if (this.elements.exportDaily) {
            this.addEventListenerWithCleanup(this.elements.exportDaily, 'click', () => {
                this.handleExportSelectedDay();
            });
        }

        if (this.elements.exportMonth) {
            this.addEventListenerWithCleanup(this.elements.exportMonth, 'click', () => {
                this.handleExportCurrentMonth();
            });
        }

        if (this.elements.exportRange) {
            this.addEventListenerWithCleanup(this.elements.exportRange, 'click', () => {
                this.handleExportDateRange();
            });
        }

        if (this.elements.exportAll) {
            this.addEventListenerWithCleanup(this.elements.exportAll, 'click', () => {
                this.handleExportAllData();
            });
        }

        // Backup/Restore buttons
        if (this.elements.backupData) {
            this.addEventListenerWithCleanup(this.elements.backupData, 'click', () => {
                this.handleExportBackup();
            });
        }

        if (this.elements.restoreData) {
            this.addEventListenerWithCleanup(this.elements.restoreData, 'click', () => {
                this.handleImportBackup();
            });
        }

        // Legacy export button (for compatibility)
        if (this.elements.exportBtn) {
            this.addEventListenerWithCleanup(this.elements.exportBtn, 'click', () => {
                this.handleExportCurrentMonth();
            });
        }

        // File input for backup restore
        if (this.elements.fileInput) {
            this.addEventListenerWithCleanup(this.elements.fileInput, 'change', (e) => {
                this.handleFileImport(e.target.files[0]);
            });
        }

        // Analytics modal (if exists)
        if (this.elements.analyticsBtn) {
            this.addEventListenerWithCleanup(this.elements.analyticsBtn, 'click', () => {
                this.showAnalyticsModal();
            });
        }

        // Listen for data changes to refresh dashboard
        document.addEventListener('data:updated', () => {
            this.refreshDashboard();
        });

        document.addEventListener('calendar:dateSelected', () => {
            this.updateExportButtonStates();
        });

        console.log('DashboardController: Event listeners set up');
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
     * Refresh dashboard data - UPDATED to work without analytics/export services
     */
    async refreshDashboard() {
        try {
            await Promise.all([
                this.updateMonthlySummary(),
                this.updateHistoricalData(),
                this.updateExportButtonStates(),
                this.updateGuestModeNotice()
            ]);
            console.log('DashboardController: Dashboard refreshed');
        } catch (error) {
            console.error('Dashboard refresh error:', error);
        }
    }

    /**
     * Update monthly summary section - UPDATED to work directly with dataService
     */
    async updateMonthlySummary() {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            // Get work log data directly from dataService
            const workLogData = this.dataService.getWorkLogData();
            
            // Calculate statistics
            let daysWorked = 0;
            let totalHours = 0;
            let totalEntries = 0;
            let uniqueProjects = new Set();
            
            Object.keys(workLogData).forEach(dateKey => {
                const date = new Date(dateKey);
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    const dayEntries = workLogData[dateKey];
                    let hasWorkEntry = false;
                    
                    dayEntries.forEach(entry => {
                        totalEntries++;
                        
                        if (entry.type === 'work') {
                            hasWorkEntry = true;
                            totalHours += entry.hours || 0;
                            if (entry.project) {
                                uniqueProjects.add(entry.project);
                            }
                        } else if (['fullLeave', 'halfLeave', 'holiday'].includes(entry.type)) {
                            hasWorkEntry = true; // Count as work day for attendance
                        }
                    });
                    
                    if (hasWorkEntry) {
                        daysWorked++;
                    }
                }
            });
            
            // Calculate derived statistics
            const avgHours = daysWorked > 0 ? totalHours / daysWorked : 0;
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const currentDayOfMonth = currentDate.getDate();
            const monthProgress = (currentDayOfMonth / daysInMonth) * 100;
            
            // Update DOM elements
            if (this.elements.totalDaysWorked) {
                this.elements.totalDaysWorked.textContent = daysWorked;
            }
            
            if (this.elements.totalHoursMonth) {
                this.elements.totalHoursMonth.textContent = totalHours.toFixed(2);
            }
            
            if (this.elements.averageHours) {
                this.elements.averageHours.textContent = avgHours.toFixed(2);
            }
            
            if (this.elements.totalProjects) {
                this.elements.totalProjects.textContent = totalEntries;
            }
            
            if (this.elements.uniqueProjects) {
                this.elements.uniqueProjects.textContent = uniqueProjects.size;
            }
            
            if (this.elements.monthProgress) {
                this.elements.monthProgress.textContent = `${monthProgress.toFixed(1)}%`;
            }
            
        } catch (error) {
            console.error('Monthly summary update error:', error);
            this.showErrorInSummary();
        }
    }

    /**
     * Update historical data section - UPDATED to work directly with dataService
     */
    async updateHistoricalData() {
        try {
            const workLogData = this.dataService.getWorkLogData();
            
            if (!this.elements.historicalData) return;
            
            // Group data by month
            const monthlyData = {};
            
            Object.keys(workLogData).forEach(dateKey => {
                const date = new Date(dateKey);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        period: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                        daysWorked: new Set(),
                        totalHours: 0,
                        date: date
                    };
                }
                
                const dayEntries = workLogData[dateKey];
                let hasWorkDay = false;
                
                dayEntries.forEach(entry => {
                    if (entry.type === 'work') {
                        hasWorkDay = true;
                        monthlyData[monthKey].totalHours += entry.hours || 0;
                    } else if (['fullLeave', 'halfLeave', 'holiday'].includes(entry.type)) {
                        hasWorkDay = true;
                    }
                });
                
                if (hasWorkDay) {
                    monthlyData[monthKey].daysWorked.add(dateKey);
                }
            });
            
            // Convert to array and sort by date (newest first)
            const monthlyArray = Object.values(monthlyData)
                .sort((a, b) => b.date - a.date)
                .slice(0, 12); // Show last 12 months
            
            if (monthlyArray.length === 0) {
                this.elements.historicalData.innerHTML = `
                    <div class="no-historical-data">
                        <div class="icon">📊</div>
                        <div>No historical data available</div>
                        <small>Start logging work entries to see trends</small>
                    </div>
                `;
                return;
            }
            
            // Generate historical data HTML
            const historicalHTML = monthlyArray.map(item => `
                <div class="historical-item">
                    <div class="historical-period">${item.period}</div>
                    <div class="historical-stats">
                        <div class="historical-stat">
                            <span>📅</span>
                            <span>${item.daysWorked.size} days</span>
                        </div>
                        <div class="historical-stat">
                            <span>⏰</span>
                            <span>${item.totalHours.toFixed(1)}h</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            this.elements.historicalData.innerHTML = historicalHTML;
            
        } catch (error) {
            console.error('Historical data update error:', error);
            if (this.elements.historicalData) {
                this.elements.historicalData.innerHTML = `
                    <div class="no-historical-data">
                        <div class="icon">⚠️</div>
                        <div>Error loading historical data</div>
                    </div>
                `;
            }
        }
    }

    /**
     * Update export button states
     */
    updateExportButtonStates() {
        // Get current app state
        const hasData = Object.keys(this.dataService.getWorkLogData()).length > 0;
        const selectedDate = window.app?.calendarView?.selectedDate;
        const hasSelectedDateData = selectedDate && this.dataService.getWorkLogData()[this.formatDateKey(selectedDate)];

        // Update button states
        if (this.elements.exportDaily) {
            this.elements.exportDaily.disabled = !hasSelectedDateData;
        }

        if (this.elements.exportMonth) {
            this.elements.exportMonth.disabled = !this.hasCurrentMonthData();
        }

        if (this.elements.exportRange) {
            this.elements.exportRange.disabled = !hasData;
        }

        if (this.elements.exportAll) {
            this.elements.exportAll.disabled = !hasData;
        }
    }

    /**
     * Update guest mode notice
     */
    updateGuestModeNotice() {
        if (this.elements.guestModeNotice) {
            const isGuest = window.app?.user?.isGuest() || false;
            this.elements.guestModeNotice.style.display = isGuest ? 'block' : 'none';
        }
    }

    /**
     * Check if current month has data
     */
    hasCurrentMonthData() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const workLogData = this.dataService.getWorkLogData();
        
        return Object.keys(workLogData).some(dateKey => {
            const date = new Date(dateKey);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
    }

    // Export handlers
    async handleExportSelectedDay() {
        const selectedDate = window.app?.calendarView?.selectedDate;
        if (!selectedDate) {
            this.showToast('❌ Please select a date first');
            return;
        }

        try {
            this.showLoadingState('Exporting selected day...');
            const result = await this.exportSelectedDayData(selectedDate);
            this.showToast('✅ Day exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('❌ Export failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    async handleExportCurrentMonth() {
        try {
            this.showLoadingState('Exporting current month...');
            const result = await this.exportCurrentMonthData();
            this.showToast('✅ Month exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('❌ Export failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    async handleExportDateRange() {
        // Show date range modal or use default range
        try {
            this.showLoadingState('Exporting date range...');
            const result = await this.exportDateRangeData();
            this.showToast('✅ Date range exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('❌ Export failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    async handleExportAllData() {
        try {
            this.showLoadingState('Exporting all data...');
            const result = await this.exportAllData();
            this.showToast('✅ All data exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('❌ Export failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    async handleExportBackup() {
        try {
            this.showLoadingState('Creating backup...');
            const result = await this.createBackup();
            this.showToast('✅ Backup created successfully');
        } catch (error) {
            console.error('Backup error:', error);
            this.showToast('❌ Backup failed: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    handleImportBackup() {
        if (this.elements.fileInput) {
            this.elements.fileInput.click();
        }
    }

    async handleFileImport(file) {
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            this.showToast('❌ Please select a valid JSON backup file');
            return;
        }
        
        try {
            this.showLoadingState('Importing backup...');
            const result = await this.importBackup(file);
            this.showToast('✅ Import successful');
            this.refreshDashboard();
            document.dispatchEvent(new CustomEvent('data:imported'));
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('❌ Import failed: ' + error.message);
        } finally {
            this.hideLoadingState();
            if (this.elements.fileInput) {
                this.elements.fileInput.value = '';
            }
        }
    }

    // Export implementation methods
    async exportSelectedDayData(date) {
        const dateKey = this.formatDateKey(date);
        const entries = this.dataService.getWorkLogData()[dateKey] || [];
        
        if (entries.length === 0) {
            throw new Error('No entries found for selected date');
        }
        
        const csvContent = this.createCSVFromEntries(entries, dateKey);
        const filename = `work-log-${dateKey}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');
        
        return { message: `${entries.length} entries exported` };
    }

    async exportCurrentMonthData() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const workLogData = this.dataService.getWorkLogData();
        const monthEntries = [];
        
        Object.keys(workLogData).forEach(dateKey => {
            const date = new Date(dateKey);
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                workLogData[dateKey].forEach(entry => {
                    monthEntries.push({ ...entry, date: dateKey });
                });
            }
        });
        
        if (monthEntries.length === 0) {
            throw new Error('No entries found for current month');
        }
        
        const csvContent = this.createCSVFromEntries(monthEntries);
        const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const filename = `work-log-${monthName.replace(' ', '-').toLowerCase()}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');
        
        return { message: `${monthEntries.length} entries exported` };
    }

    async exportAllData() {
        const workLogData = this.dataService.getWorkLogData();
        const allEntries = [];
        
        Object.keys(workLogData).forEach(dateKey => {
            workLogData[dateKey].forEach(entry => {
                allEntries.push({ ...entry, date: dateKey });
            });
        });
        
        if (allEntries.length === 0) {
            throw new Error('No data to export');
        }
        
        const csvContent = this.createCSVFromEntries(allEntries);
        const filename = `work-log-all-data-${new Date().toISOString().split('T')[0]}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');
        
        return { message: `${allEntries.length} entries exported` };
    }

    async createBackup() {
        const backupData = {
            version: '2.1',
            exportDate: new Date().toISOString(),
            workLogData: this.dataService.getWorkLogData(),
            projectData: this.dataService.getProjects(),
            metadata: {
                totalEntries: Object.values(this.dataService.getWorkLogData()).reduce((sum, entries) => sum + entries.length, 0),
                exportedBy: 'Daily Work Log Tracker'
            }
        };
        
        const jsonContent = JSON.stringify(backupData, null, 2);
        const filename = `work-log-backup-${new Date().toISOString().split('T')[0]}.json`;
        this.downloadFile(jsonContent, filename, 'application/json');
        
        return { message: 'Backup created successfully' };
    }

    async importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    if (!backupData.workLogData || !backupData.projectData) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    // Simple import - could be enhanced with merge options
                    await this.dataService.importData(backupData.workLogData, backupData.projectData);
                    
                    resolve({ message: 'Data imported successfully' });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Utility methods
    createCSVFromEntries(entries, singleDate = null) {
        const headers = ['Date', 'Entry Type', 'Project', 'Hours', 'Comments'];
        const csvRows = [headers.join(',')];
        
        entries.forEach(entry => {
            const date = entry.date || singleDate;
            const type = this.getEntryTypeLabel(entry.type);
            const project = this.getProjectDisplayName(entry.project);
            const hours = this.getEntryHours(entry);
            const comments = (entry.comments || '').replace(/"/g, '""');
            
            csvRows.push([date, `"${type}"`, `"${project}"`, hours, `"${comments}"`].join(','));
        });
        
        return csvRows.join('\n');
    }

    getEntryTypeLabel(type) {
        const types = {
            work: 'Work Entry',
            fullLeave: 'Full Day Leave',
            halfLeave: 'Half Day Leave',
            holiday: 'Holiday'
        };
        return types[type] || type;
    }

    getEntryHours(entry) {
        if (entry.type === 'work') return entry.hours || 0;
        if (entry.type === 'fullLeave' || entry.type === 'holiday') return 8;
        if (entry.type === 'halfLeave') return 4;
        return 0;
    }

    getProjectDisplayName(projectValue) {
        if (!projectValue) return 'N/A';
        const project = this.dataService.findProjectByValue(projectValue);
        return project ? `${project.projectId} - ${project.projectTitle}` : projectValue;
    }

    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // Modal methods (kept for compatibility)
    showAnalyticsModal() {
        this.showToast('📊 Advanced analytics coming soon!');
    }

    /**
     * Show error in summary
     */
    showErrorInSummary() {
        const summaryElements = [
            this.elements.totalDaysWorked,
            this.elements.totalHoursMonth,
            this.elements.averageHours,
            this.elements.totalProjects,
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
