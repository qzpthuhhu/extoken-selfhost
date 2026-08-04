import { Module } from '@nestjs/common';

import { SiteController } from './site.controller';
import { SiteOpenApiController } from './site.openapi.controller';
import { SiteService } from './site.service';

@Module({
  controllers: [SiteController, SiteOpenApiController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
