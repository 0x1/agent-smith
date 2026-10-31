// The provider API surfaces Agent Smith knows about. For the demo this is the
// mock supplier. `match` finds the endpoint in a URL expression in app code.
export interface EndpointSpec {
  endpoint: string;
  match: RegExp;
}

export interface ProviderSpec {
  provider: string;
  baseUrlEnv: string;
  endpoints: EndpointSpec[];
}

export const PROVIDERS: ProviderSpec[] = [
  {
    provider: "supplier",
    baseUrlEnv: "SUPPLIER_URL",
    endpoints: [
      { endpoint: "GET /v1/inventory/{sku}", match: /\/v1\/inventory\// },
      { endpoint: "GET /v1/pricing/{sku}", match: /\/v1\/pricing\// },
    ],
  },
];
