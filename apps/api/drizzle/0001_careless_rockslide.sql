CREATE TYPE "public"."estado_comprobante_venta" AS ENUM('BORRADOR', 'CONFIRMADO', 'ANULADO');--> statement-breakpoint
CREATE TYPE "public"."medio_cobro" AS ENUM('CAJA', 'CUENTA_BANCARIA', 'TARJETA', 'CHEQUE_PROPIO', 'CHEQUE_TERCERO');--> statement-breakpoint
CREATE TYPE "public"."tipo_impuesto_venta" AS ENUM('IVA', 'IIBB', 'OTROS');--> statement-breakpoint
CREATE TABLE "cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"razon_social" varchar(150) NOT NULL,
	"cuit" varchar(13) NOT NULL,
	"condicion_iva_id" uuid NOT NULL,
	"domicilio" varchar(200),
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venta_cobro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"importe_total" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venta_cobro_comprobante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cobro_id" uuid NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"importe_aplicado" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venta_cobro_medio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cobro_id" uuid NOT NULL,
	"medio" "medio_cobro" NOT NULL,
	"importe" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venta_comprobante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo_comprobante_id" uuid NOT NULL,
	"punto_venta_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"rubro" integer DEFAULT 1 NOT NULL,
	"neto_total" numeric(15, 2) NOT NULL,
	"exento_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"no_gravado_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"importe_total" numeric(15, 2) NOT NULL,
	"saldo_pendiente" numeric(15, 2) NOT NULL,
	"estado" "estado_comprobante_venta" DEFAULT 'BORRADOR' NOT NULL,
	"cae" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "venta_comprobante_cuota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"importe" numeric(15, 2) NOT NULL,
	"capital" numeric(15, 2) NOT NULL,
	"interes" numeric(15, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venta_comprobante_impuesto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"tipo" "tipo_impuesto_venta" NOT NULL,
	"importe" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venta_comprobante_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"descripcion" varchar(200) NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"precio_unitario" numeric(15, 2) NOT NULL,
	"alicuota_iva" numeric(5, 2) DEFAULT '21' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_condicion_iva_id_condicion_iva_id_fk" FOREIGN KEY ("condicion_iva_id") REFERENCES "public"."condicion_iva"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_cobro" ADD CONSTRAINT "venta_cobro_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_cobro" ADD CONSTRAINT "venta_cobro_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_cobro" ADD CONSTRAINT "venta_cobro_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_cobro_comprobante" ADD CONSTRAINT "venta_cobro_comprobante_cobro_id_venta_cobro_id_fk" FOREIGN KEY ("cobro_id") REFERENCES "public"."venta_cobro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_cobro_comprobante" ADD CONSTRAINT "venta_cobro_comprobante_comprobante_id_venta_comprobante_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."venta_comprobante"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_cobro_medio" ADD CONSTRAINT "venta_cobro_medio_cobro_id_venta_cobro_id_fk" FOREIGN KEY ("cobro_id") REFERENCES "public"."venta_cobro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante" ADD CONSTRAINT "venta_comprobante_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante" ADD CONSTRAINT "venta_comprobante_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante" ADD CONSTRAINT "venta_comprobante_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante" ADD CONSTRAINT "venta_comprobante_tipo_comprobante_id_tipo_comprobante_id_fk" FOREIGN KEY ("tipo_comprobante_id") REFERENCES "public"."tipo_comprobante"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante" ADD CONSTRAINT "venta_comprobante_punto_venta_id_punto_venta_id_fk" FOREIGN KEY ("punto_venta_id") REFERENCES "public"."punto_venta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante_cuota" ADD CONSTRAINT "venta_comprobante_cuota_comprobante_id_venta_comprobante_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."venta_comprobante"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante_impuesto" ADD CONSTRAINT "venta_comprobante_impuesto_comprobante_id_venta_comprobante_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."venta_comprobante"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_comprobante_item" ADD CONSTRAINT "venta_comprobante_item_comprobante_id_venta_comprobante_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."venta_comprobante"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cliente_empresa_id_idx" ON "cliente" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cliente_empresa_cuit_uk" ON "cliente" USING btree ("empresa_id","cuit");--> statement-breakpoint
CREATE INDEX "venta_cobro_empresa_id_idx" ON "venta_cobro" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "venta_cobro_comprobante_cobro_id_idx" ON "venta_cobro_comprobante" USING btree ("cobro_id");--> statement-breakpoint
CREATE INDEX "venta_cobro_medio_cobro_id_idx" ON "venta_cobro_medio" USING btree ("cobro_id");--> statement-breakpoint
CREATE INDEX "venta_comprobante_empresa_id_idx" ON "venta_comprobante" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "venta_comprobante_cliente_id_idx" ON "venta_comprobante" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venta_comprobante_empresa_tipo_pv_numero_uk" ON "venta_comprobante" USING btree ("empresa_id","tipo_comprobante_id","punto_venta_id","numero");--> statement-breakpoint
CREATE INDEX "venta_comprobante_cuota_comprobante_id_idx" ON "venta_comprobante_cuota" USING btree ("comprobante_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venta_comprobante_cuota_comprobante_numero_uk" ON "venta_comprobante_cuota" USING btree ("comprobante_id","numero");--> statement-breakpoint
CREATE INDEX "venta_comprobante_impuesto_comprobante_id_idx" ON "venta_comprobante_impuesto" USING btree ("comprobante_id");--> statement-breakpoint
CREATE INDEX "venta_comprobante_item_comprobante_id_idx" ON "venta_comprobante_item" USING btree ("comprobante_id");