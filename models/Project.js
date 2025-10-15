// models/Project.js
// Project Model Class - Project data structure and operations

class Project {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.projectId = data.projectId || '';
        this.subCode = data.subCode || '';
        this.projectTitle = data.projectTitle || '';
        this.category = data.category || '';
        this.description = data.description || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.color = data.color || this.getRandomColor();
        this.usageCount = data.usageCount || 0;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.userId = data.userId || '';
        
        // Validate data
        this.validate();
    }

    /**
     * Generate unique ID for project
     * @returns {string} - Unique ID
     */
    generateId() {
        return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate project data
     * @throws {Error} - Validation error
     */
    validate() {
        const errors = [];

        // Validate required fields
        if (!this.projectId || this.projectId.trim().length === 0) {
            errors.push('Project ID is required');
        }

        if (!this.subCode || this.subCode.trim().length === 0) {
            errors.push('Sub code is required');
        }

        if (!this.projectTitle || this.projectTitle.trim().length === 0) {
            errors.push('Project title is required');
        }

        // Validate field lengths
        if (this.projectId.length > 50) {
            errors.push('Project ID cannot exceed 50 characters');
        }

        if (this.subCode.length > 20) {
            errors.push('Sub code cannot exceed 20 characters');
        }

        if (this.projectTitle.length > 100) {
            errors.push('Project title cannot exceed 100 characters');
        }

        if (this.description && this.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }

        // Validate project ID format (alphanumeric with hyphens)
        const projectIdRegex = /^[A-Z0-9\-]+$/i;
        if (!projectIdRegex.test(this.projectId)) {
            errors.push('Project ID can only contain letters, numbers, and hyphens');
        }

        // Validate sub code format (alphanumeric)
        const subCodeRegex = /^[A-Z0-9]+$/i;
        if (!subCodeRegex.test(this.subCode)) {
            errors.push('Sub code can only contain letters and numbers');
        }

        // Validate category
        const validCategories = [
            'Strategy', 'Development', 'Testing', 'Controller', 
            'Tracking', 'Overhead', 'Research', 'Maintenance',
            'Documentation', 'Training'
        ];
        
        if (this.category && !validCategories.includes(this.category)) {
            errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
        }

        if (errors.length > 0) {
            throw new Error(`Project validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Get random color for project
     * @returns {string} - Hex color code
     */
    getRandomColor() {
        const colors = [
            '#3b82f6', // Blue
            '#ef4444', // Red
            '#22c55e', // Green
            '#f59e0b', // Amber
            '#8b5cf6', // Violet
            '#06b6d4', // Cyan
            '#f97316', // Orange
            '#84cc16', // Lime
            '#ec4899', // Pink
            '#6b7280'  // Gray
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Get project value (combination of projectId and subCode)
     * @returns {string} - Project value for selections
     */
    getValue() {
        return `${this.projectId}-${this.subCode}`;
    }

    /**
     * Get project display name
     * @returns {string} - Display name for UI
     */
    getDisplayName() {
        return `${this.projectId} ${this.subCode} - ${this.projectTitle}`;
    }

    /**
     * Get short display name
     * @returns {string} - Short display name
     */
    getShortName() {
        return `${this.projectId} ${this.subCode}`;
    }

    /**
     * Get project charge code
     * @returns {string} - Charge code for billing
     */
    getChargeCode() {
        return `${this.projectId}-${this.subCode}`;
    }

    /**
     * Get category information
     * @returns {Object} - Category details
     */
    getCategoryInfo() {
        const categoryInfo = {
            'Strategy': {
                icon: '📋',
                color: '#3b82f6',
                description: 'Strategic planning and analysis'
            },
            'Development': {
                icon: '💻',
                color: '#22c55e',
                description: 'Software development and coding'
            },
            'Testing': {
                icon: '🧪',
                color: '#f59e0b',
                description: 'Quality assurance and testing'
            },
            'Controller': {
                icon: '🎛️',
                color: '#8b5cf6',
                description: 'Control systems and hardware'
            },
            'Tracking': {
                icon: '📊',
                color: '#06b6d4',
                description: 'Progress tracking and monitoring'
            },
            'Overhead': {
                icon: '📈',
                color: '#6b7280',
                description: 'General overhead activities'
            },
            'Research': {
                icon: '🔬',
                color: '#ec4899',
                description: 'Research and development'
            },
            'Maintenance': {
                icon: '🔧',
                color: '#f97316',
                description: 'System maintenance and support'
            },
            'Documentation': {
                icon: '📝',
                color: '#84cc16',
                description: 'Documentation and reporting'
            },
            'Training': {
                icon: '🎓',
                color: '#ef4444',
                description: 'Training and education'
            }
        };

        return categoryInfo[this.category] || {
            icon: '📂',
            color: '#6b7280',
            description: 'General project category'
        };
    }

    /**
     * Get project statistics
     * @returns {Object} - Project usage statistics
     */
    getStats() {
        return {
            id: this.id,
            projectId: this.projectId,
            subCode: this.subCode,
            usageCount: this.usageCount,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            category: this.category,
            categoryInfo: this.getCategoryInfo()
        };
    }

    /**
     * Increment usage count
     */
    incrementUsage() {
        this.usageCount++;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Toggle active status
     * @returns {boolean} - New active status
     */
    toggleActive() {
        this.isActive = !this.isActive;
        this.updatedAt = new Date().toISOString();
        return this.isActive;
    }

    /**
     * Update project data
     * @param {Object} updateData - Data to update
     * @returns {Project} - Updated project instance
     */
    update(updateData) {
        const allowedFields = [
            'projectId', 'subCode', 'projectTitle', 'category', 
            'description', 'isActive', 'color'
        ];
        
        allowedFields.forEach(field => {
            if (updateData.hasOwnProperty(field)) {
                this[field] = updateData[field];
            }
        });

        // Update timestamp
        this.updatedAt = new Date().toISOString();
        
        // Re-validate
        this.validate();
        
        return this;
    }

    /**
     * Convert project to JSON
     * @returns {Object} - JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            projectId: this.projectId,
            subCode: this.subCode,
            projectTitle: this.projectTitle,
            category: this.category,
            description: this.description,
            isActive: this.isActive,
            color: this.color,
            usageCount: this.usageCount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            userId: this.userId
        };
    }

    /**
     * Clone project
     * @param {Object} overrides - Fields to override in clone
     * @returns {Project} - Cloned project
     */
    clone(overrides = {}) {
        const data = { ...this.toJSON(), ...overrides };
        delete data.id; // Generate new ID
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        return new Project(data);
    }

    /**
     * Check if project matches search query
     * @param {string} query - Search query
     * @returns {boolean} - Whether project matches
     */
    matchesSearch(query) {
        if (!query || query.trim().length === 0) return true;
        
        const searchText = query.toLowerCase().trim();
        const searchFields = [
            this.projectId,
            this.subCode,
            this.projectTitle,
            this.category,
            this.description,
            this.getDisplayName(),
            this.getChargeCode()
        ];

        return searchFields.some(field => 
            field && field.toLowerCase().includes(searchText)
        );
    }

    /**
     * Get project for dropdown option
     * @returns {Object} - Option data for dropdowns
     */
    getOptionData() {
        return {
            value: this.getValue(),
            label: this.getDisplayName(),
            projectId: this.projectId,
            subCode: this.subCode,
            title: this.projectTitle,
            category: this.category,
            color: this.color,
            isActive: this.isActive,
            usageCount: this.usageCount
        };
    }

    /**
     * Get project summary for reporting
     * @returns {Object} - Project summary
     */
    getSummary() {
        return {
            projectId: this.projectId,
            subCode: this.subCode,
            title: this.projectTitle,
            category: this.category,
            chargeCode: this.getChargeCode(),
            displayName: this.getDisplayName(),
            isActive: this.isActive,
            usageCount: this.usageCount,
            categoryIcon: this.getCategoryInfo().icon
        };
    }

    /**
     * Check if project is similar to another project
     * @param {Project} otherProject - Other project to compare
     * @returns {boolean} - Whether projects are similar
     */
    isSimilarTo(otherProject) {
        if (this.id === otherProject.id) return false;
        
        // Same project ID and sub code
        if (this.projectId === otherProject.projectId && 
            this.subCode === otherProject.subCode) {
            return true;
        }
        
        // Very similar titles
        const similarity = this.calculateTitleSimilarity(otherProject.projectTitle);
        return similarity > 0.8;
    }

    /**
     * Calculate title similarity with another project
     * @param {string} otherTitle - Other project title
     * @returns {number} - Similarity score (0-1)
     */
    calculateTitleSimilarity(otherTitle) {
        if (!this.projectTitle || !otherTitle) return 0;
        
        const title1 = this.projectTitle.toLowerCase().trim();
        const title2 = otherTitle.toLowerCase().trim();
        
        if (title1 === title2) return 1;
        
        // Simple similarity based on common words
        const words1 = title1.split(/\s+/);
        const words2 = title2.split(/\s+/);
        const commonWords = words1.filter(word => 
            word.length > 2 && words2.includes(word)
        ).length;
        
        return commonWords / Math.max(words1.length, words2.length);
    }

    /**
     * Static method to create project from CSV row
     * @param {Array} csvRow - CSV row data
     * @param {Array} headers - CSV headers
     * @returns {Project} - New project instance
     */
    static fromCSV(csvRow, headers) {
        const data = {};
        headers.forEach((header, index) => {
            const value = csvRow[index];
            
            switch (header.toLowerCase()) {
                case 'project id':
                case 'projectid':
                    data.projectId = value;
                    break;
                case 'sub code':
                case 'subcode':
                    data.subCode = value;
                    break;
                case 'project title':
                case 'title':
                    data.projectTitle = value;
                    break;
                case 'category':
                    data.category = value;
                    break;
                case 'description':
                    data.description = value;
                    break;
                case 'active':
                case 'is active':
                    data.isActive = value.toLowerCase() === 'true';
                    break;
                case 'color':
                    data.color = value;
                    break;
            }
        });

        return new Project(data);
    }

    /**
     * Static method to get default projects
     * @returns {Array} - Array of default projects
     */
    static getDefaultProjects() {
        return [
            new Project({
                projectId: 'IN-1100-NA',
                subCode: '0010',
                projectTitle: 'General Overhead',
                category: 'Overhead'
            }),
            new Project({
                projectId: 'WV-1112-4152',
                subCode: '0210',
                projectTitle: 'ASStrategy',
                category: 'Strategy'
            }),
            new Project({
                projectId: 'WV-1112-4152',
                subCode: '1010',
                projectTitle: 'ASStrategy Development',
                category: 'Development'
            }),
            new Project({
                projectId: 'RW-1173-9573P00303',
                subCode: '0010',
                projectTitle: 'RW Tracking',
                category: 'Tracking'
            }),
            new Project({
                projectId: 'WV-1137-D75B1-C4285-08-03',
                subCode: '1250',
                projectTitle: 'MERCIA INSIGNIA Electronic Controller',
                category: 'Controller'
            })
        ];
    }

    /**
     * Static method to sort projects
     * @param {Array} projects - Array of projects
     * @param {string} sortBy - Sort criteria
     * @param {string} order - Sort order (asc/desc)
     * @returns {Array} - Sorted projects
     */
    static sortProjects(projects, sortBy = 'usage', order = 'desc') {
        return projects.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'usage':
                    valueA = a.usageCount;
                    valueB = b.usageCount;
                    break;
                case 'name':
                    valueA = a.getDisplayName().toLowerCase();
                    valueB = b.getDisplayName().toLowerCase();
                    break;
                case 'category':
                    valueA = a.category;
                    valueB = b.category;
                    break;
                case 'created':
                    valueA = new Date(a.createdAt);
                    valueB = new Date(b.createdAt);
                    break;
                default:
                    valueA = a.projectId;
                    valueB = b.projectId;
            }
            
            if (order === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });
    }

    /**
     * Static method to filter projects
     * @param {Array} projects - Array of projects
     * @param {Object} filters - Filter criteria
     * @returns {Array} - Filtered projects
     */
    static filterProjects(projects, filters = {}) {
        return projects.filter(project => {
            if (filters.category && project.category !== filters.category) {
                return false;
            }
            
            if (filters.active !== undefined && project.isActive !== filters.active) {
                return false;
            }
            
            if (filters.search && !project.matchesSearch(filters.search)) {
                return false;
            }
            
            if (filters.minUsage && project.usageCount < filters.minUsage) {
                return false;
            }
            
            return true;
        });
    }
}

export default Project;
