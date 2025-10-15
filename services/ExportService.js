// services/ExportService.js
// Export Service Class - Handles data export operations in various formats

class ExportService {
    constructor(dataService) {
        this.dataService = dataService;
        this.supportedFormats = ['csv', 'json', 'pdf', 'excel'];
    }

    /**
     * Export data in specified format
     * @param {string} format - Export format (csv, json, pdf, excel)
     * @param {Object} options - Export options
     * @returns {Promise} - Export result
     */
    async export(format, options = {}) {
        const {
            dateRange = 'all',
            startDate = null,
            endDate = null,
            includeProjects = true,
            includeComments = true,
            filename = null
        } = options;

        if (!this.supportedFormats.includes(format)) {
            throw new Error(`Unsupported export format: ${format}`);
        }

        try {
            const data = this.prepareExportData(dateRange, startDate, endDate);
            const exportFilename = filename || this.generateFilename(format, dateRange);

            switch (format) {
                case 'csv':
                    return await this.exportToCSV(data, exportFilename, { includeProjects, includeComments });
                case 'json':
                    return await this.exportToJSON(data, exportFilename);
                case 'pdf':
                    return await this.exportToPDF(data, exportFilename);
                case 'excel':
                    return await this.exportToExcel(data, exportFilename);
                default:
                    throw new Error(`Export format ${format} not implemented`);
            }
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    /**
     * Prepare data for export based on date range
     * @param {string} dateRange - Date range type
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Object} - Prepared export data
     */
    prepareExportData(dateRange, startDate = null, endDate = null) {
        const workLogData = this.dataService.getWorkLogData();
        const projects = this.dataService.getProjects();
        const entries = [];

        let filterStartDate, filterEndDate;

        switch (dateRange) {
            case 'current-month':
                const currentDate = new Date();
                filterStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                filterEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                break;
            case 'last-month':
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                filterStartDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                filterEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                break;
            case 'last-3-months':
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                filterStartDate = threeMonthsAgo;
                filterEndDate = new Date();
                break;
            case 'custom':
                filterStartDate = startDate ? new Date(startDate) : null;
                filterEndDate = endDate ? new Date(endDate) : null;
                break;
            case 'all':
            default:
                filterStartDate = null;
                filterEndDate = null;
        }

        // Collect and filter entries
        Object.keys(workLogData).forEach(dateKey => {
            const entryDate = new Date(dateKey);
            
            // Apply date filter
            if (filterStartDate && entryDate < filterStartDate) return;
            if (filterEndDate && entryDate > filterEndDate) return;

            workLogData[dateKey].forEach(entry => {
                const project = this.dataService.findProjectByValue(entry.project);
                
                entries.push({
                    date: dateKey,
                    dayOfWeek: entryDate.toLocaleDateString('en-US', { weekday: 'long' }),
                    type: this.getEntryTypeLabel(entry.type),
                    project: project ? project.projectTitle : entry.project || 'N/A',
                    projectId: project ? project.projectId : '',
                    subCode: project ? project.subCode : '',
                    category: project ? project.category : 'N/A',
                    hours: this.getEntryHours(entry),
                    actualHours: entry.hours || 0,
                    halfDayPeriod: entry.halfDayPeriod || 'N/A',
                    comments: entry.comments || '',
                    timestamp: entry.timestamp || '',
                    createdDate: entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'N/A'
                });
            });
        });

        // Sort by date
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            entries,
            projects,
            metadata: {
                exportDate: new Date().toISOString(),
                dateRange,
                startDate: filterStartDate?.toISOString() || null,
                endDate: filterEndDate?.toISOString() || null,
                totalEntries: entries.length,
                exportedBy: 'Daily Work Log Tracker v2.1'
            },
            summary: this.generateSummary(entries)
        };
    }

    /**
     * Export data to CSV format
     * @param {Object} data - Export data
     * @param {string} filename - Output filename
     * @param {Object} options - Export options
     * @returns {Promise} - Export result
     */
    async exportToCSV(data, filename, options = {}) {
        const { includeProjects = true, includeComments = true } = options;
        
        // Define headers
        let headers = [
            'Date',
            'Day of Week',
            'Entry Type',
            'Project',
            'Hours'
        ];

        if (includeProjects) {
            headers.push('Project ID', 'Sub Code', 'Category');
        }

        if (includeComments) {
            headers.push('Comments');
        }

        headers.push('Created Date', 'Timestamp');

        // Create CSV content
        const csvRows = [headers.join(',')];

        data.entries.forEach(entry => {
            let row = [
                entry.date,
                `"${entry.dayOfWeek}"`,
                `"${entry.type}"`,
                `"${entry.project.replace(/"/g, '""')}"`,
                entry.hours
            ];

            if (includeProjects) {
                row.push(
                    `"${entry.projectId}"`,
                    `"${entry.subCode}"`,
                    `"${entry.category}"`
                );
            }

            if (includeComments) {
                row.push(`"${entry.comments.replace(/"/g, '""')}"`);
            }

            row.push(
                `"${entry.createdDate}"`,
                entry.timestamp
            );

            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        this.downloadFile(csvContent, filename, 'text/csv');
        
        return {
            success: true,
            message: `CSV exported successfully: ${data.entries.length} entries`,
            filename
        };
    }

    /**
     * Export data to JSON format
     * @param {Object} data - Export data
     * @param {string} filename - Output filename
     * @returns {Promise} - Export result
     */
    async exportToJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
        
        return {
            success: true,
            message: `JSON exported successfully: ${data.entries.length} entries`,
            filename
        };
    }

    /**
     * Export data to PDF format
     * @param {Object} data - Export data
     * @param {string} filename - Output filename
     * @returns {Promise} - Export result
     */
    async exportToPDF(data, filename) {
        // Create HTML content for PDF generation
        const htmlContent = this.generatePDFHTML(data);
        
        // Use browser's print functionality to generate PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 100);

        return {
            success: true,
            message: `PDF generation initiated: ${data.entries.length} entries`,
            filename
        };
    }

    /**
     * Export data to Excel format
     * @param {Object} data - Export data
     * @param {string} filename - Output filename
     * @returns {Promise} - Export result
     */
    async exportToExcel(data, filename) {
        // For Excel export, we'll create an enhanced CSV with multiple sheets worth of data
        // This is a simplified Excel export - for true Excel format, would need a library like SheetJS
        
        const workbook = {
            SheetNames: ['Work Log', 'Projects', 'Summary'],
            Sheets: {
                'Work Log': this.createExcelSheet(data.entries, [
                    'Date', 'Day of Week', 'Entry Type', 'Project', 'Hours', 
                    'Project ID', 'Sub Code', 'Category', 'Comments', 'Created Date'
                ]),
                'Projects': this.createExcelSheet(data.projects, [
                    'Project ID', 'Sub Code', 'Project Title', 'Category', 
                    'Usage Count', 'Is Active', 'Created At'
                ]),
                'Summary': this.createExcelSheet([data.summary], Object.keys(data.summary))
            }
        };

        // Convert to CSV format for download (simplified Excel export)
        const csvContent = this.convertWorkbookToCSV(workbook);
        this.downloadFile(csvContent, filename.replace('.xlsx', '.csv'), 'text/csv');

        return {
            success: true,
            message: `Excel-format CSV exported successfully: ${data.entries.length} entries`,
            filename: filename.replace('.xlsx', '.csv')
        };
    }

    /**
     * Create Excel-like sheet from array of objects
     * @param {Array} data - Data array
     * @param {Array} headers - Header columns
     * @returns {Array} - Sheet data
     */
    createExcelSheet(data, headers) {
        const sheet = [headers];
        
        data.forEach(item => {
            const row = headers.map(header => {
                const key = header.toLowerCase().replace(/\s+/g, '');
                return item[key] || item[header] || '';
            });
            sheet.push(row);
        });
        
        return sheet;
    }

    /**
     * Convert workbook to CSV format
     * @param {Object} workbook - Workbook object
     * @returns {string} - CSV content
     */
    convertWorkbookToCSV(workbook) {
        let csvContent = '';
        
        workbook.SheetNames.forEach(sheetName => {
            csvContent += `\n--- ${sheetName} ---\n`;
            const sheet = workbook.Sheets[sheetName];
            
            sheet.forEach(row => {
                csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
            });
        });
        
        return csvContent;
    }

    /**
     * Generate HTML content for PDF export
     * @param {Object} data - Export data
     * @returns {string} - HTML content
     */
    generatePDFHTML(data) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Work Log Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1, h2 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
                    .metadata { color: #666; font-size: 12px; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Daily Work Log Report</h1>
                
                <div class="metadata">
                    <p>Generated on: ${new Date(data.metadata.exportDate).toLocaleString()}</p>
                    <p>Date Range: ${data.metadata.dateRange}</p>
                    <p>Total Entries: ${data.metadata.totalEntries}</p>
                </div>

                <div class="summary">
                    <h2>Summary</h2>
                    <p>Total Days Worked: ${data.summary.totalDaysWorked}</p>
                    <p>Total Hours: ${data.summary.totalHours}</p>
                    <p>Average Hours per Day: ${data.summary.averageHours}</p>
                    <p>Unique Projects: ${data.summary.uniqueProjects}</p>
                </div>

                <h2>Work Log Entries</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Type</th>
                            <th>Project</th>
                            <th>Hours</th>
                            <th>Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.entries.map(entry => `
                            <tr>
                                <td>${entry.date}</td>
                                <td>${entry.dayOfWeek}</td>
                                <td>${entry.type}</td>
                                <td>${entry.project}</td>
                                <td>${entry.hours}</td>
                                <td>${entry.comments}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="no-print" style="margin-top: 30px;">
                    <button onclick="window.print()">Print/Save as PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Generate export filename
     * @param {string} format - Export format
     * @param {string} dateRange - Date range
     * @returns {string} - Generated filename
     */
    generateFilename(format, dateRange) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
        
        let rangeStr;
        switch (dateRange) {
            case 'current-month':
                rangeStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '-').toLowerCase();
                break;
            case 'last-month':
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                rangeStr = lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '-').toLowerCase();
                break;
            case 'custom':
                rangeStr = 'custom-range';
                break;
            case 'all':
            default:
                rangeStr = 'all-data';
        }
        
        return `work-log-${rangeStr}-${dateStr}_${timeStr}.${format}`;
    }

    /**
     * Get entry type label
     * @param {string} type - Entry type
     * @returns {string} - Human readable label
     */
    getEntryTypeLabel(type) {
        const types = {
            work: 'Work Entry',
            fullLeave: 'Full Day Leave',
            halfLeave: 'Half Day Leave',
            holiday: 'Holiday'
        };
        return types[type] || type;
    }

    /**
     * Get entry hours based on type
     * @param {Object} entry - Entry object
     * @returns {number} - Hours for entry
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
     * Generate summary statistics
     * @param {Array} entries - Entries array
     * @returns {Object} - Summary statistics
     */
    generateSummary(entries) {
        const workEntries = entries.filter(entry => entry.type === 'Work Entry');
        const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
        const totalDaysWorked = new Set(workEntries.map(entry => entry.date)).size;
        const uniqueProjects = new Set(workEntries.map(entry => entry.project)).size;
        
        return {
            totalEntries: entries.length,
            totalWorkEntries: workEntries.length,
            totalDaysWorked,
            totalHours: parseFloat(totalHours.toFixed(2)),
            averageHours: totalDaysWorked > 0 ? parseFloat((totalHours / totalDaysWorked).toFixed(2)) : 0,
            uniqueProjects,
            dateRange: {
                earliest: entries.length > 0 ? entries[0].date : null,
                latest: entries.length > 0 ? entries[entries.length - 1].date : null
            }
        };
    }

    /**
     * Download file utility
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('File download failed:', error);
            throw new Error('File download failed');
        }
    }

    /**
     * Quick export current month data
     * @param {string} format - Export format
     * @returns {Promise} - Export result
     */
    async exportCurrentMonth(format = 'csv') {
        return await this.export(format, {
            dateRange: 'current-month',
            filename: this.generateFilename(format, 'current-month')
        });
    }

    /**
     * Quick export all data
     * @param {string} format - Export format
     * @returns {Promise} - Export result
     */
    async exportAllData(format = 'csv') {
        return await this.export(format, {
            dateRange: 'all',
            filename: this.generateFilename(format, 'all')
        });
    }

    /**
     * Export data for specific date
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} format - Export format
     * @returns {Promise} - Export result
     */
    async exportDateData(date, format = 'csv') {
        return await this.export(format, {
            dateRange: 'custom',
            startDate: date,
            endDate: date,
            filename: `work-log-${date}.${format}`
        });
    }

    /**
     * Get supported export formats
     * @returns {Array} - Array of supported formats
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }

    /**
     * Validate export options
     * @param {Object} options - Export options
     * @returns {boolean} - Whether options are valid
     */
    validateExportOptions(options) {
        const { dateRange, startDate, endDate, format } = options;
        
        if (format && !this.supportedFormats.includes(format)) {
            throw new Error(`Unsupported format: ${format}`);
        }
        
        if (dateRange === 'custom') {
            if (!startDate || !endDate) {
                throw new Error('Custom date range requires both start and end dates');
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                throw new Error('Start date must be before end date');
            }
        }
        
        return true;
    }
}

export default ExportService;
