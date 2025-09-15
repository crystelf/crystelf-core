import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { DirectoryList, FileInfo, UserInfo } from './openlist.types';
import { OpenListUtils } from './openlist.utils';

@Injectable()
export class OpenListService {
  private readonly logger = new Logger(OpenListService.name);

  constructor(
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
  ) {
    OpenListUtils.init(configService);
  }
}
