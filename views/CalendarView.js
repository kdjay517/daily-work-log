// views/CalendarView.js - COMPLETE UPDATED VERSION WITH WEEKEND DETECTION & DASHBOARD INTEGRATION
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
            prevMonth: document.getElementById('prevMonth'),  // Alternative ID
            nextMonth: document.getElementById('nextMonth'),  // Alternative ID
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
        // Previous month button (try both possible IDs)
        const prevBtn = this.elements.prevMonthBtn || this.elements.prevMonth;
        if (prevBtn) {
            const prevHandler = () => this.navigateMonth(-1);
            prevBtn.addEventListener('click', prevHandler);
            this.eventListeners.push({
                element: prevBtn,
                event: 'click',
                handler: prevHandler
            });
        }

        // Next month button (try both possible IDs)
        const nextBtn = this.elements.nextMonthBtn || this.elements.nextMonth;
        if (nextBtn) {
            const nextHandler = () => this.navigateMonth(1);
            nextBtn.addEventListener('click', nextHandler);
            this.eventListeners.push({
                element: nextBtn,
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
     * ✅ UPDATED: Create individual calendar day element with weekend detection
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
        const entries = this.dataService.getEntriesForDate ? this.dataService.getEntriesForDate(dateKey) : [];
        const hasEntries = entries.length > 0;
        
        // ✅ NEW: Weekend detection
        const isWeekend = this.isWeekend(date);
        const isSaturday = date.getDay() === 6;
        const isSunday = date.getDay() === 0;

        // Apply CSS classes based on date properties
        this.applyDayClasses(dayElement, {
            isCurrentMonth,
            isToday,
            isSelected,
            hasEntries,
            entries,
            dateKey,
            isWeekend,
            isSaturday,
            isSunday
        });

        // Set up accessibility attributes with weekend info
        this.setDayAccessibility(dayElement, date, entries, isWeekend);

        // Add event listeners
        this.attachDayEventListeners(dayElement, date);

        return dayElement;
    }

    /**
     * ✅ UPDATED: Apply CSS classes to day element with weekend support
     * @param {HTMLElement} dayElement - Day element
     * @param {Object} props - Day properties
     */
    applyDayClasses(dayElement, { isCurrentMonth, isToday, isSelected, hasEntries, entries, dateKey, isWeekend, isSaturday, isSunday }) {
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

        // ✅ NEW: Weekend classes
        if (isWeekend) {
            dayElement.classList.add('weekend');
            
            if (isSaturday) {
                dayElement.classList.add('saturday');
            }
            
            if (isSunday) {
                dayElement.classList.add('sunday');
            }
        }

        // Entry type classes with improved logic
        if (hasEntries) {
            dayElement.classList.add('has-entries');
            
            // Get entry type classes for proper coloring
            const entryTypeClass = this.getEntryTypeClasses(entries);
            if (entryTypeClass) {
                dayElement.classList.add(entryTypeClass);
            }

            // Add data attribute for entry count
            dayElement.setAttribute('data-entry-count', entries.length);
            
            // ✅ NEW: Add special class for weekend work
            if (isWeekend && entries.some(e => e.type === 'work')) {
                dayElement.classList.add('has-weekend-work');
            }
        }
    }

    /**
     * ✅ UPDATED: Set accessibility attributes with weekend info
     * @param {HTMLElement} dayElement - Day element
     * @param {Date} date - Date for this day
     * @param {Array} entries - Entries for this date
     * @param {boolean} isWeekend - Whether this is a weekend
     */
    setDayAccessibility(dayElement, date, entries, isWeekend = false) {
        const dateString = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        let ariaLabel = dateString;
        let tooltip = dateString;
        
        // ✅ NEW: Add weekend information
        if (isWeekend) {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            ariaLabel += `, Weekend (${dayName})`;
            tooltip += `\n🏖️ Weekend (${dayName})`;
        }
        
        if (entries && entries.length > 0) {
            ariaLabel += `. ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
            
            const entryTypes = this.getEntryTypesForDate(entries);
            if (entryTypes.length > 0) {
                const entryTypeLabels = entryTypes.map(type => {
                    const typeInfo = this.getEntryTypeInfo(type);
                    return typeInfo ? typeInfo.label : type;
                });
                
                ariaLabel += `: ${entryTypeLabels.join(', ')}`;
                tooltip += `\n📝 ${entryTypeLabels.join(', ')}`;
            }

            // ✅ NEW: Special note for weekend work
            if (isWeekend) {
                const workEntries = entries.filter(e => e.type === 'work');
                if (workEntries.length > 0) {
                    const workHours = workEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
                    tooltip += `\n⚠️ Weekend work: ${workHours} hours`;
                }
            }
        } else if (isWeekend) {
            tooltip += '\nNo entries logged for this weekend day';
        }

        if (this.isDateToday(date)) {
            ariaLabel += '. Today';
            tooltip += '\n⭐ Today';
        }

        dayElement.setAttribute('aria-label', ariaLabel);
        dayElement.setAttribute('title', tooltip);
    }

    /**
     * ✅ NEW: Check if date is weekend
     * @param {Date} date - Date to check
     * @returns {boolean} - Whether date is weekend
     */
    isWeekend(date) {
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    }

    /**
     * ✅ UPDATED: Get entry type classes for calendar day indicators
     * @param {Array} entries - Array of entries for the day
     * @returns {string} - CSS classes for entry types
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
            // Single entry type - use specific color class
            return `has-${typeArray[0]}`;
        } else if (typeArray.length > 1) {
            // Multiple entry types - use mixed color indicator
            return 'has-mixed-entries';
        }
        
        return '';
    }

    /**
     * ✅ UPDATED: Get entry type information
     * @param {string} type - Entry type
     * @returns {Object} - Entry type information
     */
    getEntryTypeInfo(type) {
        const entryTypes = {
            work: { label: 'Work Entry', color: '#2563eb', icon: '💼' },
            fullLeave: { label: 'Full Day Leave', color: '#dc2626', icon: '🏖️' },
            halfLeave: { label: 'Half Day Leave', color: '#ea580c', icon: '🌅' },
            holiday: { label: 'Holiday', color: '#16a34a', icon: '🎉' }
        };
        
        return entryTypes[type] || { label: type, color: '#6b7280', icon: '📝' };
    }

    /**
     * ✅ NEW: Get weekend statistics for analytics
     * @param {Date} month - Month to analyze (defaults to current month)
     * @returns {Object} - Weekend statistics
     */
    getWeekendStats(month = new Date()) {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        let weekends = 0;
        let saturdays = 0;
        let sundays = 0;
        let weekendWorkDays = 0;
        let weekendWorkHours = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthIndex, day);
            const dayOfWeek = date.getDay();
            
            if (dayOfWeek === 0) { // Sunday
                weekends++;
                sundays++;
            } else if (dayOfWeek === 6) { // Saturday  
                weekends++;
                saturdays++;
            }

            // Check for weekend work
            if (this.isWeekend(date) && this.dataService.getEntriesForDate) {
                const dateKey = this.formatDateKey(date);
                const entries = this.dataService.getEntriesForDate(dateKey);
                const workEntries = entries.filter(e => e.type === 'work');
                
                if (workEntries.length > 0) {
                    weekendWorkDays++;
                    weekendWorkHours += workEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
                }
            }
        }
        
        return {
            totalWeekends: weekends,
            saturdays: saturdays,
            sundays: sundays,
            workingDays: daysInMonth - weekends,
            weekendWorkDays: weekendWorkDays,
            weekendWorkHours: weekendWorkHours
        };
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
        
        // ✅ UPDATED: Get entries with fallback for different dataService methods
        let entries = [];
        if (this.dataService.getEntriesForDate) {
            entries = this.dataService.getEntriesForDate(this.formatDateKey(this.selectedDate));
        } else if (this.dataService.getWorkLogData) {
            const workLogData = this.dataService.getWorkLogData();
            entries = workLogData[this.formatDateKey(this.selectedDate)] || [];
        }
        
        // Dispatch date selection event
        this.dispatchEvent('dateSelected', {
            date: new Date(this.selectedDate),
            dateKey: this.formatDateKey(this.selectedDate),
            entries: entries,
            isWeekend: this.isWeekend(this.selectedDate)  // ✅ NEW: Include weekend info
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
            
            // ✅ NEW: Add weekend indicator to selected date display
            const weekendIndicator = this.isWeekend(this.selectedDate) ? ' 🏖️' : '';
            this.elements.selectedDateDisplay.textContent = formatted + weekendIndicator;
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
     * ✅ UPDATED: Get calendar statistics with weekend info
     * @returns {Object} - Calendar statistics
     */
    getCalendarStats() {
        // Get all dates with entries using available dataService methods
        let dates = [];
        if (this.dataService.getAllDatesWithEntries) {
            dates = this.dataService.getAllDatesWithEntries();
        } else if (this.dataService.getWorkLogData) {
            dates = Object.keys(this.dataService.getWorkLogData());
        }

        const currentMonthEntries = dates.filter(dateKey => {
            const date = new Date(dateKey);
            return date.getMonth() === this.currentDate.getMonth() &&
                   date.getFullYear() === this.currentDate.getFullYear();
        });

        return {
            totalDatesWithEntries: dates.length,
            currentMonthDatesWithEntries: currentMonthEntries.length,
            selectedDate: this.getSelectedDate(),
            currentMonth: this.getCurrentDate(),
            weekendStats: this.getWeekendStats(this.currentDate)  // ✅ NEW
        };
    }

    /**
     * ✅ NEW: Get entry type summary for tooltip
     * @param {Array} entries - Entries for a date
     * @returns {string} - Summary string
     */
    getEntryTypeSummary(entries) {
        if (!entries || entries.length === 0) {
            return 'No entries';
        }

        const typeCounts = {};
        entries.forEach(entry => {
            typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
        });

        const summary = Object.entries(typeCounts)
            .map(([type, count]) => {
                const typeInfo = this.getEntryTypeInfo(type);
                return `${count} ${typeInfo.label}${count > 1 ? 's' : ''}`;
            })
            .join(', ');

        return `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}: ${summary}`;
    }

    /**
     * ✅ NEW: Get weekend work summary for current month
     * @returns {Object} - Weekend work summary
     */
    getWeekendWorkSummary() {
        const weekendStats = this.getWeekendStats(this.currentDate);
        const month = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        return {
            month: month,
            totalWeekends: weekendStats.totalWeekends,
            weekendWorkDays: weekendStats.weekendWorkDays,
            weekendWorkHours: weekendStats.weekendWorkHours,
            percentageOfWeekendsWorked: weekendStats.totalWeekends > 0 
                ? ((weekendStats.weekendWorkDays / weekendStats.totalWeekends) * 100).toFixed(1)
                : 0
        };
    }

    /**
     * ✅ NEW: Get all weekend dates in current month
     * @returns {Array} - Array of weekend date objects
     */
    getCurrentMonthWeekends() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const weekends = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            if (this.isWeekend(date)) {
                const dateKey = this.formatDateKey(date);
                let entries = [];
                
                if (this.dataService.getEntriesForDate) {
                    entries = this.dataService.getEntriesForDate(dateKey);
                } else if (this.dataService.getWorkLogData) {
                    const workLogData = this.dataService.getWorkLogData();
                    entries = workLogData[dateKey] || [];
                }
                
                weekends.push({
                    date: new Date(date),
                    dateKey: dateKey,
                    dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
                    isSaturday: date.getDay() === 6,
                    isSunday: date.getDay() === 0,
                    hasEntries: entries.length > 0,
                    hasWork: entries.some(e => e.type === 'work'),
                    entries: entries,
                    workHours: entries.filter(e => e.type === 'work').reduce((sum, e) => sum + (e.hours || 0), 0)
                });
            }
        }
        
        return weekends;
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
