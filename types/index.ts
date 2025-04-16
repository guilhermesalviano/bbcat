export interface SystemInfo {
    status: string;
    uptime: {
        server: number;
        api: number;
    };
    memory: {
        total: string;
        free: string;
        usage: string;
    };
    cpu: {
        model: string;
        cores: number;
        load: number[];
        temperature?: string;
    };
    hostname: string;
    platform: string;
    osRelease: string;
    // networkInterfaces: ReturnType<typeof os.networkInterfaces>;
    disk?: {
        total: string;
        used: string;
        available: string;
        usagePercent: string;
    };
}

export interface ApiResponse extends SystemInfo {
    endpoints: {
        [key: string]: string;
    };
}
