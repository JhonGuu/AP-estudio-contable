/**
 * Libros societarios (gap nuevo — ver
 * `claude/modulos-nacional-sistema-y-gap-estudio-contable.md`, seccion 3,
 * "Libros societarios: registro y seguimiento de ubicacion/estado de actas y
 * libros rubricados"). Cuarta y ultima pieza de "Gestion del estudio".
 *
 * Igual que VencimientoFiscal, siempre pertenece a un cliente puntual — no
 * existe el concepto de "libro interno del estudio" (los libros rubricados
 * son de la sociedad, no del estudio que la asesora). `empresaId` es
 * obligatorio.
 *
 * Terminologia real (investigada: tramite.sanjuan.gob.ar — en San Juan el
 * organismo es la Inspeccion General de Personas Juridicas, no IGJ — y el
 * instructivo de rubrica de un colegio profesional): los libros societarios
 * tipicos de una SA son Actas de Directorio, Actas de Asamblea, Deposito de
 * Acciones y Registro de Asistencia a Asamblea, y Registro de Acciones,
 * mas Diario e Inventario y Balances (estos ultimos compartidos con el modulo
 * `cnt`, pero el libro RUBRICADO fisico es un tramite societario aparte del
 * asiento contable); una SRL usa Actas de Reunion de Socios/Gerencia en vez
 * de Directorio/Asamblea. El tramite de rubrica no usa "agotado"/"extraviado"
 * como palabras oficiales: el formulario pide el "ultimo folio utilizado" del
 * libro anterior para habilitar el continuador, y la perdida se tramita como
 * "extravio/robo/hurto" (con denuncia policial + acta del organo de
 * administracion antes de poder rubricar un libro de reposicion). Los
 * estados de este modulo adoptan esa logica en una version simple: EN_USO,
 * COMPLETO (llego al ultimo folio, hace falta rubricar el continuador) y
 * EXTRAVIADO.
 *
 * No hay nota de diseño previa (ni en Nacional Sistema, que solo modela UNA
 * empresa-cliente desde adentro, ni en el vault): es, al igual que el resto
 * de Gestion del estudio, un tablero de seguimiento manual — el estudio
 * anota donde esta cada libro y en que estado, no hay ningun calculo
 * automatico ni integracion con el organismo rubricante.
 */
export const TIPOS_LIBRO_SOCIETARIO = [
  "ACTAS_DIRECTORIO",
  "ACTAS_ASAMBLEA",
  "ACTAS_REUNION_SOCIOS_GERENCIA",
  "REGISTRO_ACCIONES",
  "DEPOSITO_ACCIONES_ASISTENCIA",
  "DIARIO",
  "INVENTARIO_Y_BALANCES",
  "OTRO",
] as const;
export type TipoLibroSocietario = (typeof TIPOS_LIBRO_SOCIETARIO)[number];

export const ESTADOS_LIBRO_SOCIETARIO = ["EN_USO", "COMPLETO", "EXTRAVIADO"] as const;
export type EstadoLibroSocietario = (typeof ESTADOS_LIBRO_SOCIETARIO)[number];

export interface LibroSocietario {
  id: string;
  tenantId: string;
  empresaId: string;
  tipo: TipoLibroSocietario;
  /** Numero de libro (ej. "Libro N° 3"). */
  numero: number;
  /** Cantidad total de folios del libro, si se conoce. */
  cantidadFolios: number | null;
  /** Ultimo folio utilizado hasta ahora (terminologia real del tramite de rubrica). */
  ultimoFolioUtilizado: number | null;
  fechaRubrica: Date | null;
  /** Ubicacion fisica en texto libre (ej. "Archivo del estudio", "Sede social del cliente"). */
  ubicacion: string | null;
  estado: EstadoLibroSocietario;
  observaciones: string | null;
  creadoPorUsuarioId: string;
  fechaCreacion: Date;
}
