import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdenServicioService {
    constructor(private prisma: PrismaService) {}
    async findAll(page: number, limit: number, search: string) {
        const skip = (page - 1) * limit;
        const searchNumber = Number(search);

        const searchConditions = search
            ? {
                OR: [
                    ...(!isNaN(searchNumber)
                        ? [{ id_orden_servicio: searchNumber }]
                        : []),
                    {
                        MotoCliente: {
                            placa: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        },
                    },
                ],
            }
            : {};

        const ordenesCompletas = await this.prisma.ordenServicio.findMany({
            where: searchConditions,
            include: {
                MotoCliente: true,
                ServicioOrdenServicio: {
                    include: { Servicio: true },
                },
                RepuestoOrdenServicio: true,
            },
        });

        const prioridadEstado: Record<string, number> = {
            PENDIENTE: 1,
            EN_PROCESO: 2,
            COMPLETADO: 3,
            CANCELADO: 4,
        };

        ordenesCompletas.sort((a, b) => {
            const prioridadA = prioridadEstado[a.estado] ?? 99;
            const prioridadB = prioridadEstado[b.estado] ?? 99;

            if (prioridadA !== prioridadB) {
                return prioridadA - prioridadB;
            }

            return b.id_orden_servicio - a.id_orden_servicio;
        });

        const total = ordenesCompletas.length;
        const ordenesServicio = ordenesCompletas.slice(
            skip,
            skip + Number(limit),
        );

        return {
            ordenesServicio,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }

    async findOne(id: number) {
        return this.prisma.ordenServicio.findUnique({
        where: { id_orden_servicio: id },
        include: {
            MotoCliente: {
                include: { Cliente: true },
            },
            ServicioOrdenServicio: {
            include: { Servicio: true },
            },
            RepuestoOrdenServicio: {
            include: { Repuesto: true },
            },
            Factura: true,
        },
        });
    }
    async create(data: any) {
        try {
            const existingMotoCliente = await this.prisma.motoCliente.findUnique({
                where: { id_moto_cliente: data.id_moto_cliente },
            });
            if (!existingMotoCliente) {
                throw new ConflictException('La moto cliente no existe.');
            }
            if(data.estado !== 'PENDIENTE'){
                throw new ConflictException('Para crear una orden debe estar en estado pendiente.');
            }
            // Validar stock de repuestos
            if (data.repuestos && data.repuestos.length > 0) {
                for (const repuesto of data.repuestos) {
                    const repuestoEnStock = await this.prisma.repuesto.findUnique({
                        where: { id_repuesto: repuesto.id_repuesto },
                    });
                    if (!repuestoEnStock) {
                        throw new ConflictException(`El repuesto con ID ${repuesto.id_repuesto} no existe.`);
                    }
                    if (repuestoEnStock.stock < repuesto.cantidad) {
                        throw new ConflictException(`No hay suficiente stock para el repuesto: ${repuestoEnStock.nombre_repuesto} hay en stock ${repuestoEnStock.stock} y se solicitan ${repuesto.cantidad}`);
                    }
                }
            }
            const nuevaOrden = await this.prisma.ordenServicio.create({
                data: {
                    fecha: new Date(data.fecha),
                    estado: data.estado,
                    subtotal: data.subtotal,
                    descuento: data.descuento,
                    iva: data.iva,
                    total: data.total,
                    adelanto_efectivo: data.adelanto_efectivo,
                    adelanto_tarjeta: data.adelanto_tarjeta,
                    adelanto_transferencia: data.adelanto_transferencia,
                    guardar_cascos: data.guardar_cascos,
                    guardar_papeles: data.guardar_papeles,
                    observaciones: data.observaciones,
                    observaciones_mecanico: data.observaciones_mecanico,
                    observaciones_factura: data.observaciones_factura,
                    mecanico: data.mecanico,
                    vendedor: data.vendedor,
                    id_moto_cliente: data.id_moto_cliente,
                },
            });
            // Crear servicios asociados
            if (data.Servicio && data.Servicio.length > 0) {
                const serviciosOrden = data.Servicio.map((servicio: any) => ({
                    id_orden_servicio: nuevaOrden.id_orden_servicio,
                    id_servicio: servicio.id_servicio,
                    precio: servicio.precio,
                }));
                await this.prisma.servicioOrdenServicio.createMany({ data: serviciosOrden });
            }
            // Crear repuestos asociados y actualizar stock
            if (data.Repuesto && data.Repuesto.length > 0) {
                const repuestosOrden = data.Repuesto.map((repuesto: any) => ({
                    id_orden_servicio: nuevaOrden.id_orden_servicio,
                    id_repuesto: repuesto.id_repuesto,
                    cantidad: repuesto.cantidad,
                    precio: repuesto.precio,
                }));
                await this.prisma.repuestoOrdenServicio.createMany({ data: repuestosOrden });
                // Actualizar stock
                for (const repuesto of data.repuestos) {
                    await this.prisma.repuesto.update({
                        where: { id_repuesto: repuesto.id_repuesto },
                        data: { stock: { decrement: repuesto.cantidad } },
                    });
                }
            }
            return nuevaOrden;
        } catch (error) {
            console.error('Error al crear la orden de servicio:', error);
            if (error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }
    async update(id: number, data: any) {
        const prisma = this.prisma;
        try {
            return await prisma.$transaction(async (tx) => {
                const existingOrden = await tx.ordenServicio.findUnique({
                    where: { id_orden_servicio: id },
                    include: { RepuestoOrdenServicio: true }
                });
                if (!existingOrden) {
                    throw new ConflictException('La orden de servicio no existe.');
                }
                const existingMotoCliente = await tx.motoCliente.findUnique({
                    where: { id_moto_cliente: data.id_moto_cliente },
                });
                if (!existingMotoCliente) {
                    throw new ConflictException('La moto cliente no existe.');
                }
                // Handle CANCELADO state
                if (data.estado === 'CANCELADO') {
                    const existingFactura = await tx.factura.findUnique({
                        where: { id_orden_servicio: id },
                    });
                    if (existingFactura) {
                        await tx.factura.update({
                            where: { id_factura: existingFactura.id_factura },
                            data: {
                                fecha: new Date(data.fecha),
                                pago_efectivo: 0,
                                pago_tarjeta: 0,
                                pago_transferencia: 0,
                                descuento: 0,
                                subtotal: 0,
                                iva: 0,
                                total: 0,
                            },
                        });
                    }
                    // Return all repuestos to stock
                    for (const repuesto of existingOrden.RepuestoOrdenServicio) {
                        await tx.repuesto.update({
                            where: { id_repuesto: repuesto.id_repuesto },
                            data: { stock: { increment: repuesto.cantidad } },
                        });
                    }
                    // Remove all RepuestoOrdenServicio relationships
                    await tx.repuestoOrdenServicio.deleteMany({
                        where: { id_orden_servicio: id },
                    });
                    // Remove all ServicioOrdenServicio relationships
                    await tx.servicioOrdenServicio.deleteMany({
                        where: { id_orden_servicio: id },
                    });
                    // Update the order status
                    const ordenActualizada = await tx.ordenServicio.update({
                        where: { id_orden_servicio: id },
                        data: {
                            estado: 'CANCELADO',
                            adelanto_efectivo:0,
                            adelanto_tarjeta:0,
                            adelanto_transferencia:0,
                            descuento: 0,
                            subtotal: 0,
                            iva: 0,
                            total: 0,
                            observaciones: data.observaciones || 'Orden cancelada',
                            observaciones_mecanico: data.observaciones_mecanico || 'Orden cancelada',
                            observaciones_factura: data.observaciones_factura || 'Orden cancelada',
                        },
                    });
                    return ordenActualizada;
                }
                // For non-CANCELADO states, proceed with the normal update logic
                const repuestosAnteriores = await tx.repuestoOrdenServicio.findMany({
                    where: { id_orden_servicio: id },
                });
                const newRepuestosMap = new Map(
                    data.repuestos ? data.repuestos.map(r => [r.id_repuesto, r]) : []
                );
                // Handle removed or updated repuestos
                for (const oldRepuesto of repuestosAnteriores) {
                    const newRepuesto = newRepuestosMap.get(oldRepuesto.id_repuesto) as { cantidad: number };
                    if (!newRepuesto) {
                        // Repuesto was removed, return to stock
                        await tx.repuesto.update({
                            where: { id_repuesto: oldRepuesto.id_repuesto },
                            data: { stock: { increment: oldRepuesto.cantidad } },
                        });
                    } else if (newRepuesto.cantidad < oldRepuesto.cantidad) {
                        // Quantity decreased, return difference to stock
                        await tx.repuesto.update({
                            where: { id_repuesto: oldRepuesto.id_repuesto },
                            data: { stock: { increment: oldRepuesto.cantidad - newRepuesto.cantidad } },
                        });
                    } else if (newRepuesto.cantidad > oldRepuesto.cantidad) {
                        // Quantity increased, remove difference from stock
                        const repuestoEnStock = await tx.repuesto.findUnique({
                            where: { id_repuesto: oldRepuesto.id_repuesto },
                        });
                        if (repuestoEnStock.stock < (newRepuesto.cantidad - oldRepuesto.cantidad)) {
                            throw new ConflictException(`No hay suficiente stock para el repuesto: ${repuestoEnStock.nombre_repuesto}. Stock actual: ${repuestoEnStock.stock}, Cantidad adicional requerida: ${newRepuesto.cantidad - oldRepuesto.cantidad}`);
                        }
                        await tx.repuesto.update({
                            where: { id_repuesto: oldRepuesto.id_repuesto },
                            data: { stock: { decrement: newRepuesto.cantidad - oldRepuesto.cantidad } },
                        });
                    }
                }
                // Handle new repuestos
                for (const newRepuesto of data.repuestos || []) {
                    const oldRepuesto = repuestosAnteriores.find(r => r.id_repuesto === newRepuesto.id_repuesto);
                    if (!oldRepuesto) {
                        // New repuesto added, check and update stock
                        const repuestoEnStock = await tx.repuesto.findUnique({
                            where: { id_repuesto: newRepuesto.id_repuesto },
                        });
                        if (!repuestoEnStock) {
                            throw new ConflictException(`El repuesto con ID ${newRepuesto.id_repuesto} no existe.`);
                        }
                        if (repuestoEnStock.stock < newRepuesto.cantidad) {
                            throw new ConflictException(`No hay suficiente stock para el repuesto: ${repuestoEnStock.nombre_repuesto}. Stock actual: ${repuestoEnStock.stock}, Cantidad requerida: ${newRepuesto.cantidad}`);
                        }
                        await tx.repuesto.update({
                            where: { id_repuesto: newRepuesto.id_repuesto },
                            data: { stock: { decrement: newRepuesto.cantidad } },
                        });
                    }
                }
                // Update the order
                const ordenActualizada = await tx.ordenServicio.update({
                    where: { id_orden_servicio: id },
                    data: {
                        fecha: new Date(data.fecha),
                        estado: data.estado,
                        subtotal: data.subtotal,
                        descuento: data.descuento,
                        iva: data.iva,
                        total: data.total,
                        adelanto_efectivo: data.adelanto_efectivo,
                        adelanto_tarjeta: data.adelanto_tarjeta,
                        adelanto_transferencia: data.adelanto_transferencia,
                        guardar_cascos: data.guardar_cascos,
                        guardar_papeles: data.guardar_papeles,
                        observaciones: data.observaciones,
                        observaciones_mecanico: data.observaciones_mecanico,
                        observaciones_factura: data.observaciones_factura,
                        mecanico: data.mecanico,
                        vendedor: data.vendedor,
                        id_moto_cliente: data.id_moto_cliente,
                    },
                });
                // Update RepuestoOrdenServicio entries
                await tx.repuestoOrdenServicio.deleteMany({
                    where: { id_orden_servicio: id },
                });
                if (data.Repuesto && data.Repuesto.length > 0) {
                    for (const repuesto of data.Repuesto) {
                        await tx.repuestoOrdenServicio.create({
                            data: {
                                id_orden_servicio: id,
                                id_repuesto: repuesto.id_repuesto,
                                cantidad: repuesto.cantidad,
                                precio: repuesto.precio,
                            },
                        });
                    }
                }
                // Handle services
                await tx.servicioOrdenServicio.deleteMany({
                    where: { id_orden_servicio: id },
                });
                if (data.Servicio && data.Servicio.length > 0) {
                    for (const servicio of data.Servicio) {
                        await tx.servicioOrdenServicio.create({
                            data: {
                                id_orden_servicio: id,
                                id_servicio: servicio.id_servicio,
                                precio: servicio.precio,
                            },
                        });
                    }
                }
                let factura = null;
                // Handle invoice if the status is COMPLETADO
                if (data.estado === 'COMPLETADO') {
                    const existingFactura = await tx.factura.findUnique({
                        where: { id_orden_servicio: id },
                    });
                    if (existingFactura) {
                        factura = await tx.factura.update({
                            where: { id_factura: existingFactura.id_factura },
                            data: {
                                fecha: new Date(data.fecha),
                                pago_efectivo: data.adelanto_efectivo,
                                pago_tarjeta: data.adelanto_tarjeta,
                                pago_transferencia: data.adelanto_transferencia,
                                descuento: data.descuento,
                                subtotal: data.subtotal,
                                iva: data.iva,
                                total: data.total,
                                vendedor: data.vendedor
                            },
                        });
                    } else {
                        factura = await tx.factura.create({
                            data: {
                                fecha: data.fecha ? new Date(data.fecha) : new Date(),
                                pago_efectivo: data.adelanto_efectivo,
                                pago_tarjeta: data.adelanto_tarjeta,
                                pago_transferencia: data.adelanto_transferencia,
                                descuento: data.descuento,
                                subtotal: data.subtotal,
                                iva: data.iva,
                                total: data.total,
                                id_cliente: existingMotoCliente.id_cliente,
                                id_orden_servicio: id,
                                vendedor:data.vendedor,
                            },
                        });
                    }
                }
                return {
                    ...ordenActualizada,
                    factura,
                };
            });
        } catch (error) {
            console.error('Error al actualizar la orden de servicio:', error);
            if (error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }
    async remove(id: number) {
        try {
            const repuestosAsociados = await this.prisma.repuestoOrdenServicio.findMany({
                where: { id_orden_servicio: id },
            });
            // Devolver stock de repuestos antes de eliminar la orden
            for (const repuesto of repuestosAsociados) {
                await this.prisma.repuesto.update({
                    where: { id_repuesto: repuesto.id_repuesto },
                    data: { stock: { increment: repuesto.cantidad } },
                });
            }
            // Eliminar repuestos y servicios asociados
            await this.prisma.repuestoOrdenServicio.deleteMany({
                where: { id_orden_servicio: id },
            });
            await this.prisma.servicioOrdenServicio.deleteMany({
                where: { id_orden_servicio: id },
            });
            // Eliminar la orden
            const ordenEliminada = await this.prisma.ordenServicio.delete({
                where: { id_orden_servicio: id },
            });
            return ordenEliminada;
        } catch (error) {
            console.error('Error al eliminar la orden de servicio:', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }
}

