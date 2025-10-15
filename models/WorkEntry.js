// models/WorkEntry.js
// Work Entry Data Model

class WorkEntry {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.type = data.type || 'work'; // 'work', 'fullLeave', 'halfLeave', 'holiday'
        this.project = data.project || '';
        this.hours = data.hours || 0;
        this.halfDayPeriod = data.halfDayPeriod || ''; // 'morning', 'afternoon'
        this.comments = data.comments || '';
        this.timestamp = data.timestamp || new Date().toISOString();
        this.date = data.date || '';
    }

    /**
     * Get static entry types configuration
     * @returns {Object} - Entry types with display information
     */
    static getEntryTypes() {
        return {
            work: { 
                label: "Work Entry", 
                color: "#3b82f6", 
                maxHours: 8,
                description: "Regular work hours"
            },
            fullLeave: { 
                label: "Full Day Leave", 
                color: "#ef4444", 
                maxHours: 8,
                description: "Complete day off"
            },
            halfLeave: { 
                label: "Half Day Leave", 
                color: "#f97316", 
                maxHours: 4,
                description: "Half day off (morning/afternoon)"
            },
            holiday: { 
                label: "Holiday", 
                color: "#22c55e", 
                maxHours: 8,
                description: "Public or company holiday"
            }
        };
    }

    /**
     * Validate entry data
     * @returns {Object} - Validation result with errors
     */
    validate() {
        const errors = [];

        if (!this.type) {
            errors.push('Entry type is required');
        }

        if (!Object.keys(WorkEntry.getEntryTypes()).includes(this.type)) {
            errors.push('Invalid entry type');
        }

        if (this.type === 'work') {
            if (!this.project) {
                errors.push('Project selection is required for work entries');
            }
            if (!this.hours || this.hours <= 0) {
                errors.push('Hours must be greater than 0 for work entries');
            }
            if (this.hours > 8) {
                errors.push('Hours cannot exceed 8 for work entries');
            }
        }

        if (this.type === 'halfLeave') {
            if (!this.halfDayPeriod) {
                errors.push('Time period is required for half-day leave');
            }
            if (!['morning', 'afternoon'].includes(this.halfDayPeriod)) {
                errors.push('Invalid half-day period');
            }
        }

        // Validate hours format
        if (this.hours && (isNaN(this.hours) || this.hours < 0)) {
            errors.push('Hours must be a valid positive number');
        }

        // Validate comments length
        if (this.comments && this.comments.length > 500) {
            errors.push('Comments cannot exceed 500 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get hours for this entry based on type
     * @returns {number} - Hours for this entry
     */
    getHours() {
        switch (this.type) {
            case 'work':
                return this.hours || 0;
            case 'halfLeave':
                return 4;
            case 'fullLeave':
            case 'holiday':
                return 8;
            default:
                return 0;
        }
    }

    /**
     * Update entry data
     * @param {Object} data - New entry data
     */
    update(data) {
        const allowedFields = [
            'type', 'project', 'hours', 'halfDayPeriod', 'comments', 'date'
        ];
        
        allowedFields.forEach(field => {
            if (data.hasOwnProperty(field)) {
                this[field] = data[field];
            }
        });
        
        this.timestamp = new Date().toISOString();
    }

    /**
     * Convert entry to plain object for storage
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            type: this.type,
            project: this.project,
            hours: this.hours,
            halfDayPeriod: this.halfDayPeriod,
            comments: this.comments,
            timestamp: this.timestamp,
            date: this.date
        };
    }

    /**
     * Create WorkEntry from plain object
     * @param {Object} obj - Plain object data
     * @returns {WorkEntry} - New WorkEntry instance
     */
    static fromObject(obj) {
        return new WorkEntry(obj);
    }

    /**
     * Generate unique ID
     * @returns {string} - Unique identifier
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get entry type information
     * @returns {Object} - Type configuration object
     */
    getTypeInfo() {
        const entryTypes = WorkEntry.getEntryTypes();
        return entryTypes[this.type] || entryTypes.work;
    }

    /**
     * Get formatted display text for the entry
     * @returns {string} - Display text
     */
    getDisplayText() {
        const typeInfo = this.getTypeInfo();
        let text = typeInfo.label;
        
        if (this.project) {
            text += ` - ${this.project}`;
        }
        
        const hours = this.getHours();
        if (hours > 0) {
            text += ` (${hours}h)`;
        }
        
        return text;
    }

    /**
     * Get entry summary for reporting
     * @returns {Object} - Entry summary
     */
    getSummary() {
        return {
            id: this.id,
            type: this.type,
            typeLabel: this.getTypeInfo().label,
            project: this.project,
            hours: this.getHours(),
            halfDayPeriod: this.halfDayPeriod,
            comments: this.comments,
            date: this.date,
            timestamp: this.timestamp
        };
    }

    /**
     * Clone entry
     * @returns {WorkEntry} - Cloned entry
     */
    clone() {
        const cloned = new WorkEntry(this.toObject());
        cloned.id = this.generateId(); // Generate new ID for clone
        return cloned;
    }

    /**
     * Check if entry is for a specific date
     * @param {string} dateKey - Date key to check
     * @returns {boolean} - Whether entry matches date
     */
    isForDate(dateKey) {
        return this.date === dateKey;
    }

    /**
     * Get entry age in days
     * @returns {number} - Age in days
     */
    getAgeInDays() {
        const entryDate = new Date(this.timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - entryDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Format entry for CSV export
     * @returns {Array} - Array of values for CSV
     */
    toCsvRow() {
        return [
            this.date,
            this.getTypeInfo().label,
            this.project || 'N/A',
            this.getHours(),
            this.halfDayPeriod || 'N/A',
            this.comments || 'N/A',
            this.timestamp
        ];
    }

    /**
     * Get validation rules for entry type
     * @returns {Object} - Validation rules
     */
    getValidationRules() {
        const rules = {
            type: { required: true },
            hours: { min: 0, max: 8 },
            comments: { maxLength: 500 }
        };

        if (this.type === 'work') {
            rules.project = { required: true };
            rules.hours.required = true;
            rules.hours.min = 0.5;
        }

        if (this.type === 'halfLeave') {
            rules.halfDayPeriod = { required: true };
        }

        return rules;
    }
}

export default WorkEntry;
