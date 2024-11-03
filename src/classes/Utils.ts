import * as os from 'os';
import * as osu from 'os-utils';

export default class Utils {
    readonly checkRamInterval = 60000; // 1 min
    readonly maxRam = 2684254560; // 2.5GB
    restart: boolean = false;

    constructor(load?: boolean) {
        if (load)
            setInterval(() => {
                this.restart = this.ramLimitUsage();
            }, this.checkRamInterval);
    }

    ramLimitUsage() {
        const usage = os.totalmem() - os.freemem();
        console.log({
            total: this.format(os.totalmem()),
            totalBytes: os.totalmem(),
            free: this.format(os.freemem()),
            freeBytes: os.freemem(),
            usage: this.format(usage),
            usageBytes: usage,
            max: usage > this.maxRam
        });
        return usage > this.maxRam;
    }

    async stats(): Promise<ProcessorStats> {
        const cpu = await new Promise<number>(res => osu.cpuUsage(value => res(value)));

        return {
            name: process.env.PROCESSOR_NAME || 'Ymir',
            cpu,
            ram: os.totalmem() - os.freemem(),
            disk: 0,
            errors: 0,
            total: 0,
            processing: null,
            uptime: os.uptime(),
            processTime: 0
        };
    }

    format(bytes: number) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(ms: number) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const chunks: string[] = [];
        if (hours > 0) chunks.push(`${hours}h`);
        if (minutes > 0) chunks.push(`${minutes % 60}m`);
        if (seconds > 0) chunks.push(`${seconds % 60}s`);
        return chunks.join(' ');
    }

    unwrapUrl(url: string) {
        const arr = url.split('://');
        switch (arr[0]) {
            case 'b2':
                return arr[1];
            case 's3':
                return arr[1];
            default:
                return url;
        }
    }

    parseUrl(url: string) {
        const arr = url.split('://');
        switch (arr[0]) {
            case 'b2':
                return 'https://b2.yomumangas.com/' + arr[1];
            case 's3':
                return 'https://s3.yomumangas.com/' + arr[1];
            default:
                return 'https://s3.yomumangas.com/images/' + url;
        }
    }
}
