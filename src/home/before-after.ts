export interface BeforeAfterCase {
  id: string;
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  width: number;
  height: number;
}

/** Add only verified, permission-cleared photographs of Kraken's actual work. */
export const beforeAfterCases: readonly BeforeAfterCase[] = [];
