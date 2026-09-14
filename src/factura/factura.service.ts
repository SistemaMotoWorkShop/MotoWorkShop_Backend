import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacturaService {
  constructor(private prisma: PrismaService) {}

 async findAll(page: number, limit?: number, search: string = '') {
    const skip = limit ? (page - 1) * limit : undefined;

    const [facturas, total] = await Promise.all([
      this.prisma.factura.findMany({
        where: {
          OR: [
            { id_factura: { equals: parseInt(search) || undefined } },
            { Cliente: { nombre_cliente: { contains: search } } },
          ],
        },
        include: {
          Cliente: true,
          OrdenServicio: {
            include: {
              MotoCliente: true,
              ServicioOrdenServicio: { include: { Servicio: true } },
              RepuestoOrdenServicio: { include: { Repuesto: { include: { MarcaRepuesto: true } } } },
            },
          },
          VentaDirecta: {
            include: {
              Cliente: true,
              RepuestoVenta: { include: { Repuesto: { include: { MarcaRepuesto: true } } } },
            },
          },
        },
        orderBy: {
          fecha: 'desc',
        },
        skip,
        ...(limit && { take: Number(limit) }),
      }),
      this.prisma.factura.count({
        where: {
          OR: [
            { id_factura: { equals: parseInt(search) || undefined } },
            { Cliente: { nombre_cliente: { contains: search } } },
          ],
        },
      }),
    ]);

    const totalPages = limit ? Math.ceil(total / limit) : 1;

    return {
      facturas,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async findOne(id: number) {
    return this.prisma.factura.findUnique({
      where: { id_factura: id },
      include: {
        Cliente: true,
        OrdenServicio: {
          include: {
            MotoCliente: true,
            ServicioOrdenServicio: { include: { Servicio: true } },
            RepuestoOrdenServicio: { include: { Repuesto: { include: { MarcaRepuesto: true } } } },
          },
        },
        VentaDirecta: {
          include: {
            Cliente: true,
            RepuestoVenta: { include: { Repuesto: { include: { MarcaRepuesto: true } } } },
          },
        },
      },
    });
  }
}
