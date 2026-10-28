CREATE TABLE "categoria_monotributo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(2) NOT NULL,
	"orden" integer NOT NULL,
	"tope_anual_facturacion" numeric(15, 2) NOT NULL,
	"solo_venta_bienes" boolean DEFAULT false NOT NULL,
	CONSTRAINT "categoria_monotributo_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "empresa" ADD COLUMN "categoria_monotributo_id" uuid;--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_categoria_monotributo_id_categoria_monotributo_id_fk" FOREIGN KEY ("categoria_monotributo_id") REFERENCES "public"."categoria_monotributo"("id") ON DELETE restrict ON UPDATE no action;