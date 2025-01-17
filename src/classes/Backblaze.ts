import BackBlazeB2 from 'backblaze-b2';
import Logger from './Logger';

export default class Backblaze extends BackBlazeB2 {
    private readonly logger = new Logger('BackBlaze');
    private readonly reauthInterval = 84600000;

    constructor() {
        super({
            applicationKey: process.env.BACKBLAZE_APPLICATION_KEY,
            applicationKeyId: process.env.BACKBLAZE_APPLICATION_KEY_ID
        });

        // try {
        //     this.initialize();
        // } catch (error) {
        //     this.logger.error(error);
        // }
    }

    // async initialize() {
    //     this._authorize();
    //     setInterval(() => this._authorize(), this.reauthInterval);
    // }

    // private async _authorize() {
    //     this.authorize()
    //         .then(() => this.logger.log('Connected'))
    //         .catch(err => this.logger.error(err.message));
    // }

    async UploadImage(
        data: Buffer,
        fileName: string,
        uploadData: GetUploadUrlResponse
    ): Promise<ImageUploadReponse> {
        try {
            // const {
            //     data: { uploadUrl = '', authorizationToken: uploadAuthToken = '' }
            // } = await this.getUploadUrl({ bucketId: process.env.BACKBLAZE_BUCKET_ID });
            // if (!uploadUrl || !uploadAuthToken) {
            //     this.logger.error('Upload URL not found');
            //     return null;
            // }
            const response = await this.uploadFile({
                ...uploadData,
                data,
                fileName,
                mime: 'image/heif'
            });

            return {
                fileId: response.data.fileId,
                fileName: response.data.fileName,
                fileInfo: response.data.fileInfo,
                contentType: response.data.contentType,
                contentLength: Number(response.data.contentLength)
            };
        } catch (error) {
            this.logger.error(error);
        }
    }
}
