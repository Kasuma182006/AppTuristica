import type { Metadata } from "next";
import { LegalPageHeader, LegalSection } from "@/components/legal-page";
import { pageMetadata } from "@/lib/page-metadata";
import { DISCLAIMER_PATH } from "@/lib/routes";

export const metadata: Metadata = pageMetadata({
  title: "Aviso de responsabilidad",
  description:
    "Los límites de la información del buscador turístico del Valle del Cauca: errores, seguridad, orden público y áreas restringidas.",
  path: DISCLAIMER_PATH,
});

/** Change it whenever the text below changes. */
const LAST_UPDATED = { iso: "2026-11-02", text: "2 de noviembre de 2026" };

/** The disclaimer (HU-89, RF-25). It never calls a site safe: see "Orden público" in CLAUDE.md. */
export default function DisclaimerPage() {
  return (
    <article className="max-w-prose space-y-6">
      <LegalPageHeader title="Aviso de responsabilidad" updated={LAST_UPDATED} />

      <p>
        Este buscador ayuda a descubrir lugares, pero no reemplaza tu propio criterio. Lee esto
        antes de planear una visita.
      </p>

      <LegalSection id="errores" title="La información puede tener errores">
        <p>
          Los datos vienen de fuentes abiertas y de la comunidad, y se procesan de forma automática:
          nadie revisa cada sitio. Pueden estar incompletos o desactualizados, y un lugar puede
          estar mal ubicado o ya no existir.
        </p>
        <p>
          Los sitios propuestos por la comunidad se publican sin verificar. La confianza que muestra
          cada ficha mide qué tan completa está la información, no su exactitud, su calidad ni su
          seguridad. Si encuentras un error, repórtalo desde la ficha del sitio.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" title="Seguridad en la visita">
        <p>
          Visitar un lugar natural tiene riesgos: crecientes súbitas en ríos y cascadas, terreno
          resbaloso o inestable, derrumbes, cambios de clima, animales, poca señal y centros de
          salud lejanos. Que un lugar aparezca aquí no significa que sea seguro ni apto para ti, y
          la dificultad indicada, cuando la hay, es solo una referencia.
        </p>
        <p>
          Averigua las condiciones antes de salir, no vayas sin preparación y avisa a alguien a
          dónde vas. En una emergencia, llama al 123.
        </p>
      </LegalSection>

      <LegalSection id="orden-publico" title="Orden público">
        <p>
          Las condiciones de seguridad cambian y varían de una zona a otra. No las evaluamos ni
          calificamos ningún sitio como seguro. Antes de ir, consulta con la alcaldía o la Policía
          del municipio, o con una agencia de turismo registrada en el RNT.
        </p>
      </LegalSection>

      <LegalSection id="areas-restringidas" title="Áreas protegidas y propiedad privada">
        <p>
          Aparecer en este buscador no da permiso para entrar a un lugar. Algunos sitios están en
          áreas protegidas, que pueden pedir permiso o tener reglas de visita, o en propiedad
          privada, donde debes pedir autorización al propietario.
        </p>
        <p>
          Esas etiquetas se generan de forma automática y pueden faltar o estar equivocadas: un
          sitio sin etiqueta no es necesariamente de acceso libre. Confirma siempre las condiciones
          de acceso y respeta las restricciones que encuentres.
        </p>
      </LegalSection>

      <LegalSection id="no-oficial" title="No es un sitio oficial">
        <p>
          Este es un proyecto personal. No pertenece al Gobierno, a la Gobernación, a ninguna
          alcaldía ni a una autoridad ambiental, y no habla en su nombre.
        </p>
      </LegalSection>

      <LegalSection id="agencias" title="Agencias de turismo">
        <p>
          Las agencias que mostramos vienen del Registro Nacional de Turismo (RNT). Mostrarlas no es
          una recomendación ni una garantía de su servicio, y no tenemos relación con ellas.
          Confirma sus datos antes de contratar.
        </p>
      </LegalSection>

      <LegalSection id="limite" title="Límite de responsabilidad">
        <p>
          La información se ofrece tal como está, sin garantías. Decidir si visitas un lugar y cómo
          lo haces es tu responsabilidad, y en la medida en que la ley lo permita no respondemos por
          daños derivados de usar este sitio.
        </p>
      </LegalSection>
    </article>
  );
}
