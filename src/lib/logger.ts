
/**
 * Logger utility for MCP servers.
 * Writes exclusively to stderr to avoid interfering with MCP protocol on stdout.
 */
export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private format(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        let log = `[${timestamp}] [${level}] [${this.context}] ${message}`;
        if (data) {
            if (data instanceof Error) {
                log += `\n${data.stack || data.message}`;
            } else {
                log += `\n${JSON.stringify(data, null, 2)}`;
            }
        }
        return log;
    }

    info(message: string, data?: any) {
        console.error(this.format('INFO', message, data));
    }

    warn(message: string, data?: any) {
        console.error(this.format('WARN', message, data));
    }

    error(message: string, data?: any) {
        console.error(this.format('ERROR', message, data));
    }

    debug(message: string, data?: any) {
        if (process.env.DEBUG) {
            console.error(this.format('DEBUG', message, data));
        }
    }
}

export const createLogger = (context: string) => new Logger(context);
