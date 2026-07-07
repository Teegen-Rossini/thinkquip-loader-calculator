export const CONFIDENCE_META = {
  confirmed: {
    label: 'Confirmed',
    description: 'From manufacturer factory documentation or another published, verifiable source.',
  },
  estimate: {
    label: 'Estimate',
    description: 'A placeholder figure pending a real dealer quote. Usable for a working pitch, but confirm before finalizing a deal.',
  },
  unconfirmed: {
    label: 'Pending quote',
    description: 'No usable figure yet. Treated as R0 in the calculation until a dealer quote comes in.',
  },
};
