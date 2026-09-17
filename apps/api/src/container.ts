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

  return container;
}
