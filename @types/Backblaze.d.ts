interface ImageUploadReponse {
    fileId: string;
    fileName: string;
    fileInfo: [key: string] = unknown;
    contentType: string;
    contentLength: number;
}