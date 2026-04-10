type EphemeralLog = {
    id: string;
    timestamp: number;
    sessionId: string;
    modelId: string;
    searchUsed: boolean;
    searchSummary?: string;
    lastMessages: any[];
    responseContent: string;
};

// In-memory store
const logs: EphemeralLog[] = [];

// Cleanup every 10 minutes
const TEN_MINUTES = 10 * 60 * 1000;

export const addEphemeralLog = (log: Omit<EphemeralLog, "timestamp">) => {
    const now = Date.now();
    // Clean old logs
    while (logs.length > 0 && now - logs[0].timestamp > TEN_MINUTES) {
        logs.shift();
    }
    
    // Add new log
    logs.push({ ...log, timestamp: now });
    
    // Cap memory at last 50 logs just in case
    if (logs.length > 50) {
        logs.shift();
    }
};

export const getEphemeralLogs = () => {
    const now = Date.now();
    return logs.filter(log => now - log.timestamp <= TEN_MINUTES).reverse();
};

export const appendToResponse = (id: string, content: string) => {
    const log = logs.find(l => l.id === id);
    if (log) {
        log.responseContent += content;
    }
};
