import dotenv from 'dotenv';

dotenv.config();

let config = {
  get: (key: string, defaultValue: any) => {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`环境变量${key}未定义..`);
    }

    if (typeof defaultValue === 'number') return Number(value);
    if (typeof defaultValue === 'boolean') return value === 'true';
    return value;
  },

  set: (key: string, value: any) => {
    process.env[key] = value;
  },
};

export default config;
