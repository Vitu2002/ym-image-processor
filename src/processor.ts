import { logger } from '@class/Logger';
import { config } from 'dotenv';
config();
logger.start();

import Processor from './consumer/index';

const processor = new Processor();
