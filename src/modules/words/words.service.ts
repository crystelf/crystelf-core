import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PathService } from '../../core/path/path.service';
import { AutoUpdateService } from '../../core/auto-update/auto-update.service';

interface WordCacheEntry {
  data: string[];
  timer: NodeJS.Timeout;
}

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);
  private wordCache: Map<string, WordCacheEntry> = new Map();
  private readonly clearIntervalMs = 240 * 60 * 1000; // 240min
  private readonly updateMs = 15 * 60 * 1000; // 15min

  @Inject(PathService)
  private readonly paths: PathService;

  @Inject(AutoUpdateService)
  private readonly autoUpdateService: AutoUpdateService;

  constructor() {
    this.startAutoUpdate();
  }

  private startAutoUpdate() {
    setInterval(async () => {
      const wordsPath = path.join(this.paths.get('words'), '..');
      this.logger.log('定时检查文案仓库更新..');
      const updated = await this.autoUpdateService.checkRepoForUpdates(
        wordsPath,
        'words 仓库',
      );
      if (updated) {
        this.logger.log('文案仓库已更新,清理缓存..');
        this.clearAllCache();
      }
    }, this.updateMs);
  }

  private clearAllCache() {
    for (const [key, entry] of this.wordCache.entries()) {
      clearTimeout(entry.timer);
      this.wordCache.delete(key);
    }
  }

  private scheduleCacheClear(key: string) {
    const existing = this.wordCache.get(key);
    if (existing) clearTimeout(existing.timer);

    return setTimeout(() => {
      this.logger.log(`清理单项文案缓存: ${key}`);
      this.wordCache.delete(key);
    }, this.clearIntervalMs);
  }

  /**
   * 从本地加载文案到内存
   */
  public async loadWord(type: string, name: string): Promise<string[] | null> {
    const safeType = this.safePathSegment(type);
    const safeName = this.safePathSegment(name);
    const cacheKey = `${safeType}/${safeName}`;
    this.logger.log(`加载文案 ${cacheKey}..`);
    const cache = this.wordCache.get(cacheKey);
    if (cache) return cache.data;

    const filePath = path.join(
      this.paths.get('words'),
      safeType,
      `${safeName}.json`,
    );
    try {
      const content = await fs.readFile(filePath, { encoding: 'utf-8' });
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const texts = parsed.filter((item) => typeof item === 'string');
        const timer = this.scheduleCacheClear(cacheKey);
        this.wordCache.set(cacheKey, { data: texts, timer });
        return texts;
      }
      return null;
    } catch (e) {
      this.logger.error(`加载文案失败: ${cacheKey}`, e);
      return null;
    }
  }

  /**
   * 重载文案
   */
  public async reloadWord(type: string, name: string): Promise<boolean> {
    const safeType = this.safePathSegment(type);
    const safeName = this.safePathSegment(name);
    const cacheKey = `${safeType}/${safeName}`;
    this.logger.log(`重载文案: ${cacheKey}..`);
    const filePath = path.join(
      this.paths.get('words'),
      safeType,
      `${safeName}.json`,
    );
    try {
      const content = await fs.readFile(filePath, { encoding: 'utf-8' });
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const texts = parsed.filter((item) => typeof item === 'string');
        const timer = this.scheduleCacheClear(cacheKey);
        this.wordCache.set(cacheKey, { data: texts, timer });
        return true;
      }
      return false;
    } catch (e) {
      this.logger.error(`重载文案失败: ${cacheKey}`, e);
      return false;
    }
  }

  private safePathSegment(segment: string): string {
    // 将不安全字符转义为安全文件名形式
    return segment.replace(/[\\\/:*?"<>|]/g, '_');
  }
}
