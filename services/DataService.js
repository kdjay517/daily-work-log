// services/DataService.js
// Data Service for handling local and cloud storage

class DataService {
    constructor(firebaseConfig, user) {
        this.firebaseConfig = firebaseConfig;
        this.user = user;
        this.workLogData = {};
        this.projects = [];
        this.syncInProgress = false;
        this.lastSyncTime = null;
    }

    /**
     * Load data based on user authentication state
     * @returns {Promise<boolean>} - Success status
     */
    async loadData() {
        if (this.user.isAuthenticated() && !this.user.isGuest() && this.firebaseConfig.isInitialized()) {
            try {
                const success = await this.loadFromCloud();
                this.lastSyncTime = new Date();
                return success;
            } catch (error) {
                console.error('Error loading from cloud:', error);
                this.loadFromLocal();
                throw new Error('Error loading cloud data, using local data');
            }
        } else {
            this.loadFromLocal();
            return true;
        }
    }

    /**
     * Load data from Firestore cloud storage
     * @returns {Promise<boolean>} - Success status
     */
    async loadFromCloud() {
        const db = this.firebaseConfig.getDatabase();
        const userId = this.user.getUserId();
        
        if (!db || !userId) {
            throw new Error('Database or user not available');
        }

        const docRef = db.collection('workLogs').doc(userId);
        const docSnapshot = await docRef.get();
        
        if (docSnapshot.exists) {
            const cloudData = docSnapshot.data();
            console.log('Cloud data loaded successfully:', Object.keys(cloudData));
            
            // Load work log entries
            if (cloudData.entries) {
                this.workLogData = cloudData.entries;
                console.log(`Loaded ${Object.keys(this.workLogData).length} days of entries`);
            } else {
                this.workLogData = {};
            }
            
            // Load projects
            if (cloudData.projects && Array.isArray(cloudData.projects)) {
                this.projects = cloudData.projects;
                console.log(`Loaded ${this.projects.length} projects`);
            } else {
                // Initialize with default projects if none exist
                const Project = (await import('../models/Project.js')).default;
                this.projects = Project.getDefaultProjects().map(p => p.toObject());
            }
            
            this.lastSyncTime = cloudData.lastUpdated ? cloudData.lastUpdated.toDate() : new Date();
            return true;
        } else {
            console.log('No cloud data found, initializing...');
            // Initialize with default data
            const Project = (await import('../models/Project.js')).default;
            this.projects = Project.getDefaultProjects().map(p => p.toObject());
            this.workLogData = {};
            
            // Save initial data to cloud
            await this.saveToCloud();
            return false;
        }
    }

    /**
     * Load data from localStorage
     */
    loadFromLocal() {
        try {
            const savedData = localStorage.getItem('workLogData');
            const savedProjects = localStorage.getItem('projectData');
            
            if (savedData) {
                this.workLogData = JSON.parse(savedData);
                console.log('Loaded local work log data');
            } else {
                this.workLogData = {};
            }
            
            if (savedProjects) {
                this.projects = JSON.parse(savedProjects);
                console.log('Loaded local project data');
            } else {
                // Initialize with default projects
                this.initializeDefaultProjects();
            }
        } catch (error) {
            console.error('Error loading from local storage:', error);
            this.workLogData = {};
            this.initializeDefaultProjects();
        }
    }

    /**
     * Initialize default projects
     */
    async initializeDefaultProjects() {
        try {
            const Project = (await import('../models/Project.js')).default;
            this.projects = Project.getDefaultProjects().map(p => p.toObject());
        } catch (error) {
            console.error('Error initializing default projects:', error);
            this.projects = [];
        }
    }

    /**
     * Save data to both local and cloud storage
     * @returns {Promise<Object>} - Save result
     */
    async saveData() {
        // Always save locally first for data safety
        this.saveToLocal();
        
        if (this.user.isAuthenticated() && !this.user.isGuest() && this.firebaseConfig.isInitialized()) {
            try {
                await this.saveToCloud();
                this.lastSyncTime = new Date();
                return { 
                    success: true, 
                    message: '✅ Saved and synced to cloud',
                    syncTime: this.lastSyncTime
                };
            } catch (error) {
                console.error('Error saving to cloud:', error);
                return { 
                    success: false, 
                    message: '⚠️ Saved locally (Cloud sync failed - will retry)',
                    error: error.message
                };
            }
        } else {
            const message = this.user.isGuest() ? 
                '💾 Saved locally (Guest mode)' : 
                '💾 Saved locally';
            return { success: true, message };
        }
    }

    /**
     * Save data to Firestore cloud storage
     * @returns {Promise<void>}
     */
    async saveToCloud() {
        if (this.syncInProgress) {
            console.log('Sync already in progress, skipping...');
            return;
        }

        this.syncInProgress = true;
        
        try {
            const db = this.firebaseConfig.getDatabase();
            const userId = this.user.getUserId();
            
            if (!db || !userId) {
                throw new Error('Database or user not available');
            }

            const docRef = db.collection('workLogs').doc(userId);
            const saveData = {
                entries: this.workLogData,
                projects: this.projects,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                userEmail: this.user.getUserEmail(),
                version: '1.0',
                entryCount: this.getTotalEntries(),
                projectCount: this.projects.length
            };

            await docRef.set(saveData);
            console.log('Data saved to cloud successfully');
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Save data to localStorage
     */
    saveToLocal() {
        try {
            localStorage.setItem('workLogData', JSON.stringify(this.workLogData));
            localStorage.setItem('projectData', JSON.stringify(this.projects));
            localStorage.setItem('lastLocalSave', new Date().toISOString());
            console.log('Data saved to local storage');
        } catch (error) {
            console.error('Error saving to local storage:', error);
            if (error.name === 'QuotaExceededError') {
                throw new Error('Local storage quota exceeded. Please clear some data.');
            }
        }
    }

    /**
     * Get all work log data
     * @returns {Object} - Work log data
     */
    getWorkLogData() {
        return this.workLogData;
    }

    /**
     * Get entries for a specific date
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @returns {Array} - Array of entries
     */
    getEntriesForDate(dateKey) {
        return this.workLogData[dateKey] || [];
    }

    /**
     * Add entry to a specific date
     * @param {string} dateKey - Date key
     * @param {Object} entry - Entry object
     */
    addEntry(dateKey, entry) {
        if (!this.workLogData[dateKey]) {
            this.workLogData[dateKey] = [];
        }
        this.workLogData[dateKey].push(entry);

        // Update project usage count if it's a work entry
        if (entry.type === 'work' && entry.project) {
            this.incrementProjectUsage(entry.project);
        }
    }

    /**
     * Update existing entry
     * @param {string} dateKey - Date key
     * @param {string} entryId - Entry ID
     * @param {Object} updatedEntry - Updated entry object
     * @returns {boolean} - Success status
     */
    updateEntry(dateKey, entryId, updatedEntry) {
        const entries = this.workLogData[dateKey] || [];
        const index = entries.findIndex(entry => entry.id === entryId);
        
        if (index !== -1) {
            const oldEntry = entries[index];
            
            // Update project usage counts
            if (oldEntry.type === 'work' && oldEntry.project) {
                this.decrementProjectUsage(oldEntry.project);
            }
            if (updatedEntry.type === 'work' && updatedEntry.project) {
                this.incrementProjectUsage(updatedEntry.project);
            }
            
            entries[index] = updatedEntry;
            return true;
        }
        return false;
    }

    /**
     * Delete entry from a specific date
     * @param {string} dateKey - Date key
     * @param {string} entryId - Entry ID
     * @returns {boolean} - Success status
     */
    deleteEntry(dateKey, entryId) {
        if (this.workLogData[dateKey]) {
            const entries = this.workLogData[dateKey];
            const entryIndex = entries.findIndex(entry => entry.id === entryId);
            
            if (entryIndex !== -1) {
                const deletedEntry = entries[entryIndex];
                
                // Update project usage count
                if (deletedEntry.type === 'work' && deletedEntry.project) {
                    this.decrementProjectUsage(deletedEntry.project);
                }
                
                this.workLogData[dateKey] = entries.filter(entry => entry.id !== entryId);
                
                // Clean up empty date entries
                if (this.workLogData[dateKey].length === 0) {
                    delete this.workLogData[dateKey];
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Get all projects
     * @returns {Array} - Array of projects
     */
    getProjects() {
        return this.projects;
    }

    /**
     * Set projects array
     * @param {Array} projects - Projects array
     */
    setProjects(projects) {
        this.projects = projects;
    }

    /**
     * Add new project
     * @param {Object} project - Project object
     */
    addProject(project) {
        this.projects.push(project);
    }

    /**
     * Update existing project
     * @param {string} projectId - Project ID
     * @param {Object} updatedProject - Updated project object
     * @returns {boolean} - Success status
     */
    updateProject(projectId, updatedProject) {
        const index = this.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            this.projects[index] = updatedProject;
            return true;
        }
        return false;
    }

    /**
     * Delete project
     * @param {string} projectId - Project ID
     * @returns {boolean} - Success status
     */
    deleteProject(projectId) {
        const isUsed = this.isProjectInUse(projectId);
        if (isUsed) {
            throw new Error('Cannot delete project that is used in entries');
        }
        
        const index = this.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            this.projects.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Find project by ID
     * @param {string} projectId - Project ID
     * @returns {Object|null} - Project object or null
     */
    findProject(projectId) {
        return this.projects.find(p => p.id === projectId) || null;
    }

    /**
     * Find project by value (projectId-subCode)
     * @param {string} value - Project value
     * @returns {Object|null} - Project object or null
     */
    findProjectByValue(value) {
        return this.projects.find(p => {
            const projectValue = `${p.projectId}-${p.subCode}`;
            return projectValue === value;
        }) || null;
    }

    /**
     * Check if project is used in any entries
     * @param {string} projectId - Project ID
     * @returns {boolean} - Usage status
     */
    isProjectInUse(projectId) {
        const project = this.findProject(projectId);
        if (!project) return false;
        
        const projectValue = `${project.projectId}-${project.subCode}`;
        
        return Object.values(this.workLogData).some(entries =>
            entries.some(entry => entry.project === projectValue)
        );
    }

    /**
     * Increment project usage count
     * @param {string} projectValue - Project value (projectId-subCode)
     */
    incrementProjectUsage(projectValue) {
        const project = this.findProjectByValue(projectValue);
        if (project) {
            project.usageCount = (project.usageCount || 0) + 1;
        }
    }

    /**
     * Decrement project usage count
     * @param {string} projectValue - Project value (projectId-subCode)
     */
    decrementProjectUsage(projectValue) {
        const project = this.findProjectByValue(projectValue);
        if (project && project.usageCount > 0) {
            project.usageCount--;
        }
    }

    /**
     * Get all dates with entries
     * @returns {Array} - Sorted array of date keys
     */
    getAllDatesWithEntries() {
        return Object.keys(this.workLogData).sort();
    }

    /**
     * Get total number of entries
     * @returns {number} - Total entry count
     */
    getTotalEntries() {
        return Object.values(this.workLogData).reduce(
            (total, entries) => total + entries.length, 0
        );
    }

    /**
     * Get entries for date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Object} - Entries grouped by date
     */
    getEntriesForDateRange(startDate, endDate) {
        const result = {};
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        Object.keys(this.workLogData).forEach(dateKey => {
            const date = new Date(dateKey);
            if (date >= start && date <= end) {
                result[dateKey] = this.workLogData[dateKey];
            }
        });
        
        return result;
    }

    /**
     * Clear all data
     */
    clearData() {
        this.workLogData = {};
        this.projects = [];
        this.lastSyncTime = null;
        
        // Clear local storage
        localStorage.removeItem('workLogData');
        localStorage.removeItem('projectData');
        localStorage.removeItem('lastLocalSave');
        
        console.log('All data cleared');
    }

    /**
     * Export complete data
     * @returns {Object} - Complete data export
     */
    exportData() {
        return {
            workLogData: this.workLogData,
            projects: this.projects,
            exportDate: new Date().toISOString(),
            totalEntries: this.getTotalEntries(),
            totalProjects: this.projects.length,
            dateRange: this.getDateRange(),
            lastSyncTime: this.lastSyncTime,
            userInfo: {
                userId: this.user.getUserId(),
                email: this.user.getUserEmail(),
                displayName: this.user.getUserDisplayName(),
                isGuest: this.user.isGuest()
            }
        };
    }

    /**
     * Import data from export
     * @param {Object} data - Imported data
     * @returns {boolean} - Success status
     */
    importData(data) {
        try {
            if (data.workLogData) {
                this.workLogData = data.workLogData;
            }
            if (data.projects && Array.isArray(data.projects)) {
                this.projects = data.projects;
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * Get date range of entries
     * @returns {Object} - Date range information
     */
    getDateRange() {
        const dates = this.getAllDatesWithEntries();
        if (dates.length === 0) {
            return { earliest: null, latest: null, totalDays: 0 };
        }
        
        return {
            earliest: dates[0],
            latest: dates[dates.length - 1],
            totalDays: dates.length
        };
    }

    /**
     * Get sync status
     * @returns {Object} - Sync status information
     */
    getSyncStatus() {
        return {
            isCloudEnabled: this.user.isAuthenticated() && !this.user.isGuest() && this.firebaseConfig.isInitialized(),
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            totalEntries: this.getTotalEntries(),
            totalProjects: this.projects.length
        };
    }

    /**
     * Force sync with cloud
     * @returns {Promise<Object>} - Sync result
     */
    async forceSync() {
        if (!this.user.isAuthenticated() || this.user.isGuest()) {
            throw new Error('Sync not available for guest users');
        }
        
        if (!this.firebaseConfig.isInitialized()) {
            throw new Error('Firebase not initialized');
        }
        
        return await this.saveData();
    }
}

export default DataService;
