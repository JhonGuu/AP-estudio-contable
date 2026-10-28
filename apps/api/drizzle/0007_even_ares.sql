CREATE TYPE "public"."estado_libro_societario" AS ENUM('EN_USO', 'COMPLETO', 'EXTRAVIADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_libro_societario" AS ENUM('ACTAS_DIRECTORIO', 'ACTAS_ASAMBLEA', 'ACTAS_REUNION_SOCIOS_GERENCIA', 'REGISTRO_ACCIONES', 'DEPOSITO_ACCIONES_ASISTENCIA', 'DIARIO', 'INVENTARIO_Y_BALANCES', 'OTRO');--> statement-breakpoint
CREATE TABLE "libro_societario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" "tipo_libro_societario" NOT NULL,
	"numero" integer NOT NULL,
	"cantidad_folios" integer,
	"ultimo_folio_utilizado" integer,
	"fecha_rubrica" timestamp with time zone,
	"ubicacion" varchar(200),
	"estado" "estado_libro_societario" DEFAULT 'EN_USO' NOT NULL,
	"observaciones" varchar(2000),
	"creado_por_usuario_id" uuid NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "libro_societario" ADD CONSTRAINT "libro_societario_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_societario" ADD CONSTRAINT "libro_societario_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_societario" ADD CONSTRAINT "libro_societario_creado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("creado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "libro_societario_tenant_id_idx" ON "libro_societario" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "libro_societario_empresa_id_idx" ON "libro_societario" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "libro_societario_estado_idx" ON "libro_societario" USING btree ("estado");