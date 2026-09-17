/**
 * Simbolos de Inversify para tokens que no son una clase concreta (ej. el
 * cliente de Drizzle, que es un tipo estructural, no una clase instanciable) —
 * todo lo demas (repositorios, use-cases) se inyecta por tipo de clase directo,
 * sin necesitar un simbolo aca.
 */
export const TYPES = {
  Database: Symbol.for("Database"),
} as const;
