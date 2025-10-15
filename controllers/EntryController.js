// controllers/EntryController.js - FIXED Export Issue
// Entry Management Controller - Handles work entry CRUD operations

class EntryController {
    constructor(dataService, calendarView) {
        this.dataService = dataService;
        this.calendarView = calendarView;
        this.editingEntry = null;
        this.elements = {};
        this.eventListeners = [];
        this.validationTimer = null;
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Entry form
            entryForm: document.getElementById('entryForm'),
            entryType: document.getElementById('entryType'),
            projectGroup: document.getElementById('projectGroup'),
            project: document.getElementById('project'),
            hoursGroup: document.getElementById('hoursGroup'),
            hours: document.getElementById('hours'),
            halfDayPeriodGroup: document.getElementById('halfDayPeriodGroup'),
            halfDayPeriod: document.getElementById('halfDayPeriod'),
            comments: document.getElementById('comments'),
            
            // Form actions
            addEntryBtn: document.getElementById('addEntryBtn'),
            cancelEntryBtn: document.getElementById('cancelEntryBtn'),
            formErrors: document.getElementById('formErrors'),
            
            // Entry display
            entriesList: document.getElementById('entriesList'),
            entriesCount: document.getElementById('entriesCount'),
            totalHours: document.getElementById('totalHours'),
            validationWarning: document.getElementById('validationWarning'),
            selectedDateDisplay: document.getElementById('selectedDateDisplay')
        };
    }

    /**
     * Initialize entry controller
     */
    initialize() {
        this.setupEventListeners();
        this.setupCalendarEvents();
        this.updateProjectDropdown();
        this.hideEntryForm(); // Initially hidden
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Entry type change
        this.addEventListenerWithCleanup(this.elements.entryType, 'change', () => {
            this.handleEntryTypeChange();
        });

        // Add/Update entry button
        this.addEventListenerWithCleanup(this.elements.addEntryBtn, 'click', async () => {
            await this.handleAddEntry();
        });

        // Cancel editing button
        this.addEventListenerWithCleanup(this.elements.cancelEntryBtn, 'click', () => {
            this.cancelEdit();
        });

        // Hours validation and formatting
        this.addEventListenerWithCleanup(this.elements.hours, 'input', () => {
            this.handleHoursInput();
        });

        this.addEventListenerWithCleanup(this.elements.hours, 'blur', () => {
            this.validateAndFormatHours();
        });

        // Project change handler
        this.addEventListenerWithCleanup(this.elements.project, 'change', () => {
            this.handleProjectChange();
        });

        // Form submission on Enter key
        this.addEventListenerWithCleanup(this.elements.entryForm, 'keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handleAddEntry();
            }
        });

        // Comments character count
        this.addEventListenerWithCleanup(this.elements.comments, 'input', () => {
            this.updateCommentsCount();
        });

        // Auto-save draft
        this.addEventListenerWithCleanup(this.elements.entryForm, 'input', () => {
            this.debouncedSaveDraft();
        });
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
     * Set up calendar event listeners
     */
    setupCalendarEvents() {
        // Listen for date selection from calendar
        document.addEventListener('calendar:dateSelected', (event) => {
            this.handleDateSelection(event.detail);
        });

        // Listen for month changes
        document.addEventListener('calendar:monthChanged', (event) => {
            this.handleMonthChange(event.detail);
        });

        // Listen for project updates
        document.addEventListener('projects:updated', () => {
            this.updateProjectDropdown();
        });
    }

    /**
     * Handle date selection from calendar
     * @param {Object} detail - Event detail with date and entries
     */
    handleDateSelection(detail) {
        this.showEntryForm();
        this.renderDailyEntries();
        this.updateDailyStats();
        this.loadDraftEntry();
    }

    /**
     * Handle month change from calendar
     * @param {Object} detail - Event detail with month info
     */
    handleMonthChange(detail) {
        // Clear any editing state when changing months
        if (this.editingEntry) {
            this.cancelEdit();
        }
        this.clearDraftEntry();
    }

    /**
     * Handle entry type change
     */
    handleEntryTypeChange() {
        const type = this.elements.entryType.value;
        
        // Reset dependent fields
        this.resetDependentFields();
        
        // Show/hide relevant form groups
        this.updateFormVisibility(type);
        
        // Set default values based on type
        this.setDefaultValues(type);
        
        // Update validation
        this.validateForm();
    }

    /**
     * Reset dependent form fields
     */
    resetDependentFields() {
        if (this.elements.project) this.elements.project.value = '';
        if (this.elements.hours) this.elements.hours.value = '';
        if (this.elements.halfDayPeriod) this.elements.halfDayPeriod.value = '';
        this.hideFormErrors();
    }

    /**
     * Update form field visibility based on entry type
     * @param {string} type - Entry type
     */
    updateFormVisibility(type) {
        // Project group - only for work entries
        if (this.elements.projectGroup) {
            this.elements.projectGroup.style.display = type === 'work' ? 'block' : 'none';
        }
        
        // Hours group - only for work entries
        if (this.elements.hoursGroup) {
            this.elements.hoursGroup.style.display = type === 'work' ? 'block' : 'none';
        }
        
        // Half-day period - only for half leave
        if (this.elements.halfDayPeriodGroup) {
            this.elements.halfDayPeriodGroup.style.display = type === 'halfLeave' ? 'block' : 'none';
        }
    }

    /**
     * Set default values based on entry type
     * @param {string} type - Entry type
     */
    setDefaultValues(type) {
        if (this.elements.hours) {
            switch (type) {
                case 'work':
                    this.elements.hours.readOnly = false;
                    this.elements.hours.placeholder = 'Enter hours (0.5 - 8)';
                    break;
                case 'halfLeave':
                    this.elements.hours.value = '4';
                    this.elements.hours.readOnly = true;
                    break;
                case 'fullLeave':
                case 'holiday':
                    this.elements.hours.value = '8';
                    this.elements.hours.readOnly = true;
                    break;
                default:
                    this.elements.hours.readOnly = false;
                    break;
            }
        }
    }

    /**
     * Handle hours input formatting and validation
     */
    handleHoursInput() {
        if (!this.elements.hours || this.elements.hours.readOnly) return;

        // Clear previous validation timer
        if (this.validationTimer) {
            clearTimeout(this.validationTimer);
        }

        // Debounced validation
        this.validationTimer = setTimeout(() => {
            this.validateHours();
        }, 300);
    }

    /**
     * Validate and format hours input
     */
    validateAndFormatHours() {
        if (!this.elements.hours || this.elements.hours.readOnly) return;

        const value = parseFloat(this.elements.hours.value);
        const type = this.elements.entryType.value;

        if (type === 'work' && value) {
            // Round to nearest 0.5
            const rounded = Math.round(value * 2) / 2;
            if (rounded !== value) {
                this.elements.hours.value = rounded;
                this.showToast(`Hours rounded to ${rounded}`);
            }
        }

        this.validateHours();
    }

    /**
     * Validate hours input
     */
    validateHours() {
        if (!this.elements.hours || !this.elements.entryType) return;

        const value = parseFloat(this.elements.hours.value);
        const type = this.elements.entryType.value;

        if (type === 'work') {
            if (isNaN(value) || value <= 0) {
                this.elements.hours.setCustomValidity('Hours must be greater than 0');
            } else if (value > 8) {
                this.elements.hours.setCustomValidity('Hours cannot exceed 8');
            } else if (value % 0.5 !== 0) {
                this.elements.hours.setCustomValidity('Hours must be in 0.5 increments');
            } else {
                this.elements.hours.setCustomValidity('');
            }
        }

        this.updateDailyStats();
    }

    /**
     * Handle project selection change
     */
    handleProjectChange() {
        const projectValue = this.elements.project.value;
        if (projectValue) {
            // Update project usage (increment when selected for new entry)
            if (!this.editingEntry) {
                const project = this.dataService.findProjectByValue(projectValue);
                if (project) {
                    // This will be handled when the entry is actually saved
                    console.log('Project selected:', this.getProjectDisplayName(projectValue));
                }
            }
        }
    }

    /**
     * Update comments character count
     */
    updateCommentsCount() {
        if (!this.elements.comments) return;

        const maxLength = 500;
        const currentLength = this.elements.comments.value.length;
        
        // Create or update character counter
        let counter = this.elements.comments.parentNode.querySelector('.character-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'character-counter';
            this.elements.comments.parentNode.appendChild(counter);
        }

        counter.textContent = `${currentLength}/${maxLength}`;
        counter.className = currentLength > maxLength ? 
            'character-counter character-counter--over' : 
            'character-counter';
    }

    /**
     * Handle add/update entry
     */
    async handleAddEntry() {
        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) {
            this.showFormErrors(['Please select a date first']);
            return;
        }

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        // Gather form data
        const entryData = this.gatherFormData();
        
        // Create WorkEntry instance (dynamically import to avoid circular dependency)
        const WorkEntry = (await import('../models/WorkEntry.js')).default;
        const entry = new WorkEntry(entryData);
        
        // Validate entry
        const validation = entry.validate();
        if (!validation.isValid) {
            this.showFormErrors(validation.errors);
            return;
        }

        // Additional business logic validation
        const businessValidation = this.validateEntryBusinessRules(entry, selectedDate);
        if (!businessValidation.isValid) {
            this.showFormErrors(businessValidation.errors);
            return;
        }

        const dateKey = this.calendarView.formatDateKey(selectedDate);
        
        try {
            if (this.editingEntry) {
                // Update existing entry
                entry.id = this.editingEntry.id;
                this.dataService.updateEntry(dateKey, entry.id, entry.toObject());
                this.showToast('✅ Entry updated successfully');
                this.cancelEdit();
            } else {
                // Add new entry
                this.dataService.addEntry(dateKey, entry.toObject());
                this.showToast('✅ Entry added successfully');
            }

            // Save data
            const saveResult = await this.dataService.saveData();
            if (saveResult.message) {
                this.showToast(saveResult.message);
            }

            // Update UI
            this.calendarView.refresh();
            this.renderDailyEntries();
            this.updateDailyStats();
            this.resetForm();
            this.clearDraftEntry();

        } catch (error) {
            console.error('Error saving entry:', error);
            this.showToast('❌ Error saving entry. Please try again.');
        }
    }

    /**
     * Validate entry business rules
     * @param {WorkEntry} entry - Entry to validate
     * @param {Date} selectedDate - Selected date
     * @returns {Object} - Validation result
     */
    validateEntryBusinessRules(entry, selectedDate) {
        const errors = [];
        const dateKey = this.calendarView.formatDateKey(selectedDate);
        
        // Check daily hour limits
        if (!this.validateDailyHours(entry, dateKey)) {
            errors.push('Total daily hours cannot exceed 8 hours');
        }
        
        // Check for conflicting entries
        if (!this.validateEntryConflicts(entry, dateKey)) {
            errors.push('This entry conflicts with existing entries for this date');
        }
        
        // Check weekend restrictions (if applicable)
        if (!this.validateWeekendEntry(entry, selectedDate)) {
            errors.push('Work entries on weekends require special approval');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate daily hour limits
     * @param {WorkEntry} newEntry - New entry
     * @param {string} dateKey - Date key
     * @returns {boolean} - Whether hours are valid
     */
    validateDailyHours(newEntry, dateKey) {
        const existingEntries = this.dataService.getEntriesForDate(dateKey);
        let totalHours = 0;
        
        // Calculate existing hours (excluding entry being edited)
        existingEntries.forEach(entry => {
            if (!this.editingEntry || entry.id !== this.editingEntry.id) {
                totalHours += this.getEntryHours(entry);
            }
        });
        
        // Add new entry hours
        totalHours += newEntry.getHours();
        
        return totalHours <= 8;
    }

    /**
     * Validate entry conflicts
     * @param {WorkEntry} newEntry - New entry
     * @param {string} dateKey - Date key
     * @returns {boolean} - Whether entry conflicts
     */
    validateEntryConflicts(newEntry, dateKey) {
        const existingEntries = this.dataService.getEntriesForDate(dateKey);
        
        // Check for full-day conflicts
        const hasFullDayEntry = existingEntries.some(entry => 
            (!this.editingEntry || entry.id !== this.editingEntry.id) &&
            (entry.type === 'fullLeave' || entry.type === 'holiday')
        );
        
        if (hasFullDayEntry && (newEntry.type !== 'fullLeave' && newEntry.type !== 'holiday')) {
            return false;
        }
        
        if ((newEntry.type === 'fullLeave' || newEntry.type === 'holiday')) {
            const otherEntries = existingEntries.filter(entry => 
                !this.editingEntry || entry.id !== this.editingEntry.id
            );
            if (otherEntries.length > 0) {
                return false;
            }
        }
        
        // Check half-day period conflicts
        if (newEntry.type === 'halfLeave') {
            const conflictingHalfDay = existingEntries.some(entry =>
                (!this.editingEntry || entry.id !== this.editingEntry.id) &&
                entry.type === 'halfLeave' &&
                entry.halfDayPeriod === newEntry.halfDayPeriod
            );
            
            if (conflictingHalfDay) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Validate weekend entry (optional business rule)
     * @param {WorkEntry} entry - Entry to validate
     * @param {Date} date - Date of entry
     * @returns {boolean} - Whether weekend entry is valid
     */
    validateWeekendEntry(entry, date) {
        // Allow all entries for now - this could be configured based on company policy
        return true;
    }

    /**
     * Gather form data
     * @returns {Object} - Form data object
     */
    gatherFormData() {
        return {
            type: this.elements.entryType?.value || '',
            project: this.elements.project?.value || '',
            hours: this.elements.hours ? parseFloat(this.elements.hours.value) || 0 : 0,
            halfDayPeriod: this.elements.halfDayPeriod?.value || '',
            comments: this.elements.comments?.value.trim() || '',
            date: this.calendarView.getSelectedDateKey()
        };
    }

    /**
     * Validate entire form
     * @returns {boolean} - Whether form is valid
     */
    validateForm() {
        const errors = [];
        
        // Entry type validation
        if (!this.elements.entryType?.value) {
            errors.push('Please select an entry type');
        }
        
        // Type-specific validation
        const type = this.elements.entryType?.value;
        if (type === 'work') {
            if (!this.elements.project?.value) {
                errors.push('Please select a project for work entries');
            }
            
            const hours = parseFloat(this.elements.hours?.value || 0);
            if (!hours || hours <= 0) {
                errors.push('Please enter valid hours for work entries');
            }
        }
        
        if (type === 'halfLeave' && !this.elements.halfDayPeriod?.value) {
            errors.push('Please select a time period for half-day leave');
        }
        
        // Comments length validation
        const comments = this.elements.comments?.value || '';
        if (comments.length > 500) {
            errors.push('Comments cannot exceed 500 characters');
        }
        
        if (errors.length > 0) {
            this.showFormErrors(errors);
            return false;
        }
        
        this.hideFormErrors();
        return true;
    }

    /**
     * Edit existing entry
     * @param {string} entryId - Entry ID to edit
     */
    editEntry(entryId) {
        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) return;

        const dateKey = this.calendarView.getSelectedDateKey();
        const entries = this.dataService.getEntriesForDate(dateKey);
        const entry = entries.find(e => e.id === entryId);

        if (!entry) {
            this.showToast('❌ Entry not found');
            return;
        }

        this.editingEntry = entry;

        // Populate form with entry data
        if (this.elements.entryType) this.elements.entryType.value = entry.type;
        this.handleEntryTypeChange(); // Update form visibility

        if (this.elements.project) this.elements.project.value = entry.project || '';
        if (this.elements.hours) this.elements.hours.value = entry.hours || '';
        if (this.elements.halfDayPeriod) this.elements.halfDayPeriod.value = entry.halfDayPeriod || '';
        if (this.elements.comments) this.elements.comments.value = entry.comments || '';

        // Update form UI for editing mode
        this.setEditingMode(true);
        
        this.showToast('📝 Edit mode activated');

        // Focus first editable field
        this.focusFirstEditableField();
    }

    /**
     * Set form to editing mode
     * @param {boolean} isEditing - Whether in editing mode
     */
    setEditingMode(isEditing) {
        if (this.elements.addEntryBtn) {
            this.elements.addEntryBtn.innerHTML = isEditing ? 
                '<span class="btn-text">Update Entry</span>' : 
                '<span class="btn-text">Add Entry</span>';
        }
        
        if (this.elements.cancelEntryBtn) {
            this.elements.cancelEntryBtn.style.display = isEditing ? 'inline-flex' : 'none';
        }

        // Add visual indicator for editing mode
        if (this.elements.entryForm) {
            this.elements.entryForm.classList.toggle('editing-mode', isEditing);
        }
    }

    /**
     * Focus first editable field
     */
    focusFirstEditableField() {
        const editableFields = [
            this.elements.entryType,
            this.elements.project,
            this.elements.hours,
            this.elements.halfDayPeriod,
            this.elements.comments
        ].filter(field => field && !field.disabled && field.style.display !== 'none');

        if (editableFields.length > 0) {
            editableFields[0].focus();
        }
    }

    /**
     * Delete entry
     * @param {string} entryId - Entry ID to delete
     */
    async deleteEntry(entryId) {
        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) return;

        const dateKey = this.calendarView.getSelectedDateKey();
        const entries = this.dataService.getEntriesForDate(dateKey);
        const entry = entries.find(e => e.id === entryId);

        if (!entry) {
            this.showToast('❌ Entry not found');
            return;
        }

        // Get entry details for confirmation
        const WorkEntry = (await import('../models/WorkEntry.js')).default;
        const entryObj = new WorkEntry(entry);
        const entryDescription = entryObj.getDisplayText();

        const confirmDelete = confirm(`Are you sure you want to delete this entry?\n\n${entryDescription}`);
        if (!confirmDelete) return;
        
        try {
            this.dataService.deleteEntry(dateKey, entryId);
            
            // Save data
            const saveResult = await this.dataService.saveData();
            if (saveResult.message) {
                this.showToast(saveResult.message);
            }

            // Update UI
            this.calendarView.refresh();
            this.renderDailyEntries();
            this.updateDailyStats();
            this.showToast('🗑️ Entry deleted successfully');

        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showToast('❌ Error deleting entry. Please try again.');
        }
    }

    /**
     * Cancel entry editing
     */
    cancelEdit() {
        this.editingEntry = null;
        this.setEditingMode(false);
        this.resetForm();
        this.loadDraftEntry(); // Restore any draft data
        this.showToast('❌ Edit cancelled');
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        if (this.elements.entryType) this.elements.entryType.value = '';
        this.handleEntryTypeChange();
        if (this.elements.comments) this.elements.comments.value = '';
        this.updateCommentsCount();
        this.hideFormErrors();
        this.updateDailyStats();
    }

    /**
     * Render daily entries for selected date
     */
    renderDailyEntries() {
        if (!this.elements.entriesList) return;

        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) {
            this.elements.entriesList.innerHTML = this.getNoEntriesHTML('Select a date above to add your first entry');
            this.updateEntriesCount(0);
            return;
        }

        const dateKey = this.calendarView.getSelectedDateKey();
        const entries = this.dataService.getEntriesForDate(dateKey);

        if (entries.length === 0) {
            this.elements.entriesList.innerHTML = this.getNoEntriesHTML('Add your first entry using the form above');
            this.updateEntriesCount(0);
            return;
        }

        // Sort entries by timestamp (newest first)
        const sortedEntries = [...entries].sort((a, b) => 
            new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
        );

        this.elements.entriesList.innerHTML = sortedEntries
            .map(entry => this.createEntryHTML(entry))
            .join('');
        
        this.updateEntriesCount(entries.length);
    }

    /**
     * Create HTML for single entry
     * @param {Object} entry - Entry data
     * @returns {string} - HTML string
     */
    createEntryHTML(entry) {
        const entryHours = this.getEntryHours(entry);
        const projectDisplay = this.getProjectDisplayName(entry.project);
        const typeInfo = this.getEntryTypeInfo(entry.type);
        const timeAgo = this.getTimeAgo(entry.timestamp);
        
        return `
            <div class="entry-item" data-entry-id="${entry.id}">
                <div class="entry-header">
                    <div class="entry-type">
                        <span class="entry-type-indicator ${entry.type}"></span>
                        ${typeInfo.label}
                    </div>
                    <div class="entry-actions">
                        <button class="btn btn--sm btn--outline" 
                                onclick="window.entryController.editEntry('${entry.id}')"
                                aria-label="Edit entry">
                            📝 Edit
                        </button>
                        <button class="btn btn--sm btn--outline" 
                                onclick="window.entryController.showDeleteConfirm('${entry.id}')" 
                                style="color: var(--color-error);"
                                aria-label="Delete entry">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                
                <div class="entry-details">
                    ${entry.project ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Project</span>
                            <span class="entry-detail-value">${projectDisplay}</span>
                        </div>
                    ` : ''}
                    
                    ${entryHours > 0 ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Hours</span>
                            <span class="entry-detail-value">${entryHours}</span>
                        </div>
                    ` : ''}
                    
                    ${entry.type === 'halfLeave' ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Period</span>
                            <span class="entry-detail-value">
                                ${entry.halfDayPeriod === 'morning' ? 
                                    '🌅 Morning (8:00 AM - 12:00 PM)' : 
                                    '🌅 Afternoon (1:00 PM - 5:00 PM)'}
                            </span>
                        </div>
                    ` : ''}
                    
                    ${entry.timestamp ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Created</span>
                            <span class="entry-detail-value">${timeAgo}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${entry.comments ? `
                    <div class="entry-comments">
                        <strong>Comments:</strong> ${this.escapeHtml(entry.comments)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Get hours for entry
     * @param {Object} entry - Entry object
     * @returns {number} - Hours for entry
     */
    getEntryHours(entry) {
        switch (entry.type) {
            case 'work':
                return entry.hours || 0;
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
     * Get entry type information
     * @param {string} type - Entry type
     * @returns {Object} - Type information
     */
    getEntryTypeInfo(type) {
        const types = {
            work: { label: "Work Entry", color: "#3b82f6" },
            fullLeave: { label: "Full Day Leave", color: "#ef4444" },
            halfLeave: { label: "Half Day Leave", color: "#f97316" },
            holiday: { label: "Holiday", color: "#22c55e" }
        };
        return types[type] || types.work;
    }

    /**
     * Get project display name - FIXED VERSION
     * @param {string} projectValue - Project value
     * @returns {string} - Display name
     */
    getProjectDisplayName(projectValue) {
        if (!projectValue) return 'N/A';
        
        // Try to find project from data service
        const project = this.dataService.findProjectByValue(projectValue);
        
        if (project) {
            // Handle both Project instances and plain objects
            if (typeof project.getDisplayName === 'function') {
                return project.getDisplayName();
            } else {
                // For plain objects, construct display name manually
                return `${project.projectId} (${project.subCode}) - ${project.projectTitle}`;
            }
        }
        
        // Fallback to the raw value if project not found
        return projectValue;
    }

    /**
     * Get time ago string
     * @param {string} timestamp - ISO timestamp
     * @returns {string} - Time ago string
     */
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return time.toLocaleDateString();
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
     * Update daily statistics display
     */
    updateDailyStats() {
        if (!this.elements.totalHours) return;

        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) {
            this.elements.totalHours.textContent = '0';
            this.hideValidationWarning();
            return;
        }

        const dateKey = this.calendarView.getSelectedDateKey();
        const entries = this.dataService.getEntriesForDate(dateKey);

        let totalHours = 0;
        entries.forEach(entry => {
            if (!this.editingEntry || entry.id !== this.editingEntry.id) {
                totalHours += this.getEntryHours(entry);
            }
        });

        // Add current form hours if valid
        const currentHours = this.getCurrentFormHours();
        if (currentHours > 0) {
            totalHours += currentHours;
        }

        this.elements.totalHours.textContent = totalHours.toFixed(1);

        // Show validation warning
        this.updateValidationWarning(totalHours);
    }

    /**
     * Get current form hours
     * @returns {number} - Current form hours
     */
    getCurrentFormHours() {
        if (!this.elements.hours || !this.elements.entryType) return 0;

        const type = this.elements.entryType.value;
        switch (type) {
            case 'work':
                return parseFloat(this.elements.hours.value) || 0;
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
     * Update validation warning
     * @param {number} totalHours - Total hours for the day
     */
    updateValidationWarning(totalHours) {
        if (!this.elements.validationWarning) return;

        if (totalHours > 8) {
            this.elements.validationWarning.textContent = '⚠️ Exceeds 8-hour daily limit';
            this.elements.validationWarning.style.display = 'block';
            this.elements.validationWarning.className = 'validation-warning validation-warning--error';
        } else if (totalHours > 0 && totalHours < 8) {
            this.elements.validationWarning.textContent = `ℹ️ ${(8 - totalHours).toFixed(1)} hours remaining today`;
            this.elements.validationWarning.style.display = 'block';
            this.elements.validationWarning.className = 'validation-warning validation-warning--info';
        } else {
            this.hideValidationWarning();
        }
    }

    /**
     * Hide validation warning
     */
    hideValidationWarning() {
        if (this.elements.validationWarning) {
            this.elements.validationWarning.textContent = '';
            this.elements.validationWarning.style.display = 'none';
        }
    }

    /**
     * Update entries count display
     * @param {number} count - Number of entries
     */
    updateEntriesCount(count) {
        if (this.elements.entriesCount) {
            this.elements.entriesCount.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
        }
    }

    /**
     * Update project dropdown options
     */
    updateProjectDropdown() {
        if (!this.elements.project) return;

        // Store current selection
        const currentValue = this.elements.project.value;

        // Clear and repopulate
        this.elements.project.innerHTML = '<option value="">Select project...</option>';

        const projects = this.dataService.getProjects();
        
        // Sort projects by usage count (most used first) and then by name
        const sortedProjects = [...projects].sort((a, b) => {
            if (b.usageCount !== a.usageCount) {
                return b.usageCount - a.usageCount;
            }
            return a.projectTitle.localeCompare(b.projectTitle);
        });

        sortedProjects.forEach(proj => {
            const option = document.createElement('option');
            option.value = `${proj.projectId}-${proj.subCode}`;
            
            let displayName = `${proj.projectId} (${proj.subCode}) - ${proj.projectTitle}`;
            if (proj.usageCount > 0) {
                displayName += ` • ${proj.usageCount} uses`;
            }
            
            option.textContent = displayName;
            
            // Add data attributes for filtering/searching
            option.setAttribute('data-category', proj.category);
            option.setAttribute('data-usage', proj.usageCount || 0);
            
            this.elements.project.appendChild(option);
        });

        // Restore selection if it still exists
        if (currentValue) {
            this.elements.project.value = currentValue;
        }
    }

    /**
     * Show entry form
     */
    showEntryForm() {
        if (this.elements.entryForm) {
            this.elements.entryForm.style.display = 'block';
        }
    }

    /**
     * Hide entry form
     */
    hideEntryForm() {
        if (this.elements.entryForm) {
            this.elements.entryForm.style.display = 'none';
        }
    }

    /**
     * Get no entries HTML
     * @param {string} message - Message to display
     * @returns {string} - HTML string
     */
    getNoEntriesHTML(message) {
        return `
            <div class="no-entries">
                <span class="no-entries-icon">📝</span>
                <p>No entries for selected date</p>
                <span class="no-entries-hint">${message}</span>
            </div>
        `;
    }

    /**
     * Show form errors
     * @param {Array} errors - Array of error messages
     */
    showFormErrors(errors) {
        if (this.elements.formErrors) {
            this.elements.formErrors.innerHTML = errors.join('<br>');
            this.elements.formErrors.classList.add('show');
            
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
        if (this.elements.formErrors) {
            this.elements.formErrors.classList.remove('show');
        }
    }

    /**
     * Show delete confirmation
     * @param {string} entryId - Entry ID to delete
     */
    showDeleteConfirm(entryId) {
        // Simple confirmation for now - could be enhanced with custom modal
        this.deleteEntry(entryId);
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

    // Draft management methods

    /**
     * Save draft entry to localStorage
     */
    saveDraftEntry() {
        if (this.editingEntry) return; // Don't save drafts when editing

        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) return;

        const draftKey = `entryDraft_${this.calendarView.getSelectedDateKey()}`;
        const draftData = this.gatherFormData();
        
        // Only save if there's meaningful data
        if (draftData.type || draftData.project || draftData.hours || draftData.comments) {
            try {
                localStorage.setItem(draftKey, JSON.stringify(draftData));
            } catch (error) {
                console.warn('Could not save draft:', error);
            }
        }
    }

    /**
     * Load draft entry from localStorage
     */
    loadDraftEntry() {
        if (this.editingEntry) return; // Don't load drafts when editing

        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) return;

        const draftKey = `entryDraft_${this.calendarView.getSelectedDateKey()}`;
        
        try {
            const draftData = localStorage.getItem(draftKey);
            if (draftData) {
                const draft = JSON.parse(draftData);
                
                // Populate form with draft data
                if (this.elements.entryType && draft.type) {
                    this.elements.entryType.value = draft.type;
                    this.handleEntryTypeChange();
                }
                if (this.elements.project && draft.project) {
                    this.elements.project.value = draft.project;
                }
                if (this.elements.hours && draft.hours) {
                    this.elements.hours.value = draft.hours;
                }
                if (this.elements.halfDayPeriod && draft.halfDayPeriod) {
                    this.elements.halfDayPeriod.value = draft.halfDayPeriod;
                }
                if (this.elements.comments && draft.comments) {
                    this.elements.comments.value = draft.comments;
                    this.updateCommentsCount();
                }
                
                console.log('Draft entry loaded');
            }
        } catch (error) {
            console.warn('Could not load draft:', error);
        }
    }

    /**
     * Clear draft entry from localStorage
     */
    clearDraftEntry() {
        const selectedDate = this.calendarView.getSelectedDate();
        if (!selectedDate) return;

        const draftKey = `entryDraft_${this.calendarView.getSelectedDateKey()}`;
        
        try {
            localStorage.removeItem(draftKey);
        } catch (error) {
            console.warn('Could not clear draft:', error);
        }
    }

    /**
     * Debounced save draft
     */
    debouncedSaveDraft() {
        if (this.draftTimer) {
            clearTimeout(this.draftTimer);
        }
        
        this.draftTimer = setTimeout(() => {
            this.saveDraftEntry();
        }, 1000);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Clear timers
        if (this.validationTimer) {
            clearTimeout(this.validationTimer);
        }
        if (this.draftTimer) {
            clearTimeout(this.draftTimer);
        }

        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

export default EntryController;
