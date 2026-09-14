import { Module } from '@nestjs/common';
import { MecanicoController } from './mecanico.controller';
import { MecanicoService } from './mecanico.service';

@Module({
  controllers: [MecanicoController],
  providers: [MecanicoService],
})
export class MecanicoModule {}