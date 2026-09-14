import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MecanicoService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    const [mecanicos, total] = await Promise.all([
      this.prisma.mecanico.findMany({
  where: {
    OR: [
      { nombre: { contains: search, mode: 'insensitive' } },
      { apellido: { contains: search, mode: 'insensitive' } },
      { correo: { contains: search, mode: 'insensitive' } },
    ],
  },
  include: {
    mecanicodetalle: true,
  },
  orderBy: { nombre: 'asc' },
  skip,
  take: Number(limit),
}),
      this.prisma.mecanico.count({
        where: {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { apellido: { contains: search, mode: 'insensitive' } },
            { correo: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { 
      data: mecanicos, 
      total, 
      page, 
      totalPages 
    };
  }

  async findOne(id: number) {
    return this.prisma.mecanico.findUnique({ 
      where: { id_mecanico: id },
      include: {
        mecanicodetalle: true,
      },
    });
  }

async create(data: any) {
  // Verifica si ya existe un mecánico con la misma cédula
  const existingMecanicoByCedula = await this.prisma.mecanico.findUnique({
    where: { cedula: data.cedula },
  });

  const existingMecanicoByEmail = await this.prisma.mecanico.findFirst({
    where: { correo: data.correo },
  });

  const existingMecanicoByPhone = await this.prisma.mecanico.findFirst({
    where: { telefono: data.telefono },
  });

  if (existingMecanicoByCedula) {
    throw new ConflictException('Ya existe un mecánico con esta cédula.');
  }

  if (existingMecanicoByEmail) {
    throw new ConflictException('Ya existe un mecánico con este correo.');
  }

  if (existingMecanicoByPhone) {
    throw new ConflictException('Ya existe un mecánico con este número de teléfono.');
  }

  return await this.prisma.$transaction(async (tx) => {
    const mecanico = await tx.mecanico.create({
      data: {
        cedula: data.cedula,
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        correo: data.correo,
        direccion: data.direccion,
      },
    });

    await tx.mecanicodetalle.create({
      data: {
        id_mecanico: mecanico.id_mecanico,
        salario: data.detalle.salario,
        horario: data.detalle.horario,
        tipo_mecanico: data.detalle.tipo_mecanico,
        servicios_realizados: data.detalle.servicios_realizados,
        experiencia_anhos: data.detalle.experiencia_anhos,
      },
    });

    return mecanico;
  });
}

  async update(id: number, data: any) {

    // Verifica si ya existe un mecánico con la misma cedula, excluyendo al que se está actualizando
  const existingMecanicoByCedula = await this.prisma.mecanico.findFirst({
    where: {
      AND: [
      { cedula: data.cedula },
      { id_mecanico: { not: id } },
    ],
    },
  });
    
    // Verifica si ya existe un mecánico con el mismo correo, excluyendo al que se está actualizando
  const existingMecanicoByEmail = await this.prisma.mecanico.findFirst({
    where: {
      AND: [
      { correo: data.correo },
      { id_mecanico: { not: id } },
    ],
    },
  });

  // Verifica si ya existe un mecánico con el mismo teléfono
  const existingMecanicoByPhone = await this.prisma.mecanico.findFirst({
    where: {
      AND: [
      { telefono: data.telefono },
      { id_mecanico: { not: id } },
    ],
    },
  });

  if (existingMecanicoByCedula) {
    throw new ConflictException('Ya existe un mecánico con esta cedula.');
  }

  if (existingMecanicoByEmail) {
    throw new ConflictException('Ya existe un mecánico con este correo.');
  }

  if (existingMecanicoByPhone) {
    throw new ConflictException('Ya existe un mecánico con este número de teléfono.');
  }

   // Actualiza el mecánico
  return await this.prisma.$transaction(async (tx) => {
    const mecanico = await tx.mecanico.update({
      where: { id_mecanico: id },
      data: {
        cedula: data.cedula,
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        correo: data.correo,
        direccion: data.direccion,
      },
    });

    await tx.mecanicodetalle.update({
      where: { id_mecanico: id },
      data: {
        id_mecanico: mecanico.id_mecanico,
        salario: data.detalle.salario,
        horario: data.detalle.horario,
        tipo_mecanico: data.detalle.tipo_mecanico,
        servicios_realizados: data.detalle.servicios_realizados,
        experiencia_anhos: data.detalle.experiencia_anhos,
      },
    });

    return mecanico;
  });


  }

  async remove(id: number) {
    // Verificar si el mecánico existe
    const mecanico = await this.prisma.mecanico.findUnique({
      where: { id_mecanico: id },
      include: {
        mecanicodetalle: true,
      },
    });

    if (!mecanico) {
      throw new BadRequestException('El mecánico no existe.');
    }

    // Eliminar en transacción para mantener consistencia
    return await this.prisma.$transaction(async (tx) => {
      // Primero eliminar el detalle del mecánico si existe
      if (mecanico.mecanicodetalle && mecanico.mecanicodetalle.length > 0) {
        await tx.mecanicodetalle.deleteMany({
          where: { id_mecanico: id },
        });
      }

      // Luego eliminar el mecánico
      const mecanicoEliminado = await tx.mecanico.delete({
        where: { id_mecanico: id },
      });

      return mecanicoEliminado;
    });
  }
}