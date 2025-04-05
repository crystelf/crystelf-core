import apps from './app';
import logger from './utils/core/logger';

const PORT = process.env.PORT || 3000;

const app = apps.createApp();

app.listen(PORT, () => {
  logger.info(`Crystelf-core listening on ${PORT}`);
});
