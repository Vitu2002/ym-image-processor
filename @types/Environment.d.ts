declare global {
    namespace NodeJS {
        interface ProcessEnv {
            MINIO_ACCESS_KEY: string;
            MINIO_SECRET_KEY: string;
            MINIO_ENDPOINT: string;
            BACKBLAZE_APPLICATION_KEY: string;
            BACKBLAZE_APPLICATION_KEY_ID: string;
            BACKBLAZE_BUCKET_ID: string;
            REDIS_URL: string;
            DATABASE_URL: string;
            PROCESSOR_NAME: ProcessorName;
        }
    }
}

export {};
