import React from 'react';

export type KrakenIconName = 'regular' | 'deep' | 'endOfTenancy' | 'windows' | 'construction' | 'moving' | 'appointment' | 'mail';

const iconFiles: Record<KrakenIconName, string> = {
  regular: 'regular',
  deep: 'deep',
  endOfTenancy: 'end-of-tenancy',
  windows: 'windows',
  construction: 'construction',
  moving: 'moving',
  appointment: 'appointment',
  mail: 'mail',
};

/** Original Kraken pictograms with a softly dimensional finish. Adjacent text names the service. */
export default function KrakenServiceIcon({ name, className, size = 48 }: {
  name: KrakenIconName;
  className?: string;
  size?: number;
}) {
  return <img
    src={`/calculator-approved/assets/kraken-emoji-${iconFiles[name]}.svg`}
    className={['kr-service-emoji', className].filter(Boolean).join(' ')}
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    decoding="async"
    draggable={false}
  />;
}
