import { Images, PrismaClient } from '@prisma/client';
import Logger from './Logger';

export default class Prisma extends PrismaClient {
    readonly logger = new Logger('Prisma');
    constructor() {
        super({
            errorFormat: 'pretty'
        });

        this.initialize();
    }

    private async initialize() {
        this.$connect()
            .then(() => this.logger.log('Connected'))
            .catch(err => this.logger.error(err.message));
    }

    async getRandomImage(urls: string[]) {
        const image = await this.images.findFirst({
            where: { mime: { not: 'image/avif' }, uri: { notIn: urls } }
        });
        return image;
    }

    async updateImage(id: number, data: Partial<Images>) {
        const image = await this.images.update({
            where: { id },
            data
        });
        return image;
    }
}
