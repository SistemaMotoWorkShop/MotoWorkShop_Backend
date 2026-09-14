import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicioDetalleService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [detalles, total] = await Promise.all([
      this.prisma.serviciodetalle.findMany({
        orderBy: { fecha_realizado: 'desc' },
        skip,
        take: Number(limit),
        include: { Servicio: true },
      }),
      this.prisma.serviciodetalle.count(),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data: detalles, total, page, totalPages };
  }

  async findOne(id: number) {
    return this.prisma.serviciodetalle.findUnique({
    where: { id_serviciodetalle: id },
    include: {
      Servicio: true, 
    },
  });
  }

  async create(data: any) {
    // Verificar que el servicio exista
  const servicio = await this.prisma.servicio.findUnique({
    where: { id_servicio: data.id_servicio },
  });

  if (!servicio) {
    throw new BadRequestException('El servicio especificado no existe.');
  }

  // Crear el detalle del servicio
  const detalle = await this.prisma.serviciodetalle.create({
    data: {
      id_servicio: data.id_servicio,
      estado: data.estado,
      fecha_realizado: data.fecha_realizado ?? new Date(),
      observaciones: data.observaciones,
      precio_servicio: data.precio_servicio,
    },
  });

  return detalle;
  }

  async update(id: number, data: any) {
     // Verificar que el servicio exista
  const servicio = await this.prisma.servicio.findUnique({
    where: { id_servicio: data.id_servicio },
  });

  if (!servicio) {
    throw new BadRequestException('El servicio especificado no existe.');
  }

  // Validar que no se repita alguna combinación si fuera necesario
  const existente = await this.prisma.serviciodetalle.findFirst({
  where: {
    id_servicio: data.id_servicio,
    fecha_realizado: data.fecha_realizado,
    NOT: { id_serviciodetalle: id },
    },
  });

  if (existente) {
    throw new ConflictException('Ya existe un detalle de servicio con esta fecha para este servicio.');
  }

  // Validar que no exista otro detalle usando el mismo id_servicio
  const existentePorServicio = await this.prisma.serviciodetalle.findFirst({
  where: {
    id_servicio: data.id_servicio,
    NOT: { id_serviciodetalle: id }, 
    },
  });

if (existentePorServicio) {
  throw new ConflictException('Este servicio ya tiene un detalle asignado.');
}

  // Actualizar el detalle del servicio
  const detalleActualizado = await this.prisma.serviciodetalle.update({
    where: { id_serviciodetalle: id },
    data: {
      id_servicio: data.id_servicio,
      estado: data.estado,
      fecha_realizado: data.fecha_realizado,
      observaciones: data.observaciones,
      precio_servicio: data.precio_servicio,
    },
  });

  return detalleActualizado;
  }

  async remove(id: number) {
    return this.prisma.serviciodetalle.delete({ 
      where: { id_serviciodetalle: id } 
    });
  }
}
