import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MecanicoDetalleService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [detalles, total] = await Promise.all([
      this.prisma.mecanicodetalle.findMany({
        orderBy: { id_mecanicodetalle: 'asc' },
        skip,
        take: Number(limit),
        include: { mecanico: true },
      }),
      this.prisma.mecanicodetalle.count(),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { 
      data: detalles, 
      total, 
      page, 
      totalPages 
    };
  }

  async findOne(id: number) {
    return this.prisma.mecanicodetalle.findUnique({
      where: { id_mecanicodetalle: id },
      include: { 
        mecanico: true 
      },
    });
  }

  async create(data: any) {
     // Validar que el mecánico exista
  const mecanico = await this.prisma.mecanico.findUnique({
    where: { id_mecanico: data.id_mecanico },
  });

  if (!mecanico) {
    throw new BadRequestException('El mecánico especificado no existe.');
  }

  // Verificar que el mecánico aún no tenga un detalle asignado
  const existingDetalle = await this.prisma.mecanicodetalle.findUnique({
    where: { id_mecanico: data.id_mecanico },
  });

  if (existingDetalle) {
    throw new ConflictException('Este mecánico ya tiene un detalle asignado.');
  }

  // Crear el detalle del mecánico
  const mecanicodetalle = await this.prisma.mecanicodetalle.create({
    data: {
      id_mecanico: data.id_mecanico,
      salario: data.salario,
      horario: data.horario,
      tipo_mecanico: data.tipo_mecanico,
      servicios_realizados: data.servicios_realizados,
      experiencia_anhos: data.experiencia_anhos,
    },
  });

  return mecanicodetalle;
  }

  async update(id: number, data: any) {
    // Validar que el mecánico existe
  const mecanico = await this.prisma.mecanico.findUnique({
    where: { id_mecanico: data.id_mecanico },
  });

  if (!mecanico) {
    throw new BadRequestException('El mecánico especificado no existe.');
  }

  // Verificar que el id_mecanico no esté ya usado por otro detalle
  const existing = await this.prisma.mecanicodetalle.findFirst({
    where: {
      AND: [
      { id_mecanico: data.id_mecanico },
      { id_mecanicodetalle: { not: id } },
    ],
    },
  });

  if (existing) {
    throw new ConflictException('Este mecánico ya tiene un detalle asignado en otro registro.');
  }

  // Si pasa las validaciones, se actualiza
  return this.prisma.mecanicodetalle.update({
    where: { id_mecanicodetalle: id },
    data,
  });
  }

  async remove(id: number) {
    return this.prisma.mecanicodetalle.delete({ 
      where: { id_mecanicodetalle: id } 
    });
  }
}
