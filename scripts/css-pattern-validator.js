/**
 * CSS Pattern Validator
 * 
 * Automatically detects common CSS structure issues by comparing patterns
 * across similar files (e.g., table/list views).
 * 
 * Patterns to detect:
 * 1. Container/Table selector mismatch (container styles on table element)
 * 2. Missing container wrapper styles
 * 3. Inconsistent naming patterns
 * 4. Missing responsive breakpoints
 * 5. Box-sizing issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSSPatternValidator {
  constructor() {
    this.patterns = {
      // Container should have: background, padding, border-radius, box-shadow
      containerStyles: [
        'background',
        'padding',
        'border-radius',
        'box-shadow',
        'border',
        'width',
        'max-width',
        'box-sizing'
      ],
      // Table should have: border-collapse, border-spacing, table-layout
      tableStyles: [
        'border-collapse',
        'border-spacing',
        'table-layout',
        'width'
      ],
      // Common container class patterns
      containerPatterns: [
        /\.\w+-table-section/,
        /\.\w+-table\s*\{/,
        /\.\w+-container/
      ],
      // Common table class patterns
      tablePatterns: [
        /\.\w+-table\s+table/,
        /table\.\w+-table/
      ]
    };
    
    this.referenceFiles = [
      'src/features/settings/user-management/presentation/user-management-table.css'
    ];
  }

  /**
   * Parse CSS file and extract selector rules
   */
  parseCSS(cssContent) {
    const rules = [];
    const lines = cssContent.split('\n');
    let currentSelector = null;
    let currentRule = { selector: '', properties: {}, line: 0 };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (line.startsWith('/*') || line.startsWith('*') || line === '' || line === '*/') {
        continue;
      }
      
      // New selector
      if (line.includes('{') && !line.includes('}')) {
        if (currentRule.selector) {
          rules.push(currentRule);
        }
        currentRule = {
          selector: line.split('{')[0].trim(),
          properties: {},
          line: i + 1
        };
      }
      // Property
      else if (line.includes(':') && currentRule.selector) {
        const [prop, value] = line.split(':').map(s => s.trim());
        if (prop && value) {
          currentRule.properties[prop] = value.replace(';', '').trim();
        }
      }
      // End of rule
      else if (line.includes('}')) {
        if (currentRule.selector) {
          rules.push(currentRule);
          currentRule = { selector: '', properties: {}, line: 0 };
        }
      }
    }
    
    return rules;
  }

  /**
   * Check if selector is a container (has container styles)
   */
  isContainer(rule) {
    const hasContainerStyles = this.patterns.containerStyles.some(style => 
      rule.properties.hasOwnProperty(style)
    );
    return hasContainerStyles && (
      rule.selector.includes('-section') ||
      rule.selector.includes('-container') ||
      (!rule.selector.includes('table') && !rule.selector.includes('th') && !rule.selector.includes('td'))
    );
  }

  /**
   * Check if selector is a table (has table styles)
   */
  isTable(rule) {
    const hasTableStyles = this.patterns.tableStyles.some(style =>
      rule.properties.hasOwnProperty(style)
    );
    return hasTableStyles || rule.selector.includes('table');
  }

  /**
   * Validate CSS file against reference patterns
   */
  validateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rules = this.parseCSS(content);
    const issues = [];
    
    // Check for container/table pattern mismatch
    const containerRules = rules.filter(r => this.isContainer(r));
    const tableRules = rules.filter(r => this.isTable(r));
    
    // Issue 1: Container styles applied to table selector
    tableRules.forEach(rule => {
      const hasContainerStyles = this.patterns.containerStyles.some(style =>
        rule.properties.hasOwnProperty(style)
      );
      
      if (hasContainerStyles && !rule.selector.includes('section') && !rule.selector.includes('container')) {
        issues.push({
          type: 'CONTAINER_TABLE_MISMATCH',
          severity: 'error',
          message: `Container styles (background, padding, border-radius) found on table selector: ${rule.selector}`,
          line: rule.line,
          suggestion: 'Move container styles to a wrapper class (e.g., .table-section) and use nested selectors (.table-section table)'
        });
      }
    });
    
    // Issue 2: Missing container wrapper
    if (containerRules.length === 0 && tableRules.length > 0) {
      issues.push({
        type: 'MISSING_CONTAINER',
        severity: 'warning',
        message: 'Table found but no container wrapper detected. Consider adding a container class with background, padding, border-radius.',
        line: tableRules[0].line,
        suggestion: 'Add a container wrapper: .table-section { background: #fff; padding: 1rem; border-radius: 0.5rem; }'
      });
    }
    
    // Issue 3: Check for proper nesting pattern
    const hasNestedPattern = rules.some(r => 
      r.selector.includes('section') && r.selector.includes('table')
    );
    
    if (!hasNestedPattern && containerRules.length > 0 && tableRules.length > 0) {
      issues.push({
        type: 'MISSING_NESTED_SELECTOR',
        severity: 'warning',
        message: 'Container and table found but no nested selector pattern (.container table). Consider using nested selectors for better structure.',
        line: tableRules[0].line,
        suggestion: 'Use nested selectors: .table-section table { ... }'
      });
    }
    
    // Issue 4: Check for box-sizing
    const hasBoxSizing = rules.some(r => 
      r.properties['box-sizing'] || r.properties['box-sizing'] === 'border-box'
    );
    
    if (!hasBoxSizing && containerRules.length > 0) {
      issues.push({
        type: 'MISSING_BOX_SIZING',
        severity: 'info',
        message: 'Container found but box-sizing not set. Consider adding box-sizing: border-box.',
        suggestion: 'Add box-sizing: border-box to container and use * { box-sizing: border-box; }'
      });
    }
    
    // Issue 5: Check for responsive breakpoints
    const hasMediaQueries = content.includes('@media');
    if (!hasMediaQueries && tableRules.length > 0) {
      issues.push({
        type: 'MISSING_RESPONSIVE',
        severity: 'info',
        message: 'Table found but no responsive breakpoints detected.',
        suggestion: 'Add @media queries for mobile responsiveness'
      });
    }
    
    return {
      file: filePath,
      issues,
      stats: {
        totalRules: rules.length,
        containerRules: containerRules.length,
        tableRules: tableRules.length
      }
    };
  }

  /**
   * Compare file against reference files
   */
  compareWithReference(filePath, referencePath) {
    const fileResult = this.validateFile(filePath);
    const referenceResult = this.validateFile(referencePath);
    
    const comparison = {
      file: filePath,
      reference: referencePath,
      differences: []
    };
    
    // Compare structure patterns
    if (referenceResult.stats.containerRules > 0 && fileResult.stats.containerRules === 0) {
      comparison.differences.push({
        type: 'STRUCTURE_DIFFERENCE',
        message: 'Reference has container wrapper but target file does not',
        suggestion: 'Add container wrapper following reference pattern'
      });
    }
    
    return comparison;
  }

  /**
   * Validate all CSS files in a directory
   */
  validateDirectory(dirPath) {
    const results = [];
    const files = fs.readdirSync(dirPath, { recursive: true })
      .filter(f => f.endsWith('.css'))
      .map(f => path.join(dirPath, f));
    
    files.forEach(file => {
      try {
        const result = this.validateFile(file);
        if (result.issues.length > 0) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error validating ${file}:`, error.message);
      }
    });
    
    return results;
  }
}

// CLI usage - check if this file is being run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('css-pattern-validator.js');

if (isMainModule) {
  const validator = new CSSPatternValidator();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node css-pattern-validator.js <file-or-directory> [reference-file]');
    console.log('\nExamples:');
    console.log('  node css-pattern-validator.js src/features/settings/scorecards/presentation/scorecards-table.css');
    console.log('  node css-pattern-validator.js src/features/settings/scorecards/presentation/');
    process.exit(1);
  }
  
  const target = args[0];
  const reference = args[1];
  
  const stats = fs.statSync(target);
  
  if (stats.isDirectory()) {
    const results = validator.validateDirectory(target);
    results.forEach(result => {
      console.log(`\n${result.file}:`);
      result.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} [${issue.type}] ${issue.message}`);
        if (issue.line) {
          console.log(`     Line ${issue.line}`);
        }
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`);
        }
      });
    });
  } else {
    const result = validator.validateFile(target);
    console.log(`\nValidating: ${target}`);
    console.log(`Rules: ${result.stats.totalRules} | Containers: ${result.stats.containerRules} | Tables: ${result.stats.tableRules}`);
    
    if (result.issues.length === 0) {
      console.log('✅ No issues found!');
    } else {
      console.log(`\nFound ${result.issues.length} issue(s):\n`);
      result.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${issue.type}] ${issue.message}`);
        if (issue.line) {
          console.log(`   Line ${issue.line}`);
        }
        if (issue.suggestion) {
          console.log(`   💡 ${issue.suggestion}`);
        }
        console.log('');
      });
    }
    
    if (reference) {
      const comparison = validator.compareWithReference(target, reference);
      console.log('\nComparison with reference:');
      comparison.differences.forEach(diff => {
        console.log(`  ⚠️  ${diff.message}`);
        console.log(`     💡 ${diff.suggestion}`);
      });
    }
  }
}

export default CSSPatternValidator;

