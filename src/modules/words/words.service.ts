import path from 'path';
import paths from '../../utils/core/path';
import fs from 'fs/promises';
import logger from '../../utils/core/logger';

class WordsService {
  private wordCache: Record<string, string[]> = {};
  public async loadWordById(id: string): Promise<string[] | null> {
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
}
export default new WordsService();
