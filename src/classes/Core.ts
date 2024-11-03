import Prisma from '@class/Prisma';
import Backblaze from './Backblaze';
import Logger from './Logger';
import Minio from './Minio';
import Processor from './Processor';
import Redis from './Redis';
import Utils from './Utils';

export default class Core extends Utils {
    readonly logger = new Logger('Core');
    readonly restart = false;
    readonly prisma = new Prisma();
    readonly backblaze = new Backblaze();
    readonly processor = new Processor();
    readonly redis = new Redis();
    readonly minio = new Minio();
    processing = false;
    private init_time = new Date().getTime();
    private first_load = true;

    constructor() {
        super(true);

        setInterval(() => this.process(), 5000);
    }

    async process() {
        try {
            // Wait some seconds to avoid race conditions
            if (this.first_load) {
                this.first_load = false;
                setTimeout(() => this.process(), 5000 + Math.floor(Math.random() * 10000));
                return;
            }

            // Check if the process is already running
            if (this.processing) return;
            const initProcessTime = new Date().getTime();

            // Get current stats
            const stats = await this.redis.getStats(process.env.PROCESSOR_NAME || 'Ymir');

            // Check if the RAM usage is too high and restart if it is
            if (this.restart) {
                this.redis.updateStats({
                    processTime: stats.processTime + (new Date().getTime() - this.init_time)
                });
                await this.logger.discord(
                    `## Reiniciando ${stats.name}...\n\`Uptime de ${this.formatTime(new Date().getTime() - this.init_time)}\``
                );
                this.logger.log('Restarting...');
                process.exit(1);
            }

            // Get current upload from all clusters to use in randomImage
            const ignore_urls: string[] = [];
            const clusters = await Promise.all([
                this.redis.getStats('Maria'),
                this.redis.getStats('Rose'),
                this.redis.getStats('Sina'),
                this.redis.getStats('Ymir')
            ]);
            for (const cluster of clusters) {
                if (cluster.processing) ignore_urls.push(cluster.processing);
            }

            // Get a random image to process
            const imageData = await this.prisma.getRandomImage(ignore_urls);
            if (!imageData) return;

            // Init processing image
            this.logger.info(`Processing image: ${imageData.uri}`);
            this.processing = true;
            await this.redis.updateStats({ processing: imageData.uri });

            // Download and transform image
            const bufferImage = await this.processor.downloadFile(this.parseUrl(imageData.uri));
            this.logger.info(`Downloaded image: ${imageData.uri}`);
            const image = await this.processor.transformImage(bufferImage);
            this.logger.info(`Transformed image: ${imageData.uri}`);

            // Upload image
            const uploaded = await this.backblaze.UploadImage(
                image.data,
                this.unwrapUrl(imageData.uri.split('.')[0] + '.avif')
            );
            if (!uploaded) {
                this.logger.error('Upload failed');
                await this.redis.updateStats({ errors: stats.errors + 1 });
                await this.logger.discord(
                    `### Erro ao fazer upload!\nURL: [${imageData.uri}](${this.parseUrl(imageData.uri)})\nTempo: \`${this.formatTime(new Date().getTime() - initProcessTime)}\`\n✦`
                );
                return;
            }
            this.logger.info(`Uploaded image: ${uploaded.fileName}`);

            // Update image in database
            const updated = await this.prisma.updateImage(imageData.id, {
                uri: 'b2://' + uploaded.fileName,
                size: image.metadata.size,
                width: image.metadata.width,
                height: image.metadata.height,
                v: (imageData.v || 1) + 1,
                mime: 'image/avif'
            });
            if (!updated) {
                this.logger.error('Update failed');
                await this.redis.updateStats({ errors: stats.errors + 1 });
                await this.logger.discord(
                    `### Erro ao atualizar imagem!\nURL: [${updated.uri}](${this.parseUrl(updated.uri)})\nTempo: \`${this.formatTime(new Date().getTime() - initProcessTime)}\`\n✦`
                );
                return;
            }
            this.logger.info(`Updated image: ${updated.uri}`);

            // Delete image from Minio
            const deleted = await this.minio.deleteImage(this.unwrapUrl(imageData.uri));
            if (!deleted) {
                this.logger.error('Delete failed');
                await this.redis.updateStats({ errors: stats.errors + 1 });
                await this.logger.discord(
                    `### Erro ao deletar imagem!\nURL: [${updated.uri}](${this.parseUrl(updated.uri)})\nTempo: \`${this.formatTime(new Date().getTime() - initProcessTime)}\`\n✦`
                );
                return;
            }
            this.logger.info(`Deleted image: s3://${this.unwrapUrl(imageData.uri)}`);

            this.processing = false;
            this.logger.info('Process completed');
            this.logger.discord(
                `### Imagem processada!\nURL: [${updated.uri}](${this.parseUrl(updated.uri)})\nTempo: \`${this.formatTime(new Date().getTime() - initProcessTime)}\`\nDimensões: \`${updated.width}x${updated.height}\`\nTamanho: \`${this.format(imageData.size)} ➤ ${this.format(updated.size)}\`\nFormato: \`${imageData.mime} ➤ ${updated.mime}\`\n✦`
            );
            await this.redis.updateStats({
                disk: stats.disk + updated.size,
                total: stats.total + 1
            });
        } catch (error) {
            this.logger.error(error);
            await this.logger.discord(
                `### Erro ao processar imagem!\n\`\`\`js\n${error.message}\n\`\`\`\n✦`
            );
        }
    }
}
