import { Controller, Get, Render, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller()
export class ViewController {

  @Get(['/', '*'])
  @Render('index')
  async render(@Req() req: Request): Promise<{ __platform__: string }>  {
    // you can add custom render params here
    const basePlatformData = (req as Request & { __platform_data__?: Record<string, unknown> }).__platform_data__ ?? {};
    const platformData = {
      ...basePlatformData,
      appName: process.env.APP_NAME || process.env.VITE_APP_NAME || 'Extoken 上下文交换站',
      publicOpenapiGatewayToken:
        process.env.PUBLIC_OPENAPI_GATEWAY_TOKEN?.trim() ||
        process.env.OPENAPI_GATEWAY_TOKEN?.trim() ||
        '',
    };
    return {
      // don't delete this line, it's used by client to get platform info
      __platform__: JSON.stringify(platformData),
    };
  }
}
