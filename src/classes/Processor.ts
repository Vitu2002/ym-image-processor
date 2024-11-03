import Utils from '@class/Utils';
import axios from 'axios';
import sharp from 'sharp';
import Logger from './Logger';

export default class Processor extends Utils {
    private readonly logger = new Logger('Processor');

    constructor() {
        super();
    }

    async transformImage(data: Buffer): Promise<TransformedImage> {
        try {
            const image = await sharp(data).avif({ effort: 2 }).toBuffer();
            const metadata = await sharp(image).metadata();

            return {
                data: image,
                metadata: {
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    size: metadata.size
                }
            };
        } catch (error) {
            this.logger.error(error);
            return null;
        }
    }

    async downloadFile(url: string): Promise<Buffer> {
        try {
            console.log(url);
            const response = await axios.get<Buffer>(url, { responseType: 'arraybuffer' });
            return response.data;
        } catch (error) {
            this.logger.error(error);
            return null;
        }
    }
}
