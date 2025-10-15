// models/Project.js
// Project Data Model

class Project {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.projectId = data.projectId || '';
        this.subCode = data.subCode || '';
        this.projectTitle = data.projectTitle || '';
        this.category = data.category || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.usageCount = data.usageCount || 0;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.description = data.description || '';
        this.priority = data.priority || 'medium'; // low, medium, high
    }

    /**
     * Validate project data
     * @returns {Object} - Validation result
     */
    validate() {
        const errors = [];

        if (!this.projectId.trim()) {
            errors.push('Project ID is required');
        }

        if (this.projectId.length > 50) {
            errors.push('Project ID cannot exceed 50 characters');
        }

        if (!this.subCode.trim()) {
            errors.push('Sub code is required');
        }

        if (this.subCode.length > 20) {
            errors.push('Sub code cannot exceed 20 characters');
        }

        if (!this.projectTitle.trim()) {
            errors.push('Project title is required');
        }

        if (this.projectTitle.length > 100) {
            errors.push('Project title cannot exceed 100 characters');
        }

        if (!this.category.trim()) {
            errors.push('Category is required');
        }

        if (this.description && this.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }

        // Validate priority
        if (!['low', 'medium', 'high'].includes(this.priority)) {
            errors.push('Priority must be low, medium, or high');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Update project data
     * @param {Object} data - Updated project data
     */
    update(data) {
        const allowedFields = [
            'projectId', 'subCode', 'projectTitle', 'category', 
            'isActive', 'description', 'priority'
        ];
        
        allowedFields.forEach(field => {
            if (data.hasOwnProperty(field)) {
                this[field] = data[field];
            }
        });
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Increment usage count
     */
    incrementUsage() {
        this.usageCount++;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Decrement usage count
     */
    decrementUsage() {
        if (this.usageCount > 0) {
            this.usageCount--;
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Get display name for dropdown
     * @returns {string} - Formatted display name
     */
    getDisplayName() {
        return `${this.projectId} (${this.subCode}) - ${this.projectTitle}`;
    }

    /**
     * Get compact display name
     * @returns {string} - Short display name
     */
    getCompactName() {
        return `${this.projectId}-${this.subCode}`;
    }

    /**
     * Get value for form selection
     * @returns {string} - Selection value
     */
    getValue() {
        return `${this.projectId}-${this.subCode}`;
    }

    /**
     * Get formatted display for project details
     * @returns {Object} - Formatted project information
     */
    getFormattedDisplay() {
        return {
            header: `${this.projectId} (${this.subCode})`,
            title: this.projectTitle,
            category: this.category,
            usage: this.usageCount,
            status: this.isActive ? 'Active' : 'Inactive',
            priority: this.priority,
            description: this.description,
            created: new Date(this.createdAt).toLocaleDateString(),
            updated: new Date(this.updatedAt).toLocaleDateString()
        };
    }

    /**
     * Convert to plain object
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            projectId: this.projectId,
            subCode: this.subCode,
            projectTitle: this.projectTitle,
            category: this.category,
            isActive: this.isActive,
            usageCount: this.usageCount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            description: this.description,
            priority: this.priority
        };
    }

    /**
     * Create from plain object
     * @param {Object} obj - Plain object data
     * @returns {Project} - New Project instance
     */
    static fromObject(obj) {
        return new Project(obj);
    }

    /**
     * Generate unique ID
     * @returns {string} - Unique identifier
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Clone project
     * @returns {Project} - Cloned project
     */
    clone() {
        const cloned = new Project(this.toObject());
        cloned.id = this.generateId(); // Generate new ID for clone
        cloned.usageCount = 0; // Reset usage count for cloned project
        return cloned;
    }

    /**
     * Activate project
     */
    activate() {
        this.isActive = true;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Deactivate project
     */
    deactivate() {
        this.isActive = false;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Get project age in days
     * @returns {number} - Age in days
     */
    getAgeInDays() {
        const createdDate = new Date(this.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - createdDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Get default projects for initialization
     * @returns {Array<Project>} - Array of default projects
     */
    static getDefaultProjects() {
        const defaultProjectsData = [
            {
                id: "1",
                projectId: "IN-1100-NA",
                subCode: "0010",
                projectTitle: "General Overhead",
                category: "Overhead",
                isActive: true,
                usageCount: 0,
                description: "General administrative and overhead tasks"
            },
            {
                id: "2",
                projectId: "WV-1112-4152",
                subCode: "0210",
                projectTitle: "AS_Strategy",
                category: "Strategy",
                isActive: true,
                usageCount: 0,
                description: "Strategic planning and analysis"
            },
            {
                id: "3",
                projectId: "WV-1112-4152",
                subCode: "1010",
                projectTitle: "AS_Strategy",
                category: "Strategy",
                isActive: true,
                usageCount: 0,
                description: "Strategic implementation phase 1"
            },
            {
                id: "4",
                projectId: "WV-1112-4152",
                subCode: "1020",
                projectTitle: "AS_Strategy",
                category: "Strategy",
                isActive: true,
                usageCount: 0,
                description: "Strategic implementation phase 2"
            },
            {
                id: "5",
                projectId: "RW-1173-9573P00303",
                subCode: "0010",
                projectTitle: "RW Tracking",
                category: "Tracking",
                isActive: true,
                usageCount: 0,
                description: "Request workflow tracking system"
            },
            {
                id: "6",
                projectId: "WV-1137-D75B1-C4285-08-03",
                subCode: "1250",
                projectTitle: "MERCIA_INSIGNIA_ElectronicController_Mil",
                category: "Controller",
                isActive: true,
                usageCount: 0,
                description: "Military electronic controller development"
            },
            {
                id: "7",
                projectId: "WV-1116-4306",
                subCode: "0020",
                projectTitle: "SensorLess_Controller_Demo",
                category: "Controller",
                isActive: true,
                usageCount: 0,
                description: "Sensorless controller demonstration project"
            }
        ];

        return defaultProjectsData.map(data => new Project(data));
    }

    /**
     * Check for duplicate projects
     * @param {Array<Project>} projects - Array of projects to check
     * @param {string} projectId - Project ID to check
     * @param {string} subCode - Sub code to check
     * @param {string} excludeId - ID to exclude from duplicate check
     * @returns {boolean} - Whether duplicate exists
     */
    static isDuplicate(projects, projectId, subCode, excludeId = null) {
        return projects.some(p => 
            p.id !== excludeId &&
            p.projectId === projectId && 
            p.subCode === subCode
        );
    }

    /**
     * Get available categories
     * @returns {Array<string>} - List of available categories
     */
    static getAvailableCategories() {
        return [
            'Strategy',
            'Development',
            'Testing',
            'Controller',
            'Tracking',
            'Overhead',
            'Research',
            'Maintenance',
            'Documentation',
            'Training'
        ];
    }

    /**
     * Search projects by term
     * @param {Array<Project>} projects - Projects to search
     * @param {string} searchTerm - Search term
     * @returns {Array<Project>} - Filtered projects
     */
    static search(projects, searchTerm) {
        if (!searchTerm) return projects;

        const term = searchTerm.toLowerCase();
        return projects.filter(project => 
            project.projectId.toLowerCase().includes(term) ||
            project.subCode.toLowerCase().includes(term) ||
            project.projectTitle.toLowerCase().includes(term) ||
            project.category.toLowerCase().includes(term) ||
            project.description.toLowerCase().includes(term)
        );
    }

    /**
     * Sort projects by field
     * @param {Array<Project>} projects - Projects to sort
     * @param {string} field - Field to sort by
     * @param {string} order - Sort order ('asc' or 'desc')
     * @returns {Array<Project>} - Sorted projects
     */
    static sort(projects, field = 'projectId', order = 'asc') {
        return [...projects].sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (order === 'desc') {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            } else {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            }
        });
    }
}

export default Project;
