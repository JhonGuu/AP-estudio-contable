import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types.js";
import { db, type Database } from "./shared/db/client.js";

import { CatalogoRepository } from "./modules/catalogos/infra/CatalogoRepository.js";
import { ObtenerCatalogos } from "./modules/catalogos/use-cases/ObtenerCatalogos.js";

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
import { ListarPlanCuentas } from "./modules/contabilidad/use-cases/ListarPlanCuentas.js";
import { ListarAsientos } from "./modules/contabilidad/use-cases/ListarAsientos.js";
import { ObtenerLibroMayor } from "./modules/contabilidad/use-cases/ObtenerLibroMayor.js";

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

import { ClienteRepository } from "./modules/ventas/infra/ClienteRepository.js";
import { VentaComprobanteRepository } from "./modules/ventas/infra/VentaComprobanteRepository.js";
import { VentaCobroRepository } from "./modules/ventas/infra/VentaCobroRepository.js";
import { RegistrarCliente } from "./modules/ventas/use-cases/RegistrarCliente.js";
import { ListarClientes } from "./modules/ventas/use-cases/ListarClientes.js";
import { RegistrarComprobanteVenta } from "./modules/ventas/use-cases/RegistrarComprobanteVenta.js";
import { ConfirmarComprobanteVenta } from "./modules/ventas/use-cases/ConfirmarComprobanteVenta.js";
import { ListarComprobantesVenta } from "./modules/ventas/use-cases/ListarComprobantesVenta.js";
import { RegistrarCobroVenta } from "./modules/ventas/use-cases/RegistrarCobroVenta.js";

import { CajaRepository } from "./modules/tesoreria/infra/CajaRepository.js";
import { CuentaBancariaRepository } from "./modules/tesoreria/infra/CuentaBancariaRepository.js";
import { TarjetaRepository } from "./modules/tesoreria/infra/TarjetaRepository.js";
import { ChequeraRepository } from "./modules/tesoreria/infra/ChequeraRepository.js";
import { ChequeRepository } from "./modules/tesoreria/infra/ChequeRepository.js";
import { MovimientoFondoRepository } from "./modules/tesoreria/infra/MovimientoFondoRepository.js";
import { CajaDiariaRepository } from "./modules/tesoreria/infra/CajaDiariaRepository.js";
import { ConciliacionBancariaRepository } from "./modules/tesoreria/infra/ConciliacionBancariaRepository.js";
import { RegistrarCaja } from "./modules/tesoreria/use-cases/RegistrarCaja.js";
import { ListarCajas } from "./modules/tesoreria/use-cases/ListarCajas.js";
import { RegistrarCuentaBancaria } from "./modules/tesoreria/use-cases/RegistrarCuentaBancaria.js";
import { ListarCuentasBancarias } from "./modules/tesoreria/use-cases/ListarCuentasBancarias.js";
import { RegistrarTarjeta } from "./modules/tesoreria/use-cases/RegistrarTarjeta.js";
import { ListarTarjetas } from "./modules/tesoreria/use-cases/ListarTarjetas.js";
import { RegistrarChequera } from "./modules/tesoreria/use-cases/RegistrarChequera.js";
import { ListarChequeras } from "./modules/tesoreria/use-cases/ListarChequeras.js";
import { RegistrarCheque } from "./modules/tesoreria/use-cases/RegistrarCheque.js";
import { ListarCheques } from "./modules/tesoreria/use-cases/ListarCheques.js";
import { DepositarCheque } from "./modules/tesoreria/use-cases/DepositarCheque.js";
import { RechazarCheque } from "./modules/tesoreria/use-cases/RechazarCheque.js";
import { RegistrarMovimientoFondo } from "./modules/tesoreria/use-cases/RegistrarMovimientoFondo.js";
import { ListarMovimientosFondo } from "./modules/tesoreria/use-cases/ListarMovimientosFondo.js";
import { AbrirCajaDiaria } from "./modules/tesoreria/use-cases/AbrirCajaDiaria.js";
import { CerrarCajaDiaria } from "./modules/tesoreria/use-cases/CerrarCajaDiaria.js";
import { ListarCajasDiarias } from "./modules/tesoreria/use-cases/ListarCajasDiarias.js";
import { ImportarExtractoBancario } from "./modules/tesoreria/use-cases/ImportarExtractoBancario.js";
import { ListarConciliacion } from "./modules/tesoreria/use-cases/ListarConciliacion.js";
import { ConciliarLineaManual } from "./modules/tesoreria/use-cases/ConciliarLineaManual.js";

/**
 * Composition root. Un unico container para todo el proceso: cada modulo nuevo
 * (contabilidad, compras, ventas, fiscal, tesoreria, stock, sueldos) agrega
 * aca sus bindings de repositorios y use-cases a medida que se construye.
 */
export function buildContainer(): Container {
  const container = new Container();

  container.bind<Database>(TYPES.Database).toConstantValue(db);

  // --- catalogos ---
  container.bind(CatalogoRepository).toSelf().inSingletonScope();
  container.bind(ObtenerCatalogos).toSelf();

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
  container.bind(ListarPlanCuentas).toSelf();
  container.bind(ListarAsientos).toSelf();
  container.bind(ObtenerLibroMayor).toSelf();

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

  // --- ventas: infra ---
  container.bind(ClienteRepository).toSelf().inSingletonScope();
  container.bind(VentaComprobanteRepository).toSelf().inSingletonScope();
  container.bind(VentaCobroRepository).toSelf().inSingletonScope();

  // --- ventas: use-cases ---
  container.bind(RegistrarCliente).toSelf();
  container.bind(ListarClientes).toSelf();
  container.bind(RegistrarComprobanteVenta).toSelf();
  container.bind(ConfirmarComprobanteVenta).toSelf();
  container.bind(ListarComprobantesVenta).toSelf();
  container.bind(RegistrarCobroVenta).toSelf();

  // --- tesoreria: infra ---
  container.bind(CajaRepository).toSelf().inSingletonScope();
  container.bind(CuentaBancariaRepository).toSelf().inSingletonScope();
  container.bind(TarjetaRepository).toSelf().inSingletonScope();
  container.bind(ChequeraRepository).toSelf().inSingletonScope();
  container.bind(ChequeRepository).toSelf().inSingletonScope();
  container.bind(MovimientoFondoRepository).toSelf().inSingletonScope();
  container.bind(CajaDiariaRepository).toSelf().inSingletonScope();
  container.bind(ConciliacionBancariaRepository).toSelf().inSingletonScope();

  // --- tesoreria: use-cases ---
  container.bind(RegistrarCaja).toSelf();
  container.bind(ListarCajas).toSelf();
  container.bind(RegistrarCuentaBancaria).toSelf();
  container.bind(ListarCuentasBancarias).toSelf();
  container.bind(RegistrarTarjeta).toSelf();
  container.bind(ListarTarjetas).toSelf();
  container.bind(RegistrarChequera).toSelf();
  container.bind(ListarChequeras).toSelf();
  container.bind(RegistrarCheque).toSelf();
  container.bind(ListarCheques).toSelf();
  container.bind(DepositarCheque).toSelf();
  container.bind(RechazarCheque).toSelf();
  container.bind(RegistrarMovimientoFondo).toSelf();
  container.bind(ListarMovimientosFondo).toSelf();
  container.bind(AbrirCajaDiaria).toSelf();
  container.bind(CerrarCajaDiaria).toSelf();
  container.bind(ListarCajasDiarias).toSelf();
  container.bind(ImportarExtractoBancario).toSelf();
  container.bind(ListarConciliacion).toSelf();
  container.bind(ConciliarLineaManual).toSelf();

  return container;
}
