import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types.js";
import { db, type Database } from "./shared/db/client.js";

import { TenantRepository } from "./modules/identidad/infra/TenantRepository.js";
import { UsuarioRepository } from "./modules/identidad/infra/UsuarioRepository.js";
import { EmpresaRepository } from "./modules/identidad/infra/EmpresaRepository.js";
import { UsuarioEmpresaRepository } from "./modules/identidad/infra/UsuarioEmpresaRepository.js";

import { CrearTenant } from "./modules/identidad/use-cases/CrearTenant.js";
import { Login } from "./modules/identidad/use-cases/Login.js";
import { RefrescarToken } from "./modules/identidad/use-cases/RefrescarToken.js";
import { ObtenerPerfil } from "./modules/identidad/use-cases/ObtenerPerfil.js";
import { CrearEmpresa } from "./modules/identidad/use-cases/CrearEmpresa.js";
import { ListarEmpresas } from "./modules/identidad/use-cases/ListarEmpresas.js";
import { InvitarUsuario } from "./modules/identidad/use-cases/InvitarUsuario.js";
import { AsignarUsuarioEmpresa } from "./modules/identidad/use-cases/AsignarUsuarioEmpresa.js";

import { PlanCuentaRepository } from "./modules/contabilidad/infra/PlanCuentaRepository.js";
import { EjercicioRepository } from "./modules/contabilidad/infra/EjercicioRepository.js";
import { ModeloAsientoRepository } from "./modules/contabilidad/infra/ModeloAsientoRepository.js";
import { AsientoRepository } from "./modules/contabilidad/infra/AsientoRepository.js";
import { ActivarModelosAsientoDeFabrica } from "./modules/contabilidad/use-cases/ActivarModelosAsientoDeFabrica.js";
import { GenerarAsientoDesdeComprobante } from "./modules/contabilidad/use-cases/GenerarAsientoDesdeComprobante.js";

import { TipoComprobanteRepository } from "./modules/comprobantes/infra/TipoComprobanteRepository.js";
import { PuntoVentaRepository } from "./modules/comprobantes/infra/PuntoVentaRepository.js";
import { ComprobanteSecuenciaRepository } from "./modules/comprobantes/infra/ComprobanteSecuenciaRepository.js";
import { ListarTiposComprobante } from "./modules/comprobantes/use-cases/ListarTiposComprobante.js";
import { CrearPuntoVenta } from "./modules/comprobantes/use-cases/CrearPuntoVenta.js";
import { ListarPuntosVenta } from "./modules/comprobantes/use-cases/ListarPuntosVenta.js";

import { ProveedorRepository } from "./modules/compras/infra/ProveedorRepository.js";
import { CompraComprobanteRepository } from "./modules/compras/infra/CompraComprobanteRepository.js";
import { CompraPagoRepository } from "./modules/compras/infra/CompraPagoRepository.js";
import { RegistrarProveedor } from "./modules/compras/use-cases/RegistrarProveedor.js";
import { ListarProveedores } from "./modules/compras/use-cases/ListarProveedores.js";
import { RegistrarComprobanteCompra } from "./modules/compras/use-cases/RegistrarComprobanteCompra.js";
import { ConfirmarComprobanteCompra } from "./modules/compras/use-cases/ConfirmarComprobanteCompra.js";
import { ListarComprobantesCompra } from "./modules/compras/use-cases/ListarComprobantesCompra.js";
import { RegistrarPagoCompra } from "./modules/compras/use-cases/RegistrarPagoCompra.js";

/**
 * Composition root. Un unico container para todo el proceso: cada modulo nuevo
 * (contabilidad, compras, ventas, fiscal, tesoreria, stock, sueldos) agrega
 * aca sus bindings de repositorios y use-cases a medida que se construye.
 */
export function buildContainer(): Container {
  const container = new Container();

  container.bind<Database>(TYPES.Database).toConstantValue(db);

  // --- identidad: infra ---
  container.bind(TenantRepository).toSelf().inSingletonScope();
  container.bind(UsuarioRepository).toSelf().inSingletonScope();
  container.bind(EmpresaRepository).toSelf().inSingletonScope();
  container.bind(UsuarioEmpresaRepository).toSelf().inSingletonScope();

  // --- identidad: use-cases ---
  container.bind(CrearTenant).toSelf();
  container.bind(Login).toSelf();
  container.bind(RefrescarToken).toSelf();
  container.bind(ObtenerPerfil).toSelf();
  container.bind(CrearEmpresa).toSelf();
  container.bind(ListarEmpresas).toSelf();
  container.bind(InvitarUsuario).toSelf();
  container.bind(AsignarUsuarioEmpresa).toSelf();

  // --- contabilidad: infra ---
  container.bind(PlanCuentaRepository).toSelf().inSingletonScope();
  container.bind(EjercicioRepository).toSelf().inSingletonScope();
  container.bind(ModeloAsientoRepository).toSelf().inSingletonScope();
  container.bind(AsientoRepository).toSelf().inSingletonScope();

  // --- contabilidad: use-cases ---
  container.bind(ActivarModelosAsientoDeFabrica).toSelf();
  container.bind(GenerarAsientoDesdeComprobante).toSelf();

  // --- comprobantes: infra ---
  container.bind(TipoComprobanteRepository).toSelf().inSingletonScope();
  container.bind(PuntoVentaRepository).toSelf().inSingletonScope();
  container.bind(ComprobanteSecuenciaRepository).toSelf().inSingletonScope();

  // --- comprobantes: use-cases ---
  container.bind(ListarTiposComprobante).toSelf();
  container.bind(CrearPuntoVenta).toSelf();
  container.bind(ListarPuntosVenta).toSelf();

  // --- compras: infra ---
  container.bind(ProveedorRepository).toSelf().inSingletonScope();
  container.bind(CompraComprobanteRepository).toSelf().inSingletonScope();
  container.bind(CompraPagoRepository).toSelf().inSingletonScope();

  // --- compras: use-cases ---
  container.bind(RegistrarProveedor).toSelf();
  container.bind(ListarProveedores).toSelf();
  container.bind(RegistrarComprobanteCompra).toSelf();
  container.bind(ConfirmarComprobanteCompra).toSelf();
  container.bind(ListarComprobantesCompra).toSelf();
  container.bind(RegistrarPagoCompra).toSelf();

  return container;
}
