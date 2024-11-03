interface TransformedImage {
    data: Buffer;
    metadata: {
        format: string;
        width: number;
        height: number;
        size: number;
    };
}

interface ProcessorStats {
    name: ProcessorName;
    ram: number;
    cpu: number;
    disk: number;
    total: number;
    errors: number;
    processing: string;
    uptime: number;
    processTime: number;
}

type ProcessorName = 'Maria' | 'Rose' | 'Sina' | 'Ymir';