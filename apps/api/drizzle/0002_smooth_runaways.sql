CREATE TYPE "public"."estado_cheque" AS ENUM('EMITIDO', 'RECIBIDO', 'DEPOSITADO', 'COBRADO', 'RECHAZADO', 'VENCIDO', 'CADUCADO', 'ANULADO');--> statement-breakpoint
CREATE TYPE "public"."origen_cheque" AS ENUM('EMITIDO', 'RECIBIDO');--> statement-breakpoint
CREATE TYPE "public"."tipo_cuenta_fondo" AS ENUM('CAJA', 'CUENTA_BANCARIA');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento_fondo" AS ENUM('TRANSFERENCIA', 'AJUSTE');--> statement-breakpoint
CREATE TYPE "public"."tipo_tercero_cheque" AS ENUM('PROVEEDOR', 'CLIENTE');--> statement-breakpoint
CREATE TABLE "caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"moneda_id" uuid NOT NULL,
	"cuenta_contable_id" uuid NOT NULL,
	"saldo" numeric(15, 2) DEFAULT '0' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cheque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"origen" "origen_cheque" NOT NULL,
	"chequera_id" uuid,
	"numero" varchar(30) NOT NULL,
	"importe" numeric(15, 2) NOT NULL,
	"fecha_emision" timestamp with time zone NOT NULL,
	"fecha_vencimiento" timestamp with time zone NOT NULL,
	"banco_emisor" varchar(100),
	"tercero_tipo" "tipo_tercero_cheque" NOT NULL,
	"tercero_id" uuid NOT NULL,
	"cuenta_bancaria_id" uuid,
	"estado" "estado_cheque" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chequera" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_bancaria_id" uuid NOT NULL,
	"numero_desde" integer NOT NULL,
	"numero_hasta" integer NOT NULL,
	"proximo_numero" integer NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuenta_bancaria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"cbu" varchar(22),
	"banco" varchar(100) NOT NULL,
	"moneda_id" uuid NOT NULL,
	"cuenta_contable_id" uuid NOT NULL,
	"saldo" numeric(15, 2) DEFAULT '0' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimiento_fondo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"tipo" "tipo_movimiento_fondo" NOT NULL,
	"cuenta_origen_tipo" "tipo_cuenta_fondo",
	"cuenta_origen_id" uuid,
	"cuenta_destino_tipo" "tipo_cuenta_fondo",
	"cuenta_destino_id" uuid,
	"importe" numeric(15, 2) NOT NULL,
	"descripcion" varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarjeta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"cuenta_liquidadora_id" uuid NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caja" ADD CONSTRAINT "caja_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja" ADD CONSTRAINT "caja_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja" ADD CONSTRAINT "caja_moneda_id_moneda_id_fk" FOREIGN KEY ("moneda_id") REFERENCES "public"."moneda"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja" ADD CONSTRAINT "caja_cuenta_contable_id_plan_cuenta_id_fk" FOREIGN KEY ("cuenta_contable_id") REFERENCES "public"."plan_cuenta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheque" ADD CONSTRAINT "cheque_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheque" ADD CONSTRAINT "cheque_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheque" ADD CONSTRAINT "cheque_chequera_id_chequera_id_fk" FOREIGN KEY ("chequera_id") REFERENCES "public"."chequera"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheque" ADD CONSTRAINT "cheque_cuenta_bancaria_id_cuenta_bancaria_id_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuenta_bancaria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chequera" ADD CONSTRAINT "chequera_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chequera" ADD CONSTRAINT "chequera_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chequera" ADD CONSTRAINT "chequera_cuenta_bancaria_id_cuenta_bancaria_id_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuenta_bancaria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_bancaria" ADD CONSTRAINT "cuenta_bancaria_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_bancaria" ADD CONSTRAINT "cuenta_bancaria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_bancaria" ADD CONSTRAINT "cuenta_bancaria_moneda_id_moneda_id_fk" FOREIGN KEY ("moneda_id") REFERENCES "public"."moneda"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_bancaria" ADD CONSTRAINT "cuenta_bancaria_cuenta_contable_id_plan_cuenta_id_fk" FOREIGN KEY ("cuenta_contable_id") REFERENCES "public"."plan_cuenta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_fondo" ADD CONSTRAINT "movimiento_fondo_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_fondo" ADD CONSTRAINT "movimiento_fondo_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjeta" ADD CONSTRAINT "tarjeta_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjeta" ADD CONSTRAINT "tarjeta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjeta" ADD CONSTRAINT "tarjeta_cuenta_liquidadora_id_cuenta_bancaria_id_fk" FOREIGN KEY ("cuenta_liquidadora_id") REFERENCES "public"."cuenta_bancaria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "caja_empresa_id_idx" ON "caja" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "cheque_empresa_id_idx" ON "cheque" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "cheque_estado_idx" ON "cheque" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "cheque_chequera_numero_uk" ON "cheque" USING btree ("chequera_id","numero");--> statement-breakpoint
CREATE INDEX "chequera_empresa_id_idx" ON "chequera" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "cuenta_bancaria_empresa_id_idx" ON "cuenta_bancaria" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "movimiento_fondo_empresa_id_idx" ON "movimiento_fondo" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "tarjeta_empresa_id_idx" ON "tarjeta" USING btree ("empresa_id");