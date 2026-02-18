import { z } from "zod";
import { createLogger } from "./logger.js";

const logger = createLogger('ErrorHandler');

/**
 * Custom error class that includes actionable advice for the AI agent.
 */
export class ActionableError extends Error {
  constructor(message: string, public advice: string) {
    super(message);
    this.name = "ActionableError";
  }

  toString() {
    return `Error: ${this.message}\nAdvice: ${this.advice}`;
  }
}

/**
 * Wraps a tool handler to catch errors and return structured, actionable messages.
 */
export function withErrorHandling(
  toolName: string,
  handler: (args: any) => Promise<any>
) {
  return async (args: unknown) => {
    try {
      // We assume args matches the schema because MCP SDK validates it before calling the handler
      // casting to any to bypass the specific type check that is failing, 
      // relying on runtime validation/upstream types
      return await handler(args); 
    } catch (error: any) {
      logger.error(`Error in tool '${toolName}'`, error);

      let errorMessage = error.message;
      let advice = "Please verify your arguments and try again.";

      // Common error patterns
      if (error.code === 'ENOENT') {
        errorMessage = `File or directory not found: ${error.path}`;
        advice = "Use a tool like 'ls' or 'list_files' to verify the path exists before accessing it.";
      } else if (error.code === 'EACCES') {
        errorMessage = `Permission denied accessing: ${error.path}`;
        advice = "The server does not have permission to access this path. Check configured allowed roots.";
      } else if (error instanceof ActionableError) {
          advice = error.advice;
      }

      return {
        content: [{ type: "text", text: `Error: ${errorMessage}\n\nHint: ${advice}` }],
        isError: true,
      };
    }
  };
}
