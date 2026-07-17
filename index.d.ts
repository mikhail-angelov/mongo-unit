declare module 'mongo-unit' {
    /**
     * @returns Url to connect to the created db.
     */
    export function start(opts?: Partial<MongodOptions>): Promise<string>;

    export function stop(): Promise<void>;

    export function getUrl(): string;

    /**
     * Loads fixture data into the in-memory MongoDB.
     *
     * The value of each collection entry can be either:
     *  - a plain array of documents (legacy format, no indexes supported), or
     *  - a {@link CollectionData} object that explicitly declares `indexes` and `documents`.
     *
     * When the new format is used, all indexes are created for every collection
     * before any document is inserted, so unique-index constraints are enforced
     * against the fixture data itself.
     *
     * Throws if `indexes` or `documents` is present but is not an array.
     */
    export function load(data: Record<string, CollectionData | any[]>): Promise<void>;

    export function clean(data: Record<string, any>): Promise<void>;

    export function drop(): Promise<void>;

    /**
     * Initializes the test database with fixture data.
     *
     * Accepts the same data shape as {@link load}: each value is either an
     * array of documents or a {@link CollectionData} object describing
     * `indexes` and `documents`.
     */
    export function initDb(data: Record<string, CollectionData | any[]>): Promise<void>;

    export function dropDb(): Promise<void>;

    export interface MongodOptions {
        port: number;
        dbName: string;
        dbpath: string;
        verbose: boolean;
        version: string;
        useReplicaSet?: boolean;
    }

    /**
     * Explicit description of a collection's indexes and seed documents.
     *
     * Use this object form (instead of a bare array) when you need to declare
     * indexes for the collection, e.g. to test unique constraints or other
     * index-based behavior.
     */
    export interface CollectionData {
        /**
         * Index specifications passed directly to the MongoDB driver's
         * `createIndexes()`. Must be an array if present.
         */
        indexes?: any[];
        /**
         * Seed documents inserted after the indexes are created.
         * Must be an array if present.
         */
        documents?: any[];
    }
}
