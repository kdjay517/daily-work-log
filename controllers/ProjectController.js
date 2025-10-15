// controllers/ProjectController.js
// Project Controller - Manages project creation, editing, and deletion

class ProjectController {
    constructor(dataService) {
        this.dataService = dataService;
        this.elements = {};
        this.eventListeners = [];
        this.editingProject = null;
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Project management modal
            projectModal: document.getElementById('projectModal'),
            manageProjectsBtn: document.getElementById('manageProjectsBtn'),
            closeProjectModalBtn: document.getElementById('closeProjectModalBtn'),
            
            // Project form elements
            projectForm: document.getElementById('projectForm'),
            newProjectId: document.getElementById('newProjectId'),
            newSubCode: document.getElementById('newSubCode'),
            newProjectTitle: document.getElementById('newProjectTitle'),
            newProjectCategory: document.getElementById('newProjectCategory'),
            addProjectBtn: document.getElementById('addProjectBtn'),
            cancelProjectBtn: document.getElementById('cancelProjectBtn'),
            
            // Project list
            projectsList: document.getElementById('projectsList'),
            projectsCount: document.getElementById('projectsCount'),
            
            // Project dropdown (for entries)
            projectDropdown: document.getElementById('project'),
            
            // Search and filters
            projectSearch: document.getElementById('projectSearch'),
            categoryFilter: document.getElementById('categoryFilter'),
            
            // Error display
            projectErrors: document.getElementById('projectErrors')
        };
    }

    /**
     * Initialize project controller
     */
    initialize() {
        this.setupEventListeners();
        this.renderProjectsList();
        this.updateProjectDropdown();
        console.log('ProjectController: Initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Modal management
        if (this.elements.manageProjectsBtn) {
            this.addEventListenerWithCleanup(this.elements.manageProjectsBtn, 'click', () => {
                this.showProjectModal();
            });
        }

        if (this.elements.closeProjectModalBtn) {
            this.addEventListenerWithCleanup(this.elements.closeProjectModalBtn, 'click', () => {
                this.hideProjectModal();
            });
        }

        // Form submission
        if (this.elements.addProjectBtn) {
            this.addEventListenerWithCleanup(this.elements.addProjectBtn, 'click', async () => {
                await this.handleAddProject();
            });
        }

        if (this.elements.cancelProjectBtn) {
            this.addEventListenerWithCleanup(this.elements.cancelProjectBtn, 'click', () => {
                this.cancelEdit();
            });
        }

        // Search and filter
        if (this.elements.projectSearch) {
            this.addEventListenerWithCleanup(this.elements.projectSearch, 'input', () => {
                this.filterProjects();
            });
        }

        if (this.elements.categoryFilter) {
            this.addEventListenerWithCleanup(this.elements.categoryFilter, 'change', () => {
                this.filterProjects();
            });
        }

        // Modal overlay click
        if (this.elements.projectModal) {
            this.addEventListenerWithCleanup(this.elements.projectModal, 'click', (e) => {
                if (e.target === this.elements.projectModal) {
                    this.hideProjectModal();
                }
            });
        }

        // Listen for data changes
        document.addEventListener('data:updated', () => {
            this.renderProjectsList();
            this.updateProjectDropdown();
        });

        document.addEventListener('projects:updated', () => {
            this.renderProjectsList();
            this.updateProjectDropdown();
        });

        console.log('ProjectController: Event listeners set up');
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
     * Show project management modal
     */
    showProjectModal() {
        if (this.elements.projectModal) {
            this.elements.projectModal.classList.remove('hidden');
            this.renderProjectsList();
            this.clearForm();
        }
    }

    /**
     * Hide project management modal
     */
    hideProjectModal() {
        if (this.elements.projectModal) {
            this.elements.projectModal.classList.add('hidden');
            this.cancelEdit();
        }
    }

    /**
     * Handle add/update project
     */
    async handleAddProject() {
        try {
            // Validate form
            if (!this.validateForm()) {
                return;
            }

            // Gather form data
            const projectData = this.gatherFormData();

            // Add or update project
            if (this.editingProject) {
                await this.updateProject(projectData);
            } else {
                await this.addProject(projectData);
            }

            // Reset form and refresh display
            this.clearForm();
            this.renderProjectsList();
            this.updateProjectDropdown();

        } catch (error) {
            console.error('Error handling project:', error);
            this.showFormErrors([error.message]);
        }
    }

    /**
     * Add new project
     * @param {Object} projectData - Project data
     */
    async addProject(projectData) {
        await this.dataService.addProject(projectData);
        this.showToast('✅ Project added successfully');
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('projects:updated'));
    }

    /**
     * Update existing project
     * @param {Object} projectData - Project data
     */
    async updateProject(projectData) {
        await this.dataService.updateProject(this.editingProject.id, projectData);
        this.showToast('✅ Project updated successfully');
        this.cancelEdit();
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('projects:updated'));
    }

    /**
     * Edit project
     * @param {string} projectId - Project ID
     */
    editProject(projectId) {
        const projects = this.dataService.getProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
            this.showToast('❌ Project not found');
            return;
        }

        this.editingProject = project;
        this.populateFormWithProject(project);
        this.updateFormUIForEditing();
        this.showToast('📝 Edit mode activated');
    }

    /**
     * Populate form with project data
     * @param {Object} project - Project to edit
     */
    populateFormWithProject(project) {
        if (this.elements.newProjectId) this.elements.newProjectId.value = project.projectId || '';
        if (this.elements.newSubCode) this.elements.newSubCode.value = project.subCode || '';
        if (this.elements.newProjectTitle) this.elements.newProjectTitle.value = project.projectTitle || '';
        if (this.elements.newProjectCategory) this.elements.newProjectCategory.value = project.category || '';
    }

    /**
     * Update form UI for editing mode
     */
    updateFormUIForEditing() {
        if (this.elements.addProjectBtn) {
            this.elements.addProjectBtn.textContent = 'Update Project';
        }
        if (this.elements.cancelProjectBtn) {
            this.elements.cancelProjectBtn.style.display = 'inline-block';
        }
    }

    /**
     * Cancel edit mode
     */
    cancelEdit() {
        this.editingProject = null;
        this.clearForm();
        this.showToast('✅ Edit cancelled');
    }

    /**
     * Delete project
     * @param {string} projectId - Project ID
     */
    async deleteProject(projectId) {
        const projects = this.dataService.getProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
            this.showToast('❌ Project not found');
            return;
        }

        const confirmMessage = `Are you sure you want to delete project "${project.projectTitle}"?\n\nThis action cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            await this.dataService.deleteProject(projectId);
            this.renderProjectsList();
            this.updateProjectDropdown();
            this.showToast('✅ Project deleted successfully');
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('projects:updated'));
            
        } catch (error) {
            console.error('Error deleting project:', error);
            this.showToast(`❌ ${error.message}`);
        }
    }

    /**
     * Toggle project active status
     * @param {string} projectId - Project ID
     */
    async toggleProjectStatus(projectId) {
        const projects = this.dataService.getProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
            this.showToast('❌ Project not found');
            return;
        }

        try {
            await this.dataService.updateProject(projectId, {
                isActive: !project.isActive
            });
            
            this.renderProjectsList();
            this.updateProjectDropdown();
            
            const status = project.isActive ? 'deactivated' : 'activated';
            this.showToast(`✅ Project ${status} successfully`);
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('projects:updated'));
            
        } catch (error) {
            console.error('Error toggling project status:', error);
            this.showToast('❌ Failed to update project status');
        }
    }

    /**
     * Find project by value (projectId-subCode)
     * @param {string} projectValue - Project value
     * @returns {Object|null} - Project object or null
     */
    findProjectByValue(projectValue) {
        return this.dataService.findProjectByValue(projectValue);
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
     * @returns {boolean} - Whether form is valid
     */
    validateForm() {
        const errors = [];
        const projectData = this.gatherFormData();

        // Validate required fields
        if (!projectData.projectId) {
            errors.push('Project ID is required');
        }
        if (!projectData.subCode) {
            errors.push('Sub code is required');
        }
        if (!projectData.projectTitle) {
            errors.push('Project title is required');
        }
        if (!projectData.category) {
            errors.push('Category is required');
        }

        // Validate field formats
        if (projectData.projectId && !/^[A-Z0-9\-]+$/i.test(projectData.projectId)) {
            errors.push('Project ID can only contain letters, numbers, and hyphens');
        }
        if (projectData.subCode && !/^[A-Z0-9]+$/i.test(projectData.subCode)) {
            errors.push('Sub code can only contain letters and numbers');
        }

        // Check for duplicates (only when adding new project)
        if (!this.editingProject) {
            const existing = this.findProjectByValue(`${projectData.projectId}-${projectData.subCode}`);
            if (existing) {
                errors.push('Project with this ID and sub code already exists');
            }
        }

        if (errors.length > 0) {
            this.showFormErrors(errors);
            return false;
        }

        this.hideFormErrors();
        return true;
    }

    /**
     * Render projects list
     */
    renderProjectsList() {
        if (!this.elements.projectsList) return;

        const projects = this.dataService.getProjects();
        
        if (projects.length === 0) {
            this.elements.projectsList.innerHTML = `
                <div class="no-projects">
                    <p>No projects available</p>
                    <small>Add your first project using the form above</small>
                </div>
            `;
            this.updateProjectsCount(0);
            return;
        }

        // Sort projects by usage count and name
        const sortedProjects = projects.sort((a, b) => {
            if (a.isActive !== b.isActive) {
                return b.isActive - a.isActive; // Active projects first
            }
            return (b.usageCount || 0) - (a.usageCount || 0); // Then by usage count
        });

        const projectsHTML = sortedProjects.map(project => this.createProjectHTML(project)).join('');
        this.elements.projectsList.innerHTML = projectsHTML;
        this.updateProjectsCount(projects.length);
    }

    /**
     * Create HTML for single project
     * @param {Object} project - Project object
     * @returns {string} - HTML string
     */
    createProjectHTML(project) {
        const categoryInfo = this.getCategoryInfo(project.category);
        const statusClass = project.isActive ? 'active' : 'inactive';
        const statusIcon = project.isActive ? '✅' : '⚠️';

        return `
            <div class="project-item ${statusClass}" data-project-id="${project.id}">
                <div class="project-header">
                    <div class="project-info">
                        <h5>${project.projectId} ${project.subCode}</h5>
                        <p>${project.projectTitle}</p>
                        <div class="project-meta">
                            <span class="project-category">
                                ${categoryInfo.icon} ${project.category}
                            </span>
                            <span class="project-usage">
                                Used ${project.usageCount || 0} times
                            </span>
                            <span class="project-status">
                                ${statusIcon} ${project.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    <div class="project-actions">
                        <button class="btn btn--sm btn--outline" onclick="window.projectController.editProject('${project.id}')" title="Edit project">
                            ✏️ Edit
                        </button>
                        <button class="btn btn--sm btn--outline" onclick="window.projectController.toggleProjectStatus('${project.id}')" title="Toggle active status">
                            ${project.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                        </button>
                        <button class="btn btn--sm btn--outline" onclick="window.projectController.deleteProject('${project.id}')" style="color: var(--color-error)" title="Delete project">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get category information
     * @param {string} category - Category name
     * @returns {Object} - Category info
     */
    getCategoryInfo(category) {
        const categories = {
            'Strategy': { icon: '📋', color: '#3b82f6' },
            'Development': { icon: '💻', color: '#22c55e' },
            'Testing': { icon: '🧪', color: '#f59e0b' },
            'Controller': { icon: '🎛️', color: '#8b5cf6' },
            'Tracking': { icon: '📊', color: '#06b6d4' },
            'Overhead': { icon: '📈', color: '#6b7280' },
            'Research': { icon: '🔬', color: '#ec4899' },
            'Maintenance': { icon: '🔧', color: '#f97316' },
            'Documentation': { icon: '📝', color: '#84cc16' },
            'Training': { icon: '🎓', color: '#ef4444' }
        };
        return categories[category] || { icon: '📂', color: '#6b7280' };
    }

    /**
     * Update projects count display
     * @param {number} count - Number of projects
     */
    updateProjectsCount(count) {
        if (this.elements.projectsCount) {
            this.elements.projectsCount.textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
        }
    }

    /**
     * Update project dropdown in entry form
     */
    updateProjectDropdown() {
        if (!this.elements.projectDropdown) return;

        const projects = this.dataService.getProjects();
        const activeProjects = projects.filter(p => p.isActive);

        // Store current selection
        const currentValue = this.elements.projectDropdown.value;

        // Clear existing options
        this.elements.projectDropdown.innerHTML = '<option value="">Select project...</option>';

        // Add project options sorted by usage count
        activeProjects
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .forEach(project => {
                const option = document.createElement('option');
                option.value = `${project.projectId}-${project.subCode}`;
                option.textContent = `${project.projectId} ${project.subCode} - ${project.projectTitle}`;
                option.dataset.projectTitle = project.projectTitle;
                option.dataset.category = project.category;
                this.elements.projectDropdown.appendChild(option);
            });

        // Restore selection if it still exists
        if (currentValue && activeProjects.find(p => `${p.projectId}-${p.subCode}` === currentValue)) {
            this.elements.projectDropdown.value = currentValue;
        }
    }

    /**
     * Filter projects based on search and category
     */
    filterProjects() {
        const searchTerm = this.elements.projectSearch?.value?.toLowerCase() || '';
        const categoryFilter = this.elements.categoryFilter?.value || '';

        const projectItems = document.querySelectorAll('.project-item');
        
        projectItems.forEach(item => {
            const projectId = item.dataset.projectId;
            const projects = this.dataService.getProjects();
            const project = projects.find(p => p.id === projectId);
            
            if (!project) return;

            let show = true;

            // Apply search filter
            if (searchTerm) {
                const searchableText = `
                    ${project.projectId} ${project.subCode} ${project.projectTitle} ${project.category}
                `.toLowerCase();
                show = show && searchableText.includes(searchTerm);
            }

            // Apply category filter
            if (categoryFilter) {
                show = show && project.category === categoryFilter;
            }

            item.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Clear project form
     */
    clearForm() {
        if (this.elements.newProjectId) this.elements.newProjectId.value = '';
        if (this.elements.newSubCode) this.elements.newSubCode.value = '';
        if (this.elements.newProjectTitle) this.elements.newProjectTitle.value = '';
        if (this.elements.newProjectCategory) this.elements.newProjectCategory.value = '';

        // Reset UI state
        if (this.elements.addProjectBtn) this.elements.addProjectBtn.textContent = 'Add Project';
        if (this.elements.cancelProjectBtn) this.elements.cancelProjectBtn.style.display = 'none';

        this.editingProject = null;
        this.hideFormErrors();
    }

    /**
     * Show form errors
     * @param {Array} errors - Array of error messages
     */
    showFormErrors(errors) {
        if (this.elements.projectErrors) {
            this.elements.projectErrors.innerHTML = errors.join('<br>');
            this.elements.projectErrors.classList.add('show');
        }
    }

    /**
     * Hide form errors
     */
    hideFormErrors() {
        if (this.elements.projectErrors) {
            this.elements.projectErrors.classList.remove('show');
        }
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

    /**
     * Get all projects
     * @returns {Array} - Array of projects
     */
    getProjects() {
        return this.dataService.getProjects();
    }

    /**
     * Get active projects only
     * @returns {Array} - Array of active projects
     */
    getActiveProjects() {
        return this.dataService.getProjects().filter(p => p.isActive);
    }

    /**
     * Export projects to CSV
     * @returns {string} - CSV content
     */
    exportProjectsToCSV() {
        const projects = this.dataService.getProjects();
        const headers = ['Project ID', 'Sub Code', 'Project Title', 'Category', 'Usage Count', 'Is Active', 'Created At'];
        
        const csvRows = [headers.join(',')];
        
        projects.forEach(project => {
            const row = [
                project.projectId,
                project.subCode,
                `"${project.projectTitle.replace(/"/g, '""')}"`,
                project.category,
                project.usageCount || 0,
                project.isActive ? 'Yes' : 'No',
                project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ''
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

export default ProjectController;
