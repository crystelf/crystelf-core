import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PathService } from '../../core/path/path.service';
import { AutoUpdateService } from '../../core/auto-update/auto-update.service';

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);
  private wordCache: Record<string, string[]> = {};
  private readonly clearIntervalMs = 30 * 60 * 1000; // 30min

  @Inject(PathService)
  private readonly paths: PathService;

  @Inject(AutoUpdateService)
  private readonly autoUpdateService: AutoUpdateService;

  constructor() {
    this.startAutoClear();
    this.startAutoUpdate();
  }

  /**
   * 启动定时清理缓存
   */
  private startAutoClear() {
    setInterval(() => {
      this.logger.log('清理文案缓存..');
      this.wordCache = {};
    }, this.clearIntervalMs);
  }

  /**
   * 启动定时检查 words 仓库更新
   */
  private startAutoUpdate() {
    setInterval(async () => {
      const wordsPath = this.paths.get('words');
      this.logger.log('定时检查文案仓库更新..');
      const updated = await this.autoUpdateService.checkRepoForUpdates(
        wordsPath,
        'words 仓库',
      );

      if (updated) {
        this.logger.log('文案仓库已更新，清理缓存..');
        this.wordCache = {};
      }
    }, this.clearIntervalMs);
  }

  /**
   * 从本地加载文案到内存
   */
  async loadWordById(id: string): Promise<string[] | null> {
    this.logger.log(`加载文案 ${id}..`);
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
