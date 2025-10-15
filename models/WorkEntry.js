// models/WorkEntry.js
// Work Entry Model Class - Individual work entry data structure and operations

class WorkEntry {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.type = data.type || 'work'; // work, fullLeave, halfLeave, holiday
        this.date = data.date || new Date().toISOString().split('T')[0];
        this.project = data.project || '';
        this.hours = parseFloat(data.hours) || 0;
        this.halfDayPeriod = data.halfDayPeriod || ''; // morning, afternoon
        this.comments = data.comments || '';
        this.timestamp = data.timestamp || new Date().toISOString();
        this.userId = data.userId || '';
        
        // Validate data
        this.validate();
    }

    /**
     * Generate unique ID for entry
     * @returns {string} - Unique ID
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate entry data
     * @throws {Error} - Validation error
     */
    validate() {
        const errors = [];

        // Validate entry type
        const validTypes = ['work', 'fullLeave', 'halfLeave', 'holiday'];
        if (!validTypes.includes(this.type)) {
            errors.push(`Invalid entry type: ${this.type}`);
        }

        // Validate date format
        if (!this.isValidDate(this.date)) {
            errors.push('Invalid date format');
        }

        // Validate hours for work entries
        if (this.type === 'work') {
            if (!this.project) {
                errors.push('Project is required for work entries');
            }
            if (this.hours <= 0 || this.hours > 24) {
                errors.push('Work hours must be between 0 and 24');
            }
        }

        // Validate half day period for half leave
        if (this.type === 'halfLeave') {
            const validPeriods = ['morning', 'afternoon'];
            if (!validPeriods.includes(this.halfDayPeriod)) {
                errors.push('Half day period must be morning or afternoon');
            }
        }

        // Validate comments length
        if (this.comments && this.comments.length > 500) {
            errors.push('Comments cannot exceed 500 characters');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Check if date string is valid
     * @param {string} dateString - Date string to validate
     * @returns {boolean} - Whether date is valid
     */
    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        const date = new Date(dateString);
        const timestamp = date.getTime();
        
        if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
            return false;
        }
        
        return dateString === date.toISOString().split('T')[0];
    }

    /**
     * Get entry type information
     * @returns {Object} - Entry type details
     */
    getTypeInfo() {
        const typeInfo = {
            work: {
                label: 'Work Entry',
                color: '#2563eb',
                icon: '💼',
                description: 'Regular work hours'
            },
            fullLeave: {
                label: 'Full Day Leave',
                color: '#dc2626',
                icon: '🏖️',
                description: 'Full day absence'
            },
            halfLeave: {
                label: 'Half Day Leave',
                color: '#ea580c',
                icon: '🌅',
                description: 'Half day absence'
            },
            holiday: {
                label: 'Holiday',
                color: '#16a34a',
                icon: '🎉',
                description: 'Public holiday or company holiday'
            }
        };

        return typeInfo[this.type] || {
            label: this.type,
            color: '#6b7280',
            icon: '📝',
            description: 'Custom entry type'
        };
    }

    /**
     * Get calculated hours based on entry type
     * @returns {number} - Hours for this entry
     */
    getHours() {
        switch (this.type) {
            case 'work':
                return this.hours;
            case 'fullLeave':
            case 'holiday':
                return 8; // Standard full day
            case 'halfLeave':
                return 4; // Standard half day
            default:
                return 0;
        }
    }

    /**
     * Get entry display name
     * @returns {string} - Display name for entry
     */
    getDisplayName() {
        const typeInfo = this.getTypeInfo();
        
        if (this.type === 'work' && this.project) {
            return `${typeInfo.label} - ${this.project}`;
        }
        
        if (this.type === 'halfLeave' && this.halfDayPeriod) {
            const period = this.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon';
            return `${typeInfo.label} (${period})`;
        }
        
        return typeInfo.label;
    }

    /**
     * Get formatted date
     * @param {string} format - Date format (short, long, relative)
     * @returns {string} - Formatted date
     */
    getFormattedDate(format = 'short') {
        const date = new Date(this.date);
        
        switch (format) {
            case 'long':
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'relative':
                const today = new Date();
                const diffTime = date.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) return 'Today';
                if (diffDays === -1) return 'Yesterday';
                if (diffDays === 1) return 'Tomorrow';
                if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
                if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
                
                return this.getFormattedDate('short');
            case 'short':
            default:
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
        }
    }

    /**
     * Get day of week
     * @returns {string} - Day of week name
     */
    getDayOfWeek() {
        const date = new Date(this.date);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    /**
     * Check if entry is on weekend
     * @returns {boolean} - Whether entry is on weekend
     */
    isWeekend() {
        const date = new Date(this.date);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    }

    /**
     * Get detailed entry information
     * @returns {Object} - Detailed entry info
     */
    getDetailedInfo() {
        return {
            id: this.id,
            type: this.type,
            typeInfo: this.getTypeInfo(),
            date: this.date,
            formattedDate: this.getFormattedDate('long'),
            dayOfWeek: this.getDayOfWeek(),
            isWeekend: this.isWeekend(),
            project: this.project,
            hours: this.getHours(),
            actualHours: this.hours,
            halfDayPeriod: this.halfDayPeriod,
            comments: this.comments,
            displayName: this.getDisplayName(),
            timestamp: this.timestamp,
            userId: this.userId
        };
    }

    /**
     * Convert entry to JSON
     * @returns {Object} - JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            date: this.date,
            project: this.project,
            hours: this.hours,
            halfDayPeriod: this.halfDayPeriod,
            comments: this.comments,
            timestamp: this.timestamp,
            userId: this.userId
        };
    }

    /**
     * Update entry data
     * @param {Object} updateData - Data to update
     * @returns {WorkEntry} - Updated entry instance
     */
    update(updateData) {
        const allowedFields = ['type', 'date', 'project', 'hours', 'halfDayPeriod', 'comments'];
        
        allowedFields.forEach(field => {
            if (updateData.hasOwnProperty(field)) {
                this[field] = updateData[field];
            }
        });

        // Update timestamp
        this.timestamp = new Date().toISOString();
        
        // Re-validate
        this.validate();
        
        return this;
    }

    /**
     * Clone entry
     * @param {Object} overrides - Fields to override in clone
     * @returns {WorkEntry} - Cloned entry
     */
    clone(overrides = {}) {
        const data = { ...this.toJSON(), ...overrides };
        delete data.id; // Generate new ID
        return new WorkEntry(data);
    }

    /**
     * Check if entry conflicts with another entry on the same date
     * @param {WorkEntry} otherEntry - Other entry to check against
     * @returns {boolean} - Whether entries conflict
     */
    conflictsWith(otherEntry) {
        if (this.date !== otherEntry.date) return false;
        if (this.id === otherEntry.id) return false;

        // Full day entries conflict with everything
        if (this.type === 'fullLeave' || this.type === 'holiday' || 
            otherEntry.type === 'fullLeave' || otherEntry.type === 'holiday') {
            return true;
        }

        // Half day conflicts with same period
        if (this.type === 'halfLeave' && otherEntry.type === 'halfLeave') {
            return this.halfDayPeriod === otherEntry.halfDayPeriod;
        }

        return false;
    }

    /**
     * Calculate daily hours limit remaining
     * @param {Array} otherEntriesForDate - Other entries for the same date
     * @returns {number} - Remaining hours available
     */
    getRemainingDailyHours(otherEntriesForDate = []) {
        const maxDailyHours = 8;
        let usedHours = 0;

        otherEntriesForDate.forEach(entry => {
            if (entry.id !== this.id) {
                usedHours += entry.getHours();
            }
        });

        return Math.max(0, maxDailyHours - usedHours);
    }

    /**
     * Get entry summary for reporting
     * @returns {Object} - Entry summary
     */
    getSummary() {
        return {
            date: this.date,
            type: this.type,
            typeName: this.getTypeInfo().label,
            project: this.project || 'N/A',
            hours: this.getHours(),
            period: this.halfDayPeriod || 'Full Day',
            weekend: this.isWeekend(),
            hasComments: !!this.comments
        };
    }

    /**
     * Static method to create entry from CSV row
     * @param {Array} csvRow - CSV row data
     * @param {Array} headers - CSV headers
     * @returns {WorkEntry} - New entry instance
     */
    static fromCSV(csvRow, headers) {
        const data = {};
        headers.forEach((header, index) => {
            const value = csvRow[index];
            
            switch (header.toLowerCase()) {
                case 'date':
                    data.date = value;
                    break;
                case 'type':
                case 'entry type':
                    data.type = value.toLowerCase().replace(/\s+/g, '');
                    break;
                case 'project':
                    data.project = value;
                    break;
                case 'hours':
                    data.hours = parseFloat(value) || 0;
                    break;
                case 'period':
                case 'half day period':
                    data.halfDayPeriod = value.toLowerCase();
                    break;
                case 'comments':
                    data.comments = value;
                    break;
            }
        });

        return new WorkEntry(data);
    }

    /**
     * Static method to validate multiple entries for conflicts
     * @param {Array} entries - Array of WorkEntry instances
     * @returns {Array} - Array of conflict descriptions
     */
    static findConflicts(entries) {
        const conflicts = [];
        const dateGroups = {};

        // Group entries by date
        entries.forEach(entry => {
            if (!dateGroups[entry.date]) {
                dateGroups[entry.date] = [];
            }
            dateGroups[entry.date].push(entry);
        });

        // Check each date for conflicts
        Object.keys(dateGroups).forEach(date => {
            const dateEntries = dateGroups[date];
            
            for (let i = 0; i < dateEntries.length; i++) {
                for (let j = i + 1; j < dateEntries.length; j++) {
                    if (dateEntries[i].conflictsWith(dateEntries[j])) {
                        conflicts.push({
                            date: date,
                            entry1: dateEntries[i].getDisplayName(),
                            entry2: dateEntries[j].getDisplayName(),
                            reason: 'Time period conflict'
                        });
                    }
                }
            }

            // Check daily hours limit
            const totalHours = dateEntries.reduce((sum, entry) => sum + entry.getHours(), 0);
            if (totalHours > 8) {
                conflicts.push({
                    date: date,
                    reason: `Exceeds 8-hour daily limit (${totalHours} hours)`,
                    entries: dateEntries.map(e => e.getDisplayName())
                });
            }
        });

        return conflicts;
    }
}

export default WorkEntry;
