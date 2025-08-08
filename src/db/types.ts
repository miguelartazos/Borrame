export type SQLiteValue = string | number | null | boolean;
export type SQLParams = SQLiteValue[];

export interface IntentInput {
  assetId: string;
  action: 'keep' | 'delete';
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
}
