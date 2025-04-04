import chalk from 'chalk';
import config from './config';
import fc from './file';

const logger = {
  debug: (...args: any[]) => {
    if (config.get('DEBUG', false)) {
      //const message = args.join(' ');
      console.log(chalk.cyan('[DEBUG]'), ...args);
      //fc.logToFile('DEBUG', message);
    }
  },
  info: (...args: any[]) => {
    const message = args.join(' ');
    console.log(chalk.green('[INFO]'), ...args);
    fc.logToFile('INFO', message);
  },
  warn: (...args: any[]) => {
    const message = args.join(' ');
    console.log(chalk.yellow('[WARN]'), ...args);
    fc.logToFile('WARN', message);
  },
  error: (...args: any[]) => {
    const message = args.join(' ');
    console.log(chalk.red('[ERROR]'), ...args);
    fc.logToFile('ERROR', message);
  },
};

export default logger;
