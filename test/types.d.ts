/**
 * Type declarations for test utilities
 */

declare global {
    function createMockTextDocument(content: string, uri?: string): any;
    function createMockConnection(): any;
}

export {};