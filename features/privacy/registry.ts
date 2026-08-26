export const privacyOperationRegistry = {
  access: { irreversible: false, bounded: true },
  export: { irreversible: false, bounded: true },
  correction: { irreversible: false, bounded: true },
  deletion: { irreversible: true, bounded: true },
} as const;
