import { logger } from '@class/Logger';
import { config } from 'dotenv';
config();
logger.start();

import Server from './manager/index';

const server = new Server();
