import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { ChequeRepository } from "../infra/ChequeRepository.js";
import { ChequeraRepository } from "../infra/ChequeraRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { Cheque, OrigenCheque, TipoTerceroCheque } from "../domain/Cheque.js";

export interface RegistrarChequeInput {
  origen: OrigenCheque;
  /** Obligatorio si origen=EMITIDO (de que chequera propia sale). Ignorado si origen=RECIBIDO. */
  chequeraId?: string;
  /** Obligatorio si origen=RECIBIDO (numero que ya trae el cheque de tercero). Ignorado si origen=EMITIDO (se asigna solo). */
  numero?: string;
  importe: number;
  fechaEmision: Date;
  fechaVencimiento: Date;
  bancoEmisor?: string | null;
  terceroTipo: TipoTerceroCheque;
  terceroId: string;
}

/**
 * POST /tesoreria/cheques (nota 22, seccion 2 y 6 — implicito: hace falta
 * poder dar de alta un cheque, propio o de tercero, antes de poder
 * depositarlo/rechazarlo). Un EMITIDO (terceroTipo=PROVEEDOR) toma el
 * proximo numero de su chequera y arranca en estado EMITIDO; un RECIBIDO
 * (terceroTipo=CLIENTE) trae su propio numero y arranca en estado RECIBIDO
 * (nota 22, seccion 4: el flujo de deposito arranca ahi).
 */
@injectable()
export class RegistrarCheque {
  constructor(
    @inject(ChequeRepository) private readonly chequeRepository: ChequeRepository,
    @inject(ChequeraRepository) private readonly chequeraRepository: ChequeraRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarChequeInput): Promise<Cheque> {
    if (input.importe <= 0) {
      throw AppError.badRequest("El importe del cheque debe ser positivo");
    }

    if (input.origen === "EMITIDO") {
      if (input.terceroTipo !== "PROVEEDOR") {
        throw AppError.badRequest("Un cheque EMITIDO se le paga a un PROVEEDOR");
      }
      if (!input.chequeraId) {
        throw AppError.badRequest("Un cheque EMITIDO necesita chequeraId");
      }
      const chequera = await this.chequeraRepository.buscarPorIdYEmpresa(input.chequeraId, context.empresaId);
      if (!chequera) {
        throw AppError.notFound("Chequera no encontrada en esta empresa");
      }
      const numero = await this.chequeraRepository.siguienteNumero(chequera.id);
      if (numero > chequera.numeroHasta) {
        throw new AppError(422, "La chequera no tiene mas numeros disponibles", "CHEQUERA_AGOTADA");
      }

      return this.chequeRepository.crear({
        tenantId: context.tenantId,
        empresaId: context.empresaId,
        origen: "EMITIDO",
        chequeraId: chequera.id,
        numero: String(numero),
        importe: input.importe,
        fechaEmision: input.fechaEmision,
        fechaVencimiento: input.fechaVencimiento,
        bancoEmisor: input.bancoEmisor,
        terceroTipo: input.terceroTipo,
        terceroId: input.terceroId,
        estado: "EMITIDO",
      });
    }

    if (input.terceroTipo !== "CLIENTE") {
      throw AppError.badRequest("Un cheque RECIBIDO viene de un CLIENTE");
    }
    if (!input.numero) {
      throw AppError.badRequest("Un cheque RECIBIDO necesita su numero de origen");
    }

    return this.chequeRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      origen: "RECIBIDO",
      chequeraId: null,
      numero: input.numero,
      importe: input.importe,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento,
      bancoEmisor: input.bancoEmisor,
      terceroTipo: input.terceroTipo,
      terceroId: input.terceroId,
      estado: "RECIBIDO",
    });
  }
}
