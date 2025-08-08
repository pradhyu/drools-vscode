#!/usr/bin/env node

/**
 * Test Runner for Feature-Based Test Structure
 * Allows running tests by feature category
 */

const { execSync } = require('child_process');
const path = require('path');

const testCategories = {
    'core': 'Core parsing functionality (parser, AST, comments)',
    'language-features': 'Drools language features (rules, queries, functions)',
    'patterns': 'Pattern matching (basic, multi-line, constraints)',
    'validation': 'Validation and diagnostics (syntax, semantic, grammar)',
    'ide-features': 'IDE functionality (completion, formatting, symbols)',
    'performance': 'Performance tests (large files, memory usage)',
    'integration': 'Integration tests (language server, end-to-end)'
};

function showUsage() {
    console.log('Usage: node test/run-tests.js [category] [options]');
    console.log('');
    console.log('Categories:');
    Object.entries(testCategories).forEach(([key, description]) => {
        console.log(`  ${key.padEnd(20)} ${description}`);
    });
    console.log('  all                  Run all tests');
    console.log('');
    console.log('Options:');
    console.log('  --verbose           Show detailed test output');
    console.log('  --watch             Watch for changes and re-run tests');
    console.log('  --coverage          Generate coverage report');
    console.log('');
    console.log('Examples:');
    console.log('  node test/run-tests.js core');
    console.log('  node test/run-tests.js patterns --verbose');
    console.log('  node test/run-tests.js validation --watch');
    console.log('  node test/run-tests.js all --coverage');
}

function runTests(category, options = []) {
    const jestOptions = [];
    
    if (category === 'all') {
        jestOptions.push('test/');
    } else if (testCategories[category]) {
        jestOptions.push(`test/${category}/`);
    } else {
        console.error(`Unknown test category: ${category}`);
        console.error('Available categories:', Object.keys(testCategories).join(', '));
        process.exit(1);
    }
    
    // Add additional options
    if (options.includes('--verbose')) {
        jestOptions.push('--verbose');
    }
    
    if (options.includes('--watch')) {
        jestOptions.push('--watch');
    }
    
    if (options.includes('--coverage')) {
        jestOptions.push('--coverage');
    }
    
    const command = `npx jest ${jestOptions.join(' ')}`;
    
    console.log(`Running tests for category: ${category}`);
    console.log(`Command: ${command}`);
    console.log('');
    
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        process.exit(error.status || 1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

const category = args[0];
const options = args.slice(1);

runTests(category, options);