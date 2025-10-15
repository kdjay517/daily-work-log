// views/CalendarView.js
// Calendar View Controller and Renderer

class CalendarView {
    constructor(dataService) {
        this.dataService = dataService;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.elements = {};
        this.eventListeners = [];
        
        this.cacheElements();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            calendarGrid: document.getElementById('calendarGrid'),
            currentMonth: document.getElementById('currentMonth'),
            prevMonthBtn: document.getElementById('prevMonthBtn'),
            nextMonthBtn: document.getElementById('nextMonthBtn'),
            selectedDateDisplay: document.getElementById('selectedDateDisplay')
        };
    }

    /**
     * Initialize calendar view
     */
    initialize() {
        this.setupEventListeners();
        this.render();
        
        // Select today by default
        const today = new Date();
        this.selectDate(today);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Previous month button
        if (this.elements.prevMonthBtn) {
            const prevHandler = () => this.navigateMonth(-1);
            this.elements.prevMonthBtn.addEventListener('click', prevHandler);
            this.eventListeners.push({
                element: this.elements.prevMonthBtn,
                event: 'click',
                handler: prevHandler
            });
        }

        // Next month button
        if (this.elements.nextMonthBtn) {
            const nextHandler = () => this.navigateMonth(1);
            this.elements.nextMonthBtn.addEventListener('click', nextHandler);
            this.eventListeners.push({
                element: this.elements.nextMonthBtn,
                event: 'click',
                handler: nextHandler
            });
        }

        // Keyboard navigation
        const keyHandler = (e) => this.handleKeyboardNavigation(e);
        document.addEventListener('keydown', keyHandler);
        this.eventListeners.push({
            element: document,
            event: 'keydown',
            handler: keyHandler
        });
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardNavigation(event) {
        if (!this.selectedDate) return;

        const { key, ctrlKey, metaKey } = event;
        let newDate = null;

        switch (key) {
            case 'ArrowLeft':
                newDate = new Date(this.selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                break;
            case 'ArrowRight':
                newDate = new Date(this.selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                break;
            case 'ArrowUp':
                newDate = new Date(this.selectedDate);
                newDate.setDate(newDate.getDate() - 7);
                break;
            case 'ArrowDown':
                newDate = new Date(this.selectedDate);
                newDate.setDate(newDate.getDate() + 7);
                break;
            case 'Home':
                if (ctrlKey || metaKey) {
                    newDate = new Date();
                } else {
                    newDate = new Date(this.selectedDate);
                    newDate.setDate(1);
                }
                break;
            case 'End':
                newDate = new Date(this.selectedDate);
                newDate.setMonth(newDate.getMonth() + 1, 0);
                break;
            case 'PageUp':
                newDate = new Date(this.selectedDate);
                newDate.setMonth(newDate.getMonth() - 1);
                break;
            case 'PageDown':
                newDate = new Date(this.selectedDate);
                newDate.setMonth(newDate.getMonth() + 1);
                break;
        }

        if (newDate) {
            event.preventDefault();
            this.selectDate(newDate);
        }
    }

    /**
     * Render the complete calendar
     */
    render() {
        if (!this.elements.calendarGrid || !this.elements.currentMonth) {
            console.warn('Required calendar elements not found');
            return;
        }

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Update month display
        this.updateMonthDisplay();

        // Clear existing calendar days
        this.clearCalendarDays();

        // Generate calendar grid
        this.renderCalendarGrid(year, month);

        // Update accessibility
        this.updateAccessibility();
    }

    /**
     * Update month display text
     */
    updateMonthDisplay() {
        this.elements.currentMonth.textContent = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            year: 'numeric'
        }).format(this.currentDate);
    }

    /**
     * Clear existing calendar days
     */
    clearCalendarDays() {
        const existingDays = this.elements.calendarGrid.querySelectorAll('.calendar-day');
        existingDays.forEach(day => {
            this.removeEventListenersFromElement(day);
            day.remove();
        });
    }

    /**
     * Render calendar grid for given month/year
     * @param {number} year - Year to render
     * @param {number} month - Month to render (0-11)
     */
    renderCalendarGrid(year, month) {
        // Calculate calendar grid boundaries
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate 42 days (6 weeks) for complete calendar grid
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = this.createCalendarDay(date, month);
            this.elements.calendarGrid.appendChild(dayElement);
        }
    }

    /**
     * Create individual calendar day element
     * @param {Date} date - Date for this day
     * @param {number} currentMonth - Current month being displayed
     * @returns {HTMLElement} - Calendar day element
     */
    createCalendarDay(date, currentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        dayElement.setAttribute('tabindex', '0');
        dayElement.setAttribute('role', 'button');
        
        const dateKey = this.formatDateKey(date);
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isDateToday(date);
        const isSelected = this.selectedDate && this.formatDateKey(this.selectedDate) === dateKey;
        const entries = this.dataService.getEntriesForDate(dateKey);
        const hasEntries = entries.length > 0;

        // Apply CSS classes based on date properties
        this.applyDayClasses(dayElement, {
            isCurrentMonth,
            isToday,
            isSelected,
            hasEntries,
            entries,
            dateKey
        });

        // Set up accessibility attributes
        this.setDayAccessibility(dayElement, date, entries);

        // Add event listeners
        this.attachDayEventListeners(dayElement, date);

        return dayElement;
    }

    /**
     * Apply CSS classes to day element
     * @param {HTMLElement} dayElement - Day element
     * @param {Object} props - Day properties
     */
    applyDayClasses(dayElement, { isCurrentMonth, isToday, isSelected, hasEntries, entries, dateKey }) {
        // Basic state classes
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        }

        if (isToday) {
            dayElement.classList.add('today');
        }

        if (isSelected) {
            dayElement.classList.add('selected');
        }

        if (hasEntries) {
            dayElement.classList.add('has-entries');
            
            // Add entry type indicators
            const entryTypes = this.getEntryTypesForDate(entries);
            entryTypes.forEach(type => {
                dayElement.classList.add(`has-${type}`);
            });

            // Add data attribute for entry count
            dayElement.setAttribute('data-entry-count', entries.length);
        }
    }

    /**
     * Set accessibility attributes for day element
     * @param {HTMLElement} dayElement - Day element
     * @param {Date} date - Date for this day
     * @param {Array} entries - Entries for this date
     */
    setDayAccessibility(dayElement, date, entries) {
        const dateString = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        let ariaLabel = dateString;
        
        if (entries.length > 0) {
            ariaLabel += `. ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
            
            const entryTypes = this.getEntryTypesForDate(entries);
            if (entryTypes.length > 0) {
                const WorkEntry = window.WorkEntry || { getEntryTypes: () => ({
                    work: { label: 'Work Entry' },
                    fullLeave: { label: 'Full Day Leave' },
                    halfLeave: { label: 'Half Day Leave' },
                    holiday: { label: 'Holiday' }
                })};
                
                const entryTypeLabels = entryTypes.map(type => {
                    const typeInfo = WorkEntry.getEntryTypes()[type];
                    return typeInfo ? typeInfo.label : type;
                });
                
                ariaLabel += `: ${entryTypeLabels.join(', ')}`;
            }
        }

        if (this.isDateToday(date)) {
            ariaLabel += '. Today';
        }

        dayElement.setAttribute('aria-label', ariaLabel);
    }

    /**
 * Get entry type classes for calendar days
 */
getEntryTypeClasses(entries) {
    if (!entries || entries.length === 0) {
        return '';
    }

    const entryTypes = new Set();
    entries.forEach(entry => {
        entryTypes.add(entry.type);
    });

    const typeArray = Array.from(entryTypes);
    
    if (typeArray.length === 1) {
        return `has-${typeArray[0]}-entries`;
    } else if (typeArray.length > 1) {
        return 'has-mixed-entries';
    }
    
    return 'has-entries';
}


    /**
     * Attach event listeners to day element
     * @param {HTMLElement} dayElement - Day element
     * @param {Date} date - Date for this day
     */
    attachDayEventListeners(dayElement, date) {
        // Click handler
        const clickHandler = () => this.selectDate(date);
        dayElement.addEventListener('click', clickHandler);

        // Keyboard handler
        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectDate(date);
            }
        };
        dayElement.addEventListener('keydown', keyHandler);

        // Store handlers for cleanup
        this.eventListeners.push(
            { element: dayElement, event: 'click', handler: clickHandler },
            { element: dayElement, event: 'keydown', handler: keyHandler }
        );
    }

    /**
     * Navigate to previous/next month
     * @param {number} direction - Direction (-1 for previous, 1 for next)
     */
    navigateMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.render();
        
        // Dispatch month change event
        this.dispatchEvent('monthChanged', {
            month: this.currentDate.getMonth(),
            year: this.currentDate.getFullYear(),
            date: new Date(this.currentDate)
        });
    }

    /**
     * Select a specific date
     * @param {Date} date - Date to select
     */
    selectDate(date) {
        const newDate = new Date(date);
        
        // Update current month if selected date is in different month
        if (newDate.getMonth() !== this.currentDate.getMonth() || 
            newDate.getFullYear() !== this.currentDate.getFullYear()) {
            this.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
            this.render();
        }
        
        this.selectedDate = newDate;
        this.updateSelectedDateDisplay();
        this.updateCalendarSelection();
        
        // Dispatch date selection event
        this.dispatchEvent('dateSelected', {
            date: new Date(this.selectedDate),
            dateKey: this.formatDateKey(this.selectedDate),
            entries: this.dataService.getEntriesForDate(this.formatDateKey(this.selectedDate))
        });
    }

    /**
     * Update calendar visual selection
     */
    updateCalendarSelection() {
        // Remove previous selection
        const previousSelected = this.elements.calendarGrid.querySelectorAll('.selected');
        previousSelected.forEach(el => el.classList.remove('selected'));

        // Add selection to current date
        if (this.selectedDate) {
            const selectedDay = this.findDayElement(this.selectedDate);
            if (selectedDay) {
                selectedDay.classList.add('selected');
                selectedDay.focus();
            }
        }
    }

    /**
     * Find day element for specific date
     * @param {Date} date - Date to find
     * @returns {HTMLElement|null} - Day element or null
     */
    findDayElement(date) {
        const dayElements = this.elements.calendarGrid.querySelectorAll('.calendar-day');
        const targetDay = date.getDate();
        
        return Array.from(dayElements).find(el => {
            return parseInt(el.textContent) === targetDay && 
                   !el.classList.contains('other-month');
        }) || null;
    }

    /**
     * Update selected date display
     */
    updateSelectedDateDisplay() {
        if (!this.elements.selectedDateDisplay) return;

        if (this.selectedDate) {
            const formatted = new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(this.selectedDate);
            this.elements.selectedDateDisplay.textContent = formatted;
        } else {
            this.elements.selectedDateDisplay.textContent = 'Please select a date';
        }
    }

    /**
     * Update accessibility attributes
     */
    updateAccessibility() {
        if (this.elements.calendarGrid) {
            this.elements.calendarGrid.setAttribute('role', 'grid');
            this.elements.calendarGrid.setAttribute('aria-label', 'Calendar');
        }
    }

    /**
     * Get entry types for a specific date
     * @param {Array} entries - Entries for the date
     * @returns {Array} - Unique entry types
     */
    getEntryTypesForDate(entries) {
        return [...new Set(entries.map(entry => entry.type))];
    }

    /**
     * Format date as key (YYYY-MM-DD)
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date key
     */
    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Check if date is today
     * @param {Date} date - Date to check
     * @returns {boolean} - Whether date is today
     */
    isDateToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(`calendar:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Remove event listeners from element
     * @param {HTMLElement} element - Element to clean up
     */
    removeEventListenersFromElement(element) {
        this.eventListeners = this.eventListeners.filter(listener => {
            if (listener.element === element) {
                element.removeEventListener(listener.event, listener.handler);
                return false;
            }
            return true;
        });
    }

    // Public API methods

    /**
     * Get current displayed date
     * @returns {Date} - Current date
     */
    getCurrentDate() {
        return new Date(this.currentDate);
    }

    /**
     * Get selected date
     * @returns {Date|null} - Selected date
     */
    getSelectedDate() {
        return this.selectedDate ? new Date(this.selectedDate) : null;
    }

    /**
     * Get selected date key
     * @returns {string|null} - Selected date key
     */
    getSelectedDateKey() {
        return this.selectedDate ? this.formatDateKey(this.selectedDate) : null;
    }

    /**
     * Refresh calendar display
     */
    refresh() {
        this.render();
    }

    /**
     * Set current displayed month/year
     * @param {Date} date - Date to set as current
     */
    setCurrentDate(date) {
        this.currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        this.render();
    }

    /**
     * Go to today
     */
    goToToday() {
        const today = new Date();
        this.setCurrentDate(today);
        this.selectDate(today);
    }

    /**
     * Highlight specific dates with custom class
     * @param {Array} dateKeys - Array of date keys to highlight
     * @param {string} className - CSS class to add
     */
    highlightDates(dateKeys, className) {
        dateKeys.forEach(dateKey => {
            const date = new Date(dateKey);
            const dayElement = this.findDayElement(date);
            if (dayElement) {
                dayElement.classList.add(className);
            }
        });
    }

    /**
     * Get calendar statistics
     * @returns {Object} - Calendar statistics
     */
    getCalendarStats() {
        const dates = this.dataService.getAllDatesWithEntries();
        const currentMonthEntries = dates.filter(dateKey => {
            const date = new Date(dateKey);
            return date.getMonth() === this.currentDate.getMonth() &&
                   date.getFullYear() === this.currentDate.getFullYear();
        });

        return {
            totalDatesWithEntries: dates.length,
            currentMonthDatesWithEntries: currentMonthEntries.length,
            selectedDate: this.getSelectedDate(),
            currentMonth: this.getCurrentDate()
        };
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

export default CalendarView;
