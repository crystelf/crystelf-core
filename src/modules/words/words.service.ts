import path from 'path';
import paths from '../../utils/core/path';
import fs from 'fs/promises';
import logger from '../../utils/core/logger';

class WordsService {
  private wordCache: Record<string, string[]> = {}; //缓存

  /**
   * 从本地加载json到内存&返回
   * @param id 文件名
   */
  public async loadWordById(id: string): Promise<string[] | null> {
    logger.info(`Loading words ${id}..`);
    if (this.wordCache[id]) return this.wordCache[id];
    const filePath = path.join(paths.get('words'), `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const texts = parsed.filter((item) => typeof item === 'string');
        this.wordCache[id] = texts;
        return texts;
      } else {
        return null;
      }
    } catch (error) {
      logger.error(`Failed to loadWordById: ${id}`);
      return null;
    }
  }

  /**
   * 重载json到内存
   * @param id 文件名
   */
  public async reloadWord(id: string): Promise<boolean> {
    logger.info(`Reloading word: ${id}..`);
    const filePath = path.join(paths.get('words'), `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        this.wordCache[id] = parsed.filter((item) => typeof item === 'string');
        return true;
      } else {
        return false;
      }
    } catch (e) {
      logger.error(`Failed to reloadWordById: ${id}..`);
      return false;
    }
  }
}
export default new WordsService();
