/**
 * CSV Handler
 * Handles CSV file parsing and bulk upload
 */

import type { CSVUserRow } from '../domain/types.js';

export class CSVHandler {
  /**
   * Parse CSV file
   */
  async parseCSV(file: File): Promise<CSVUserRow[]> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
    const records: CSVUserRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        records.push(record as CSVUserRow);
      }
    }

    return records;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Generate sample CSV content
   */
  generateSampleCSV(): string {
    const sampleData: CSVUserRow[] = [
      {
        'Name': 'John Doe',
        'Email': 'john.doe@example.com',
        'Role': 'Employee',
        'Department': 'QPT',
        'Channel': 'Voice',
        'Team': 'Team A',
        'Designation': 'Customer Service Representative',
        'Employee ID': 'EMP001',
        'Country': 'Bangladesh',
        'Team Supervisor': 'supervisor@example.com',
        'Quality Mentor': 'qa@example.com',
        'Status': 'Active'
      },
      {
        'Name': 'Jane Smith',
        'Email': 'jane.smith@example.com',
        'Role': 'Quality Analyst',
        'Department': 'CEx',
        'Channel': 'Chat',
        'Team': 'Team B',
        'Designation': 'Senior Quality Analyst',
        'Employee ID': 'EMP002',
        'Country': 'Bangladesh',
        'Team Supervisor': '',
        'Quality Mentor': '',
        'Status': 'Active'
      }
    ];

    const headers = Object.keys(sampleData[0]);
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row =>
        headers.map(header => {
          const value = row[header as keyof CSVUserRow] || '';
          // Escape commas and quotes in values
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Download sample CSV template
   */
  downloadSampleCSV(): void {
    const csvContent = this.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'user_bulk_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

