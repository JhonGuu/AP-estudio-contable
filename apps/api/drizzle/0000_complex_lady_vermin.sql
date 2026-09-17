CREATE TYPE "public"."estado_comprobante_compra" AS ENUM('BORRADOR', 'CONFIRMADO', 'ANULADO');--> statement-breakpoint
CREATE TYPE "public"."medio_pago" AS ENUM('CAJA', 'CUENTA_BANCARIA', 'TARJETA', 'CHEQUE_PROPIO', 'CHEQUE_TERCERO');--> statement-breakpoint
CREATE TYPE "public"."tipo_impuesto_compra" AS ENUM('IVA', 'IIBB', 'OTROS');--> statement-breakpoint
CREATE TYPE "public"."tipo_retencion" AS ENUM('IIBB', 'GANANCIAS', 'IVA');--> statement-breakpoint
CREATE TYPE "public"."aplica_a_comprobante" AS ENUM('COMPRA', 'VENTA', 'AMBOS');--> statement-breakpoint
CREATE TYPE "public"."evento_modelo_asiento" AS ENUM('ASIENTO_COMPRA', 'ASIENTO_VENTA', 'COBRO_ASIENTO', 'PAGO_ASIENTO', 'DEPOSITO', 'SUELDOS');--> statement-breakpoint
CREATE TYPE "public"."lado_movimiento" AS ENUM('DEBE', 'HABER');--> statement-breakpoint
CREATE TYPE "public"."origen_asiento" AS ENUM('AUTOMATICO', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."tipo_cuenta" AS ENUM('ACTIVO', 'PASIVO', 'PATRIMONIO_NETO', 'RESULTADO');--> statement-breakpoint
CREATE TYPE "public"."estado_empresa" AS ENUM('ACTIVO', 'INACTIVO');--> statement-breakpoint
CREATE TYPE "public"."estado_tenant" AS ENUM('ACTIVO', 'SUSPENDIDO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."estado_usuario" AS ENUM('ACTIVO', 'INVITADO_PENDIENTE', 'DESHABILITADO');--> statement-breakpoint
CREATE TYPE "public"."modulo_activable" AS ENUM('STOCK', 'SUELDOS');--> statement-breakpoint
CREATE TYPE "public"."plan_tenant" AS ENUM('TRIAL', 'BASICO', 'PROFESIONAL');--> statement-breakpoint
CREATE TYPE "public"."rol_empresa" AS ENUM('OWNER', 'ADMIN', 'CONTADOR', 'ASISTENTE', 'SOLO_LECTURA');--> statement-breakpoint
CREATE TYPE "public"."rol_global" AS ENUM('OWNER', 'ADMIN', 'CONTADOR', 'ASISTENTE');--> statement-breakpoint
CREATE TABLE "condicion_iva" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_afip" varchar(4) NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"es_responsable_inscripto" boolean DEFAULT false NOT NULL,
	CONSTRAINT "condicion_iva_codigo_afip_unique" UNIQUE("codigo_afip")
);
--> statement-breakpoint
CREATE TABLE "moneda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(3) NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"simbolo" varchar(5) NOT NULL,
	CONSTRAINT "moneda_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "provincia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_afip" varchar(2) NOT NULL,
	"nombre" varchar(50) NOT NULL,
	CONSTRAINT "provincia_codigo_afip_unique" UNIQUE("codigo_afip")
);
--> statement-breakpoint
CREATE TABLE "tipo_documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_afip" varchar(3) NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"longitud" integer,
	CONSTRAINT "tipo_documento_codigo_afip_unique" UNIQUE("codigo_afip")
);
--> statement-breakpoint
CREATE TABLE "compra_comprobante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
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
	"estado" "estado_comprobante_compra" DEFAULT 'BORRADOR' NOT NULL,
	"cae" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "compra_comprobante_impuesto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"tipo" "tipo_impuesto_compra" NOT NULL,
	"importe" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compra_comprobante_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"descripcion" varchar(200) NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"precio_unitario" numeric(15, 2) NOT NULL,
	"alicuota_iva" numeric(5, 2) DEFAULT '21' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compra_pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"importe_total" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compra_pago_comprobante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_id" uuid NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"importe_aplicado" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compra_pago_medio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_id" uuid NOT NULL,
	"medio" "medio_pago" NOT NULL,
	"importe" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compra_retencion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_id" uuid NOT NULL,
	"tipo" "tipo_retencion" NOT NULL,
	"importe" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proveedor" (
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
CREATE TABLE "comprobante_secuencia" (
	"punto_venta_id" uuid NOT NULL,
	"tipo_comprobante_id" uuid NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "comprobante_secuencia_punto_venta_id_tipo_comprobante_id_pk" PRIMARY KEY("punto_venta_id","tipo_comprobante_id")
);
--> statement-breakpoint
CREATE TABLE "punto_venta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipo_comprobante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(10) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"aplica_a" "aplica_a_comprobante" NOT NULL,
	"afecta_iva" boolean DEFAULT false NOT NULL,
	"afecta_cuenta_corriente" boolean DEFAULT true NOT NULL,
	"requiere_cae" boolean DEFAULT false NOT NULL,
	CONSTRAINT "tipo_comprobante_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "asiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"ejercicio_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"leyenda" varchar(255) NOT NULL,
	"origen" "origen_asiento" DEFAULT 'AUTOMATICO' NOT NULL,
	"comprobante_origen_tipo" varchar(30),
	"comprobante_origen_id" uuid
);
--> statement-breakpoint
CREATE TABLE "asiento_contador" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asiento_movimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asiento_id" uuid NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"lado" "lado_movimiento" NOT NULL,
	"importe" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ejercicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fecha_desde" date NOT NULL,
	"fecha_hasta" date NOT NULL,
	"cerrado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelo_asiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"evento" "evento_modelo_asiento" NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelo_asiento_movimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_asiento_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"lado" "lado_movimiento" NOT NULL,
	"formula" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelo_asiento_plantilla" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento" "evento_modelo_asiento" NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "modelo_asiento_plantilla_evento_unique" UNIQUE("evento")
);
--> statement-breakpoint
CREATE TABLE "modelo_asiento_plantilla_movimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plantilla_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	"cuenta_codigo" varchar(20) NOT NULL,
	"lado" "lado_movimiento" NOT NULL,
	"formula" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_cuenta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"tipo" "tipo_cuenta" NOT NULL,
	"imputable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"razon_social" varchar(150) NOT NULL,
	"nombre_comercial" varchar(150),
	"cuit" varchar(13) NOT NULL,
	"condicion_iva_id" uuid NOT NULL,
	"domicilio_fiscal" varchar(200) NOT NULL,
	"provincia_id" uuid NOT NULL,
	"actividad_afip" varchar(10) NOT NULL,
	"moneda_base_id" uuid NOT NULL,
	"cierre_ejercicio" varchar(5) NOT NULL,
	"estado" "estado_empresa" DEFAULT 'ACTIVO' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa_modulo" (
	"empresa_id" uuid NOT NULL,
	"modulo" "modulo_activable" NOT NULL,
	"activado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresa_modulo_empresa_id_modulo_pk" PRIMARY KEY("empresa_id","modulo")
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"razon_social" varchar(150) NOT NULL,
	"cuit" varchar(13) NOT NULL,
	"email_contacto" varchar(150) NOT NULL,
	"plan" "plan_tenant" DEFAULT 'TRIAL' NOT NULL,
	"estado" "estado_tenant" DEFAULT 'ACTIVO' NOT NULL,
	"fecha_alta" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_baja" timestamp with time zone,
	CONSTRAINT "tenant_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"apellido" varchar(100) NOT NULL,
	"rol_global" "rol_global" DEFAULT 'ASISTENTE' NOT NULL,
	"estado" "estado_usuario" DEFAULT 'INVITADO_PENDIENTE' NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "usuario_empresa" (
	"usuario_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"rol" "rol_empresa" NOT NULL,
	CONSTRAINT "usuario_empresa_usuario_id_empresa_id_pk" PRIMARY KEY("usuario_id","empresa_id")
);
--> statement-breakpoint
ALTER TABLE "compra_comprobante" ADD CONSTRAINT "compra_comprobante_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_comprobante" ADD CONSTRAINT "compra_comprobante_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_comprobante" ADD CONSTRAINT "compra_comprobante_proveedor_id_proveedor_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_comprobante" ADD CONSTRAINT "compra_comprobante_tipo_comprobante_id_tipo_comprobante_id_fk" FOREIGN KEY ("tipo_comprobante_id") REFERENCES "public"."tipo_comprobante"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_comprobante" ADD CONSTRAINT "compra_comprobante_punto_venta_id_punto_venta_id_fk" FOREIGN KEY ("punto_venta_id") REFERENCES "public"."punto_venta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_comprobante_impuesto" ADD CONSTRAINT "compra_comprobante_impuesto_comprobante_id_compra_comprobante_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."compra_comprobante"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_comprobante_item" ADD CONSTRAINT "compra_comprobante_item_comprobante_id_compra_comprobante_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."compra_comprobante"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_pago" ADD CONSTRAINT "compra_pago_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_pago" ADD CONSTRAINT "compra_pago_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_pago" ADD CONSTRAINT "compra_pago_proveedor_id_proveedor_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_pago_comprobante" ADD CONSTRAINT "compra_pago_comprobante_pago_id_compra_pago_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."compra_pago"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_pago_comprobante" ADD CONSTRAINT "compra_pago_comprobante_comprobante_id_compra_comprobante_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."compra_comprobante"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_pago_medio" ADD CONSTRAINT "compra_pago_medio_pago_id_compra_pago_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."compra_pago"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_retencion" ADD CONSTRAINT "compra_retencion_pago_id_compra_pago_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."compra_pago"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_condicion_iva_id_condicion_iva_id_fk" FOREIGN KEY ("condicion_iva_id") REFERENCES "public"."condicion_iva"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobante_secuencia" ADD CONSTRAINT "comprobante_secuencia_punto_venta_id_punto_venta_id_fk" FOREIGN KEY ("punto_venta_id") REFERENCES "public"."punto_venta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobante_secuencia" ADD CONSTRAINT "comprobante_secuencia_tipo_comprobante_id_tipo_comprobante_id_fk" FOREIGN KEY ("tipo_comprobante_id") REFERENCES "public"."tipo_comprobante"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punto_venta" ADD CONSTRAINT "punto_venta_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punto_venta" ADD CONSTRAINT "punto_venta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asiento" ADD CONSTRAINT "asiento_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asiento" ADD CONSTRAINT "asiento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asiento" ADD CONSTRAINT "asiento_ejercicio_id_ejercicio_id_fk" FOREIGN KEY ("ejercicio_id") REFERENCES "public"."ejercicio"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asiento_contador" ADD CONSTRAINT "asiento_contador_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asiento_movimiento" ADD CONSTRAINT "asiento_movimiento_asiento_id_asiento_id_fk" FOREIGN KEY ("asiento_id") REFERENCES "public"."asiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asiento_movimiento" ADD CONSTRAINT "asiento_movimiento_cuenta_id_plan_cuenta_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."plan_cuenta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelo_asiento" ADD CONSTRAINT "modelo_asiento_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelo_asiento" ADD CONSTRAINT "modelo_asiento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelo_asiento_movimiento" ADD CONSTRAINT "modelo_asiento_movimiento_modelo_asiento_id_modelo_asiento_id_fk" FOREIGN KEY ("modelo_asiento_id") REFERENCES "public"."modelo_asiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelo_asiento_movimiento" ADD CONSTRAINT "modelo_asiento_movimiento_cuenta_id_plan_cuenta_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."plan_cuenta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelo_asiento_plantilla_movimiento" ADD CONSTRAINT "modelo_asiento_plantilla_movimiento_plantilla_id_modelo_asiento_plantilla_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "public"."modelo_asiento_plantilla"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_cuenta" ADD CONSTRAINT "plan_cuenta_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_cuenta" ADD CONSTRAINT "plan_cuenta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_condicion_iva_id_condicion_iva_id_fk" FOREIGN KEY ("condicion_iva_id") REFERENCES "public"."condicion_iva"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_provincia_id_provincia_id_fk" FOREIGN KEY ("provincia_id") REFERENCES "public"."provincia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_moneda_base_id_moneda_id_fk" FOREIGN KEY ("moneda_base_id") REFERENCES "public"."moneda"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_modulo" ADD CONSTRAINT "empresa_modulo_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compra_comprobante_empresa_id_idx" ON "compra_comprobante" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "compra_comprobante_proveedor_id_idx" ON "compra_comprobante" USING btree ("proveedor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "compra_comprobante_empresa_tipo_pv_numero_uk" ON "compra_comprobante" USING btree ("empresa_id","tipo_comprobante_id","punto_venta_id","numero");--> statement-breakpoint
CREATE INDEX "compra_comprobante_impuesto_comprobante_id_idx" ON "compra_comprobante_impuesto" USING btree ("comprobante_id");--> statement-breakpoint
CREATE INDEX "compra_comprobante_item_comprobante_id_idx" ON "compra_comprobante_item" USING btree ("comprobante_id");--> statement-breakpoint
CREATE INDEX "compra_pago_empresa_id_idx" ON "compra_pago" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "compra_pago_comprobante_pago_id_idx" ON "compra_pago_comprobante" USING btree ("pago_id");--> statement-breakpoint
CREATE INDEX "compra_pago_medio_pago_id_idx" ON "compra_pago_medio" USING btree ("pago_id");--> statement-breakpoint
CREATE INDEX "compra_retencion_pago_id_idx" ON "compra_retencion" USING btree ("pago_id");--> statement-breakpoint
CREATE INDEX "proveedor_empresa_id_idx" ON "proveedor" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proveedor_empresa_cuit_uk" ON "proveedor" USING btree ("empresa_id","cuit");--> statement-breakpoint
CREATE INDEX "punto_venta_empresa_id_idx" ON "punto_venta" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "punto_venta_empresa_numero_uk" ON "punto_venta" USING btree ("empresa_id","numero");--> statement-breakpoint
CREATE INDEX "asiento_empresa_id_idx" ON "asiento" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asiento_empresa_numero_uk" ON "asiento" USING btree ("empresa_id","numero");--> statement-breakpoint
CREATE INDEX "asiento_movimiento_asiento_id_idx" ON "asiento_movimiento" USING btree ("asiento_id");--> statement-breakpoint
CREATE INDEX "ejercicio_empresa_id_idx" ON "ejercicio" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ejercicio_empresa_desde_uk" ON "ejercicio" USING btree ("empresa_id","fecha_desde");--> statement-breakpoint
CREATE UNIQUE INDEX "modelo_asiento_empresa_evento_uk" ON "modelo_asiento" USING btree ("empresa_id","evento");--> statement-breakpoint
CREATE INDEX "plan_cuenta_empresa_id_idx" ON "plan_cuenta" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_cuenta_empresa_codigo_uk" ON "plan_cuenta" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE INDEX "empresa_tenant_id_idx" ON "empresa" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "empresa_cuit_activo_uk" ON "empresa" USING btree ("cuit") WHERE "empresa"."estado" = 'ACTIVO';--> statement-breakpoint
CREATE INDEX "usuario_tenant_id_idx" ON "usuario" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "usuario_empresa_empresa_id_idx" ON "usuario_empresa" USING btree ("empresa_id");