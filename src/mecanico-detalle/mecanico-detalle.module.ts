import { Module } from '@nestjs/common';
import { MecanicoDetalleController } from './mecanico-detalle.controller';
import { MecanicoDetalleService } from './mecanico-detalle.service';

@Module({
  controllers: [MecanicoDetalleController],
  providers: [MecanicoDetalleService],
})
export class MecanicoDetalleModule {}