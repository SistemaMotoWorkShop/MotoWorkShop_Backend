import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [notificaciones, total] = await Promise.all([
      this.prisma.notificaciones.findMany({
        orderBy: { fecha_notificacion: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.notificaciones.count(),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data: notificaciones, 
      total, 
      page, 
      totalPages
    };
  }

  async findOne(id: number) {
    return this.prisma.notificaciones.findUnique({
    where: { id_notificaciones: id },
    include: {
      OrdenServicio_notificaciones_id_orden_servicioToOrdenServicio: true,
    },
  });
  }

  async create(data: any) {
     // Validar que la orden de servicio exista (si viene)
  if (data.id_orden_servicio) {
    const orden = await this.prisma.ordenServicio.findUnique({
      where: { id_orden_servicio: data.id_orden_servicio },
    });

    if (!orden) {
      throw new BadRequestException('La orden de servicio especificada no existe.');
    }

    // Validar que no haya otra notificación asociada a esa orden
    const existingByOrden = await this.prisma.notificaciones.findUnique({
      where: { id_orden_servicio: data.id_orden_servicio },
    });

    if (existingByOrden) {
      throw new ConflictException('Ya existe una notificación para esta orden de servicio.');
    }
  }

  // Crear la notificación
  const notificacion = await this.prisma.notificaciones.create({
    data: {
      id_orden_servicio: data.id_orden_servicio,
      email: data.email,
      fecha_notificacion: data.fecha_notificacion ?? new Date(),
    },
  });

  return notificacion;
  }

  async update(id: number, data: any) {
    
  // Validar que la orden de servicio exista (si viene)
  if (data.id_orden_servicio) {
    const orden = await this.prisma.ordenServicio.findUnique({
      where: { id_orden_servicio: data.id_orden_servicio },
    });

    if (!orden) {
      throw new BadRequestException('La orden de servicio especificada no existe.');
    }

    // Validar que la orden no esté ya usada en otra notificación
    const existingByOrden = await this.prisma.notificaciones.findFirst({
      where: {
        id_orden_servicio: data.id_orden_servicio,
        NOT: { id_notificaciones: id },
      },
    });

    if (existingByOrden) {
      throw new ConflictException('Ya existe una notificación asignada a esta orden de servicio.');
    }
  }

  // Actualizar la notificación
  return this.prisma.notificaciones.update({
    where: { id_notificaciones: id },
    data,
  });
  }

  async remove(id: number) {
    return this.prisma.notificaciones.delete({ 
      where: { id_notificaciones: id } 
    });
  }
}