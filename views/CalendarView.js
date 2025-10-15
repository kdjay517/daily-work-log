// views/CalendarView.js
// Calendar View Class - Manages calendar display and interactions with weekend detection

class CalendarView {
    constructor(dataService) {
        this.dataService = dataService;
        this.elements = {};
        this.eventListeners = [];
        this.currentDate = new Date();
        this.selectedDate = null;
        this.weekendDetectionEnabled = true;
        
        this.cacheElements();
        this.initialize();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Calendar container elements
            calendarGrid: document.getElementById('calendarGrid'),
            calendarDates: document.getElementById('calendarDates'),
            calendarWeekdays: document.getElementById('calendarWeekdays'),
            
            // Navigation elements
            currentMonth: document.getElementById('currentMonth'),
            prevMonthBtn: document.getElementById('prevMonth'),
            nextMonthBtn: document.getElementById('nextMonth'),
            monthSelector: document.getElementById('monthSelector'),
            
            // Calendar header
            calendarHeader: document.querySelector('.calendar-header'),
            
            // Legend elements
            calendarLegend: document.querySelector('.calendar-legend')
        };
    }

    /**
     * Initialize calendar view
     */
    initialize() {
        this.setupEventListeners();
        this.createCalendarStructure();
        this.render();
        console.log('CalendarView: Initialized successfully with weekend detection');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Month navigation
        if (this.elements.prevMonthBtn) {
            this.addEventListenerWithCleanup(this.elements.prevMonthBtn, 'click', () => {
                this.navigateMonth(-1);
            });
        }

        if (this.elements.nextMonthBtn) {
            this.addEventListenerWithCleanup(this.elements.nextMonthBtn, 'click', () => {
                this.navigateMonth(1);
            });
        }

        // Month selector dropdown
        if (this.elements.monthSelector) {
            this.addEventListenerWithCleanup(this.elements.monthSelector, 'change', (e) => {
                this.navigateToMonth(e.target.value);
            });
        }

        // Listen for data changes to refresh calendar
        document.addEventListener('data:updated', () => {
            this.refresh();
        });

        document.addEventListener('data:entryAdded', () => {
            this.refresh();
        });

        document.addEventListener('data:entryUpdated', () => {
            this.refresh();
        });

        document.addEventListener('data:entryDeleted', () => {
            this.refresh();
        });

        console.log('CalendarView: Event listeners set up');
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
     * Create calendar structure if it doesn't exist
     */
    createCalendarStructure() {
        // Create weekdays header if it doesn't exist
        if (!this.elements.calendarWeekdays) {
            this.createWeekdaysHeader();
        }

        // Create calendar dates container if it doesn't exist
        if (!this.elements.calendarDates) {
            this.createCalendarDates();
        }

        // Create or update legend
        this.createOrUpdateLegend();
    }

    /**
     * Create weekdays header
     */
    createWeekdaysHeader() {
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        let weekdaysContainer = document.querySelector('.calendar-weekdays');
        if (!weekdaysContainer) {
            weekdaysContainer = document.createElement('div');
            weekdaysContainer.className = 'calendar-weekdays';
            weekdaysContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: var(--space-2);
                margin-bottom: var(--space-8);
            `;
        }

        weekdaysContainer.innerHTML = '';
        
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'weekday';
            dayElement.textContent = day;
            dayElement.style.cssText = `
                text-align: center;
                font-weight: var(--font-weight-semibold);
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
                padding: var(--space-8);
            `;
            weekdaysContainer.appendChild(dayElement);
        });

        // Insert before calendar dates or at the beginning of calendar grid
        const calendarContainer = this.elements.calendarGrid || document.querySelector('.calendar-grid');
        if (calendarContainer) {
            if (this.elements.calendarDates) {
                calendarContainer.insertBefore(weekdaysContainer, this.elements.calendarDates);
            } else {
                calendarContainer.appendChild(weekdaysContainer);
            }
        }

        this.elements.calendarWeekdays = weekdaysContainer;
    }

    /**
     * Create calendar dates container
     */
    createCalendarDates() {
        let datesContainer = document.getElementById('calendarDates');
        if (!datesContainer) {
            datesContainer = document.createElement('div');
            datesContainer.id = 'calendarDates';
            datesContainer.className = 'calendar-dates';
            datesContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: var(--space-2);
            `;

            const calendarContainer = this.elements.calendarGrid || document.querySelector('.calendar-grid');
            if (calendarContainer) {
                calendarContainer.appendChild(datesContainer);
            }
        }

        this.elements.calendarDates = datesContainer;
    }

    /**
     * Create or update calendar legend
     */
    createOrUpdateLegend() {
        let legend = document.querySelector('.calendar-legend');
        if (!legend) {
            legend = document.createElement('div');
            legend.className = 'calendar-legend';
            legend.style.cssText = `
                display: flex;
                gap: var(--space-16);
                margin-bottom: var(--space-20);
                flex-wrap: wrap;
            `;

            const calendarHeader = this.elements.calendarHeader || document.querySelector('.calendar-header');
            if (calendarHeader) {
                calendarHeader.appendChild(legend);
            }
        }

        // Legend items with weekend detection
        const legendItems = [
            { class: 'work-logged', color: 'var(--color-primary)', label: 'Work Logged' },
            { class: 'today-marker', color: 'var(--color-warning)', label: 'Today' },
            { class: 'holiday-marker', color: 'var(--color-success)', label: 'Holiday/Leave' },
            { class: 'weekend-marker', color: 'var(--color-info)', label: 'Weekend' }
        ];

        legend.innerHTML = '';
        
        legendItems.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: var(--space-6);
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
            `;

            const dot = document.createElement('span');
            dot.className = `legend-dot ${item.class}`;
            dot.style.cssText = `
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: ${item.color};
            `;

            const label = document.createElement('span');
            label.textContent = item.label;

            legendItem.appendChild(dot);
            legendItem.appendChild(label);
            legend.appendChild(legendItem);
        });

        this.elements.calendarLegend = legend;
    }

    /**
     * Render the calendar
     */
    render() {
        this.updateMonthDisplay();
        this.renderCalendarDays();
        this.updateMonthSelector();
    }

    /**
     * Update month display
     */
    updateMonthDisplay() {
        if (this.elements.currentMonth) {
            const formatter = new Intl.DateTimeFormat('en-US', {
                month: 'long',
                year: 'numeric'
            });
            this.elements.currentMonth.textContent = formatter.format(this.currentDate);
        }
    }

    /**
     * Render calendar days with weekend detection
     */
    renderCalendarDays() {
        if (!this.elements.calendarDates) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first day of month and calculate starting date
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Clear existing days
        this.elements.calendarDates.innerHTML = '';

        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = this.createCalendarDay(date, month);
            this.elements.calendarDates.appendChild(dayElement);
        }
    }

    /**
     * Create individual calendar day element
     * @param {Date} date - Date for this day
     * @param {number} currentMonth - Current month being displayed
     * @returns {HTMLElement} - Day element
     */
    createCalendarDay(date, currentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-date';
        dayElement.setAttribute('tabindex', '0');
        
        const dateKey = this.formatDateKey(date);
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isDateToday(date);
        const isSelected = this.selectedDate && this.formatDateKey(this.selectedDate) === dateKey;
        const hasEntries = this.hasEntriesForDate(dateKey);
        const isWeekend = this.isWeekend(date);
        
        // Base styling
        dayElement.style.cssText = `
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-base);
            cursor: pointer;
            transition: all var(--duration-fast) var(--ease-standard);
            position: relative;
            background-color: var(--color-background);
            padding: var(--space-4);
            min-height: 60px;
        `;

        // Add CSS classes for styling
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
            dayElement.style.color = 'var(--color-text-secondary)';
            dayElement.style.backgroundColor = 'var(--color-secondary)';
            dayElement.style.cursor = 'default';
        }
        
        if (isToday) {
            dayElement.classList.add('today');
            dayElement.style.borderColor = 'var(--color-warning)';
            dayElement.style.backgroundColor = 'var(--color-bg-2)';
            dayElement.style.fontWeight = 'var(--font-weight-semibold)';
        }
        
        if (isSelected) {
            dayElement.classList.add('selected');
            dayElement.style.backgroundColor = 'var(--color-primary)';
            dayElement.style.color = 'var(--color-btn-primary-text)';
            dayElement.style.borderColor = 'var(--color-primary)';
        }
        
        if (isWeekend && this.weekendDetectionEnabled) {
            dayElement.classList.add('weekend');
            if (!isSelected) {
                dayElement.style.backgroundColor = 'var(--color-bg-8)';
            }
        }
        
        if (hasEntries) {
            dayElement.classList.add('has-entries');
            if (!isSelected) {
                dayElement.style.borderColor = 'var(--color-primary)';
            }
        }

        // Create day number
        const dateNumber = document.createElement('div');
        dateNumber.className = 'date-number';
        dateNumber.textContent = date.getDate();
        dateNumber.style.cssText = `
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-medium);
            margin-bottom: var(--space-2);
        `;

        dayElement.appendChild(dateNumber);

        // Add entry indicators
        if (hasEntries) {
            this.addEntryIndicators(dayElement, dateKey, isSelected);
        }

        // Add event listeners for current month days only
        if (isCurrentMonth) {
            dayElement.addEventListener('click', () => {
                this.selectDate(date);
            });
            
            dayElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectDate(date);
                }
            });

            // Hover effects
            dayElement.addEventListener('mouseenter', () => {
                if (!isSelected) {
                    dayElement.style.borderColor = 'var(--color-primary)';
                    dayElement.style.backgroundColor = 'var(--color-bg-1)';
                }
            });

            dayElement.addEventListener('mouseleave', () => {
                if (!isSelected) {
                    // Restore original background
                    if (isToday) {
                        dayElement.style.backgroundColor = 'var(--color-bg-2)';
                        dayElement.style.borderColor = 'var(--color-warning)';
                    } else if (isWeekend && this.weekendDetectionEnabled) {
                        dayElement.style.backgroundColor = 'var(--color-bg-8)';
                        dayElement.style.borderColor = 'var(--color-border)';
                    } else if (hasEntries) {
                        dayElement.style.backgroundColor = 'var(--color-background)';
                        dayElement.style.borderColor = 'var(--color-primary)';
                    } else {
                        dayElement.style.backgroundColor = 'var(--color-background)';
                        dayElement.style.borderColor = 'var(--color-border)';
                    }
                }
            });
        }

        return dayElement;
    }

    /**
     * Add entry indicators to calendar day
     * @param {HTMLElement} dayElement - Day element
     * @param {string} dateKey - Date key
     * @param {boolean} isSelected - Whether day is selected
     */
    addEntryIndicators(dayElement, dateKey, isSelected) {
        const entries = this.dataService.getEntriesForDate(dateKey);
        
        // Add entry count indicator
        const entryCount = document.createElement('div');
        entryCount.className = 'entry-count';
        entryCount.textContent = entries.length;
        entryCount.style.cssText = `
            position: absolute;
            top: var(--space-2);
            right: var(--space-2);
            background-color: ${isSelected ? 'var(--color-btn-primary-text)' : 'var(--color-primary)'};
            color: ${isSelected ? 'var(--color-primary)' : 'var(--color-btn-primary-text)'};
            border-radius: 50%;
            width: 16px;
            height: 16px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: var(--font-weight-bold);
        `;
        dayElement.appendChild(entryCount);

        // Add hours indicator for work entries
        const workEntries = entries.filter(entry => entry.type === 'work');
        if (workEntries.length > 0) {
            const totalHours = workEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
            
            const hoursIndicator = document.createElement('div');
            hoursIndicator.className = 'hours-indicator';
            hoursIndicator.textContent = `${totalHours}h`;
            hoursIndicator.style.cssText = `
                font-size: 10px;
                color: ${isSelected ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)'};
                margin-top: auto;
            `;
            dayElement.appendChild(hoursIndicator);
        }

        // Add entry type indicators
        const entryTypes = [...new Set(entries.map(entry => entry.type))];
        if (entryTypes.length > 0) {
            const typeIndicators = document.createElement('div');
            typeIndicators.className = 'type-indicators';
            typeIndicators.style.cssText = `
                position: absolute;
                bottom: var(--space-2);
                left: var(--space-2);
                display: flex;
                gap: var(--space-1);
            `;

            entryTypes.forEach(type => {
                const indicator = document.createElement('div');
                indicator.className = `type-indicator ${type}`;
                indicator.style.cssText = `
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background-color: ${this.getEntryTypeColor(type)};
                `;
                typeIndicators.appendChild(indicator);
            });

            dayElement.appendChild(typeIndicators);
        }
    }

    /**
     * Get color for entry type
     * @param {string} type - Entry type
     * @returns {string} - Color value
     */
    getEntryTypeColor(type) {
        const colors = {
            work: 'var(--color-primary)',
            fullLeave: 'var(--color-error)',
            halfLeave: 'var(--color-warning)',
            holiday: 'var(--color-success)'
        };
        return colors[type] || 'var(--color-info)';
    }

    /**
     * Check if date is weekend
     * @param {Date} date - Date to check
     * @returns {boolean} - Whether date is weekend
     */
    isWeekend(date) {
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
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
     * Check if date has entries
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @returns {boolean} - Whether date has entries
     */
    hasEntriesForDate(dateKey) {
        const entries = this.dataService.getEntriesForDate(dateKey);
        return entries.length > 0;
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
     * Select a date
     * @param {Date} date - Date to select
     */
    selectDate(date) {
        this.selectedDate = date;
        const dateKey = this.formatDateKey(date);
        
        // Dispatch event
        const event = new CustomEvent('calendar:dateSelected', {
            detail: {
                date: date,
                dateKey: dateKey
            }
        });
        document.dispatchEvent(event);
        
        // Re-render to show selection
        this.renderCalendarDays();
        
        console.log(`CalendarView: Selected date ${dateKey}`);
    }

    /**
     * Navigate months
     * @param {number} direction - Direction (-1 for previous, 1 for next)
     */
    navigateMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.render();
        
        // Dispatch event
        const event = new CustomEvent('calendar:monthChanged', {
            detail: {
                date: new Date(this.currentDate),
                monthKey: this.formatDateKey(this.currentDate).substring(0, 7)
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Navigate to specific month
     * @param {string} monthKey - Month key (YYYY-MM)
     */
    navigateToMonth(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        this.currentDate = new Date(year, month - 1, 1);
        this.render();
        
        // Dispatch event
        const event = new CustomEvent('calendar:monthChanged', {
            detail: {
                date: new Date(this.currentDate),
                monthKey: monthKey
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Update month selector dropdown
     */
    updateMonthSelector() {
        if (!this.elements.monthSelector) return;

        // Get available months from data
        const workLogData = this.dataService.getWorkLogData();
        const availableMonths = new Set();
        
        // Add months that have data
        Object.keys(workLogData).forEach(dateKey => {
            const monthKey = dateKey.substring(0, 7);
            availableMonths.add(monthKey);
        });

        // Add current month if not in data
        const currentMonthKey = this.formatDateKey(this.currentDate).substring(0, 7);
        availableMonths.add(currentMonthKey);

        // Sort months
        const sortedMonths = Array.from(availableMonths).sort().reverse();

        // Update selector
        this.elements.monthSelector.innerHTML = '';
        sortedMonths.forEach(monthKey => {
            const option = document.createElement('option');
            option.value = monthKey;
            option.textContent = this.formatMonthKey(monthKey);
            option.selected = monthKey === currentMonthKey;
            this.elements.monthSelector.appendChild(option);
        });
    }

    /**
     * Format month key for display
     * @param {string} monthKey - Month key (YYYY-MM)
     * @returns {string} - Formatted month
     */
    formatMonthKey(monthKey) {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    }

    /**
     * Refresh calendar display
     */
    refresh() {
        this.render();
        console.log('CalendarView: Refreshed');
    }

    /**
     * Set current date (programmatically)
     * @param {Date} date - Date to set as current
     */
    setCurrentDate(date) {
        this.currentDate = new Date(date);
        this.render();
    }

    /**
     * Get current month data
     * @returns {Object} - Current month information
     */
    getCurrentMonthData() {
        const monthKey = this.formatDateKey(this.currentDate).substring(0, 7);
        const workLogData = this.dataService.getWorkLogData();
        
        // Get all dates for current month
        const monthDates = Object.keys(workLogData).filter(dateKey => 
            dateKey.startsWith(monthKey)
        );

        return {
            monthKey,
            totalDays: monthDates.length,
            totalEntries: monthDates.reduce((sum, dateKey) => 
                sum + workLogData[dateKey].length, 0
            ),
            workDays: monthDates.filter(dateKey =>
                workLogData[dateKey].some(entry => entry.type === 'work')
            ).length
        };
    }

    /**
     * Enable/disable weekend detection
     * @param {boolean} enabled - Whether to enable weekend detection
     */
    setWeekendDetection(enabled) {
        this.weekendDetectionEnabled = enabled;
        this.refresh();
        console.log(`CalendarView: Weekend detection ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get selected date
     * @returns {Date|null} - Currently selected date
     */
    getSelectedDate() {
        return this.selectedDate;
    }

    /**
     * Get current date
     * @returns {Date} - Current calendar date
     */
    getCurrentDate() {
        return new Date(this.currentDate);
    }

    /**
     * Highlight specific dates
     * @param {Array} dates - Array of date objects with highlighting info
     */
    highlightDates(dates) {
        // Implementation for highlighting specific dates
        dates.forEach(({ date, className, style }) => {
            const dateKey = this.formatDateKey(date);
            const dayElement = document.querySelector(`[data-date="${dateKey}"]`);
            if (dayElement) {
                if (className) dayElement.classList.add(className);
                if (style) Object.assign(dayElement.style, style);
            }
        });
    }

    /**
     * Clear all date highlights
     */
    clearHighlights() {
        const highlightedElements = document.querySelectorAll('.calendar-date.highlighted');
        highlightedElements.forEach(element => {
            element.classList.remove('highlighted');
        });
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
     * Get calendar statistics
     * @returns {Object} - Calendar statistics
     */
    getCalendarStats() {
        const monthData = this.getCurrentMonthData();
        
        return {
            currentMonth: this.formatMonthKey(monthData.monthKey),
            selectedDate: this.selectedDate ? this.formatDateKey(this.selectedDate) : null,
            weekendDetection: this.weekendDetectionEnabled,
            ...monthData
        };
    }
}

export default CalendarView;
