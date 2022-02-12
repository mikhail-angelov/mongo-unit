declare module 'mongo-unit' {
    /**
     * @returns Url to connect to the created db.
     */
    export function start(opts?: Partial<MongodOptions>): Promise<string>;

    export function stop(): Promise<void>;

    export function getUrl(): string;

    export function load(data: object): Promise<void>;

    export function clear(data: object): Promise<void>;

    export function drop(): Promise<void>;

    export function initDb(data: object): Promise<void>;

    export function dropDb(): Promise<void>;

    export interface MongodOptions {
        port: number;
        dbName: string;
        dbpath: string;
        verbose: boolean;
        version: string;
    }
}
