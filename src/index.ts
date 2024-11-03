import { logger } from '@class/Logger';
import { config } from 'dotenv';
config();
logger.start();

import Core from '@core';

new Core();
