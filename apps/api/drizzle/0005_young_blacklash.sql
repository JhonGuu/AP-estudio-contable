CREATE TYPE "public"."estado_vencimiento" AS ENUM('PENDIENTE', 'CUMPLIDO');--> statement-breakpoint
CREATE TYPE "public"."tipo_vencimiento" AS ENUM('IVA', 'GANANCIAS', 'MONOTRIBUTO', 'INGRESOS_BRUTOS', 'SICORE', 'SUELDOS', 'OTRO');--> statement-breakpoint
CREATE TABLE "vencimiento_fiscal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" "tipo_vencimiento" NOT NULL,
	"descripcion" varchar(200),
	"periodo" varchar(20),
	"fecha_vencimiento" timestamp with time zone NOT NULL,
	"estado" "estado_vencimiento" DEFAULT 'PENDIENTE' NOT NULL,
	"fecha_cumplido" timestamp with time zone,
	"asignado_a_usuario_id" uuid,
	"creado_por_usuario_id" uuid NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vencimiento_fiscal" ADD CONSTRAINT "vencimiento_fiscal_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vencimiento_fiscal" ADD CONSTRAINT "vencimiento_fiscal_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vencimiento_fiscal" ADD CONSTRAINT "vencimiento_fiscal_asignado_a_usuario_id_usuario_id_fk" FOREIGN KEY ("asignado_a_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vencimiento_fiscal" ADD CONSTRAINT "vencimiento_fiscal_creado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("creado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vencimiento_fiscal_tenant_id_idx" ON "vencimiento_fiscal" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vencimiento_fiscal_empresa_id_idx" ON "vencimiento_fiscal" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vencimiento_fiscal_fecha_vencimiento_idx" ON "vencimiento_fiscal" USING btree ("fecha_vencimiento");--> statement-breakpoint
CREATE INDEX "vencimiento_fiscal_estado_idx" ON "vencimiento_fiscal" USING btree ("estado");