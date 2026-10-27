CREATE TYPE "public"."estado_caja_diaria" AS ENUM('ABIERTA', 'CERRADA');--> statement-breakpoint
CREATE TYPE "public"."estado_conciliacion" AS ENUM('PENDIENTE', 'CONCILIADA');--> statement-breakpoint
CREATE TABLE "caja_diaria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"caja_id" uuid NOT NULL,
	"fecha_apertura" timestamp with time zone NOT NULL,
	"saldo_apertura" numeric(15, 2) NOT NULL,
	"estado" "estado_caja_diaria" DEFAULT 'ABIERTA' NOT NULL,
	"fecha_cierre" timestamp with time zone,
	"saldo_teorico" numeric(15, 2),
	"total_contado" numeric(15, 2),
	"diferencia" numeric(15, 2),
	"movimiento_fondo_id" uuid
);
--> statement-breakpoint
CREATE TABLE "conciliacion_bancaria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_bancaria_id" uuid NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"descripcion" varchar(300) NOT NULL,
	"importe" numeric(15, 2) NOT NULL,
	"estado" "estado_conciliacion" DEFAULT 'PENDIENTE' NOT NULL,
	"asiento_id" uuid
);
--> statement-breakpoint
ALTER TABLE "caja_diaria" ADD CONSTRAINT "caja_diaria_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_diaria" ADD CONSTRAINT "caja_diaria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_diaria" ADD CONSTRAINT "caja_diaria_caja_id_caja_id_fk" FOREIGN KEY ("caja_id") REFERENCES "public"."caja"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_diaria" ADD CONSTRAINT "caja_diaria_movimiento_fondo_id_movimiento_fondo_id_fk" FOREIGN KEY ("movimiento_fondo_id") REFERENCES "public"."movimiento_fondo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conciliacion_bancaria" ADD CONSTRAINT "conciliacion_bancaria_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conciliacion_bancaria" ADD CONSTRAINT "conciliacion_bancaria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conciliacion_bancaria" ADD CONSTRAINT "conciliacion_bancaria_cuenta_bancaria_id_cuenta_bancaria_id_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuenta_bancaria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conciliacion_bancaria" ADD CONSTRAINT "conciliacion_bancaria_asiento_id_asiento_id_fk" FOREIGN KEY ("asiento_id") REFERENCES "public"."asiento"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "caja_diaria_empresa_id_idx" ON "caja_diaria" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "caja_diaria_caja_id_idx" ON "caja_diaria" USING btree ("caja_id");--> statement-breakpoint
CREATE INDEX "conciliacion_bancaria_empresa_id_idx" ON "conciliacion_bancaria" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "conciliacion_bancaria_cuenta_bancaria_id_idx" ON "conciliacion_bancaria" USING btree ("cuenta_bancaria_id");