import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClientesModule } from './clientes/clientes.module';
import { MotoClienteModule } from './moto-cliente/moto-cliente.module';
import { OrdenServicioModule } from './orden-servicio/orden-servicio.module';
import { ServicioModule } from './servicio/servicio.module';
import { ProveedorModule } from './proveedor/proveedor.module';
import { MarcaRepuestoModule } from './marca-repuesto/marca-repuesto.module';
import { MotoMercadoModule } from './moto-mercado/moto-mercado.module';
import { RepuestoModule } from './repuesto/repuesto.module';
import { VentaDirectaModule } from './venta-directa/venta-directa.module';
import { FacturaModule } from './factura/factura.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MecanicoModule } from './mecanico/mecanico.module';
import { MecanicoDetalleModule } from './mecanico-detalle/mecanico-detalle.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ReservasModule } from './reservas/reservas.module';
import { ServicioDetalleModule } from './servicio-detalle/servicio-detalle.module';

@Module({
  imports: [
    
    AuthModule,
    UsersModule,
    PrismaModule,
    ClientesModule,
    MotoClienteModule,
    OrdenServicioModule,
    ServicioModule,
    ProveedorModule,
    MarcaRepuestoModule,
    MotoMercadoModule,
    RepuestoModule,
    VentaDirectaModule,
    FacturaModule,
    MecanicoModule,
    MecanicoDetalleModule,
    NotificacionesModule,
    ReservasModule,
    ServicioDetalleModule,
  ],
})
export class AppModule {}