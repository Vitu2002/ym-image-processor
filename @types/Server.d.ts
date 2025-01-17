interface ServerServiceStatus {
    Maria: ServerServiceStatuses;
    Rose: ServerServiceStatuses;
    Sina: ServerServiceStatuses;
    Ymir: ServerServiceStatuses;
}

interface ProcessedImageResponse {
    status: 'error' | 'success';
    imageId: number;
    taskId: string;
    error?: string;
    name: ProcessorName;
}

type ServerServiceStatuses = 'idle' | 'off' | 'processing';
