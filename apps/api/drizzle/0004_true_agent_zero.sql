CREATE TYPE "public"."estado_tarea" AS ENUM('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');--> statement-breakpoint
CREATE TABLE "tarea_estudio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid,
	"titulo" varchar(200) NOT NULL,
	"descripcion" varchar(2000),
	"asignado_a_usuario_id" uuid NOT NULL,
	"creado_por_usuario_id" uuid NOT NULL,
	"fecha_limite" timestamp with time zone,
	"estado" "estado_tarea" DEFAULT 'PENDIENTE' NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_completada" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tarea_estudio_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"descripcion" varchar(200) NOT NULL,
	"completado" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tarea_estudio" ADD CONSTRAINT "tarea_estudio_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_estudio" ADD CONSTRAINT "tarea_estudio_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_estudio" ADD CONSTRAINT "tarea_estudio_asignado_a_usuario_id_usuario_id_fk" FOREIGN KEY ("asignado_a_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_estudio" ADD CONSTRAINT "tarea_estudio_creado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("creado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_estudio_item" ADD CONSTRAINT "tarea_estudio_item_tarea_id_tarea_estudio_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tarea_estudio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tarea_estudio_tenant_id_idx" ON "tarea_estudio" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tarea_estudio_empresa_id_idx" ON "tarea_estudio" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "tarea_estudio_asignado_a_idx" ON "tarea_estudio" USING btree ("asignado_a_usuario_id");--> statement-breakpoint
CREATE INDEX "tarea_estudio_item_tarea_id_idx" ON "tarea_estudio_item" USING btree ("tarea_id");