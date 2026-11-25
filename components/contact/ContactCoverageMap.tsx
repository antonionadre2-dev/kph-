import React from 'react';
import { publicHref } from '../../src/routing/site-paths';
import { COVERAGE_MAP, COVERAGE_MOBILE_VIEW, COVERAGE_REGIONS, projectCoverageCoordinate } from './coverage-geography';
import './contact-coverage-map.css';

export type ContactCoverageMapLabels = {
  eyebrow: string;
  title: string;
  subtitle: string;
  note: string;
  regionsLabel: string;
  accessibleLabel: string;
};

export type ContactCoverageMapProps = {
  language: string;
  labels: ContactCoverageMapLabels;
};

/** A local geographic illustration, with native links to service regions.
 * It has no map engine, runtime cartographic requests, tracking or route planner.
 */
export function ContactCoverageMap({ language, labels }: ContactCoverageMapProps) {
  const headingId = React.useId();
  return (
    <section className="kr-contact-coverage" aria-labelledby={headingId}>
      <header className="kr-contact-coverage-heading">
        <p className="kr-contact-coverage-eyebrow">{labels.eyebrow}</p>
        <h2 id={headingId}>{labels.title}</h2>
        <p className="kr-contact-coverage-subtitle">{labels.subtitle}</p>
      </header>
      <figure className="kr-contact-coverage-figure">
        <div className="kr-contact-coverage-map" style={{ '--coverage-map-aspect': `${COVERAGE_MAP.width} / ${COVERAGE_MAP.height}`, '--coverage-mobile-aspect': `${COVERAGE_MOBILE_VIEW.width} / ${COVERAGE_MOBILE_VIEW.height}` } as React.CSSProperties}>
          <picture>
            <source media="(max-width:600px)" srcSet="/kraken-contact/assets/coverage-region-mobile.svg" width={COVERAGE_MOBILE_VIEW.width} height={COVERAGE_MOBILE_VIEW.height} />
            <img
              src="/kraken-contact/assets/coverage-region.svg"
              alt={labels.accessibleLabel}
              width={COVERAGE_MAP.width}
              height={COVERAGE_MAP.height}
              loading="lazy"
              decoding="async"
            />
          </picture>
          {COVERAGE_REGIONS.map(region => {
            const point = projectCoverageCoordinate(region.coordinates);
            return (
              <a
                key={region.id}
                className={`kr-contact-coverage-marker kr-contact-coverage-marker-${region.id}`}
                href={publicHref(region.path, language)}
                style={{ '--coverage-marker-x': `${point.x / COVERAGE_MAP.width * 100}%`, '--coverage-marker-mobile-x': `${(point.x - COVERAGE_MOBILE_VIEW.x) / COVERAGE_MOBILE_VIEW.width * 100}%`, top: `${point.y / COVERAGE_MAP.height * 100}%` } as React.CSSProperties}
                data-coverage-region={region.id}
              >
                <span className="kr-contact-coverage-pin" aria-hidden="true"><span /></span>
                <span className="kr-contact-coverage-label">{region.name}</span>
              </a>
            );
          })}
        </div>
        <figcaption className="kr-contact-coverage-attribution">
          <a href="https://www.geo.admin.ch/en/vector-tiles-service-available-services-and-data" target="_blank" rel="noopener noreferrer">© swisstopo, © FDFA, © FOEN, © FOCP, © SAC, © Naturefriends Switzerland, © opentransportdata.swiss</a>
        </figcaption>
      </figure>
      <p className="kr-contact-coverage-note">{labels.note}</p>
      <nav className="kr-contact-coverage-regions" aria-label={labels.regionsLabel}>
        {COVERAGE_REGIONS.map(region => <a key={region.id} href={publicHref(region.path, language)}>{region.name}</a>)}
      </nav>
    </section>
  );
}

export default ContactCoverageMap;
