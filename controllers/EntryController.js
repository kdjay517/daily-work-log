// controllers/EntryController.js
// Entry Controller - Manages work entry creation, editing, and deletion

class EntryController {
    constructor(dataService, calendarView) {
        this.dataService = dataService;
        this.calendarView = calendarView;
        this.elements = {};
        this.eventListeners = [];
        this.currentEntry = null;
        this.editingEntry = null;
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Entry form elements
            entryForm: document.getElementById('entryForm'),
            entryType: document.getElementById('entryType'),
            projectGroup: document.getElementById('projectGroup'),
            project: document.getElementById('project'),
            hoursGroup: document.getElementById('hoursGroup'),
            hours: document.getElementById('hours'),
            halfDayPeriodGroup: document.getElementById('halfDayPeriodGroup'),
            halfDayPeriod: document.getElementById('halfDayPeriod'),
            comments: document.getElementById('comments'),
            addEntryBtn: document.getElementById('addEntryBtn'),
            cancelEntryBtn: document.getElementById('cancelEntryBtn'),
            
            // Entry display elements
            entriesList: document.getElementById('entriesList'),
            entriesCount: document.getElementById('entriesCount'),
            selectedDateDisplay: document.getElementById('selectedDateDisplay'),
            totalHours: document.getElementById('totalHours'),
            
            // Form validation
            formErrors: document.getElementById('formErrors'),
            validationWarning: document.getElementById('validationWarning')
        };
    }

    /**
     * Initialize entry controller
     */
    initialize() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.resetForm();
        console.log('EntryController: Initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Entry type change
        if (this.elements.entryType) {
            this.addEventListenerWithCleanup(this.elements.entryType, 'change', () => {
                this.handleEntryTypeChange();
            });
        }

        // Add/Update entry button
        if (this.elements.addEntryBtn) {
            this.addEventListenerWithCleanup(this.elements.addEntryBtn, 'click', async () => {
                await this.handleAddEntry();
            });
        }

        // Cancel entry button
        if (this.elements.cancelEntryBtn) {
            this.addEventListenerWithCleanup(this.elements.cancelEntryBtn, 'click', () => {
                this.cancelEdit();
            });
        }

        // Project selection change
        if (this.elements.project) {
            this.addEventListenerWithCleanup(this.elements.project, 'change', () => {
                this.updateProjectUsage();
            });
        }

        // Hours input validation
        if (this.elements.hours) {
            this.addEventListenerWithCleanup(this.elements.hours, 'input', () => {
                this.validateHours();
            });
        }

        // Listen for calendar date selection
        document.addEventListener('calendar:dateSelected', (event) => {
            this.handleDateSelection(event.detail.dateKey);
        });

        // Listen for data changes
        document.addEventListener('data:updated', () => {
            this.refreshCurrentDateEntries();
        });

        console.log('EntryController: Event listeners set up');
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
     * Handle entry type change
     */
    handleEntryTypeChange() {
        const entryType = this.elements.entryType?.value;
        
        // Show/hide form fields based on entry type
        this.toggleFormFields(entryType);
        
        // Set default values
        this.setDefaultValues(entryType);
        
        // Clear validation errors
        this.hideFormErrors();
    }

    /**
     * Toggle form fields visibility based on entry type
     * @param {string} entryType - Selected entry type
     */
    toggleFormFields(entryType) {
        const isWorkEntry = entryType === 'work';
        const isHalfLeave = entryType === 'halfLeave';
        
        // Project field - only for work entries
        if (this.elements.projectGroup) {
            this.elements.projectGroup.style.display = isWorkEntry ? 'block' : 'none';
        }
        
        // Hours field - for work entries only (others are fixed)
        if (this.elements.hoursGroup) {
            if (isWorkEntry) {
                this.elements.hoursGroup.style.display = 'block';
                if (this.elements.hours) {
                    this.elements.hours.readOnly = false;
                    this.elements.hours.value = '';
                }
            } else {
                // For leave/holiday entries, hours are fixed
                this.elements.hoursGroup.style.display = 'none';
                if (this.elements.hours) {
                    this.elements.hours.readOnly = true;
                }
            }
        }
        
        // Half day period - only for half leave
        if (this.elements.halfDayPeriodGroup) {
            this.elements.halfDayPeriodGroup.style.display = isHalfLeave ? 'block' : 'none';
        }
    }

    /**
     * Set default values based on entry type
     * @param {string} entryType - Selected entry type
     */
    setDefaultValues(entryType) {
        if (this.elements.hours) {
            switch (entryType) {
                case 'fullLeave':
                case 'holiday':
                    this.elements.hours.value = '8';
                    break;
                case 'halfLeave':
                    this.elements.hours.value = '4';
                    break;
                case 'work':
                default:
                    this.elements.hours.value = '';
                    break;
            }
        }
        
        // Reset project selection for non-work entries
        if (!entryType || entryType !== 'work') {
            if (this.elements.project) {
                this.elements.project.value = '';
            }
        }
        
        // Reset half day period for non-half-leave entries
        if (entryType !== 'halfLeave' && this.elements.halfDayPeriod) {
            this.elements.halfDayPeriod.value = '';
        }
    }

    /**
     * Handle date selection from calendar
     * @param {string} dateKey - Selected date key (YYYY-MM-DD)
     */
    handleDateSelection(dateKey) {
        this.currentDate = dateKey;
        this.updateSelectedDateDisplay(dateKey);
        this.refreshEntriesForDate(dateKey);
        this.showEntryForm();
        this.resetForm();
    }

    /**
     * Update selected date display
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     */
    updateSelectedDateDisplay(dateKey) {
        if (this.elements.selectedDateDisplay) {
            const date = new Date(dateKey);
            const formatted = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            this.elements.selectedDateDisplay.textContent = formatted;
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
     * Handle add/update entry
     */
    async handleAddEntry() {
        try {
            // Validate form
            if (!this.validateForm()) {
                return;
            }

            // Gather form data
            const entryData = this.gatherFormData();

            // Add or update entry
            if (this.editingEntry) {
                await this.updateEntry(entryData);
            } else {
                await this.addEntry(entryData);
            }

            // Reset form and refresh display
            this.resetForm();
            this.refreshCurrentDateEntries();
            this.calendarView.refresh();

        } catch (error) {
            console.error('Error handling entry:', error);
            this.showFormErrors([error.message]);
        }
    }

    /**
     * Add new entry
     * @param {Object} entryData - Entry data
     */
    async addEntry(entryData) {
        await this.dataService.addEntry(this.currentDate, entryData);
        this.showToast('✅ Entry added successfully');
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('entry:added', {
            detail: { dateKey: this.currentDate, entry: entryData }
        }));
    }

    /**
     * Update existing entry
     * @param {Object} entryData - Entry data
     */
    async updateEntry(entryData) {
        await this.dataService.updateEntry(this.currentDate, this.editingEntry.id, entryData);
        this.showToast('✅ Entry updated successfully');
        this.cancelEdit();
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('entry:updated', {
            detail: { dateKey: this.currentDate, entryId: this.editingEntry.id, entry: entryData }
        }));
    }

    /**
     * Edit entry
     * @param {string} entryId - Entry ID
     */
    editEntry(entryId) {
        const entries = this.dataService.getEntriesForDate(this.currentDate);
        const entry = entries.find(e => e.id === entryId);
        
        if (!entry) {
            this.showToast('❌ Entry not found');
            return;
        }

        this.editingEntry = entry;
        this.populateFormWithEntry(entry);
        this.updateFormUIForEditing();
        this.showToast('📝 Edit mode activated');
    }

    /**
     * Populate form with entry data
     * @param {Object} entry - Entry to edit
     */
    populateFormWithEntry(entry) {
        if (this.elements.entryType) this.elements.entryType.value = entry.type;
        if (this.elements.project) this.elements.project.value = entry.project || '';
        if (this.elements.hours) this.elements.hours.value = entry.hours || '';
        if (this.elements.halfDayPeriod) this.elements.halfDayPeriod.value = entry.halfDayPeriod || '';
        if (this.elements.comments) this.elements.comments.value = entry.comments || '';
        
        // Trigger entry type change to show/hide fields
        this.handleEntryTypeChange();
    }

    /**
     * Update form UI for editing mode
     */
    updateFormUIForEditing() {
        if (this.elements.addEntryBtn) {
            this.elements.addEntryBtn.textContent = 'Update Entry';
        }
        if (this.elements.cancelEntryBtn) {
            this.elements.cancelEntryBtn.style.display = 'inline-block';
        }
    }

    /**
     * Cancel edit mode
     */
    cancelEdit() {
        this.editingEntry = null;
        this.resetForm();
        this.showToast('✅ Edit cancelled');
    }

    /**
     * Delete entry
     * @param {string} entryId - Entry ID
     */
    async deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) {
            return;
        }

        try {
            await this.dataService.deleteEntry(this.currentDate, entryId);
            this.refreshCurrentDateEntries();
            this.calendarView.refresh();
            this.showToast('✅ Entry deleted successfully');
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('entry:deleted', {
                detail: { dateKey: this.currentDate, entryId }
            }));
            
        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showToast('❌ Failed to delete entry');
        }
    }

    /**
     * Gather form data
     * @returns {Object} - Form data
     */
    gatherFormData() {
        return {
            type: this.elements.entryType?.value || 'work',
            project: this.elements.project?.value || '',
            hours: parseFloat(this.elements.hours?.value) || 0,
            halfDayPeriod: this.elements.halfDayPeriod?.value || '',
            comments: this.elements.comments?.value?.trim() || ''
        };
    }

    /**
     * Validate form data
     * @returns {boolean} - Whether form is valid
     */
    validateForm() {
        const errors = [];
        const entryData = this.gatherFormData();

        // Validate entry type
        if (!entryData.type) {
            errors.push('Entry type is required');
        }

        // Validate work entries
        if (entryData.type === 'work') {
            if (!entryData.project) {
                errors.push('Project selection is required for work entries');
            }
            if (!entryData.hours || entryData.hours <= 0) {
                errors.push('Hours must be greater than 0 for work entries');
            }
            if (entryData.hours > 24) {
                errors.push('Hours cannot exceed 24 per day');
            }
        }

        // Validate half leave entries
        if (entryData.type === 'halfLeave') {
            if (!entryData.halfDayPeriod) {
                errors.push('Time period is required for half-day leave');
            }
        }

        // Validate daily hours limit
        if (!this.validateDailyHours(entryData)) {
            errors.push('Total daily hours cannot exceed 8 hours');
        }

        // Check for conflicts
        if (!this.validateEntryConflicts(entryData)) {
            errors.push('This entry conflicts with existing entries for this date');
        }

        if (errors.length > 0) {
            this.showFormErrors(errors);
            return false;
        }

        this.hideFormErrors();
        return true;
    }

    /**
     * Validate daily hours limit
     * @param {Object} newEntry - New entry data
     * @returns {boolean} - Whether within daily limit
     */
    validateDailyHours(newEntry) {
        const existingEntries = this.dataService.getEntriesForDate(this.currentDate);
        let totalHours = 0;

        // Calculate existing hours (excluding entry being edited)
        existingEntries.forEach(entry => {
            if (!this.editingEntry || entry.id !== this.editingEntry.id) {
                totalHours += this.getEntryHours(entry);
            }
        });

        // Add new entry hours
        totalHours += this.getEntryHours(newEntry);

        return totalHours <= 8;
    }

    /**
     * Validate entry conflicts
     * @param {Object} newEntry - New entry data
     * @returns {boolean} - Whether entry has conflicts
     */
    validateEntryConflicts(newEntry) {
        const existingEntries = this.dataService.getEntriesForDate(this.currentDate);
        
        // Check for full day conflicts
        const hasFullDayEntry = existingEntries.some(entry => 
            (!this.editingEntry || entry.id !== this.editingEntry.id) &&
            (entry.type === 'fullLeave' || entry.type === 'holiday')
        );

        if (hasFullDayEntry && newEntry.type !== 'fullLeave' && newEntry.type !== 'holiday') {
            return false;
        }

        if ((newEntry.type === 'fullLeave' || newEntry.type === 'holiday') && 
            existingEntries.some(entry => !this.editingEntry || entry.id !== this.editingEntry.id)) {
            return false;
        }

        // Check for half-day period conflicts
        if (newEntry.type === 'halfLeave') {
            const conflictingHalfDay = existingEntries.some(entry =>
                (!this.editingEntry || entry.id !== this.editingEntry.id) &&
                entry.type === 'halfLeave' &&
                entry.halfDayPeriod === newEntry.halfDayPeriod
            );
            if (conflictingHalfDay) return false;
        }

        return true;
    }

    /**
     * Get entry hours based on type
     * @param {Object} entry - Entry object
     * @returns {number} - Hours
     */
    getEntryHours(entry) {
        switch (entry.type) {
            case 'work':
                return entry.hours || 0;
            case 'fullLeave':
            case 'holiday':
                return 8;
            case 'halfLeave':
                return 4;
            default:
                return 0;
        }
    }

    /**
     * Validate hours input
     */
    validateHours() {
        const value = parseFloat(this.elements.hours?.value);
        const type = this.elements.entryType?.value;

        if (type === 'work' && this.elements.hours) {
            if (value > 8) {
                this.elements.hours.setCustomValidity('Hours cannot exceed 8');
            } else if (value <= 0) {
                this.elements.hours.setCustomValidity('Hours must be greater than 0');
            } else {
                this.elements.hours.setCustomValidity('');
            }
        }
    }

    /**
     * Update project dropdown
     */
    updateProjectDropdown() {
        if (!this.elements.project) return;

        const projects = this.dataService.getProjects();
        const activeProjects = projects.filter(p => p.isActive);

        // Clear existing options
        this.elements.project.innerHTML = '<option value="">Select project...</option>';

        // Add project options sorted by usage count
        activeProjects
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .forEach(project => {
                const option = document.createElement('option');
                option.value = `${project.projectId}-${project.subCode}`;
                option.textContent = `${project.projectId} ${project.subCode} - ${project.projectTitle}`;
                option.dataset.projectTitle = project.projectTitle;
                this.elements.project.appendChild(option);
            });
    }

    /**
     * Update project usage when selected
     */
    updateProjectUsage() {
        // This will be handled automatically by the DataService when entries are added
    }

    /**
     * Refresh entries for current date
     */
    refreshCurrentDateEntries() {
        if (this.currentDate) {
            this.refreshEntriesForDate(this.currentDate);
        }
    }

    /**
     * Refresh entries display for specific date
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     */
    refreshEntriesForDate(dateKey) {
        const entries = this.dataService.getEntriesForDate(dateKey);
        this.renderEntries(entries);
        this.updateDailyStats(entries);
    }

    /**
     * Render entries list
     * @param {Array} entries - Entries to render
     */
    renderEntries(entries) {
        if (!this.elements.entriesList) return;

        if (entries.length === 0) {
            this.elements.entriesList.innerHTML = `
                <div class="no-entries">
                    <p>No entries for selected date</p>
                    <small>Add your first entry using the form above</small>
                </div>
            `;
            this.updateEntriesCount(0);
            return;
        }

        const entriesHTML = entries.map(entry => this.createEntryHTML(entry)).join('');
        this.elements.entriesList.innerHTML = entriesHTML;
        this.updateEntriesCount(entries.length);
    }

    /**
     * Create HTML for single entry
     * @param {Object} entry - Entry object
     * @returns {string} - HTML string
     */
    createEntryHTML(entry) {
        const typeInfo = this.getEntryTypeInfo(entry.type);
        const project = this.dataService.findProjectByValue(entry.project);
        const projectName = project ? project.projectTitle : entry.project || 'N/A';

        return `
            <div class="entry-item" data-entry-id="${entry.id}">
                <div class="entry-header">
                    <div class="entry-type">
                        <span class="entry-type-indicator ${entry.type}" style="background-color: ${typeInfo.color}"></span>
                        ${typeInfo.label}
                    </div>
                    <div class="entry-actions">
                        <button class="btn btn--sm btn--outline" onclick="window.entryController.editEntry('${entry.id}')">
                            Edit
                        </button>
                        <button class="btn btn--sm btn--outline" onclick="window.entryController.deleteEntry('${entry.id}')" style="color: var(--color-error)">
                            Delete
                        </button>
                    </div>
                </div>
                <div class="entry-details">
                    ${entry.project ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Project:</span>
                            <span class="entry-detail-value">${projectName}</span>
                        </div>
                    ` : ''}
                    ${this.getEntryHours(entry) > 0 ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Hours:</span>
                            <span class="entry-detail-value">${this.getEntryHours(entry)}</span>
                        </div>
                    ` : ''}
                    ${entry.type === 'halfLeave' ? `
                        <div class="entry-detail">
                            <span class="entry-detail-label">Period:</span>
                            <span class="entry-detail-value">${entry.halfDayPeriod === 'morning' ? 'Morning (8:00 AM - 12:00 PM)' : 'Afternoon (1:00 PM - 5:00 PM)'}</span>
                        </div>
                    ` : ''}
                    ${entry.comments ? `
                        <div class="entry-comments">${entry.comments}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get entry type information
     * @param {string} type - Entry type
     * @returns {Object} - Type information
     */
    getEntryTypeInfo(type) {
        const types = {
            work: { label: 'Work Entry', color: '#3b82f6' },
            fullLeave: { label: 'Full Day Leave', color: '#ef4444' },
            halfLeave: { label: 'Half Day Leave', color: '#f97316' },
            holiday: { label: 'Holiday', color: '#22c55e' }
        };
        return types[type] || { label: type, color: '#6b7280' };
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
     * Update daily statistics
     * @param {Array} entries - Entries for the day
     */
    updateDailyStats(entries) {
        if (!this.elements.totalHours) return;

        const totalHours = entries.reduce((sum, entry) => sum + this.getEntryHours(entry), 0);
        this.elements.totalHours.textContent = totalHours.toFixed(1);

        // Show warning if over 8 hours
        if (this.elements.validationWarning) {
            if (totalHours > 8) {
                this.elements.validationWarning.textContent = 'Exceeds 8-hour daily limit';
                this.elements.validationWarning.style.display = 'block';
            } else {
                this.elements.validationWarning.style.display = 'none';
            }
        }
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        if (this.elements.entryType) this.elements.entryType.value = 'work';
        if (this.elements.project) this.elements.project.value = '';
        if (this.elements.hours) this.elements.hours.value = '';
        if (this.elements.halfDayPeriod) this.elements.halfDayPeriod.value = '';
        if (this.elements.comments) this.elements.comments.value = '';

        // Reset UI state
        if (this.elements.addEntryBtn) this.elements.addEntryBtn.textContent = 'Add Entry';
        if (this.elements.cancelEntryBtn) this.elements.cancelEntryBtn.style.display = 'none';

        this.editingEntry = null;
        this.handleEntryTypeChange();
        this.hideFormErrors();
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        // Real-time validation will be handled by individual field validators
        console.log('EntryController: Form validation set up');
    }

    /**
     * Show form errors
     * @param {Array} errors - Array of error messages
     */
    showFormErrors(errors) {
        if (this.elements.formErrors) {
            this.elements.formErrors.innerHTML = errors.join('<br>');
            this.elements.formErrors.classList.add('show');
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
     * Cleanup event listeners
     */
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    /**
     * Get current selected date
     * @returns {string|null} - Current date key
     */
    getCurrentDate() {
        return this.currentDate || null;
    }

    /**
     * Set current date (programmatically)
     * @param {string} dateKey - Date key to set
     */
    setCurrentDate(dateKey) {
        this.handleDateSelection(dateKey);
    }
}

export default EntryController;
