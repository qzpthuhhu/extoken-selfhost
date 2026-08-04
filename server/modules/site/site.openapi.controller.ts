import { Controller, Get } from '@nestjs/common';
import { SiteService } from './site.service';

@Controller('openapi/site')
export class SiteOpenApiController {
  constructor(private readonly siteService: SiteService) {}

  @Get('project-updates')
  async projectUpdates() {
    const appName = process.env.APP_NAME?.trim() || 'Extoken 私有化交换站';
    return this.siteService.getPublicProjectUpdates(appName);
  }
}
