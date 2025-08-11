import * as vscode from 'vscode';
import { DroolsSnippet } from './snippetProvider';

/**
 * Central registry for all Drools snippets
 * Organizes snippets by category and provides easy access methods
 */
export class SnippetRegistry {
    private static javaSnippets: DroolsSnippet[] = [];
    private static droolsSnippets: DroolsSnippet[] = [];
    private static ruleSnippets: DroolsSnippet[] = [];
    private static conditionSnippets: DroolsSnippet[] = [];
    private static actionSnippets: DroolsSnippet[] = [];
    private static attributeSnippets: DroolsSnippet[] = [];
    private static functionSnippets: DroolsSnippet[] = [];

    /**
     * Initialize the registry with basic snippets
     */
    public static initialize(): void {
        this.initializeRuleSnippets();
        this.initializeConditionSnippets();
        this.initializeActionSnippets();
        this.initializeAttributeSnippets();
        this.initializeJavaSnippets();
        this.initializeDroolsSnippets();
    }

    /**
     * Get all snippets from all categories
     */
    public static getAllSnippets(): DroolsSnippet[] {
        return [
            ...this.ruleSnippets,
            ...this.conditionSnippets,
            ...this.actionSnippets,
            ...this.attributeSnippets,
            ...this.functionSnippets,
            ...this.javaSnippets,
            ...this.droolsSnippets
        ];
    }

    /**
     * Get Java-specific snippets for RHS
     */
    public static getJavaSnippets(): DroolsSnippet[] {
        return [...this.javaSnippets];
    }

    /**
     * Get Drools-specific snippets for RHS
     */
    public static getDroolsSnippets(): DroolsSnippet[] {
        return [...this.droolsSnippets];
    }

    /**
     * Get snippets by category
     */
    public static getSnippetsByCategory(category: string): DroolsSnippet[] {
        switch (category) {
            case 'rule':
                return [...this.ruleSnippets];
            case 'condition':
                return [...this.conditionSnippets];
            case 'action':
                return [...this.actionSnippets];
            case 'attribute':
                return [...this.attributeSnippets];
            case 'function':
                return [...this.functionSnippets];
            case 'java':
                return [...this.javaSnippets];
            case 'drools':
                return [...this.droolsSnippets];
            default:
                return [];
        }
    }

    /**
     * Add Java snippets to the registry
     */
    public static addJavaSnippets(snippets: DroolsSnippet[]): void {
        this.javaSnippets.push(...snippets);
    }

    /**
     * Add Drools snippets to the registry
     */
    public static addDroolsSnippets(snippets: DroolsSnippet[]): void {
        this.droolsSnippets.push(...snippets);
    }

    /**
     * Add snippets to a specific category
     */
    public static addSnippetsToCategory(category: string, snippets: DroolsSnippet[]): void {
        switch (category) {
            case 'rule':
                this.ruleSnippets.push(...snippets);
                break;
            case 'condition':
                this.conditionSnippets.push(...snippets);
                break;
            case 'action':
                this.actionSnippets.push(...snippets);
                break;
            case 'attribute':
                this.attributeSnippets.push(...snippets);
                break;
            case 'function':
                this.functionSnippets.push(...snippets);
                break;
            case 'java':
                this.javaSnippets.push(...snippets);
                break;
            case 'drools':
                this.droolsSnippets.push(...snippets);
                break;
        }
    }

    /**
     * Clear all snippets (useful for testing)
     */
    public static clear(): void {
        this.javaSnippets = [];
        this.droolsSnippets = [];
        this.ruleSnippets = [];
        this.conditionSnippets = [];
        this.actionSnippets = [];
        this.attributeSnippets = [];
        this.functionSnippets = [];
    }

    /**
     * Get snippet count by category
     */
    public static getSnippetCount(): { [category: string]: number } {
        return {
            rule: this.ruleSnippets.length,
            condition: this.conditionSnippets.length,
            action: this.actionSnippets.length,
            attribute: this.attributeSnippets.length,
            function: this.functionSnippets.length,
            java: this.javaSnippets.length,
            drools: this.droolsSnippets.length
        };
    }

    private static initializeRuleSnippets(): void {
        this.ruleSnippets = [
            {
                label: 'rule',
                insertText: new vscode.SnippetString('rule "${1:RuleName}"\n    ${2:salience 10}\nwhen\n    ${3:// conditions}\nthen\n    ${4:// actions}\nend'),
                detail: 'Basic rule template',
                documentation: 'Creates a basic Drools rule with when-then structure',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'rule',
                priority: 1
            },
            {
                label: 'rule-simple',
                insertText: new vscode.SnippetString('rule "${1:RuleName}"\nwhen\n    ${2:// conditions}\nthen\n    ${3:// actions}\nend'),
                detail: 'Simple rule template',
                documentation: 'Creates a simple Drools rule without attributes',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'rule',
                priority: 2
            }
        ];
    }

    private static initializeConditionSnippets(): void {
        this.conditionSnippets = [
            {
                label: 'fact-pattern',
                insertText: new vscode.SnippetString('${1:$variable} : ${2:FactType}(${3:field} ${4:==} ${5:value})'),
                detail: 'Fact pattern with constraint',
                documentation: 'Creates a fact pattern with a field constraint',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'condition',
                priority: 1
            },
            {
                label: 'fact-simple',
                insertText: new vscode.SnippetString('${1:$variable} : ${2:FactType}()'),
                detail: 'Simple fact pattern',
                documentation: 'Creates a simple fact pattern without constraints',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'condition',
                priority: 2
            },
            {
                label: 'not-exists',
                insertText: new vscode.SnippetString('not ${1:FactType}(${2:constraints})'),
                detail: 'Not exists pattern',
                documentation: 'Creates a negative pattern that matches when fact does not exist',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'condition',
                priority: 3
            },
            {
                label: 'exists',
                insertText: new vscode.SnippetString('exists ${1:FactType}(${2:constraints})'),
                detail: 'Exists pattern',
                documentation: 'Creates an exists pattern that matches when at least one fact exists',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'condition',
                priority: 3
            }
        ];
    }

    private static initializeActionSnippets(): void {
        this.actionSnippets = [
            {
                label: 'update-fact',
                insertText: new vscode.SnippetString('${1:$variable}.${2:setProperty}(${3:value});\nupdate(${1:$variable});'),
                detail: 'Update fact and notify engine',
                documentation: 'Updates a fact property and notifies the rule engine',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'action',
                priority: 1
            },
            {
                label: 'insert-fact',
                insertText: new vscode.SnippetString('insert(new ${1:FactType}(${2:parameters}));'),
                detail: 'Insert new fact',
                documentation: 'Creates and inserts a new fact into working memory',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'action',
                priority: 1
            },
            {
                label: 'retract-fact',
                insertText: new vscode.SnippetString('retract(${1:$variable});'),
                detail: 'Retract fact',
                documentation: 'Removes a fact from working memory',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'action',
                priority: 1
            }
        ];
    }

    private static initializeAttributeSnippets(): void {
        this.attributeSnippets = [
            {
                label: 'salience',
                insertText: new vscode.SnippetString('salience ${1:10}'),
                detail: 'Rule priority',
                documentation: 'Sets the rule execution priority (higher numbers execute first)',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'attribute',
                priority: 1
            },
            {
                label: 'no-loop',
                insertText: new vscode.SnippetString('no-loop ${1:true}'),
                detail: 'Prevent infinite loops',
                documentation: 'Prevents the rule from re-activating itself',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'attribute',
                priority: 2
            },
            {
                label: 'agenda-group',
                insertText: new vscode.SnippetString('agenda-group "${1:group-name}"'),
                detail: 'Agenda group',
                documentation: 'Assigns the rule to a specific agenda group',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'attribute',
                priority: 2
            },
            {
                label: 'activation-group',
                insertText: new vscode.SnippetString('activation-group "${1:group-name}"'),
                detail: 'Activation group',
                documentation: 'Only one rule in the activation group can fire',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'attribute',
                priority: 3
            }
        ];
    }

    private static initializeJavaSnippets(): void {
        this.javaSnippets = [
            // === CONTROL FLOW SNIPPETS ===
            {
                label: 'java-if',
                insertText: new vscode.SnippetString('if (${1:condition}) {\n    ${2:// true block}\n}'),
                detail: 'If statement',
                documentation: 'Java if conditional statement',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-if-else',
                insertText: new vscode.SnippetString('if (${1:condition}) {\n    ${2:// true block}\n} else {\n    ${3:// false block}\n}'),
                detail: 'If-else statement',
                documentation: 'Java if-else conditional statement',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-switch',
                insertText: new vscode.SnippetString('switch (${1:variable}) {\n    case ${2:value1}:\n        ${3:// case 1}\n        break;\n    case ${4:value2}:\n        ${5:// case 2}\n        break;\n    default:\n        ${6:// default case}\n        break;\n}'),
                detail: 'Switch statement',
                documentation: 'Java switch-case statement',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-switch-expression',
                insertText: new vscode.SnippetString('${1:result} = switch (${2:variable}) {\n    case ${3:value1} -> ${4:result1};\n    case ${5:value2} -> ${6:result2};\n    default -> ${7:defaultResult};\n};'),
                detail: 'Switch expression (Java 14+)',
                documentation: 'Modern Java switch expression with arrow syntax',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-for-loop',
                insertText: new vscode.SnippetString('for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n    ${3:// loop body}\n}'),
                detail: 'For loop',
                documentation: 'Java for loop with counter',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-for-each',
                insertText: new vscode.SnippetString('for (${1:Type} ${2:item} : ${3:collection}) {\n    ${4:// loop body}\n}'),
                detail: 'Enhanced for loop',
                documentation: 'Java enhanced for loop (for-each)',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-while',
                insertText: new vscode.SnippetString('while (${1:condition}) {\n    ${2:// loop body}\n}'),
                detail: 'While loop',
                documentation: 'Java while loop',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-try-catch',
                insertText: new vscode.SnippetString('try {\n    ${1:// risky code}\n} catch (${2:Exception} ${3:e}) {\n    ${4:// error handling}\n}'),
                detail: 'Try-catch block',
                documentation: 'Java exception handling with try-catch',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-try-with-resources',
                insertText: new vscode.SnippetString('try (${1:Resource} ${2:resource} = ${3:new Resource()}) {\n    ${4:// use resource}\n} catch (${5:Exception} ${6:e}) {\n    ${7:// error handling}\n}'),
                detail: 'Try-with-resources',
                documentation: 'Java try-with-resources for automatic resource management',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 3
            },

            // === CONSOLE OUTPUT ===
            {
                label: 'java-sysout',
                insertText: new vscode.SnippetString('System.out.println(${1:"message"});'),
                detail: 'System.out.println',
                documentation: 'Print message to console',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-sysout-var',
                insertText: new vscode.SnippetString('System.out.println("${1:Variable}: " + ${2:variable});'),
                detail: 'Print variable value',
                documentation: 'Print variable value with label',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-printf',
                insertText: new vscode.SnippetString('System.out.printf("${1:format string}", ${2:args});'),
                detail: 'System.out.printf',
                documentation: 'Formatted output to console',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },

            // === STRING OPERATIONS ===
            {
                label: 'java-string-format',
                insertText: new vscode.SnippetString('String.format("${1:format string}", ${2:args})'),
                detail: 'String.format',
                documentation: 'Format string with placeholders',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-string-builder',
                insertText: new vscode.SnippetString('StringBuilder ${1:sb} = new StringBuilder();\n${1:sb}.append("${2:text}");\nString ${3:result} = ${1:sb}.toString();'),
                detail: 'StringBuilder usage',
                documentation: 'Efficient string concatenation with StringBuilder',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-text-block',
                insertText: new vscode.SnippetString('String ${1:text} = """\n    ${2:multi-line text}\n    ${3:more text}\n    """;'),
                detail: 'Text block (Java 15+)',
                documentation: 'Multi-line string literal using text blocks',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-string-join',
                insertText: new vscode.SnippetString('String.join("${1:delimiter}", ${2:strings})'),
                detail: 'String.join',
                documentation: 'Join strings with delimiter',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },

            // === COLLECTIONS (COMPREHENSIVE) ===
            {
                label: 'java-list-create',
                insertText: new vscode.SnippetString('List<${1:Type}> ${2:list} = new ArrayList<>();'),
                detail: 'Create ArrayList',
                documentation: 'Create new ArrayList instance',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-list-of',
                insertText: new vscode.SnippetString('List<${1:Type}> ${2:list} = List.of(${3:elements});'),
                detail: 'Immutable List.of (Java 9+)',
                documentation: 'Create immutable list with List.of factory method',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-list-add',
                insertText: new vscode.SnippetString('${1:list}.add(${2:item});'),
                detail: 'Add to list',
                documentation: 'Add item to list',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-map-create',
                insertText: new vscode.SnippetString('Map<${1:KeyType}, ${2:ValueType}> ${3:map} = new HashMap<>();'),
                detail: 'Create HashMap',
                documentation: 'Create new HashMap instance',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-map-of',
                insertText: new vscode.SnippetString('Map<${1:KeyType}, ${2:ValueType}> ${3:map} = Map.of(\n    ${4:key1}, ${5:value1},\n    ${6:key2}, ${7:value2}\n);'),
                detail: 'Immutable Map.of (Java 9+)',
                documentation: 'Create immutable map with Map.of factory method',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-map-put',
                insertText: new vscode.SnippetString('${1:map}.put(${2:key}, ${3:value});'),
                detail: 'Put in map',
                documentation: 'Add key-value pair to map',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-map-get',
                insertText: new vscode.SnippetString('${1:ValueType} ${2:value} = ${3:map}.get(${4:key});'),
                detail: 'Get from map',
                documentation: 'Get value from map by key',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-set-create',
                insertText: new vscode.SnippetString('Set<${1:Type}> ${2:set} = new HashSet<>();'),
                detail: 'Create HashSet',
                documentation: 'Create new HashSet instance',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-set-of',
                insertText: new vscode.SnippetString('Set<${1:Type}> ${2:set} = Set.of(${3:elements});'),
                detail: 'Immutable Set.of (Java 9+)',
                documentation: 'Create immutable set with Set.of factory method',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },

            // === DATE AND TIME (MODERN JAVA TIME API) ===
            {
                label: 'java-localdate-now',
                insertText: new vscode.SnippetString('LocalDate ${1:date} = LocalDate.now();'),
                detail: 'Current LocalDate',
                documentation: 'Get current date using modern Java Time API',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-localdate-of',
                insertText: new vscode.SnippetString('LocalDate ${1:date} = LocalDate.of(${2:year}, ${3:month}, ${4:day});'),
                detail: 'Create LocalDate',
                documentation: 'Create specific date with LocalDate.of',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-localtime-now',
                insertText: new vscode.SnippetString('LocalTime ${1:time} = LocalTime.now();'),
                detail: 'Current LocalTime',
                documentation: 'Get current time using modern Java Time API',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-localdatetime-now',
                insertText: new vscode.SnippetString('LocalDateTime ${1:dateTime} = LocalDateTime.now();'),
                detail: 'Current LocalDateTime',
                documentation: 'Get current date and time using modern Java Time API',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-instant-now',
                insertText: new vscode.SnippetString('Instant ${1:instant} = Instant.now();'),
                detail: 'Current Instant',
                documentation: 'Get current timestamp as Instant',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-zoneddatetime-now',
                insertText: new vscode.SnippetString('ZonedDateTime ${1:zdt} = ZonedDateTime.now(ZoneId.of("${2:UTC}"));'),
                detail: 'Current ZonedDateTime',
                documentation: 'Get current date-time with timezone',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-date-format',
                insertText: new vscode.SnippetString('DateTimeFormatter ${1:formatter} = DateTimeFormatter.ofPattern("${2:yyyy-MM-dd HH:mm:ss}");\nString ${3:formatted} = ${4:dateTime}.format(${1:formatter});'),
                detail: 'Format date/time',
                documentation: 'Format date/time using DateTimeFormatter',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-period',
                insertText: new vscode.SnippetString('Period ${1:period} = Period.between(${2:startDate}, ${3:endDate});'),
                detail: 'Period between dates',
                documentation: 'Calculate period between two dates',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 3
            },
            {
                label: 'java-duration',
                insertText: new vscode.SnippetString('Duration ${1:duration} = Duration.between(${2:startTime}, ${3:endTime});'),
                detail: 'Duration between times',
                documentation: 'Calculate duration between two times',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 3
            },

            // === STREAMS AND FUNCTIONAL PROGRAMMING ===
            {
                label: 'java-stream-filter',
                insertText: new vscode.SnippetString('${1:collection}.stream()\n    .filter(${2:item} -> ${3:condition})\n    .collect(Collectors.toList())'),
                detail: 'Stream filter',
                documentation: 'Filter collection using streams',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-stream-map',
                insertText: new vscode.SnippetString('${1:collection}.stream()\n    .map(${2:item} -> ${3:transformation})\n    .collect(Collectors.toList())'),
                detail: 'Stream map',
                documentation: 'Transform collection using streams',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-stream-reduce',
                insertText: new vscode.SnippetString('${1:Type} ${2:result} = ${3:collection}.stream()\n    .reduce(${4:identity}, (${5:a}, ${6:b}) -> ${7:operation});'),
                detail: 'Stream reduce',
                documentation: 'Reduce collection to single value',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-stream-foreach',
                insertText: new vscode.SnippetString('${1:collection}.stream()\n    .forEach(${2:item} -> ${3:action});'),
                detail: 'Stream forEach',
                documentation: 'Perform action on each stream element',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-stream-collect',
                insertText: new vscode.SnippetString('${1:collection}.stream()\n    .collect(Collectors.${2|toList,toSet,toMap,groupingBy,joining|}(${3:}))'),
                detail: 'Stream collect',
                documentation: 'Collect stream results using Collectors',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },

            // === OPTIONAL (NULL SAFETY) ===
            {
                label: 'java-optional',
                insertText: new vscode.SnippetString('Optional<${1:Type}> ${2:optional} = Optional.ofNullable(${3:value});\nif (${2:optional}.isPresent()) {\n    ${1:Type} ${4:result} = ${2:optional}.get();\n    ${5:// use result}\n}'),
                detail: 'Optional usage',
                documentation: 'Handle nullable values safely with Optional',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-optional-orelse',
                insertText: new vscode.SnippetString('${1:Type} ${2:result} = ${3:optional}.orElse(${4:defaultValue});'),
                detail: 'Optional orElse',
                documentation: 'Get value from Optional or default',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-optional-map',
                insertText: new vscode.SnippetString('${1:optional}\n    .map(${2:value} -> ${3:transformation})\n    .orElse(${4:defaultValue})'),
                detail: 'Optional map',
                documentation: 'Transform Optional value if present',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 3
            },

            // === MODERN JAVA FEATURES ===
            {
                label: 'java-var',
                insertText: new vscode.SnippetString('var ${1:variable} = ${2:value};'),
                detail: 'Local variable type inference (Java 10+)',
                documentation: 'Use var for local variable type inference',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-record',
                insertText: new vscode.SnippetString('record ${1:RecordName}(${2:Type} ${3:field}) {\n    ${4:// additional methods if needed}\n}'),
                detail: 'Record class (Java 14+)',
                documentation: 'Create immutable data class using records',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-sealed-class',
                insertText: new vscode.SnippetString('sealed class ${1:ClassName} permits ${2:SubClass1}, ${3:SubClass2} {\n    ${4:// class body}\n}'),
                detail: 'Sealed class (Java 17+)',
                documentation: 'Create sealed class with restricted inheritance',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 3
            },
            {
                label: 'java-pattern-matching',
                insertText: new vscode.SnippetString('if (${1:object} instanceof ${2:Type} ${3:variable}) {\n    ${4:// use variable directly}\n}'),
                detail: 'Pattern matching instanceof (Java 16+)',
                documentation: 'Pattern matching with instanceof',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },

            // === UTILITY AND SAFETY ===
            {
                label: 'java-null-check',
                insertText: new vscode.SnippetString('if (${1:variable} != null) {\n    ${2:// null-safe code}\n}'),
                detail: 'Null check',
                documentation: 'Check if variable is not null',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 1
            },
            {
                label: 'java-objects-equals',
                insertText: new vscode.SnippetString('Objects.equals(${1:obj1}, ${2:obj2})'),
                detail: 'Objects.equals',
                documentation: 'Null-safe equality check using Objects.equals',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-objects-hash',
                insertText: new vscode.SnippetString('Objects.hash(${1:field1}, ${2:field2})'),
                detail: 'Objects.hash',
                documentation: 'Generate hash code using Objects.hash',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 3
            },
            {
                label: 'java-assert',
                insertText: new vscode.SnippetString('assert ${1:condition} : "${2:error message}";'),
                detail: 'Assert statement',
                documentation: 'Assert condition with error message',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 3
            },

            // === MATH AND NUMBERS ===
            {
                label: 'java-math-random',
                insertText: new vscode.SnippetString('double ${1:random} = Math.random();'),
                detail: 'Random number',
                documentation: 'Generate random double between 0.0 and 1.0',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-math-round',
                insertText: new vscode.SnippetString('${1:long} ${2:rounded} = Math.round(${3:value});'),
                detail: 'Round number',
                documentation: 'Round number to nearest integer',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-bigdecimal',
                insertText: new vscode.SnippetString('BigDecimal ${1:decimal} = new BigDecimal("${2:value}");'),
                detail: 'BigDecimal creation',
                documentation: 'Create BigDecimal for precise decimal arithmetic',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },

            // === LOGGING ===
            {
                label: 'java-logger',
                insertText: new vscode.SnippetString('logger.${1|info,debug,warn,error|}("${2:message}");'),
                detail: 'Logger statement',
                documentation: 'Log message using logger',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            },
            {
                label: 'java-logger-with-args',
                insertText: new vscode.SnippetString('logger.${1|info,debug,warn,error|}("${2:message with {} and {}}", ${3:arg1}, ${4:arg2});'),
                detail: 'Logger with arguments',
                documentation: 'Log message with placeholder arguments',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'java',
                priority: 2
            }
        ];
    }

    private static initializeDroolsSnippets(): void {
        this.droolsSnippets = [
            // === FACT MANIPULATION ===
            {
                label: 'drools-update-pattern',
                insertText: new vscode.SnippetString('${1:$fact}.set${2:Property}(${3:newValue});\nupdate(${1:$fact});'),
                detail: 'Update fact pattern',
                documentation: 'Common pattern for updating fact property and notifying engine',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 1
            },
            {
                label: 'drools-insert-update',
                insertText: new vscode.SnippetString('${1:FactType} ${2:newFact} = new ${1:FactType}();\n${2:newFact}.set${3:Property}(${4:value});\ninsert(${2:newFact});'),
                detail: 'Create and insert fact',
                documentation: 'Create new fact, set properties, and insert into working memory',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 1
            },
            {
                label: 'drools-modify-block',
                insertText: new vscode.SnippetString('modify(${1:$fact}) {\n    set${2:Property}(${3:value}),\n    set${4:Property2}(${5:value2})\n}'),
                detail: 'Modify block',
                documentation: 'Use modify block to update multiple properties atomically',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 1
            },
            {
                label: 'drools-retract-fact',
                insertText: new vscode.SnippetString('retract(${1:$fact});'),
                detail: 'Retract fact',
                documentation: 'Remove fact from working memory',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 1
            },
            {
                label: 'drools-global-access',
                insertText: new vscode.SnippetString('${1:globalVariable}.${2:method}(${3:parameters});'),
                detail: 'Access global variable',
                documentation: 'Access global variable declared in rule file',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 2
            },
            {
                label: 'drools-function-call',
                insertText: new vscode.SnippetString('${1:result} = ${2:functionName}(${3:parameters});'),
                detail: 'Call Drools function',
                documentation: 'Call function defined in rule file',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 2
            },

            // === KNOWLEDGE CONTEXT OPERATIONS ===
            {
                label: 'drools-kcontext',
                insertText: new vscode.SnippetString('kcontext.getKnowledgeRuntime().${1:method}(${2:parameters});'),
                detail: 'Access KnowledgeContext',
                documentation: 'Access knowledge context for advanced operations',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 3
            },
            {
                label: 'drools-agenda-focus',
                insertText: new vscode.SnippetString('kcontext.getKnowledgeRuntime().getAgenda().getAgendaGroup("${1:groupName}").setFocus();'),
                detail: 'Set agenda focus',
                documentation: 'Set focus to specific agenda group',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 3
            },
            {
                label: 'drools-halt',
                insertText: new vscode.SnippetString('kcontext.getKnowledgeRuntime().halt();'),
                detail: 'Halt rule execution',
                documentation: 'Stop rule engine execution',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 3
            },
            {
                label: 'drools-working-memory',
                insertText: new vscode.SnippetString('WorkingMemory wm = kcontext.getKnowledgeRuntime();\nwm.${1:method}(${2:parameters});'),
                detail: 'Access working memory',
                documentation: 'Get working memory reference for advanced operations',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 3
            },
            {
                label: 'drools-rule-name',
                insertText: new vscode.SnippetString('String ruleName = kcontext.getRule().getName();\nSystem.out.println("Rule fired: " + ruleName);'),
                detail: 'Get current rule name',
                documentation: 'Get name of currently executing rule',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 3
            },
            {
                label: 'drools-fact-handle',
                insertText: new vscode.SnippetString('FactHandle ${1:handle} = kcontext.getKnowledgeRuntime().getFactHandle(${2:$fact});\nif (${1:handle} != null) {\n    ${3:// fact exists in working memory}\n}'),
                detail: 'Get fact handle',
                documentation: 'Get fact handle for fact object',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 3
            },
            {
                label: 'drools-query-results',
                insertText: new vscode.SnippetString('QueryResults ${1:results} = kcontext.getKnowledgeRuntime().getQueryResults("${2:queryName}", ${3:parameters});\nfor (QueryResultsRow ${4:row} : ${1:results}) {\n    ${5:// process row}\n}'),
                detail: 'Execute query',
                documentation: 'Execute query and iterate through results',
                kind: vscode.CompletionItemKind.Snippet,
                category: 'drools',
                priority: 3
            }
        ];
    }}
