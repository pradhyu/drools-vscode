/**
 * Tests for Drools Documentation System
 */

import { DroolsDocumentation } from '../../src/server/documentation/droolsDocumentation';

describe('DroolsDocumentation', () => {
    describe('getKeywordDoc', () => {
        it('should return documentation for valid keywords', () => {
            const ruleDoc = DroolsDocumentation.getKeywordDoc('rule');
            
            expect(ruleDoc).toBeDefined();
            expect(ruleDoc?.keyword).toBe('rule');
            expect(ruleDoc?.category).toBe('rule');
            expect(ruleDoc?.description).toContain('Defines a rule');
            expect(ruleDoc?.syntax).toContain('rule "rule-name"');
            expect(ruleDoc?.example).toContain('rule "Customer Discount"');
        });

        it('should return null for invalid keywords', () => {
            const doc = DroolsDocumentation.getKeywordDoc('invalidkeyword');
            expect(doc).toBeNull();
        });

        it('should be case insensitive', () => {
            const doc1 = DroolsDocumentation.getKeywordDoc('RULE');
            const doc2 = DroolsDocumentation.getKeywordDoc('rule');
            
            expect(doc1).toEqual(doc2);
        });
    });

    describe('getFunctionDoc', () => {
        it('should return documentation for valid functions', () => {
            const updateDoc = DroolsDocumentation.getFunctionDoc('update');
            
            expect(updateDoc).toBeDefined();
            expect(updateDoc?.name).toBe('update');
            expect(updateDoc?.category).toBe('builtin');
            expect(updateDoc?.description).toContain('Notifies the engine');
            expect(updateDoc?.returnType).toBe('void');
            expect(updateDoc?.parameters).toHaveLength(1);
            expect(updateDoc?.parameters[0].name).toBe('fact');
            expect(updateDoc?.parameters[0].type).toBe('Object');
        });

        it('should return null for invalid functions', () => {
            const doc = DroolsDocumentation.getFunctionDoc('invalidfunction');
            expect(doc).toBeNull();
        });
    });

    describe('getKeywordsByCategory', () => {
        it('should return keywords by category', () => {
            const ruleKeywords = DroolsDocumentation.getKeywordsByCategory('rule');
            const conditionKeywords = DroolsDocumentation.getKeywordsByCategory('condition');
            const operatorKeywords = DroolsDocumentation.getKeywordsByCategory('operator');

            expect(ruleKeywords.length).toBeGreaterThan(0);
            expect(conditionKeywords.length).toBeGreaterThan(0);
            expect(operatorKeywords.length).toBeGreaterThan(0);

            expect(ruleKeywords.some(k => k.keyword === 'rule')).toBe(true);
            expect(conditionKeywords.some(k => k.keyword === 'when')).toBe(true);
            expect(operatorKeywords.some(k => k.keyword === 'and')).toBe(true);
        });

        it('should return empty array for invalid category', () => {
            const keywords = DroolsDocumentation.getKeywordsByCategory('invalid' as any);
            expect(keywords).toEqual([]);
        });
    });

    describe('searchKeywords', () => {
        it('should find keywords by partial name', () => {
            const results = DroolsDocumentation.searchKeywords('rul');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(k => k.keyword === 'rule')).toBe(true);
        });

        it('should find keywords by description', () => {
            const results = DroolsDocumentation.searchKeywords('condition');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(k => k.description.toLowerCase().includes('condition'))).toBe(true);
        });

        it('should be case insensitive', () => {
            const results1 = DroolsDocumentation.searchKeywords('RULE');
            const results2 = DroolsDocumentation.searchKeywords('rule');
            
            expect(results1).toEqual(results2);
        });
    });

    describe('getRelatedKeywords', () => {
        it('should return related keywords for rule', () => {
            const related = DroolsDocumentation.getRelatedKeywords('rule');
            
            expect(related.length).toBeGreaterThan(0);
            expect(related.some(k => k.keyword === 'when')).toBe(true);
            expect(related.some(k => k.keyword === 'then')).toBe(true);
            expect(related.some(k => k.keyword === 'end')).toBe(true);
        });

        it('should return empty array for keywords without relations', () => {
            const related = DroolsDocumentation.getRelatedKeywords('nonexistent');
            expect(related).toEqual([]);
        });
    });

    describe('keyword and function detection', () => {
        it('should correctly identify keywords', () => {
            expect(DroolsDocumentation.isKeyword('rule')).toBe(true);
            expect(DroolsDocumentation.isKeyword('when')).toBe(true);
            expect(DroolsDocumentation.isKeyword('then')).toBe(true);
            expect(DroolsDocumentation.isKeyword('invalidkeyword')).toBe(false);
        });

        it('should correctly identify functions', () => {
            expect(DroolsDocumentation.isFunction('update')).toBe(true);
            expect(DroolsDocumentation.isFunction('insert')).toBe(true);
            expect(DroolsDocumentation.isFunction('delete')).toBe(true);
            expect(DroolsDocumentation.isFunction('invalidfunction')).toBe(false);
        });
    });

    describe('getAllKeywords and getAllFunctions', () => {
        it('should return all available keywords', () => {
            const keywords = DroolsDocumentation.getAllKeywords();
            
            expect(keywords.length).toBeGreaterThan(20);
            expect(keywords).toContain('rule');
            expect(keywords).toContain('when');
            expect(keywords).toContain('then');
            expect(keywords).toContain('end');
        });

        it('should return all available functions', () => {
            const functions = DroolsDocumentation.getAllFunctions();
            
            expect(functions.length).toBeGreaterThan(0);
            expect(functions).toContain('update');
            expect(functions).toContain('insert');
            expect(functions).toContain('delete');
        });
    });

    describe('comprehensive keyword coverage', () => {
        it('should have documentation for all essential Drools keywords', () => {
            const essentialKeywords = [
                'rule', 'when', 'then', 'end',
                'and', 'or', 'not', 'exists',
                'collect', 'accumulate', 'from',
                'salience', 'no-loop', 'agenda-group',
                'global', 'import', 'package'
            ];

            essentialKeywords.forEach(keyword => {
                const doc = DroolsDocumentation.getKeywordDoc(keyword);
                expect(doc).toBeDefined();
                expect(doc?.keyword).toBe(keyword);
                expect(doc?.description).toBeTruthy();
                expect(doc?.syntax).toBeTruthy();
                expect(doc?.example).toBeTruthy();
            });
        });

        it('should have documentation for all essential Drools functions', () => {
            const essentialFunctions = [
                'update', 'insert', 'delete', 'retract', 'modify'
            ];

            essentialFunctions.forEach(functionName => {
                const doc = DroolsDocumentation.getFunctionDoc(functionName);
                expect(doc).toBeDefined();
                expect(doc?.name).toBe(functionName);
                expect(doc?.description).toBeTruthy();
                expect(doc?.returnType).toBeTruthy();
                expect(doc?.example).toBeTruthy();
            });
        });
    });
});