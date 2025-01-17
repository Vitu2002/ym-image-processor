import Backblaze from '@class/Backblaze';
import Logger from '@class/Logger';
import Minio from '@class/Minio';
import Prisma from '@class/Prisma';
import Utils from '@class/Utils';
import axios from 'axios';
import { createClient, RedisClientType } from 'redis';
import sharp from 'sharp';

export default class Processor extends Utils {
    readonly logger = new Logger('Processor');
    readonly backblaze = new Backblaze();
    readonly minio = new Minio();
    readonly prisma = new Prisma();
    readonly redis: RedisClientType;
    readonly queue: Array<{ chapterId: number; taskId: string; name: ProcessorName }> = [];
    onQueueFinished: () => void;

    constructor() {
        super(true);
        this.logger.log(`Connecting ${process.env.PROCESSOR_NAME || 'OFFLINE'}...`);
        this.redis = createClient({ url: process.env.REDIS_URL });
        this.startRedis();
    }

    async startRedis() {
        await this.redis
            .connect()
            .then(() => this.logger.log('Connected', 'Redis'))
            .catch(err => {
                this.logger.error(err?.message, 'Redis');
                this.logger.discord(`> ## Redis Error\n\`\`\`js\n${err?.message}\n\`\`\``);
                process.exit(1);
            });

        await this.redis.publish(
            'processors',
            JSON.stringify({ name: process.env.PROCESSOR_NAME, status: 'on' })
        );
        this.subscriber();
    }

    private async subscriber() {
        const sub = this.redis.duplicate();
        await sub.connect();

        await sub.subscribe('check:' + process.env.PROCESSOR_NAME, (id: string) => {
            this.redis.publish(
                'check:response',
                JSON.stringify({
                    name: process.env.PROCESSOR_NAME,
                    id
                })
            );
        });

        await sub.subscribe(process.env.PROCESSOR_NAME, async (message: string) => {
            const initProcessTime = new Date().getTime();
            const {
                imageId,
                taskId,
                uploadData
            }: ProcessedImageResponse & { uploadData: GetUploadUrlResponse } = JSON.parse(message);
            this.logger.info(`Baixando imagem ${imageId} (${taskId})...`);
            const oldImage = await this.getImage(imageId);
            if (!oldImage) return;
            this.logger.info(`Transformando imagem ${imageId} (${taskId})...`);
            const image = await this.transformImage(oldImage.data);
            if (!image) return;
            this.logger.info(`Enviando imagem ${imageId} (${taskId}) para o Backblaze...`);
            const pathName = oldImage.uri.split('.')[0] + '.avif';
            const uploaded = await this.backblaze.UploadImage(image.data, pathName, uploadData);
            this.logger.log(`Imagem ${imageId} (${taskId}) enviada para o Backblaze.`);
            this.logger.info(`Atualizando banco de dados...`);
            const updated = await this.prisma.images.update({
                where: { id: imageId },
                data: {
                    uri: 'b2://' + pathName,
                    mime: 'image/avif',
                    size: image.metadata.size,
                    width: image.metadata.width,
                    height: image.metadata.height,
                    b2: uploaded.fileId,
                    v: (oldImage.v || 1) + 1
                }
            });
            this.logger.log(`Banco de dados atualizado.`);
            this.logger.info(`Deletando imagem do MinIO...`);
            await this.minio.deleteImage(pathName);
            this.logger.log(`Imagem ${imageId} (${taskId}) deletada do MinIO.`);
            this.logger.info('Processo finalizado!');
            this.logger.discord(
                `### Imagem processada!\nURL: [${updated.uri}](${this.parseUrl(updated.uri)})\nTempo: \`${this.formatTime(new Date().getTime() - initProcessTime)}\`\nDimensões: \`${updated.width}x${updated.height}\`\nTamanho: \`${this.format(oldImage.size)} ➤ ${this.format(updated.size)}\`\nFormato: \`${oldImage.mime} ➤ ${updated.mime}\`\n✦`
            );
            this.redis.publish(
                'processed',
                JSON.stringify({
                    status: 'success',
                    imageId: updated.id,
                    serviceName: process.env.PROCESSOR_NAME
                })
            );
        });
    }

    private async getImage(imageId: number) {
        try {
            const image = await this.prisma.images.findFirst({ where: { id: imageId } });
            const response = await axios.get<Buffer>(this.parseUrl(image.uri), {
                responseType: 'arraybuffer'
            });
            this.logger.log(`Imagem ${imageId} (${image.uri}) baixada.`);
            return { ...image, data: response.data };
        } catch (err) {
            this.logger.error(err);
            this.logger.discord(`## Erro \`GET_IMAGE\`\n\`\`\`js\n${err.message}\n\`\`\``);
            return null;
        }
    }

    async transformImage(data: Buffer): Promise<TransformedImage> {
        try {
            const image = await sharp(data).avif({ effort: 2 }).toBuffer();
            const metadata = await sharp(image).metadata();
            this.logger.log(
                `Imagem convertida para AVIF. (${this.format(data.byteLength)} -> ${this.format(
                    metadata.size
                )})`
            );

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
}
