import { Client } from 'minio';
import Logger from './Logger';

export default class Minio extends Client {
    readonly logger = new Logger('Minio');

    constructor() {
        super({
            accessKey: process.env.MINIO_ACCESS_KEY,
            secretKey: process.env.MINIO_SECRET_KEY,
            endPoint: process.env.MINIO_ENDPOINT,
            useSSL: true
        });

        this.initialize();
    }

    private async initialize() {
        this.bucketExists('images')
            .then(() => this.logger.log('Connected'))
            .catch(err => this.logger.error(err.message));
    }

    async deleteImage(fileName: string) {
        try {
            const rem = await this.removeObject('images', fileName);
            return true;
        } catch (error) {
            this.logger.error(error);
            return false;
        }
    }
}
