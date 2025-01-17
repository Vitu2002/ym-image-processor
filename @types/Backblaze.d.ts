interface ImageUploadReponse {
    fileId: string;
    fileName: string;
    fileInfo: [key: string] = unknown;
    contentType: string;
    contentLength: number;
}

interface GetUploadUrlResponse {
    uploadUrl: string;
    uploadAuthToken: string;
}

interface PubSubProcessedResponse {
    name: ProcessorName;
}