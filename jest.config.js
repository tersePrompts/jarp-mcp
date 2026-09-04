/**
 * Jest configuration (ESM mode).
 * The project is "type": "module" and source uses import.meta,
 * so Jest runs with the experimental VM modules flag (see "test" script).
 */
export default {
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    // Tests import source as '../src/utils/foo.js' (TS-style extension);
    // map those back to the actual .ts files.
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                // Transpile per-file (no full-program type check): the root
                // tsconfig sets rootDir: "src", which tests live outside of.
                isolatedModules: true,
            },
        ],
    },
    testTimeout: 15000,
};
