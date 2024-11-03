import { Webhook } from '@ly-nld/dishook';
import { cyan, green, grey, magenta, red, yellow } from 'colors';
import dayjs from 'dayjs';

export default class Logger {
    private hook = new Webhook(process.env.DISCORD_WEBHOOK);
    identifier: string = 'Logger';

    constructor(identifier?: string) {
        if (identifier) this.identifier = identifier;
    }

    private readonly types = {
        log: cyan('LOG'),
        info: green('INFO'),
        warn: yellow('WARN'),
        error: red('ERROR')
    };

    private base(type: 'log' | 'warn' | 'error' | 'info', ident: string) {
        const now = dayjs().format('DD/MM/YYYY HH:mm:ss');
        const time = `${green(`[Yumu-Core]`)} ${now}`;
        return `${time}     ${this.types[type]} ${magenta(`[${ident}]`)}`;
    }

    log(message: string, identifier?: string) {
        const ident = identifier || this.identifier;
        return console.log(`${this.base('log', ident)} ${grey(`${message}`)}`);
    }

    info(message: string, identifier?: string) {
        const ident = identifier || this.identifier;
        return console.log(`${this.base('info', ident)} ${grey(`${message}`)}`);
    }

    error(message: string, identifier?: string) {
        const ident = identifier || this.identifier;
        return console.log(`${this.base('error', ident)} ${grey(`${message}`)}`);
    }

    warn(message: string, identifier?: string) {
        const ident = identifier || this.identifier;
        return console.log(`${this.base('warn', ident)} ${grey(`${message}`)}`);
    }

    start() {
        console.clear();
        const now = dayjs().format('DD/MM/YYYY HH:mm:ss');
        const time = `${green(`[Yumu-Core]`)} ${now}`;
        return console.log(`${time}     Starting system...\n`);
    }

    async discord(message: string) {
        await this.hook
            .setUsername(`Image Processor [${process.env.PROCESSOR_NAME || 'Ymir'}]`)
            .setContent(message)
            .send();
    }
}

const logger = new Logger('System');
export { logger };
