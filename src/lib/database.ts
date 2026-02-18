import Database from 'better-sqlite3';
import path from 'path';
import { createLogger } from './logger.js';

export type { Database };

const logger = createLogger('Database');

export class BaseDatabase {
    protected db: Database.Database | null = null;
    private dbPath: string;

    constructor(filename: string = 'local_data.db') {
        this.dbPath = path.resolve(process.cwd(), filename);
    }

    init(schema?: string, migrate?: (db: Database.Database) => void) {
        if (this.db) {
            logger.warn('Database already initialized');
            return;
        }

        try {
            this.db = new Database(this.dbPath);
            logger.info(`Database connected at ${this.dbPath}`);
            
            // Enable WAL mode for better concurrency
            this.db.pragma('journal_mode = WAL');
            
            if (schema) {
                this.db.exec(schema);
            }

            if (migrate) {
                migrate(this.db);
            }
        } catch (error) {
            logger.error('Failed to initialize database', error);
            throw error;
        }
    }

    get(): Database.Database {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }

    close() {
        if (this.db) {
            logger.info('Closing database connection...');
            this.db.close();
            this.db = null;
        }
    }
}

// Singleton instance
export const db = new BaseDatabase();
