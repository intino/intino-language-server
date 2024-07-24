/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver-protocol/browser.js';
import { CloseAction, ErrorAction, State } from 'vscode-languageclient/lib/common/client.js';
import { createUrl } from './utils.js';
export class LanguageClientWrapper {
    languageClient;
    languageClientConfig;
    messageTransports;
    connectionProvider;
    languageId;
    worker;
    port;
    name;
    logger;
    async init(config) {
        this.languageClientConfig = config.languageClientConfig;
        this.name = this.languageClientConfig.name ?? 'unnamed';
        this.logger = config.logger;
        this.languageId = this.languageClientConfig.languageId;
    }
    haveLanguageClient() {
        return this.languageClient !== undefined;
    }
    haveLanguageClientConfig() {
        return this.languageClientConfig !== undefined;
    }
    getLanguageClient() {
        return this.languageClient;
    }
    getWorker() {
        return this.worker;
    }
    isStarted() {
        return this.languageClient !== undefined && this.languageClient.isRunning();
    }
    getMessageTransports() {
        return this.messageTransports;
    }
    getConnectionProvider() {
        return this.connectionProvider;
    }
    async start() {
        if (this.languageClientConfig) {
            return this.startLanguageClientConnection();
        }
        else {
            const languageClientError = {
                message: `languageClientWrapper (${this.name}): Unable to start monaco-languageclient. No configuration was provided.`,
                error: 'No error was provided.'
            };
            return Promise.reject(languageClientError);
        }
    }
    /**
     * Restart the languageclient with options to control worker handling
     *
     * @param updatedWorker Set a new worker here that should be used. keepWorker has no effect then, as we want to dispose of the prior workers
     * @param keepWorker Set to true if worker should not be disposed
     */
    async restartLanguageClient(updatedWorker, keepWorker) {
        if (updatedWorker) {
            await this.disposeLanguageClient(false);
        }
        else {
            await this.disposeLanguageClient(keepWorker);
        }
        this.worker = updatedWorker;
        if (this.languageClientConfig) {
            this.logger?.info('Re-Starting monaco-languageclient');
            return this.startLanguageClientConnection();
        }
        else {
            const languageClientError = {
                message: `languageClientWrapper (${this.name}): Unable to restart languageclient. No configuration was provided.`,
                error: 'No error was provided.'
            };
            return Promise.reject(languageClientError);
        }
    }
    startLanguageClientConnection() {
        if (this.languageClient && this.languageClient.isRunning()) {
            this.logger?.info('monaco-languageclient already running!');
            return Promise.resolve();
        }
        const lcConfig = this.languageClientConfig?.options;
        // allow to fully override the clonnecetionProvider
        // if it is undefined it will be created from the message transports in handleLanguageClientStart
        this.connectionProvider = this.languageClientConfig?.connectionProvider;
        return new Promise((resolve, reject) => {
            if (lcConfig?.$type === 'WebSocket' || lcConfig?.$type === 'WebSocketUrl') {
                const url = createUrl(lcConfig);
                const webSocket = new WebSocket(url);
                webSocket.onopen = async () => {
                    const socket = toSocket(webSocket);
                    this.messageTransports = await this.connectionProvider?.get('') ?? {
                        reader: new WebSocketMessageReader(socket),
                        writer: new WebSocketMessageWriter(socket)
                    };
                    this.handleLanguageClientStart(resolve, reject);
                };
                webSocket.onerror = (ev) => {
                    const languageClientError = {
                        message: `languageClientWrapper (${this.name}): Websocket connection failed.`,
                        error: ev.error ?? 'No error was provided.'
                    };
                    reject(languageClientError);
                };
            }
            else {
                if (!this.worker) {
                    if (lcConfig?.$type === 'WorkerConfig') {
                        const workerConfig = lcConfig;
                        this.worker = new Worker(new URL(workerConfig.url, import.meta.url).href, {
                            type: workerConfig.type,
                            name: workerConfig.workerName
                        });
                        this.worker.onerror = (ev) => {
                            const languageClientError = {
                                message: `languageClientWrapper (${this.name}): Illegal worker configuration detected. Potentially the url is wrong.`,
                                error: ev.error ?? 'No error was provided.'
                            };
                            reject(languageClientError);
                        };
                    }
                    else {
                        const workerDirectConfig = lcConfig;
                        this.worker = workerDirectConfig.worker;
                    }
                    if (lcConfig?.messagePort) {
                        this.port = lcConfig.messagePort;
                    }
                }
                const startWorkerLS = async (port) => {
                    this.messageTransports = await this.connectionProvider?.get('') ?? {
                        reader: new BrowserMessageReader(port),
                        writer: new BrowserMessageWriter(port)
                    };
                    this.handleLanguageClientStart(resolve, reject);
                };
                startWorkerLS(this.port ? this.port : this.worker);
            }
        });
    }
    async handleLanguageClientStart(resolve, reject) {
        if (!this.connectionProvider) {
            this.connectionProvider = {
                get: () => {
                    // even with the check "if (this.messageTransports)" the compiler requires the ! here
                    return Promise.resolve(this.messageTransports);
                }
            };
        }
        const mlcConfig = {
            name: this.languageClientConfig?.name ?? 'Monaco Wrapper Language Client',
            // allow to fully override the clientOptions
            clientOptions: this.languageClientConfig?.clientOptions ?? {
                documentSelector: [this.languageId],
                // disable the default error handler
                errorHandler: {
                    error: () => ({ action: ErrorAction.Continue }),
                    closed: () => ({ action: CloseAction.DoNotRestart })
                }
            },
            connectionProvider: this.connectionProvider
        };
        this.languageClient = new MonacoLanguageClient(mlcConfig);
        const lcConfig = this.languageClientConfig?.options;
        this.messageTransports?.reader.onClose(async () => {
            await this.languageClient?.stop();
            if ((lcConfig?.$type === 'WebSocket' || lcConfig?.$type === 'WebSocketUrl') && lcConfig.stopOptions) {
                const stopOptions = lcConfig.stopOptions;
                stopOptions.onCall(this.getLanguageClient());
                if (stopOptions.reportStatus !== undefined) {
                    this.logger?.info(this.reportStatus().join('\n'));
                }
            }
        });
        try {
            await this.languageClient.start();
            if ((lcConfig?.$type === 'WebSocket' || lcConfig?.$type === 'WebSocketUrl') && lcConfig.startOptions) {
                const startOptions = lcConfig.startOptions;
                startOptions.onCall(this.getLanguageClient());
                if (startOptions.reportStatus !== undefined) {
                    this.logger?.info(this.reportStatus().join('\n'));
                }
            }
        }
        catch (e) {
            const languageClientError = {
                message: `languageClientWrapper (${this.name}): Start was unsuccessful.`,
                error: Object.hasOwn(e ?? {}, 'cause') ? e : 'No error was provided.'
            };
            reject(languageClientError);
        }
        this.logger?.info(`languageClientWrapper (${this.name}): Started successfully.`);
        resolve();
    }
    disposeWorker(keepWorker) {
        if (keepWorker === undefined || keepWorker === false) {
            this.worker?.terminate();
            this.worker = undefined;
        }
    }
    async disposeLanguageClient(keepWorker) {
        // If there is no language client, try to terminate the worker
        if (!this.languageClient) {
            this.disposeWorker(keepWorker);
            return Promise.resolve();
        }
        // then attempt to dispose the LC
        if (this.languageClient.isRunning()) {
            try {
                await this.languageClient.dispose();
                this.disposeWorker(keepWorker);
                this.languageClient = undefined;
                this.logger?.info('monaco-languageclient and monaco-editor were successfully disposed.');
                return Promise.resolve();
            }
            catch (e) {
                const languageClientError = {
                    message: `languageClientWrapper (${this.name}): Disposing the monaco-languageclient resulted in error.`,
                    error: Object.hasOwn(e ?? {}, 'cause') ? e : 'No error was provided.'
                };
                return Promise.reject(languageClientError);
            }
        }
        else {
            // disposing the languageclient if it does not exist is considered ok
            return Promise.resolve();
        }
    }
    reportStatus() {
        const status = [];
        const languageClient = this.getLanguageClient();
        status.push('LanguageClientWrapper status:');
        status.push(`LanguageClient: ${languageClient?.name ?? 'Language Client'} is in a '${State[languageClient?.state ?? 1]}' state`);
        return status;
    }
}
//# sourceMappingURL=languageClientWrapper.js.map