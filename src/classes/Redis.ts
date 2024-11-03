import { createClient } from 'redis';
import Logger from './Logger';
import Utils from './Utils';

export default class Redis extends Utils {
    private readonly logger = new Logger('Redis');
    private readonly redis = createClient({
        url: process.env.REDIS_URL,
        name: process.env.PROCESSOR_NAME
    });

    constructor() {
        super();

        this.initialize();

        this.redis.on('disconnect', () => {
            this.logger.warn('Redis disconnected');
            this.logger.info('Reconnecting...');
            this.initialize();
        });
    }

    async initialize() {
        await this.redis
            .connect()
            .then(() => this.logger.log('Connected'))
            .catch(err => this.logger.error(err?.message));
    }

    async getStats(processor: ProcessorName): Promise<ProcessorStats> {
        const key = `ym:stats:${processor}`;
        const cache = await this.redis.get(key);
        const stats = await this.stats();
        const data: ProcessorStats = cache ? JSON.parse(cache) : stats;

        return {
            ...stats,
            ...data,
            cpu: stats.cpu,
            ram: stats.ram,
            uptime: stats.uptime,
            processTime: stats.processTime
        };
    }

    async updateStats(stats: Partial<ProcessorStats>) {
        const current = await this.getStats(stats.name);
        const data = { ...current, ...stats };
        await this.redis.set(`ym:stats:${data.name}`, JSON.stringify(data));
        return data;
    }
}
