import Logger from '@class/Logger';
import BackBlazeB2 from 'backblaze-b2';

export default class Backblaze extends BackBlazeB2 {
    private readonly logger = new Logger('BackBlaze');
    private readonly reauthInterval = 84600000;

    constructor() {
        super({
            applicationKey: process.env.BACKBLAZE_APPLICATION_KEY,
            applicationKeyId: process.env.BACKBLAZE_APPLICATION_KEY_ID
        });

        try {
            this.initialize();
        } catch (error) {
            this.logger.error(error);
        }
    }

    async initialize() {
        this._authorize();
        setInterval(() => this._authorize(), this.reauthInterval);
    }

    private async _authorize() {
        this.authorize()
            .then(() => this.logger.log('Connected'))
            .catch(err => this.logger.error(err.message));
    }

    async getUploadImageUrl(): Promise<GetUploadUrlResponse> {
        try {
            const { data } = await this.getUploadUrl({ bucketId: process.env.BACKBLAZE_BUCKET_ID });
            if (!data.uploadUrl || !data.authorizationToken) {
                this.logger.error('Upload URL not found');
                this.logger.discord('## Erro `B2_UPLOAD_URL`');
                return null;
            }

            return { uploadUrl: data.uploadUrl, uploadAuthToken: data.authorizationToken };
        } catch (error) {
            this.logger.error(error);
            this.logger.discord(`## Erro \`B2_UPLOAD_URL\`\n\`\`\`js\n${error.message}\n\`\`\``);
        }
    }
}
