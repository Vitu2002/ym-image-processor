import Logger from '@class/Logger';
import Prisma from '@class/Prisma';
import Utils from '@class/Utils';
import { randomBytes } from 'crypto';
import { createClient, RedisClientType } from 'redis';
import Backblaze from './Backblaze';

export default class Server extends Utils {
    readonly logger = new Logger('Server');
    readonly services: ServerServiceStatus = {
        Maria: 'off',
        Rose: 'off',
        Sina: 'off',
        Ymir: 'off'
    };
    readonly backblaze = new Backblaze();
    readonly prisma = new Prisma();
    readonly redis: RedisClientType;
    readonly queue: Array<{ imageId: number; taskId: string; name: ProcessorName }> = [];
    checkStatus: Array<{ name: ProcessorName; id: string }> = [];

    constructor() {
        super(true);
        this.redis = createClient({ url: process.env.REDIS_URL });
        this.startRedis();
        this.checkForImages();
        setInterval(() => this.checkForImages(), 60000);
    }

    async startRedis() {
        await this.redis
            .connect()
            .then(() => {
                this.logger.log('Connected', 'Redis');
                this.redis.flushAll();
            })
            .catch(err => {
                this.logger.error(err?.message, 'Redis');
                this.logger.discord(`> ## Redis Error\n\`\`\`js\n${err?.message}\n\`\`\``);
                process.exit(1);
            });

        this.checkProcessors();
        this.subscriber();
        setInterval(() => this.checkProcessors(), 60000);
    }

    private async subscriber() {
        const sub = this.redis.duplicate();
        await sub.connect();

        await sub.subscribe('check:response', (message: string) => {
            const { id, name }: { id: string; name: ProcessorName } = JSON.parse(message);

            if (this.services[name] === 'off') this.startService(name);

            if (this.checkStatus.find(status => status.id === id))
                this.checkStatus = this.checkStatus.filter(status => status.id !== id);
            this.processQueue();
        });

        await sub.subscribe('processor:status', (message: string) => {
            const { name, status }: ProcessorStatus = JSON.parse(message);

            switch (status) {
                case 'off':
                    this.stopService(name);
                    break;
                case 'on':
                    this.startService(name);
                    break;
            }
        });

        await sub.subscribe('processed', (message: string) => {
            const { status, imageId, serviceName, error } = JSON.parse(message);

            if (status === 'success')
                this.logger.log(
                    `Processo concluído com sucesso na imagem ${imageId} por ${serviceName}`
                );
            else if (status === 'error')
                this.logger.error(
                    `Erro no processamento da imagem ${imageId} por ${serviceName}: ${error}`
                );

            this.services[serviceName] = 'idle';
            this.processQueue();
        });
    }

    private async checkProcessors() {
        for (const name in this.services) {
            const id = randomBytes(8).toString('hex');

            this.checkStatus.push({ name: name as ProcessorName, id });
            this.logger.log(`Iniciando check de ${name}...`);
            this.redis.publish('check:' + name, id);

            setTimeout(() => {
                const stillPending = this.checkStatus.find(status => status.id === id);
                if (stillPending) {
                    this.checkStatus = this.checkStatus.filter(status => status.id !== id);
                    this.stopService(name as ProcessorName);
                } else {
                    this.logger.info(`Check de ${name} | Online.`);
                    this.processQueue();
                }
            }, 10000);
        }
    }

    private async checkForImages() {
        if (this.queue.length > 10) return;
        this.logger.log('Buscando imagens...');
        const images = await this.prisma.images.findMany({
            where: { mime: { not: 'image/avif' } },
            distinct: ['uri'],
            take: 25
        });

        for (const image of images) {
            this.addToQueue(image.id, image.uri);
            this.logger.log(
                `Imagem ${image.id} (${image.uri}) adicionada a fila de processamento.`
            );
        }

        this.logger.log(`Busca finalizada! ${images.length} imagens encontradas.`);
    }

    public addToQueue(imageId: number, taskId: string) {
        this.queue.push({ imageId, taskId, name: 'Ymir' });
        this.processQueue();
    }

    private async processQueue() {
        const availableService = this.getAvailableService();
        if (!availableService) return;
        if (this.queue.length === 0) return;

        const task = this.queue[0]; // Não remova da fila ainda.
        const lockKey = `lock:image:${task.imageId}`; // Lock baseado no ID da imagem.

        // Tente adquirir o lock
        const lockAcquired = await this.redis.set(lockKey, 'locked', { NX: true, PX: 30000 }); // Timeout de 30s
        if (!lockAcquired) return; // Se o lock já existe, outra instância está processando.

        // Remova da fila apenas após adquirir o lock
        this.queue.shift();

        // Atualize o serviço como "processing"
        this.services[availableService] = 'processing';
        this.logger.log(`Enviando imagem ${task.imageId} para ${availableService}`);

        try {
            const uploadData = await this.backblaze.getUploadImageUrl();
            await this.redis.publish(
                availableService,
                JSON.stringify({
                    imageId: task.imageId,
                    taskId: task.taskId,
                    uploadData
                })
            );
        } catch (error) {
            this.logger.error(`Erro ao processar imagem ${task.imageId}: ${error.message}`);
        } finally {
            // Libere o lock e atualize o status do serviço
            await this.redis.del(lockKey);
            this.services[availableService] = 'idle';
            this.processQueue(); // Continue processando a fila
        }
    }

    private getAvailableService(): ProcessorName | null {
        return (
            (Object.keys(this.services).find(
                serviceName => this.services[serviceName] === 'idle'
            ) as ProcessorName) || null
        );
    }

    public startService(serviceName: ProcessorName) {
        if (this.services[serviceName] === 'off') {
            this.services[serviceName] = 'idle';
            this.logger.log(`Serviço ${serviceName} está online e disponível.`);
        }
    }

    public stopService(serviceName: ProcessorName) {
        this.services[serviceName] = 'off';
        this.logger.log(`Serviço ${serviceName} está offline.`);
    }
}
