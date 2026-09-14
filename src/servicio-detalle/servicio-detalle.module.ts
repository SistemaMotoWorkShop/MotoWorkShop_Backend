import { Module } from '@nestjs/common';
import { ServicioDetalleController } from './servicio-detalle.controller';
import { ServicioDetalleService } from './servicio-detalle.service';

@Module({
  controllers: [ServicioDetalleController],
  providers: [ServicioDetalleService],
})
export class ServicioDetalleModule {}