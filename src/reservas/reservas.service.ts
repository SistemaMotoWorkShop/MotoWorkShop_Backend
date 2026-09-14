import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReservasService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [reservas, total] = await Promise.all([
      this.prisma.reserva.findMany({
        orderBy: { fecha_reserva: 'desc' },
        skip,
        take: Number(limit),
        include: {
          Cliente: true,
          Servicio: true,
        },
      }),
      this.prisma.reserva.count(),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data: reservas, total, page, totalPages };
  }

  async findOne(id: number) {
    return this.prisma.reserva.findUnique({
      where: { id_reserva: id },
      include: { Cliente: true, Servicio: true },
    });
  }

  async create(data: any) {
    // Validar que el cliente exista
  const cliente = await this.prisma.cliente.findUnique({
    where: { id_cliente: data.id_cliente },
  });

  if (!cliente) {
    throw new BadRequestException('El cliente especificado no existe.');
  }

  // Validar que el servicio exista
  const servicio = await this.prisma.servicio.findUnique({
    where: { id_servicio: data.id_servicio },
  });

  if (!servicio) {
    throw new BadRequestException('El servicio especificado no existe.');
  }

  // Verificar si ya existe una reserva igual (cliente, servicio y fecha)
  const existingReserva = await this.prisma.reserva.findFirst({
    where: {
      id_cliente: data.id_cliente,
      fecha_reserva: data.fecha_reserva,
    },
  });

  if (existingReserva) {
    throw new ConflictException('Este cliente ya tiene una reserva para este servicio en esta fecha.');
  }

  // Crear la reserva
  const reserva = await this.prisma.reserva.create({
    data: {
      id_cliente: data.id_cliente,
      id_servicio: data.id_servicio,
      fecha_reserva: data.fecha_reserva ?? new Date(),
    },
  });

  return reserva;
  }

  async update(id: number, data: any) {
      // Verifica si existe el cliente asociado
  const existingCliente = await this.prisma.cliente.findUnique({
    where: { id_cliente: data.id_cliente },
  });

  if (!existingCliente) {
    throw new BadRequestException('El cliente especificado no existe.');
  }

  // Verifica si existe el servicio asociado
  const existingServicio = await this.prisma.servicio.findUnique({
    where: { id_servicio: data.id_servicio },
  });

  if (!existingServicio) {
    throw new BadRequestException('El servicio especificado no existe.');
  }

  // Verifica si ya existe una reserva duplicada para el mismo cliente, servicio y fecha
  const existingReserva = await this.prisma.reserva.findFirst({
    where: {
      id_cliente: data.id_cliente,
      id_servicio: data.id_servicio,
      fecha_reserva: data.fecha_reserva,
      NOT: { id_reserva: id }, // Excluye la actual
    },
  });

  if (existingReserva) {
    throw new ConflictException('Ya existe una reserva con este cliente, servicio y fecha.');
  }

  // Si todo es válido, se actualiza la reserva
  const reservaActualizada = await this.prisma.reserva.update({
    where: { id_reserva: id },
    data: {
      id_cliente: data.id_cliente,
      id_servicio: data.id_servicio,
      fecha_reserva: data.fecha_reserva,
    },
  });

  return reservaActualizada;
  }

  async remove(id: number) {
    return this.prisma.reserva.delete({ 
      where: { id_reserva: id } 
    });
  }
}