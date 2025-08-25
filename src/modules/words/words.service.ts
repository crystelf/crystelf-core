import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PathService } from '../../core/path/path.service';

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);
  private wordCache: Record<string, string[]> = {};
  private readonly clearIntervalMs = 30 * 60 * 1000; // 30min
  @Inject(PathService)
  private readonly paths: PathService;

  constructor() {
    this.startAutoClear();
  }

  private startAutoClear() {
    setInterval(() => {
      this.logger.log('清理文案缓存..');
      this.wordCache = {};
    }, this.clearIntervalMs);
  }

  /**
   * 从本地加载 json 到内存&返回
   */
  async loadWordById(id: string): Promise<string[] | null> {
    this.logger.log(`Loading words ${id}..`);
    if (this.wordCache[id]) return this.wordCache[id];
    const filePath = path.join(this.paths.get('words'), `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const texts = parsed.filter((item) => typeof item === 'string');
        this.wordCache[id] = texts;
        return texts;
      }
      return null;
    } catch (e) {
      this.logger.error(`加载文案失败: ${id}..`, e);
      return null;
    }
  }

  /**
   * 重载 json 到内存
   */
  async reloadWord(id: string): Promise<boolean> {
    this.logger.log(`重载文案: ${id}..`);
    const filePath = path.join(this.paths.get('words'), `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        this.wordCache[id] = parsed.filter((item) => typeof item === 'string');
        return true;
      }
      return false;
    } catch (e) {
      this.logger.error(`重载文案失败: ${id}`, e);
      return false;
    }
  }
}
