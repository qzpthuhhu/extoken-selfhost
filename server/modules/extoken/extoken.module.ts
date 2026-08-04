import { Module } from '@nestjs/common';
import { ExtokenController } from './extoken.controller';
import { ExtokenOpenApiController } from './extoken.openapi.controller';
import { ExtokenAccountService } from './extoken-account.service';
import { ExtokenService } from './extoken.service';
import { OpenapiGatewayGuard } from './extoken.openapi.guard';

@Module({
  controllers: [ExtokenController, ExtokenOpenApiController],
  providers: [ExtokenAccountService, ExtokenService, OpenapiGatewayGuard],
  exports: [ExtokenAccountService, ExtokenService, OpenapiGatewayGuard],
})
export class ExtokenModule {}
