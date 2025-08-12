/**
 * Unit tests for Java API Knowledge Base
 */

import { JavaAPIKnowledge, ClassDefinition, MethodDefinition } from '../../../src/server/knowledge/javaAPIKnowledge';

describe('JavaAPIKnowledge', () => {
    beforeAll(() => {
        JavaAPIKnowledge.initialize();
    });

    describe('Core Classes', () => {
        test('should have String class with essential methods', () => {
            const stringClass = JavaAPIKnowledge.getClass('String');
            expect(stringClass).toBeDefined();
            expect(stringClass?.name).toBe('String');
            expect(stringClass?.package).toBe('java.lang');
            
            const methods = stringClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('length');
            expect(methodNames).toContain('charAt');
            expect(methodNames).toContain('substring');
            expect(methodNames).toContain('indexOf');
            expect(methodNames).toContain('toLowerCase');
            expect(methodNames).toContain('toUpperCase');
            expect(methodNames).toContain('trim');
            expect(methodNames).toContain('replace');
            expect(methodNames).toContain('split');
            expect(methodNames).toContain('equals');
        });

        test('should have String static methods', () => {
            const stringClass = JavaAPIKnowledge.getClass('String');
            const staticMethods = stringClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('valueOf');
            expect(staticMethodNames).toContain('format');
            expect(staticMethodNames).toContain('join');
        });

        test('should have Object class with basic methods', () => {
            const objectClass = JavaAPIKnowledge.getClass('Object');
            expect(objectClass).toBeDefined();
            expect(objectClass?.name).toBe('Object');
            
            const methods = objectClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('toString');
            expect(methodNames).toContain('equals');
            expect(methodNames).toContain('hashCode');
            expect(methodNames).toContain('getClass');
        });

        test('should have System class with utility methods', () => {
            const systemClass = JavaAPIKnowledge.getClass('System');
            expect(systemClass).toBeDefined();
            
            const staticMethods = systemClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('currentTimeMillis');
            expect(staticMethodNames).toContain('nanoTime');
            expect(staticMethodNames).toContain('getProperty');
            
            const fields = systemClass?.fields || [];
            const fieldNames = fields.map(f => f.name);
            
            expect(fieldNames).toContain('out');
            expect(fieldNames).toContain('err');
            expect(fieldNames).toContain('in');
        });
    });

    describe('Collection Classes', () => {
        test('should have List interface with collection methods', () => {
            const listClass = JavaAPIKnowledge.getClass('List');
            expect(listClass).toBeDefined();
            expect(listClass?.isInterface).toBe(true);
            
            const methods = listClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('add');
            expect(methodNames).toContain('get');
            expect(methodNames).toContain('set');
            expect(methodNames).toContain('remove');
            expect(methodNames).toContain('size');
            expect(methodNames).toContain('isEmpty');
            expect(methodNames).toContain('contains');
            expect(methodNames).toContain('stream');
            expect(methodNames).toContain('forEach');
        });

        test('should have Map interface with key-value methods', () => {
            const mapClass = JavaAPIKnowledge.getClass('Map');
            expect(mapClass).toBeDefined();
            expect(mapClass?.isInterface).toBe(true);
            
            const methods = mapClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('put');
            expect(methodNames).toContain('get');
            expect(methodNames).toContain('remove');
            expect(methodNames).toContain('containsKey');
            expect(methodNames).toContain('containsValue');
            expect(methodNames).toContain('keySet');
            expect(methodNames).toContain('values');
            expect(methodNames).toContain('entrySet');
            expect(methodNames).toContain('getOrDefault');
            expect(methodNames).toContain('forEach');
        });

        test('should have Collections utility class', () => {
            const collectionsClass = JavaAPIKnowledge.getClass('Collections');
            expect(collectionsClass).toBeDefined();
            
            const staticMethods = collectionsClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('sort');
            expect(staticMethodNames).toContain('reverse');
            expect(staticMethodNames).toContain('shuffle');
            expect(staticMethodNames).toContain('min');
            expect(staticMethodNames).toContain('max');
            expect(staticMethodNames).toContain('frequency');
            expect(staticMethodNames).toContain('emptyList');
            expect(staticMethodNames).toContain('emptySet');
            expect(staticMethodNames).toContain('emptyMap');
        });
    });

    describe('Time API Classes', () => {
        test('should have LocalDate class with date methods', () => {
            const localDateClass = JavaAPIKnowledge.getClass('LocalDate');
            expect(localDateClass).toBeDefined();
            expect(localDateClass?.since).toBe('8');
            
            const methods = localDateClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('getYear');
            expect(methodNames).toContain('getMonth');
            expect(methodNames).toContain('getDayOfMonth');
            expect(methodNames).toContain('plusDays');
            expect(methodNames).toContain('minusDays');
            expect(methodNames).toContain('isAfter');
            expect(methodNames).toContain('isBefore');
            expect(methodNames).toContain('format');
            
            const staticMethods = localDateClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('now');
            expect(staticMethodNames).toContain('of');
            expect(staticMethodNames).toContain('parse');
        });

        test('should have Duration class with time duration methods', () => {
            const durationClass = JavaAPIKnowledge.getClass('Duration');
            expect(durationClass).toBeDefined();
            
            const methods = durationClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('toDays');
            expect(methodNames).toContain('toHours');
            expect(methodNames).toContain('toMinutes');
            expect(methodNames).toContain('getSeconds');
            
            const staticMethods = durationClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('ofDays');
            expect(staticMethodNames).toContain('ofHours');
            expect(staticMethodNames).toContain('ofMinutes');
            expect(staticMethodNames).toContain('between');
        });
    });

    describe('Functional Programming Classes', () => {
        test('should have Optional class with functional methods', () => {
            const optionalClass = JavaAPIKnowledge.getClass('Optional');
            expect(optionalClass).toBeDefined();
            expect(optionalClass?.since).toBe('8');
            
            const methods = optionalClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('isPresent');
            expect(methodNames).toContain('isEmpty');
            expect(methodNames).toContain('get');
            expect(methodNames).toContain('orElse');
            expect(methodNames).toContain('orElseGet');
            expect(methodNames).toContain('ifPresent');
            expect(methodNames).toContain('filter');
            expect(methodNames).toContain('map');
            expect(methodNames).toContain('flatMap');
            
            const staticMethods = optionalClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('empty');
            expect(staticMethodNames).toContain('of');
            expect(staticMethodNames).toContain('ofNullable');
        });

        test('should have Stream interface with stream operations', () => {
            const streamClass = JavaAPIKnowledge.getClass('Stream');
            expect(streamClass).toBeDefined();
            expect(streamClass?.isInterface).toBe(true);
            expect(streamClass?.since).toBe('8');
            
            const methods = streamClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('filter');
            expect(methodNames).toContain('map');
            expect(methodNames).toContain('flatMap');
            expect(methodNames).toContain('distinct');
            expect(methodNames).toContain('sorted');
            expect(methodNames).toContain('limit');
            expect(methodNames).toContain('skip');
            expect(methodNames).toContain('forEach');
            expect(methodNames).toContain('collect');
            expect(methodNames).toContain('reduce');
            expect(methodNames).toContain('findFirst');
            expect(methodNames).toContain('findAny');
            expect(methodNames).toContain('anyMatch');
            expect(methodNames).toContain('allMatch');
            expect(methodNames).toContain('noneMatch');
            expect(methodNames).toContain('count');
        });

        test('should have Collectors utility class', () => {
            const collectorsClass = JavaAPIKnowledge.getClass('Collectors');
            expect(collectorsClass).toBeDefined();
            
            const staticMethods = collectorsClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('toList');
            expect(staticMethodNames).toContain('toSet');
            expect(staticMethodNames).toContain('toMap');
            expect(staticMethodNames).toContain('joining');
            expect(staticMethodNames).toContain('groupingBy');
            expect(staticMethodNames).toContain('counting');
            expect(staticMethodNames).toContain('summingInt');
            expect(staticMethodNames).toContain('averagingInt');
        });
    });

    describe('Math and Utility Classes', () => {
        test('should have Math class with mathematical functions', () => {
            const mathClass = JavaAPIKnowledge.getClass('Math');
            expect(mathClass).toBeDefined();
            
            const staticMethods = mathClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('abs');
            expect(staticMethodNames).toContain('max');
            expect(staticMethodNames).toContain('min');
            expect(staticMethodNames).toContain('pow');
            expect(staticMethodNames).toContain('sqrt');
            expect(staticMethodNames).toContain('ceil');
            expect(staticMethodNames).toContain('floor');
            expect(staticMethodNames).toContain('round');
            expect(staticMethodNames).toContain('random');
            expect(staticMethodNames).toContain('sin');
            expect(staticMethodNames).toContain('cos');
            expect(staticMethodNames).toContain('tan');
            
            const fields = mathClass?.fields || [];
            const fieldNames = fields.map(f => f.name);
            
            expect(fieldNames).toContain('PI');
            expect(fieldNames).toContain('E');
        });

        test('should have Arrays utility class', () => {
            const arraysClass = JavaAPIKnowledge.getClass('Arrays');
            expect(arraysClass).toBeDefined();
            
            const staticMethods = arraysClass?.staticMethods || [];
            const staticMethodNames = staticMethods.map(m => m.name);
            
            expect(staticMethodNames).toContain('asList');
            expect(staticMethodNames).toContain('sort');
            expect(staticMethodNames).toContain('binarySearch');
            expect(staticMethodNames).toContain('copyOf');
            expect(staticMethodNames).toContain('equals');
            expect(staticMethodNames).toContain('fill');
            expect(staticMethodNames).toContain('toString');
            expect(staticMethodNames).toContain('stream');
        });

        test('should have BigDecimal class with precision arithmetic', () => {
            const bigDecimalClass = JavaAPIKnowledge.getClass('BigDecimal');
            expect(bigDecimalClass).toBeDefined();
            
            const methods = bigDecimalClass?.methods || [];
            const methodNames = methods.map(m => m.name);
            
            expect(methodNames).toContain('add');
            expect(methodNames).toContain('subtract');
            expect(methodNames).toContain('multiply');
            expect(methodNames).toContain('divide');
            expect(methodNames).toContain('compareTo');
            
            const fields = bigDecimalClass?.fields || [];
            const fieldNames = fields.map(f => f.name);
            
            expect(fieldNames).toContain('ZERO');
            expect(fieldNames).toContain('ONE');
            expect(fieldNames).toContain('TEN');
        });
    });

    describe('Method Search', () => {
        test('should find methods by name search', () => {
            const results = JavaAPIKnowledge.searchMethods('toString');
            expect(results.length).toBeGreaterThan(0);
            
            const methodNames = results.map(m => m.name);
            expect(methodNames).toContain('toString');
        });

        test('should find methods with partial name match', () => {
            const results = JavaAPIKnowledge.searchMethods('stream');
            expect(results.length).toBeGreaterThan(0);
            
            const methodNames = results.map(m => m.name);
            expect(methodNames.some(name => name.includes('stream'))).toBe(true);
        });
    });

    describe('Method Definitions', () => {
        test('should have proper method signatures with parameters', () => {
            const stringClass = JavaAPIKnowledge.getClass('String');
            const substringMethod = stringClass?.methods.find(m => m.name === 'substring');
            
            expect(substringMethod).toBeDefined();
            expect(substringMethod?.parameters.length).toBeGreaterThan(0);
            expect(substringMethod?.parameters[0].name).toBe('beginIndex');
            expect(substringMethod?.parameters[0].type).toBe('int');
            expect(substringMethod?.documentation).toBeDefined();
            expect(substringMethod?.examples).toBeDefined();
        });

        test('should have proper return types', () => {
            const listClass = JavaAPIKnowledge.getClass('List');
            const sizeMethod = listClass?.methods.find(m => m.name === 'size');
            
            expect(sizeMethod).toBeDefined();
            expect(sizeMethod?.returnType).toBe('int');
        });

        test('should mark static methods correctly', () => {
            const mathClass = JavaAPIKnowledge.getClass('Math');
            const absMethod = mathClass?.staticMethods.find(m => m.name === 'abs');
            
            expect(absMethod).toBeDefined();
            expect(absMethod?.isStatic).toBe(true);
        });
    });

    describe('Class Information', () => {
        test('should mark interfaces correctly', () => {
            const listClass = JavaAPIKnowledge.getClass('List');
            expect(listClass?.isInterface).toBe(true);
            
            const arrayListClass = JavaAPIKnowledge.getClass('ArrayList');
            expect(arrayListClass?.isInterface).toBeFalsy();
        });

        test('should have proper package information', () => {
            const stringClass = JavaAPIKnowledge.getClass('String');
            expect(stringClass?.package).toBe('java.lang');
            
            const listClass = JavaAPIKnowledge.getClass('List');
            expect(listClass?.package).toBe('java.util');
            
            const localDateClass = JavaAPIKnowledge.getClass('LocalDate');
            expect(localDateClass?.package).toBe('java.time');
        });

        test('should have version information for newer features', () => {
            const optionalClass = JavaAPIKnowledge.getClass('Optional');
            expect(optionalClass?.since).toBe('8');
            
            const localDateClass = JavaAPIKnowledge.getClass('LocalDate');
            expect(localDateClass?.since).toBe('8');
        });
    });
});