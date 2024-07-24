/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { initEnhancedMonacoEnvironment } from 'monaco-languageclient/vscode/services';

export type WorkerOverrides = {
    rootPath?: string | URL;
    basePath?: string | URL;
    workerLoaders?: Partial<Record<string, WorkerConfigSupplier | WorkerLoader>>;
    ignoreMapping?: boolean;
    userDefinedMapping?: (label: string) => string;
}

export type WorkerConfig = {
    rootPath: string | URL;
    basePath?: string | URL;
    workerFile: string | URL;
    options?: WorkerOptions;
}

export type WorkerConfigSupplier = () => WorkerConfig;
export type WorkerLoader = () => Worker

export const defaultWorkerLoaders: Partial<Record<string, WorkerConfigSupplier | WorkerLoader>> = {
    editorWorker: () => {
        return {
            rootPath: import.meta.url,
            workerFile: 'monaco-editor-wrapper/dist/workers/editorWorker-es.js'
        };
    },
    tsWorker: () => {
        return {
            rootPath: import.meta.url,
            workerFile: 'monaco-editor-wrapper/dist/workers/tsWorker-es.js'
        };
    },
    htmlWorker: () => {
        return {
            rootPath: import.meta.url,
            workerFile: 'monaco-editor-wrapper/dist/workers/htmlWorker-es.js'
        };
    },
    cssWorker: () => {
        return {
            rootPath: import.meta.url,
            workerFile: 'monaco-editor-wrapper/dist/workers/cssWorker-es.js'
        };
    },
    jsonWorker: () => {
        return {
            rootPath: import.meta.url,
            workerFile: 'monaco-editor-wrapper/dist/workers/jsonWorker-es.js'
        };
    }
};
/**
 * Cross origin workers don't work
 * The workaround used by vscode is to start a worker on a blob url containing a short script calling 'importScripts'
 * importScripts accepts to load the code inside the blob worker
 */
export const buildWorker = (config: WorkerConfig, workerOverrides?: WorkerOverrides): Worker => {
    if (workerOverrides?.rootPath !== undefined) {
        config.rootPath = workerOverrides.rootPath;
    }
    if (workerOverrides?.basePath !== undefined) {
        config.basePath = workerOverrides.basePath;
    }
    let workerFile = config.workerFile;
    if (config.basePath !== undefined) {
        workerFile = `${config.basePath}/${config.workerFile}`;
    }
    const fullUrl = new URL(workerFile, config.rootPath).href;
    console.log(`Creating worker: ${fullUrl}`);

    // default to 'module' if not specified
    const workerOptions = config.options ?? {};
    if (!workerOptions.type) {
        workerOptions.type = 'module';
    }
    const js = workerOptions.type === 'module' ? `import '${fullUrl}';` : `importScripts('${fullUrl}');`;
    const blob = new Blob([js], { type: 'application/javascript' });

    return new Worker(URL.createObjectURL(blob), workerOptions);
};

export const useWorkerFactory = (workerOverrides?: WorkerOverrides) => {
    const envEnhanced = initEnhancedMonacoEnvironment();

    const getWorker = (moduleId: string, label: string) => {
        console.log(`getWorker: moduleId: ${moduleId} label: ${label}`);

        let selector = label;
        let workerLoaders;

        // if you choose to ignore the default mapping only the
        // workerLoaders passed with workerOverrides are used
        if (workerOverrides?.ignoreMapping === true) {
            workerLoaders = {
                ...workerOverrides.workerLoaders
            };
        } else {
            workerLoaders = {
                ...defaultWorkerLoaders, ...workerOverrides?.workerLoaders
            };

            let mappingFunc = useDefaultWorkerMapping;
            if (workerOverrides?.userDefinedMapping) {
                mappingFunc = workerOverrides.userDefinedMapping;
            }
            selector = mappingFunc(label);
        }

        const workerOrConfig = workerLoaders[selector];
        if (workerOrConfig) {
            const invoked = workerOrConfig();
            if (Object.hasOwn(invoked, 'workerFile')) {
                return buildWorker(invoked as WorkerConfig, workerOverrides);
            } else {
                return invoked as Worker;
            }
        }
        throw new Error(`Unimplemented worker ${label} (${moduleId})`);
    };
    envEnhanced.getWorker = getWorker;
};

export const useDefaultWorkerMapping = (label: string) => {
    switch (label) {
        case 'editor':
        case 'editorWorkerService':
            return 'editorWorker';
        case 'typescript':
        case 'javascript':
            return 'tsWorker';
        case 'html':
        case 'handlebars':
        case 'razor':
            return 'htmlWorker';
        case 'css':
        case 'scss':
        case 'less':
            return 'cssWorker';
        case 'json':
            return 'jsonWorker';
        default:
            return label;
    }
};
