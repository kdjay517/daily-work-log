// services/ExportService.js
// Data Export and Import Service

class ExportService {
    constructor(dataService) {
        this.dataService = dataService;
    }

    /**
     * Export current month data as CSV
     * @returns {Promise<void>}
     */
    async exportCurrentMonthCSV() {
        const currentDate = new Date();
        return this.exportMonthCSV(currentDate.getFullYear(), currentDate.getMonth());
    }

    /**
     * Export all data as CSV
     * @returns {Promise<void>}
     */
    async exportAllDataCSV() {
        try {
            const workLogData = this.dataService.getWorkLogData();
            const entries = this.flattenWorkLogData(workLogData);
            
            if (entries.length === 0) {
                throw new Error('No data available to export');
            }
            
            const csvContent = this.convertToCSV(entries);
            const filename = `work-log-all-data-${new Date().toISOString().split('T')[0]}.csv`;
            
            this.downloadFile(csvContent, filename, 'text/csv');
            
            return {
                success: true,
                message: `Exported ${entries.length} entries successfully`,
                filename: filename
            };
        } catch (error) {
            console.error('Export error:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Export month data as CSV
     * @param {number} year - Year to export
     * @param {number} month - Month to export (0-11)
     * @returns {Promise<void>}
     */
    async exportMonthCSV(year, month) {
        try {
            const workLogData = this.dataService.getWorkLogData();
            const monthEntries = [];
            
            Object.keys(workLogData).forEach(dateKey => {
                const date = new Date(dateKey);
                if (date.getFullYear() === year && date.getMonth() === month) {
                    workLogData[dateKey].forEach(entry => {
                        monthEntries.push({
                            ...entry,
                            date: dateKey,
                            dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' })
                        });
                    });
                }
            });

            if (monthEntries.length === 0) {
                throw new Error('No data available for the selected month');
            }

            const csvContent = this.convertToCSV(monthEntries);
            const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const filename = `work-log-${monthName.replace(' ', '-').toLowerCase()}.csv`;
            
            this.downloadFile(csvContent, filename, 'text/csv');
            
            return {
                success: true,
                message: `Exported ${monthEntries.length} entries for ${monthName}`,
                filename: filename
            };
        } catch (error) {
            console.error('Export error:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Export data backup as JSON
     * @returns {Promise<Object>}
     */
    async exportDataBackup() {
        try {
            const backupData = {
                version: '2.1',
                exportDate: new Date().toISOString(),
                workLogData: this.dataService.getWorkLogData(),
                projectData: this.dataService.getProjects(),
                metadata: {
                    totalEntries: this.getTotalEntriesCount(),
                    dateRange: this.getDateRange(),
                    exportedBy: 'Work Log Tracker v2.1'
                }
            };

            const jsonContent = JSON.stringify(backupData, null, 2);
            const filename = `work-log-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            this.downloadFile(jsonContent, filename, 'application/json');
            
            return {
                success: true,
                message: 'Data backup exported successfully',
                filename: filename,
                entriesCount: backupData.metadata.totalEntries
            };
        } catch (error) {
            console.error('Backup export error:', error);
            throw new Error(`Backup export failed: ${error.message}`);
        }
    }

    /**
     * Import data from backup file
     * @param {File} file - Backup file
     * @returns {Promise<Object>}
     */
    async importDataBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    // Validate backup format
                    if (!backupData.workLogData || !backupData.projectData) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    // Merge or replace data based on user choice
                    const importChoice = confirm(
                        'How would you like to import this backup?\n\n' +
                        'OK = Merge with existing data\n' +
                        'Cancel = Replace all existing data'
                    );
                    
                    let importedEntries = 0;
                    let importedProjects = 0;
                    
                    if (importChoice) {
                        // Merge data
                        importedEntries = await this.mergeWorkLogData(backupData.workLogData);
                        importedProjects = await this.mergeProjectData(backupData.projectData);
                    } else {
                        // Replace data
                        await this.dataService.replaceAllData(backupData.workLogData, backupData.projectData);
                        importedEntries = this.getTotalEntriesFromData(backupData.workLogData);
                        importedProjects = backupData.projectData.length;
                    }
                    
                    // Save the updated data
                    await this.dataService.saveData();
                    
                    resolve({
                        success: true,
                        message: `Import completed: ${importedEntries} entries, ${importedProjects} projects`,
                        importedEntries: importedEntries,
                        importedProjects: importedProjects,
                        backupDate: backupData.exportDate
                    });
                    
                } catch (error) {
                    reject(new Error(`Import failed: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read backup file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Export custom date range as CSV
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string} format - Export format (csv, json, pdf)
     * @returns {Promise<Object>}
     */
    async exportCustomRange(startDate, endDate, format = 'csv') {
        try {
            const workLogData = this.dataService.getWorkLogData();
            const entries = [];
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            Object.keys(workLogData).forEach(dateKey => {
                const date = new Date(dateKey);
                if (date >= start && date <= end) {
                    workLogData[dateKey].forEach(entry => {
                        entries.push({
                            ...entry,
                            date: dateKey,
                            dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' })
                        });
                    });
                }
            });

            if (entries.length === 0) {
                throw new Error('No data available for the selected date range');
            }

            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            
            let filename, content, mimeType;
            
            switch (format) {
                case 'json':
                    content = JSON.stringify({
                        dateRange: { start: startStr, end: endStr },
                        exportDate: new Date().toISOString(),
                        entries: entries
                    }, null, 2);
                    filename = `work-log-${startStr}-to-${endStr}.json`;
                    mimeType = 'application/json';
                    break;
                    
                case 'pdf':
                    // For PDF, we'll generate a formatted report
                    content = this.generatePDFReport(entries, start, end);
                    filename = `work-log-report-${startStr}-to-${endStr}.html`;
                    mimeType = 'text/html';
                    break;
                    
                default: // csv
                    content = this.convertToCSV(entries);
                    filename = `work-log-${startStr}-to-${endStr}.csv`;
                    mimeType = 'text/csv';
                    break;
            }
            
            this.downloadFile(content, filename, mimeType);
            
            return {
                success: true,
                message: `Exported ${entries.length} entries from ${startStr} to ${endStr}`,
                filename: filename,
                format: format
            };
            
        } catch (error) {
            console.error('Custom export error:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Convert work log entries to CSV format
     * @param {Array} entries - Work log entries
     * @returns {string} - CSV content
     */
    convertToCSV(entries) {
        const headers = [
            'Date',
            'Day of Week',
            'Entry Type',
            'Project ID',
            'Project Title',
            'Hours',
            'Half Day Period',
            'Comments',
            'Created Date'
        ];

        let csv = headers.join(',') + '\n';

        entries.forEach(entry => {
            const project = this.getProjectDisplayName(entry.project);
            const createdDate = entry.timestamp ? 
                new Date(entry.timestamp).toLocaleDateString() : 'N/A';
            
            const row = [
                entry.date,
                entry.dayOfWeek || new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' }),
                this.getEntryTypeLabel(entry.type),
                this.getProjectId(entry.project),
                this.getProjectTitle(entry.project),
                entry.hours || this.getDefaultHours(entry.type),
                entry.halfDayPeriod || 'N/A',
                this.escapeCsvValue(entry.comments || ''),
                createdDate
            ];

            csv += row.map(value => `"${value}"`).join(',') + '\n';
        });

        return csv;
    }

    /**
     * Generate PDF report content
     * @param {Array} entries - Work log entries
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {string} - HTML content for PDF
     */
    generatePDFReport(entries, startDate, endDate) {
        const totalHours = entries.reduce((sum, entry) => 
            sum + (entry.hours || this.getDefaultHours(entry.type)), 0);
        const workDays = new Set(entries.filter(e => e.type === 'work').map(e => e.date)).size;
        const avgHours = workDays > 0 ? (totalHours / workDays) : 0;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Work Log Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 40px; }
                .summary { background: #f8f9fa; padding: 20px; margin-bottom: 30px; }
                .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
                .summary-item { text-align: center; }
                .summary-value { font-size: 24px; font-weight: bold; color: #2563eb; }
                .summary-label { font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; font-weight: bold; }
                .entry-work { background-color: rgba(37, 99, 235, 0.1); }
                .entry-leave { background-color: rgba(220, 38, 38, 0.1); }
                .entry-holiday { background-color: rgba(22, 163, 74, 0.1); }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Work Log Report</h1>
                <p>Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
                <p>Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="summary">
                <h2>Summary</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${workDays}</div>
                        <div class="summary-label">Work Days</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${totalHours.toFixed(2)}</div>
                        <div class="summary-label">Total Hours</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${avgHours.toFixed(2)}</div>
                        <div class="summary-label">Avg Hours/Day</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${entries.length}</div>
                        <div class="summary-label">Total Entries</div>
                    </div>
                </div>
            </div>
            
            <h2>Detailed Entries</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Project</th>
                        <th>Hours</th>
                        <th>Comments</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map(entry => `
                        <tr class="entry-${entry.type}">
                            <td>${entry.date}</td>
                            <td>${this.getEntryTypeLabel(entry.type)}</td>
                            <td>${this.getProjectDisplayName(entry.project)}</td>
                            <td>${entry.hours || this.getDefaultHours(entry.type)}</td>
                            <td>${entry.comments || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `;
    }

    /**
     * Download file to user's device
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Flatten work log data structure
     * @param {Object} workLogData - Work log data
     * @returns {Array} - Flattened entries
     */
    flattenWorkLogData(workLogData) {
        const entries = [];
        
        Object.keys(workLogData).forEach(dateKey => {
            workLogData[dateKey].forEach(entry => {
                entries.push({
                    ...entry,
                    date: dateKey,
                    dayOfWeek: new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' })
                });
            });
        });
        
        // Sort by date
        return entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Get project display name
     * @param {string} projectValue - Project value
     * @returns {string} - Display name
     */
    getProjectDisplayName(projectValue) {
        if (!projectValue) return 'N/A';
        
        const project = this.dataService.findProjectByValue(projectValue);
        if (project) {
            return `${project.projectId} - ${project.projectTitle}`;
        }
        
        return projectValue;
    }

    /**
     * Get project ID from project value
     * @param {string} projectValue - Project value
     * @returns {string} - Project ID
     */
    getProjectId(projectValue) {
        if (!projectValue) return 'N/A';
        
        const project = this.dataService.findProjectByValue(projectValue);
        return project ? project.projectId : projectValue.split('-')[0] || projectValue;
    }

    /**
     * Get project title from project value
     * @param {string} projectValue - Project value
     * @returns {string} - Project title
     */
    getProjectTitle(projectValue) {
        if (!projectValue) return 'N/A';
        
        const project = this.dataService.findProjectByValue(projectValue);
        return project ? project.projectTitle : 'Unknown Project';
    }

    /**
     * Get entry type label
     * @param {string} type - Entry type
     * @returns {string} - Entry type label
     */
    getEntryTypeLabel(type) {
        const labels = {
            work: 'Work Entry',
            fullLeave: 'Full Day Leave',
            halfLeave: 'Half Day Leave',
            holiday: 'Holiday'
        };
        
        return labels[type] || type;
    }

    /**
     * Get default hours for entry type
     * @param {string} type - Entry type
     * @returns {number} - Default hours
     */
    getDefaultHours(type) {
        const defaults = {
            work: 0,
            fullLeave: 8,
            halfLeave: 4,
            holiday: 8
        };
        
        return defaults[type] || 0;
    }

    /**
     * Escape CSV value
     * @param {string} value - Value to escape
     * @returns {string} - Escaped value
     */
    escapeCsvValue(value) {
        if (typeof value !== 'string') return value;
        return value.replace(/"/g, '""');
    }

    /**
     * Get total entries count
     * @returns {number} - Total entries
     */
    getTotalEntriesCount() {
        const workLogData = this.dataService.getWorkLogData();
        let count = 0;
        
        Object.keys(workLogData).forEach(dateKey => {
            count += workLogData[dateKey].length;
        });
        
        return count;
    }

    /**
     * Get date range of data
     * @returns {Object} - Date range
     */
    getDateRange() {
        const workLogData = this.dataService.getWorkLogData();
        const dates = Object.keys(workLogData).sort();
        
        return {
            earliest: dates[0] || null,
            latest: dates[dates.length - 1] || null
        };
    }

    /**
     * Merge work log data during import
     * @param {Object} importData - Work log data to merge
     * @returns {Promise<number>} - Number of entries imported
     */
    async mergeWorkLogData(importData) {
        let importedCount = 0;
        
        Object.keys(importData).forEach(dateKey => {
            const existingEntries = this.dataService.getEntriesForDate(dateKey);
            const importEntries = importData[dateKey];
            
            importEntries.forEach(importEntry => {
                // Check if entry already exists (by ID or similar content)
                const exists = existingEntries.some(existing => 
                    existing.id === importEntry.id ||
                    (existing.type === importEntry.type && 
                     existing.project === importEntry.project &&
                     existing.hours === importEntry.hours)
                );
                
                if (!exists) {
                    this.dataService.addEntry(dateKey, importEntry);
                    importedCount++;
                }
            });
        });
        
        return importedCount;
    }

    /**
     * Merge project data during import
     * @param {Array} importProjects - Projects to merge
     * @returns {Promise<number>} - Number of projects imported
     */
    async mergeProjectData(importProjects) {
        const existingProjects = this.dataService.getProjects();
        let importedCount = 0;
        
        importProjects.forEach(importProject => {
            const exists = existingProjects.some(existing =>
                existing.projectId === importProject.projectId &&
                existing.subCode === importProject.subCode
            );
            
            if (!exists) {
                this.dataService.addProject(importProject);
                importedCount++;
            }
        });
        
        return importedCount;
    }

    /**
     * Get total entries from data structure
     * @param {Object} workLogData - Work log data
     * @returns {number} - Total entries
     */
    getTotalEntriesFromData(workLogData) {
        let count = 0;
        Object.keys(workLogData).forEach(dateKey => {
            count += workLogData[dateKey].length;
        });
        return count;
    }
}

export default ExportService;
