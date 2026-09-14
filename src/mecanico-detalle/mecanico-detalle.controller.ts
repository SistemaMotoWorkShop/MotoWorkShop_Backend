import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { MecanicoDetalleService } from './mecanico-detalle.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('mecanico-detalle')
@UseGuards(JwtAuthGuard)
export class MecanicoDetalleController {
  constructor(private readonly mecanicoDetalleService: MecanicoDetalleService) {}

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.mecanicoDetalleService.findAll(page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mecanicoDetalleService.findOne(+id);
  }

  @Post()
  async create(@Body() data: any) {
    try {
      return await this.mecanicoDetalleService.create(data);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.mecanicoDetalleService.update(+id, data);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  async remove(@Param('id') id: string) {
    return this.mecanicoDetalleService.remove(+id);
  }
}