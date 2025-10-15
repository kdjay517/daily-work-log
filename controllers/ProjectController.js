// controllers/ProjectController.js
// Project Management Controller

class ProjectController {
    constructor(dataService) {
        this.dataService = dataService;
        this.elements = {};
        this.eventListeners = [];
        this.searchTerm = '';
        this.sortField = 'projectId';
        this.sortOrder = 'asc';
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Modal and buttons
            manageProjectsBtn: document.getElementById('manageProjectsBtn'),
            projectModal: document.getElementById('projectModal'),
            closeProjectModalBtn: document.getElementById('closeProjectModalBtn'),
            
            // Form elements
            newProjectId: document.getElementById('newProjectId'),
            newSubCode: document.getElementById('newSubCode'),
            newProjectTitle: document.getElementById('newProjectTitle'),
            newProjectCategory: document.getElementById('newProjectCategory'),
            addProjectBtn: document.getElementById('addProjectBtn'),
            
            // Project list and search
            projectsList: document.getElementById('projectsList'),
            searchProjects: document.getElementById('searchProjects'),
            sortProjects: document.getElementById('sortProjects'),
            projectsCount: document.getElementById('projectsCount'),
            
            // Form validation
            projectFormErrors: document.getElementById('projectFormErrors')
        };
    }

    /**
     * Initialize project controller
     */
    initialize() {
        this.setupEventListeners();
        this.initializeDefaultProjects();
        this.setupKeyboardShortcuts();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Modal controls
        this.addEventListenerWithCleanup(this.elements.manageProjectsBtn, 'click', () => {
            this.showProjectModal();
        });

        this.addEventListenerWithCleanup(this.elements.closeProjectModalBtn, 'click', () => {
            this.hideProjectModal();
        });

        // Add project
        this.addEventListenerWithCleanup(this.elements.addProjectBtn, 'click', async () => {
            await this.handleAddProject();
        });

        // Form validation on input
        this.setupFormValidation();

        // Search and sort
        this.addEventListenerWithCleanup(this.elements.searchProjects, 'input', () => {
            this.handleSearch();
        });

        this.addEventListenerWithCleanup(this.elements.sortProjects, 'change', () => {
            this.handleSort();
        });

        // Modal overlay click to close
        this.addEventListenerWithCleanup(document, 'click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.hideProjectModal();
            }
        });

        // Form submission on Enter
        this.addEventListenerWithCleanup(this.elements.projectModal, 'keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handleAddProject();
            }
        });

        // Real-time duplicate checking
        this.setupDuplicateChecking();
    }

    /**
     * Add event listener with cleanup tracking
     * @param {HTMLElement} element - Element to attach listener to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    addEventListenerWithCleanup(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.push({ element, event, handler });
        }
    }

    /**
     * Set up form validation
     */
    setupFormValidation() {
        // Project ID validation
        this.addEventListenerWithCleanup(this.elements.newProjectId, 'blur', () => {
            this.validateProjectId();
        });

        this.addEventListenerWithCleanup(this.elements.newProjectId, 'input', () => {
            this.formatProjectId();
        });

        // Sub code validation
        this.addEventListenerWithCleanup(this.elements.newSubCode, 'blur', () => {
            this.validateSubCode();
        });

        this.addEventListenerWithCleanup(this.elements.newSubCode, 'input', () => {
            this.formatSubCode();
        });

        // Project title validation
        this.addEventListenerWithCleanup(this.elements.newProjectTitle, 'blur', () => {
            this.validateProjectTitle();
        });

        // Category validation
        this.addEventListenerWithCleanup(this.elements.newProjectCategory, 'change', () => {
            this.validateCategory();
        });
    }

    /**
     * Set up duplicate checking
     */
    setupDuplicateChecking() {
        const checkDuplicates = () => {
            this.checkForDuplicates();
        };

        this.addEventListenerWithCleanup(this.elements.newProjectId, 'input', checkDuplicates);
        this.addEventListenerWithCleanup(this.elements.newSubCode, 'input', checkDuplicates);
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.addEventListenerWithCleanup(document, 'keydown', (e) => {
            // Ctrl/Cmd + Shift + P to open project manager
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.showProjectModal();
            }

            // Escape to close modal
            if (e.key === 'Escape' && !this.elements.projectModal.classList.contains('hidden')) {
                this.hideProjectModal();
            }
        });
    }

    /**
     * Initialize with default projects if none exist
     */
    async initializeDefaultProjects() {
        if (this.dataService.getProjects().length === 0) {
            try {
                const Project = (await import('../models/Project.js')).default;
                const defaultProjects = Project.getDefaultProjects();
                this.dataService.setProjects(defaultProjects.map(p => p.toObject()));
                console.log('Default projects initialized');
            } catch (error) {
                console.error('Error initializing default projects:', error);
            }
        }
    }

    /**
     * Show project management modal
     */
    showProjectModal() {
        if (!this.elements.projectModal) return;
        
        this.elements.projectModal.classList.remove('hidden');
        this.renderProjectsList();
        this.updateProjectsCount();
        this.clearProjectForm();
        
        // Focus first input
        setTimeout(() => {
            if (this.elements.newProjectId) {
                this.elements.newProjectId.focus();
            }
        }, 100);

        // Dispatch event
        this.dispatchEvent('projectModalOpened');
    }

    /**
     * Hide project management modal
     */
    hideProjectModal() {
        if (!this.elements.projectModal) return;
        
        this.elements.projectModal.classList.add('hidden');
        this.clearProjectForm();
        this.hideFormErrors();

        // Dispatch event
        this.dispatchEvent('projectModalClosed');
    }

    /**
     * Render projects list
     */
    renderProjectsList() {
        if (!this.elements.projectsList) return;

        let projects = this.dataService.getProjects();

        // Apply search filter
        if (this.searchTerm) {
            try {
                const Project = (await import('../models/Project.js')).default;
                projects = Project.search(projects, this.searchTerm);
            } catch (error) {
                console.error('Error applying search filter:', error);
            }
        }

        // Apply sorting
        try {
            const Project = (await import('../models/Project.js')).default;
            projects = Project.sort(projects, this.sortField, this.sortOrder);
        } catch (error) {
            console.error('Error applying sort:', error);
        }

        if (projects.length === 0) {
            const message = this.searchTerm ? 
                `No projects found matching "${this.searchTerm}"` : 
                'No projects available';
            this.elements.projectsList.innerHTML = `
                <div class="no-entries">
                    <span class="no-entries-icon">📁</span>
                    <p>${message}</p>
                </div>
            `;
            return;
        }

        this.elements.projectsList.innerHTML = projects
            .map(projectData => this.createProjectItemHTML(projectData))
            .join('');
    }

    /**
     * Create HTML for project item
     * @param {Object} projectData - Project data
     * @returns {string} - HTML string
     */
    createProjectItemHTML(projectData) {
        const isUsed = this.dataService.isProjectInUse(projectData.id);
        const usageClass = isUsed ? 'project-item--in-use' : '';
        const deleteDisabled = isUsed ? 'disabled' : '';
        const createdDate = new Date(projectData.createdAt).toLocaleDateString();
        
        return `
            <div class="project-item ${usageClass}" data-project-id="${projectData.id}">
                <div class="project-info">
                    <div class="project-header">
                        <h5>${projectData.projectId} (${projectData.subCode})</h5>
                        <div class="project-badges">
                            ${projectData.isActive ? 
                                '<span class="badge badge--success">Active</span>' : 
                                '<span class="badge badge--inactive">Inactive</span>'
                            }
                            ${isUsed ? '<span class="badge badge--info">In Use</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="project-details">
                        <p class="project-title">${this.escapeHtml(projectData.projectTitle)}</p>
                        <div class="project-meta">
                            <span class="meta-item">
                                <strong>Category:</strong> ${projectData.category}
                            </span>
                            <span class="meta-item">
                                <strong>Usage:</strong> ${projectData.usageCount || 0} times
                            </span>
                            <span class="meta-item">
                                <strong>Created:</strong> ${createdDate}
                            </span>
                        </div>
                        ${projectData.description ? `
                            <p class="project-description">${this.escapeHtml(projectData.description)}</p>
                        ` : ''}
                    </div>
                </div>
                
                <div class="project-actions">
                    <button class="btn btn--sm btn--outline"
                            onclick="window.projectController.editProject('${projectData.id}')"
                            aria-label="Edit project">
                        📝 Edit
                    </button>
                    
                    <button class="btn btn--sm btn--outline"
                            onclick="window.projectController.toggleProjectStatus('${projectData.id}')"
                            aria-label="${projectData.isActive ? 'Deactivate' : 'Activate'} project">
                        ${projectData.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    
                    <button class="btn btn--sm btn--outline"
                            onclick="window.projectController.deleteProject('${projectData.id}')"
                            style="color: var(--color-error);"
                            ${deleteDisabled}
                            aria-label="Delete project">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle adding new project
     */
    async handleAddProject() {
        const projectData = this.gatherFormData();
        
        // Validate form data
        if (!this.validateForm(projectData)) {
            return;
        }

        try {
            const Project = (await import('../models/Project.js')).default;
            const project = new Project(projectData);

            // Validate project model
            const validation = project.validate();
            if (!validation.isValid) {
                this.showFormErrors(validation.errors);
                return;
            }

            // Check for duplicates
            const projects = this.dataService.getProjects();
            const isDuplicate = Project.isDuplicate(projects, project.projectId, project.subCode);
            
            if (isDuplicate) {
                this.showFormErrors(['Project with this ID and sub code already exists']);
                return;
            }

            // Add project to data service
            this.dataService.addProject(project.toObject());

            // Save data
            const saveResult = await this.dataService.saveData();
            this.showToast(saveResult.message || 'Project saved');

            // Update UI
            this.renderProjectsList();
            this.updateProjectsCount();
            this.clearProjectForm();
            this.updateDropdowns();
            this.showToast('✅ Project added successfully');

            // Focus back to first input for rapid entry
            if (this.elements.newProjectId) {
                this.elements.newProjectId.focus();
            }

        } catch (error) {
            console.error('Error adding project:', error);
            this.showFormErrors(['Error adding project. Please try again.']);
        }
    }

    /**
     * Edit existing project
     * @param {string} projectId - Project ID to edit
     */
    editProject(projectId) {
        const project = this.dataService.findProject(projectId);
        if (!project) {
            this.showToast('❌ Project not found');
            return;
        }

        // Populate form with project data
        if (this.elements.newProjectId) this.elements.newProjectId.value = project.projectId;
        if (this.elements.newSubCode) this.elements.newSubCode.value = project.subCode;
        if (this.elements.newProjectTitle) this.elements.newProjectTitle.value = project.projectTitle;
        if (this.elements.newProjectCategory) this.elements.newProjectCategory.value = project.category;

        // Update button for editing mode
        if (this.elements.addProjectBtn) {
            this.elements.addProjectBtn.textContent = 'Update Project';
            this.elements.addProjectBtn.setAttribute('data-editing-id', projectId);
        }

        this.showToast('📝 Edit mode activated');
    }

    /**
     * Toggle project active status
     * @param {string} projectId - Project ID
     */
    async toggleProjectStatus(projectId) {
        const project = this.dataService.findProject(projectId);
        if (!project) {
            this.showToast('❌ Project not found');
            return;
        }

        try {
            // Update project status
            project.isActive = !project.isActive;
            project.updatedAt = new Date().toISOString();

            this.dataService.updateProject(projectId, project);

            // Save data
            const saveResult = await this.dataService.saveData();
            this.showToast(saveResult.message || 'Project updated');

            // Update UI
            this.renderProjectsList();
            this.updateDropdowns();
            
            const statusText = project.isActive ? 'activated' : 'deactivated';
            this.showToast(`✅ Project ${statusText} successfully`);

        } catch (error) {
            console.error('Error updating project status:', error);
            this.showToast('❌ Error updating project status');
        }
    }

    /**
     * Delete project
     * @param {string} projectId - Project ID to delete
     */
    async deleteProject(projectId) {
        const project = this.dataService.findProject(projectId);
        if (!project) {
            this.showToast('❌ Project not found');
            return;
        }

        // Check if project is in use
        const isInUse = this.dataService.isProjectInUse(projectId);
        if (isInUse) {
            this.showToast('❌ Cannot delete project that is used in entries');
            return;
        }

        // Confirm deletion
        const projectName = `${project.projectId} (${project.subCode}) - ${project.projectTitle}`;
        const confirmDelete = confirm(
            `Are you sure you want to delete this project?\n\n${projectName}\n\nThis action cannot be undone.`
        );
        
        if (!confirmDelete) return;

        try {
            this.dataService.deleteProject(projectId);

            // Save data
            const saveResult = await this.dataService.saveData();
            this.showToast(saveResult.message || 'Project deleted');

            // Update UI
            this.renderProjectsList();
            this.updateProjectsCount();
            this.updateDropdowns();
            this.showToast('🗑️ Project deleted successfully');

        } catch (error) {
            console.error('Error deleting project:', error);
            this.showToast('❌ Error deleting project');
        }
    }

    /**
     * Handle search input
     */
    handleSearch() {
        this.searchTerm = this.elements.searchProjects?.value?.trim() || '';
        this.renderProjectsList();
        this.updateProjectsCount();
    }

    /**
     * Handle sort change
     */
    handleSort() {
        const sortValue = this.elements.sortProjects?.value || 'projectId:asc';
        const [field, order] = sortValue.split(':');
        
        this.sortField = field;
        this.sortOrder = order;
        
        this.renderProjectsList();
    }

    /**
     * Gather form data
     * @returns {Object} - Form data
     */
    gatherFormData() {
        return {
            projectId: this.elements.newProjectId?.value?.trim() || '',
            subCode: this.elements.newSubCode?.value?.trim() || '',
            projectTitle: this.elements.newProjectTitle?.value?.trim() || '',
            category: this.elements.newProjectCategory?.value || ''
        };
    }

    /**
     * Validate form data
     * @param {Object} data - Form data
     * @returns {boolean} - Whether form is valid
     */
    validateForm(data) {
        const errors = [];

        if (!data.projectId) {
            errors.push('Project ID is required');
        } else if (data.projectId.length > 50) {
            errors.push('Project ID cannot exceed 50 characters');
        }

        if (!data.subCode) {
            errors.push('Sub code is required');
        } else if (data.subCode.length > 20) {
            errors.push('Sub code cannot exceed 20 characters');
        }

        if (!data.projectTitle) {
            errors.push('Project title is required');
        } else if (data.projectTitle.length > 100) {
            errors.push('Project title cannot exceed 100 characters');
        }

        if (!data.category) {
            errors.push('Category is required');
        }

        if (errors.length > 0) {
            this.showFormErrors(errors);
            return false;
        }

        this.hideFormErrors();
        return true;
    }

    // Individual field validation methods

    /**
     * Validate project ID field
     */
    validateProjectId() {
        const value = this.elements.newProjectId?.value?.trim() || '';
        const isValid = value.length > 0 && value.length <= 50;
        
        if (this.elements.newProjectId) {
            this.elements.newProjectId.classList.toggle('invalid', !isValid);
        }
    }

    /**
     * Format project ID (uppercase, remove spaces)
     */
    formatProjectId() {
        if (this.elements.newProjectId) {
            let value = this.elements.newProjectId.value.toUpperCase().replace(/\s+/g, '');
            this.elements.newProjectId.value = value;
        }
    }

    /**
     * Validate sub code field
     */
    validateSubCode() {
        const value = this.elements.newSubCode?.value?.trim() || '';
        const isValid = value.length > 0 && value.length <= 20;
        
        if (this.elements.newSubCode) {
            this.elements.newSubCode.classList.toggle('invalid', !isValid);
        }
    }

    /**
     * Format sub code (remove spaces)
     */
    formatSubCode() {
        if (this.elements.newSubCode) {
            let value = this.elements.newSubCode.value.replace(/\s+/g, '');
            this.elements.newSubCode.value = value;
        }
    }

    /**
     * Validate project title field
     */
    validateProjectTitle() {
        const value = this.elements.newProjectTitle?.value?.trim() || '';
        const isValid = value.length > 0 && value.length <= 100;
        
        if (this.elements.newProjectTitle) {
            this.elements.newProjectTitle.classList.toggle('invalid', !isValid);
        }
    }

    /**
     * Validate category field
     */
    validateCategory() {
        const value = this.elements.newProjectCategory?.value || '';
        const isValid = value.length > 0;
        
        if (this.elements.newProjectCategory) {
            this.elements.newProjectCategory.classList.toggle('invalid', !isValid);
        }
    }

    /**
     * Check for duplicate projects
     */
    checkForDuplicates() {
        const projectId = this.elements.newProjectId?.value?.trim() || '';
        const subCode = this.elements.newSubCode?.value?.trim() || '';
        
        if (projectId && subCode) {
            const projects = this.dataService.getProjects();
            const editingId = this.elements.addProjectBtn?.getAttribute('data-editing-id');
            
            try {
                const Project = (await import('../models/Project.js')).default;
                const isDuplicate = Project.isDuplicate(projects, projectId, subCode, editingId);
                
                if (isDuplicate) {
                    this.showFormErrors(['Project with this ID and sub code already exists']);
                } else {
                    this.hideFormErrors();
                }
            } catch (error) {
                console.error('Error checking duplicates:', error);
            }
        }
    }

    /**
     * Clear project form
     */
    clearProjectForm() {
        if (this.elements.newProjectId) this.elements.newProjectId.value = '';
        if (this.elements.newSubCode) this.elements.newSubCode.value = '';
        if (this.elements.newProjectTitle) this.elements.newProjectTitle.value = '';
        if (this.elements.newProjectCategory) this.elements.newProjectCategory.value = '';
        
        // Reset button
        if (this.elements.addProjectBtn) {
            this.elements.addProjectBtn.textContent = 'Add Project';
            this.elements.addProjectBtn.removeAttribute('data-editing-id');
        }

        // Clear validation states
        const inputs = [
            this.elements.newProjectId,
            this.elements.newSubCode,
            this.elements.newProjectTitle,
            this.elements.newProjectCategory
        ];
        
        inputs.forEach(input => {
            if (input) {
                input.classList.remove('invalid');
            }
        });

        this.hideFormErrors();
    }

    /**
     * Update projects count display
     */
    updateProjectsCount() {
        if (!this.elements.projectsCount) return;

        const totalProjects = this.dataService.getProjects().length;
        const activeProjects = this.dataService.getProjects().filter(p => p.isActive).length;
        
        this.elements.projectsCount.textContent = 
            `${totalProjects} total (${activeProjects} active)`;
    }

    /**
     * Update dropdowns in other components
     */
    updateDropdowns() {
        this.dispatchEvent('projectsUpdated', {
            projects: this.dataService.getProjects()
        });
    }

    /**
     * Show form errors
     * @param {Array} errors - Error messages
     */
    showFormErrors(errors) {
        if (this.elements.projectFormErrors) {
            this.elements.projectFormErrors.innerHTML = errors.join('<br>');
            this.elements.projectFormErrors.classList.add('show');
            
            // Auto-hide after 8 seconds
            setTimeout(() => {
                this.hideFormErrors();
            }, 8000);
        }
    }

    /**
     * Hide form errors
     */
    hideFormErrors() {
        if (this.elements.projectFormErrors) {
            this.elements.projectFormErrors.classList.remove('show');
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     */
    dispatchEvent(eventName, data = null) {
        const event = new CustomEvent(`projects:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Show toast message
     * @param {string} message - Message to show
     */
    showToast(message) {
        const event = new CustomEvent('app:toast', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    // Public API methods

    /**
     * Get all projects
     * @returns {Array} - Projects array
     */
    getProjects() {
        return this.dataService.getProjects();
    }

    /**
     * Find project by ID
     * @param {string} projectId - Project ID
     * @returns {Object|null} - Project object
     */
    findProject(projectId) {
        return this.dataService.findProject(projectId);
    }

    /**
     * Find project by value
     * @param {string} value - Project value
     * @returns {Object|null} - Project object
     */
    findProjectByValue(value) {
        return this.dataService.findProjectByValue(value);
    }

    /**
     * Export projects as CSV
     */
    exportProjects() {
        const projects = this.dataService.getProjects();
        
        if (projects.length === 0) {
            this.showToast('❌ No projects to export');
            return;
        }

        const headers = [
            'Project ID', 'Sub Code', 'Project Title', 'Category', 
            'Status', 'Usage Count', 'Created Date', 'Description'
        ];
        
        const csvData = [
            headers.join(','),
            ...projects.map(project => [
                project.projectId,
                project.subCode,
                `"${project.projectTitle.replace(/"/g, '""')}"`,
                project.category,
                project.isActive ? 'Active' : 'Inactive',
                project.usageCount || 0,
                new Date(project.createdAt).toLocaleDateString(),
                `"${(project.description || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        // Download CSV
        this.downloadFile(csvData, 'projects-export.csv', 'text/csv');
        this.showToast('📁 Projects exported successfully');
    }

    /**
     * Download file
     * @param {string} content - File content
     * @param {string} filename - File name
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

    /**
     * Get project statistics
     * @returns {Object} - Project statistics
     */
    getProjectStats() {
        const projects = this.dataService.getProjects();
        const activeProjects = projects.filter(p => p.isActive);
        const categoryCounts = {};
        
        projects.forEach(project => {
            categoryCounts[project.category] = (categoryCounts[project.category] || 0) + 1;
        });

        return {
            total: projects.length,
            active: activeProjects.length,
            inactive: projects.length - activeProjects.length,
            categories: Object.keys(categoryCounts).length,
            categoryCounts: categoryCounts,
            mostUsed: projects.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0],
            totalUsage: projects.reduce((sum, p) => sum + (p.usageCount || 0), 0)
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

export default ProjectController;
