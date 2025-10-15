// services/DataService.js
// Data Service Class - Handles all data operations, storage, and synchronization

class DataService {
    constructor(firebaseConfig, user) {
        this.firebaseConfig = firebaseConfig;
        this.user = user;
        this.workLogData = {}; // Format: { 'YYYY-MM-DD': [entries] }
        this.projects = [];
        this.syncStatus = 'idle'; // idle, syncing, synced, error
        this.lastSyncTime = null;
        this.pendingChanges = false;
        this.isOnline = navigator.onLine;
        
        // Set up network listeners
        this.setupNetworkListeners();
    }

    /**
     * Setup network connectivity listeners
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleNetworkChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleNetworkChange(false);
        });
    }

    /**
     * Handle network connectivity changes
     * @param {boolean} isOnline - Whether device is online
     */
    async handleNetworkChange(isOnline) {
        if (isOnline && this.pendingChanges && this.user.isAuthenticated()) {
            try {
                await this.syncToCloud();
            } catch (error) {
                console.error('Auto-sync after network reconnection failed:', error);
            }
        }
    }

    /**
     * Load all data (from cloud if authenticated, otherwise local)
     * @returns {Promise} - Load result
     */
    async loadData() {
        try {
            if (this.user.isAuthenticated() && !this.user.isGuest()) {
                await this.loadFromCloud();
            } else {
                this.loadFromLocal();
            }
            
            this.dispatchDataEvent('loaded');
            return { success: true, message: 'Data loaded successfully' };
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to local data
            this.loadFromLocal();
            this.dispatchDataEvent('loaded');
            return { success: false, message: 'Loaded local data after cloud error' };
        }
    }

    /**
     * Load data from cloud (Firestore)
     * @returns {Promise} - Load result
     */
    async loadFromCloud() {
        if (!this.firebaseConfig || !this.firebaseConfig.isInitialized() || !this.user.isAuthenticated()) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        this.setSyncStatus('syncing');

        try {
            const db = this.firebaseConfig.getDatabase();
            const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Load work log data
            const workLogQuery = query(
                collection(db, 'workLogs'),
                where('userId', '==', this.user.getCurrentUser().uid),
                orderBy('date', 'desc')
            );
            
            const workLogSnapshot = await getDocs(workLogQuery);
            this.workLogData = {};
            
            workLogSnapshot.forEach(doc => {
                const data = doc.data();
                if (!this.workLogData[data.date]) {
                    this.workLogData[data.date] = [];
                }
                this.workLogData[data.date].push({
                    ...data,
                    id: doc.id
                });
            });

            // Load projects
            const projectsQuery = query(
                collection(db, 'projects'),
                where('userId', '==', this.user.getCurrentUser().uid),
                orderBy('usageCount', 'desc')
            );
            
            const projectsSnapshot = await getDocs(projectsQuery);
            this.projects = [];
            
            projectsSnapshot.forEach(doc => {
                this.projects.push({
                    ...doc.data(),
                    id: doc.id
                });
            });

            // If no projects exist, load defaults
            if (this.projects.length === 0) {
                this.projects = this.getDefaultProjects();
                await this.saveProjects(); // Save default projects to cloud
            }

            this.setSyncStatus('synced');
            this.lastSyncTime = new Date();
            this.pendingChanges = false;
            
            return { success: true, message: 'Data loaded from cloud' };
        } catch (error) {
            this.setSyncStatus('error');
            throw error;
        }
    }

    /**
     * Load data from local storage
     */
    loadFromLocal() {
        try {
            // Load work log data
            const savedWorkLog = localStorage.getItem('workLogData');
            if (savedWorkLog) {
                this.workLogData = JSON.parse(savedWorkLog);
            } else {
                this.workLogData = {};
            }

            // Load projects
            const savedProjects = localStorage.getItem('projectData');
            if (savedProjects) {
                this.projects = JSON.parse(savedProjects);
            } else {
                this.projects = this.getDefaultProjects();
                this.saveToLocal(); // Save default projects locally
            }

            this.setSyncStatus('local');
            console.log('Data loaded from local storage');
        } catch (error) {
            console.error('Error loading local data:', error);
            this.workLogData = {};
            this.projects = this.getDefaultProjects();
        }
    }

    /**
     * Save all data (to cloud if authenticated, otherwise local)
     * @returns {Promise} - Save result
     */
    async saveData() {
        this.saveToLocal(); // Always save locally first
        
        if (this.user.isAuthenticated() && !this.user.isGuest() && this.isOnline) {
            try {
                await this.syncToCloud();
                return { success: true, message: 'Data saved and synced to cloud' };
            } catch (error) {
                console.error('Cloud sync failed:', error);
                this.pendingChanges = true;
                return { success: false, message: 'Saved locally, cloud sync failed' };
            }
        } else {
            this.pendingChanges = true;
            return { success: true, message: 'Data saved locally' };
        }
    }

    /**
     * Save data to local storage
     */
    saveToLocal() {
        try {
            localStorage.setItem('workLogData', JSON.stringify(this.workLogData));
            localStorage.setItem('projectData', JSON.stringify(this.projects));
            localStorage.setItem('lastLocalSave', new Date().toISOString());
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }

    /**
     * Sync data to cloud (Firestore)
     * @returns {Promise} - Sync result
     */
    async syncToCloud() {
        if (!this.firebaseConfig || !this.firebaseConfig.isInitialized() || !this.user.isAuthenticated()) {
            throw new Error('Cannot sync - Firebase not initialized or user not authenticated');
        }

        this.setSyncStatus('syncing');

        try {
            const db = this.firebaseConfig.getDatabase();
            const { doc, setDoc, collection, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const batch = writeBatch(db);
            const userId = this.user.getCurrentUser().uid;

            // Sync work log data
            Object.keys(this.workLogData).forEach(dateKey => {
                const entries = this.workLogData[dateKey];
                entries.forEach(entry => {
                    const docRef = doc(collection(db, 'workLogs'));
                    batch.set(docRef, {
                        ...entry,
                        userId: userId,
                        date: dateKey,
                        updatedAt: serverTimestamp()
                    });
                });
            });

            // Sync projects
            this.projects.forEach(project => {
                const docRef = doc(collection(db, 'projects'));
                batch.set(docRef, {
                    ...project,
                    userId: userId,
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
            
            this.setSyncStatus('synced');
            this.lastSyncTime = new Date();
            this.pendingChanges = false;
            
            this.dispatchDataEvent('synced');
            return { success: true, message: 'Data synced to cloud' };
        } catch (error) {
            this.setSyncStatus('error');
            throw error;
        }
    }

    /**
     * Get work log data
     * @returns {Object} - Work log data
     */
    getWorkLogData() {
        return this.workLogData;
    }

    /**
     * Get entries for a specific date
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @returns {Array} - Array of entries for the date
     */
    getEntriesForDate(dateKey) {
        return this.workLogData[dateKey] || [];
    }

    /**
     * Add entry for a date
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {Object} entryData - Entry data
     * @returns {Promise} - Add result
     */
    async addEntry(dateKey, entryData) {
        if (!this.workLogData[dateKey]) {
            this.workLogData[dateKey] = [];
        }

        const entry = {
            id: this.generateId(),
            ...entryData,
            timestamp: new Date().toISOString()
        };

        this.workLogData[dateKey].push(entry);
        
        // Update project usage if it's a work entry
        if (entry.type === 'work' && entry.project) {
            this.incrementProjectUsage(entry.project);
        }

        this.dispatchDataEvent('entryAdded', { dateKey, entry });
        return await this.saveData();
    }

    /**
     * Update entry
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {string} entryId - Entry ID
     * @param {Object} updateData - Data to update
     * @returns {Promise} - Update result
     */
    async updateEntry(dateKey, entryId, updateData) {
        if (!this.workLogData[dateKey]) {
            throw new Error('No entries found for this date');
        }

        const entryIndex = this.workLogData[dateKey].findIndex(entry => entry.id === entryId);
        if (entryIndex === -1) {
            throw new Error('Entry not found');
        }

        const oldEntry = this.workLogData[dateKey][entryIndex];
        const updatedEntry = {
            ...oldEntry,
            ...updateData,
            timestamp: new Date().toISOString()
        };

        this.workLogData[dateKey][entryIndex] = updatedEntry;

        // Update project usage counts
        if (oldEntry.type === 'work' && oldEntry.project && oldEntry.project !== updatedEntry.project) {
            this.decrementProjectUsage(oldEntry.project);
        }
        if (updatedEntry.type === 'work' && updatedEntry.project) {
            this.incrementProjectUsage(updatedEntry.project);
        }

        this.dispatchDataEvent('entryUpdated', { dateKey, entryId, entry: updatedEntry });
        return await this.saveData();
    }

    /**
     * Delete entry
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {string} entryId - Entry ID
     * @returns {Promise} - Delete result
     */
    async deleteEntry(dateKey, entryId) {
        if (!this.workLogData[dateKey]) {
            throw new Error('No entries found for this date');
        }

        const entryIndex = this.workLogData[dateKey].findIndex(entry => entry.id === entryId);
        if (entryIndex === -1) {
            throw new Error('Entry not found');
        }

        const deletedEntry = this.workLogData[dateKey][entryIndex];
        this.workLogData[dateKey].splice(entryIndex, 1);

        // Clean up empty date arrays
        if (this.workLogData[dateKey].length === 0) {
            delete this.workLogData[dateKey];
        }

        // Update project usage
        if (deletedEntry.type === 'work' && deletedEntry.project) {
            this.decrementProjectUsage(deletedEntry.project);
        }

        this.dispatchDataEvent('entryDeleted', { dateKey, entryId, entry: deletedEntry });
        return await this.saveData();
    }

    /**
     * Get all projects
     * @returns {Array} - Array of projects
     */
    getProjects() {
        return this.projects;
    }

    /**
     * Add new project
     * @param {Object} projectData - Project data
     * @returns {Promise} - Add result
     */
    async addProject(projectData) {
        // Check for duplicates
        const existing = this.findProjectByValue(`${projectData.projectId}-${projectData.subCode}`);
        if (existing) {
            throw new Error('Project with this ID and sub code already exists');
        }

        const project = {
            id: this.generateId(),
            ...projectData,
            usageCount: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.projects.push(project);
        this.dispatchDataEvent('projectAdded', { project });
        return await this.saveData();
    }

    /**
     * Update project
     * @param {string} projectId - Project ID
     * @param {Object} updateData - Data to update
     * @returns {Promise} - Update result
     */
    async updateProject(projectId, updateData) {
        const projectIndex = this.projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
            throw new Error('Project not found');
        }

        const updatedProject = {
            ...this.projects[projectIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        this.projects[projectIndex] = updatedProject;
        this.dispatchDataEvent('projectUpdated', { projectId, project: updatedProject });
        return await this.saveData();
    }

    /**
     * Delete project
     * @param {string} projectId - Project ID
     * @returns {Promise} - Delete result
     */
    async deleteProject(projectId) {
        const projectIndex = this.projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
            throw new Error('Project not found');
        }

        const project = this.projects[projectIndex];
        
        // Check if project is used in entries
        const isUsed = Object.values(this.workLogData).some(entries =>
            entries.some(entry => entry.project === `${project.projectId}-${project.subCode}`)
        );

        if (isUsed) {
            throw new Error('Cannot delete project that is used in work entries');
        }

        this.projects.splice(projectIndex, 1);
        this.dispatchDataEvent('projectDeleted', { projectId, project });
        return await this.saveData();
    }

    /**
     * Find project by value (projectId-subCode)
     * @param {string} projectValue - Project value
     * @returns {Object|null} - Project object or null
     */
    findProjectByValue(projectValue) {
        if (!projectValue) return null;
        
        return this.projects.find(project => 
            `${project.projectId}-${project.subCode}` === projectValue
        ) || null;
    }

    /**
     * Increment project usage count
     * @param {string} projectValue - Project value
     */
    incrementProjectUsage(projectValue) {
        const project = this.findProjectByValue(projectValue);
        if (project) {
            project.usageCount = (project.usageCount || 0) + 1;
            project.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Decrement project usage count
     * @param {string} projectValue - Project value
     */
    decrementProjectUsage(projectValue) {
        const project = this.findProjectByValue(projectValue);
        if (project && project.usageCount > 0) {
            project.usageCount--;
            project.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Get default projects
     * @returns {Array} - Default projects array
     */
    getDefaultProjects() {
        return [
            {
                id: 'default_1',
                projectId: 'IN-1100-NA',
                subCode: '0010',
                projectTitle: 'General Overhead',
                category: 'Overhead',
                isActive: true,
                usageCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'default_2',
                projectId: 'WV-1112-4152',
                subCode: '0210',
                projectTitle: 'ASStrategy',
                category: 'Strategy',
                isActive: true,
                usageCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'default_3',
                projectId: 'WV-1112-4152',
                subCode: '1010',
                projectTitle: 'ASStrategy Development',
                category: 'Development',
                isActive: true,
                usageCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'default_4',
                projectId: 'RW-1173-9573P00303',
                subCode: '0010',
                projectTitle: 'RW Tracking',
                category: 'Tracking',
                isActive: true,
                usageCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'default_5',
                projectId: 'WV-1137-D75B1-C4285-08-03',
                subCode: '1250',
                projectTitle: 'MERCIA INSIGNIA Electronic Controller',
                category: 'Controller',
                isActive: true,
                usageCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    /**
     * Import data from backup
     * @param {Object} workLogData - Work log data
     * @param {Object} projectData - Project data
     * @returns {Promise} - Import result
     */
    async importData(workLogData, projectData) {
        try {
            // Backup current data
            const currentWorkLog = { ...this.workLogData };
            const currentProjects = [...this.projects];

            // Import new data
            this.workLogData = workLogData || {};
            this.projects = projectData || [];

            // Save imported data
            const result = await this.saveData();
            
            this.dispatchDataEvent('imported', { 
                workLogEntries: Object.keys(this.workLogData).length,
                projects: this.projects.length 
            });

            return {
                success: true,
                message: `Imported ${Object.keys(this.workLogData).length} work log entries and ${this.projects.length} projects`,
                backup: { workLogData: currentWorkLog, projectData: currentProjects }
            };
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    /**
     * Export all data
     * @returns {Object} - Exported data
     */
    exportData() {
        return {
            workLogData: this.workLogData,
            projectData: this.projects,
            exportDate: new Date().toISOString(),
            version: '2.1',
            userInfo: {
                userId: this.user.getUserId(),
                email: this.user.getUserEmail(),
                isGuest: this.user.isGuest()
            }
        };
    }

    /**
     * Clear all data
     */
    clearData() {
        this.workLogData = {};
        this.projects = [];
        this.saveToLocal();
        this.dispatchDataEvent('cleared');
    }

    /**
     * Get sync status
     * @returns {Object} - Sync status information
     */
    getSyncStatus() {
        return {
            status: this.syncStatus,
            lastSyncTime: this.lastSyncTime,
            pendingChanges: this.pendingChanges,
            isOnline: this.isOnline,
            isAuthenticated: this.user.isAuthenticated(),
            isGuest: this.user.isGuest()
        };
    }

    /**
     * Set sync status
     * @param {string} status - New sync status
     */
    setSyncStatus(status) {
        this.syncStatus = status;
        this.dispatchDataEvent('syncStatusChanged', { status });
    }

    /**
     * Generate unique ID
     * @returns {string} - Unique ID
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Dispatch data-related events
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     */
    dispatchDataEvent(eventName, data) {
        const event = new CustomEvent(`data:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Get data statistics
     * @returns {Object} - Data statistics
     */
    getDataStats() {
        const totalEntries = Object.values(this.workLogData).reduce((sum, entries) => sum + entries.length, 0);
        const totalWorkDays = Object.keys(this.workLogData).filter(dateKey => 
            this.workLogData[dateKey].some(entry => entry.type === 'work')
        ).length;
        
        const totalHours = Object.values(this.workLogData).reduce((sum, entries) => {
            return sum + entries.reduce((daySum, entry) => {
                if (entry.type === 'work') return daySum + (entry.hours || 0);
                return daySum;
            }, 0);
        }, 0);

        return {
            totalEntries,
            totalWorkDays,
            totalHours,
            activeProjects: this.projects.filter(p => p.isActive).length,
            totalProjects: this.projects.length,
            dateRange: this.getDateRange(),
            syncStatus: this.getSyncStatus()
        };
    }

    /**
     * Get date range of data
     * @returns {Object} - Date range information
     */
    getDateRange() {
        const dates = Object.keys(this.workLogData).sort();
        if (dates.length === 0) return { earliest: null, latest: null, totalDays: 0 };
        
        return {
            earliest: dates[0],
            latest: dates[dates.length - 1],
            totalDays: dates.length
        };
    }

    /**
     * Save projects specifically (useful for project management)
     * @returns {Promise} - Save result
     */
    async saveProjects() {
        this.dispatchDataEvent('updated');
        return await this.saveData();
    }
}

export default DataService;
