// services/AnalyticsService.js
// Analytics and Reporting Service

class AnalyticsService {
    constructor(dataService) {
        this.dataService = dataService;
    }

    /**
     * Calculate monthly summary statistics
     * @param {Date} month - Month to analyze (defaults to current month)
     * @returns {Object} - Monthly summary data
     */
    calculateMonthlySummary(month = new Date()) {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        
        // Get all entries for the specified month
        const monthEntries = this.getMonthEntries(year, monthIndex);
        
        // Calculate basic metrics
        const workDays = this.calculateWorkDays(monthEntries);
        const totalHours = this.calculateTotalHours(monthEntries);
        const avgHours = workDays > 0 ? (totalHours / workDays) : 0;
        const totalEntries = monthEntries.length;
        const uniqueProjects = this.calculateUniqueProjects(monthEntries);
        const monthProgress = this.calculateMonthProgress(month);
        
        return {
            month: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            daysWorked: workDays,
            totalHours: parseFloat(totalHours.toFixed(2)),
            avgHours: parseFloat(avgHours.toFixed(2)),
            totalEntries: totalEntries,
            uniqueProjects: uniqueProjects,
            monthProgress: parseFloat(monthProgress.toFixed(1)),
            breakdown: this.calculateEntryTypeBreakdown(monthEntries)
        };
    }

    /**
     * Get historical data for all months with entries
     * @returns {Array} - Array of monthly summaries
     */
    getHistoricalData() {
        const workLogData = this.dataService.getWorkLogData();
        const monthsMap = new Map();
        
        // Group entries by month
        Object.keys(workLogData).forEach(dateKey => {
            const date = new Date(dateKey);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthsMap.has(monthKey)) {
                monthsMap.set(monthKey, {
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    entries: []
                });
            }
            
            monthsMap.get(monthKey).entries.push(...workLogData[dateKey]);
        });
        
        // Calculate summary for each month
        const historicalData = [];
        monthsMap.forEach(monthData => {
            const monthDate = new Date(monthData.year, monthData.month, 1);
            const summary = this.calculateMonthlySummary(monthDate);
            historicalData.push({
                period: summary.month,
                daysWorked: summary.daysWorked,
                totalHours: summary.totalHours,
                avgHours: summary.avgHours,
                entries: summary.totalEntries
            });
        });
        
        // Sort by date (newest first)
        return historicalData.sort((a, b) => {
            const dateA = new Date(a.period);
            const dateB = new Date(b.period);
            return dateB - dateA;
        });
    }

    /**
     * Get project productivity analytics
     * @returns {Array} - Project analytics data
     */
    getProjectAnalytics() {
        const workLogData = this.dataService.getWorkLogData();
        const projectStats = new Map();
        
        // Collect project statistics
        Object.keys(workLogData).forEach(dateKey => {
            workLogData[dateKey].forEach(entry => {
                if (entry.type === 'work' && entry.project) {
                    if (!projectStats.has(entry.project)) {
                        projectStats.set(entry.project, {
                            project: entry.project,
                            totalHours: 0,
                            entryCount: 0,
                            avgHours: 0,
                            lastUsed: dateKey
                        });
                    }
                    
                    const stats = projectStats.get(entry.project);
                    stats.totalHours += entry.hours || 0;
                    stats.entryCount += 1;
                    stats.avgHours = stats.totalHours / stats.entryCount;
                    
                    if (dateKey > stats.lastUsed) {
                        stats.lastUsed = dateKey;
                    }
                }
            });
        });
        
        return Array.from(projectStats.values())
            .sort((a, b) => b.totalHours - a.totalHours);
    }

    /**
     * Get productivity trends over time
     * @param {number} months - Number of months to analyze
     * @returns {Array} - Productivity trend data
     */
    getProductivityTrends(months = 6) {
        const trends = [];
        const currentDate = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const summary = this.calculateMonthlySummary(date);
            
            trends.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                daysWorked: summary.daysWorked,
                totalHours: summary.totalHours,
                avgHours: summary.avgHours,
                productivity: summary.avgHours > 0 ? (summary.totalHours / 20) * 100 : 0 // Assuming 20 working days
            });
        }
        
        return trends;
    }

    /**
     * Get entries for a specific month
     * @param {number} year - Year
     * @param {number} month - Month (0-11)
     * @returns {Array} - Array of entries
     */
    getMonthEntries(year, month) {
        const workLogData = this.dataService.getWorkLogData();
        const entries = [];
        
        Object.keys(workLogData).forEach(dateKey => {
            const date = new Date(dateKey);
            if (date.getFullYear() === year && date.getMonth() === month) {
                entries.push(...workLogData[dateKey].map(entry => ({
                    ...entry,
                    date: dateKey
                })));
            }
        });
        
        return entries;
    }

    /**
     * Calculate work days from entries
     * @param {Array} entries - Month entries
     * @returns {number} - Number of work days
     */
    calculateWorkDays(entries) {
        const workDates = new Set();
        
        entries.forEach(entry => {
            if (entry.type === 'work') {
                workDates.add(entry.date);
            }
        });
        
        return workDates.size;
    }

    /**
     * Calculate total hours worked
     * @param {Array} entries - Month entries
     * @returns {number} - Total hours
     */
    calculateTotalHours(entries) {
        return entries.reduce((total, entry) => {
            if (entry.type === 'work') {
                return total + (entry.hours || 0);
            }
            return total;
        }, 0);
    }

    /**
     * Calculate unique projects used
     * @param {Array} entries - Month entries
     * @returns {number} - Number of unique projects
     */
    calculateUniqueProjects(entries) {
        const projects = new Set();
        
        entries.forEach(entry => {
            if (entry.type === 'work' && entry.project) {
                projects.add(entry.project);
            }
        });
        
        return projects.size;
    }

    /**
     * Calculate month progress (percentage of month completed)
     * @param {Date} month - Month to calculate
     * @returns {number} - Progress percentage
     */
    calculateMonthProgress(month) {
        const now = new Date();
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        if (now < monthStart) {
            return 0;
        }
        
        if (now > monthEnd) {
            return 100;
        }
        
        const totalDays = monthEnd.getDate();
        const currentDay = now.getDate();
        
        return (currentDay / totalDays) * 100;
    }

    /**
     * Calculate entry type breakdown
     * @param {Array} entries - Month entries
     * @returns {Object} - Entry type breakdown
     */
    calculateEntryTypeBreakdown(entries) {
        const breakdown = {
            work: 0,
            fullLeave: 0,
            halfLeave: 0,
            holiday: 0
        };
        
        entries.forEach(entry => {
            if (breakdown.hasOwnProperty(entry.type)) {
                breakdown[entry.type]++;
            }
        });
        
        return breakdown;
    }

    /**
     * Get weekly productivity data
     * @param {Date} startDate - Start date
     * @param {number} weeks - Number of weeks
     * @returns {Array} - Weekly data
     */
    getWeeklyData(startDate = new Date(), weeks = 4) {
        const weeklyData = [];
        const workLogData = this.dataService.getWorkLogData();
        
        for (let i = weeks - 1; i >= 0; i--) {
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            let weekHours = 0;
            let weekDays = 0;
            
            // Calculate for this week
            for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                const dateKey = d.toISOString().split('T')[0];
                const dayEntries = workLogData[dateKey] || [];
                
                const workEntries = dayEntries.filter(e => e.type === 'work');
                if (workEntries.length > 0) {
                    weekDays++;
                    weekHours += workEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
                }
            }
            
            weeklyData.push({
                week: `Week ${weeks - i}`,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0],
                hours: parseFloat(weekHours.toFixed(2)),
                days: weekDays,
                avgDaily: weekDays > 0 ? parseFloat((weekHours / weekDays).toFixed(2)) : 0
            });
        }
        
        return weeklyData;
    }

    /**
     * Calculate attendance rate
     * @param {Date} month - Month to calculate
     * @returns {Object} - Attendance data
     */
    calculateAttendance(month = new Date()) {
        const entries = this.getMonthEntries(month.getFullYear(), month.getMonth());
        const attendanceDates = new Set();
        const leaveDates = new Set();
        const holidayDates = new Set();
        
        entries.forEach(entry => {
            if (entry.type === 'work') {
                attendanceDates.add(entry.date);
            } else if (entry.type === 'fullLeave' || entry.type === 'halfLeave') {
                leaveDates.add(entry.date);
            } else if (entry.type === 'holiday') {
                holidayDates.add(entry.date);
            }
        });
        
        const workingDays = this.getWorkingDaysInMonth(month);
        const attendanceRate = workingDays > 0 ? (attendanceDates.size / workingDays) * 100 : 0;
        
        return {
            workingDays: workingDays,
            presentDays: attendanceDates.size,
            leaveDays: leaveDates.size,
            holidayDays: holidayDates.size,
            attendanceRate: parseFloat(attendanceRate.toFixed(2))
        };
    }

    /**
     * Get working days in month (excluding weekends)
     * @param {Date} month - Month to calculate
     * @returns {number} - Working days count
     */
    getWorkingDaysInMonth(month) {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        let workingDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthIndex, day);
            const dayOfWeek = date.getDay();
            
            // Count Monday to Friday as working days
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                workingDays++;
            }
        }
        
        return workingDays;
    }
}

export default AnalyticsService;
