import {
  Controller,
  Get,
  Query,
  Param,
  Headers,
  Req,
} from '@nestjs/common';

import { AppService } from './app.service.js';
import type { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/*')
  getHello(
    @Query() query: any,
    @Param() params: any,
    @Headers() headers: any,
    @Req() req: Request,
  ) {
    console.log('Query 参数:', query);
    console.log('Param 参数:', params);
    console.log('Headers 参数:', headers);
    console.log('用户 IP:', req.ip);
    console.log('远程 IP:', req.socket.remoteAddress);

    console.log('请求方法:', req.method);
    console.log('请求 URL:', req.originalUrl);

    debugger;

    return this.appService.getHello();
  }
}