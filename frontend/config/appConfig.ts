export interface FrontendAppConfig {
  apiBaseUrl: string;
  mlApiBaseUrl: string;
  forecastQueueMonitorRefreshMs: number;
  forecastQueueFailedJobsLimit: number;
}

const appConfig: FrontendAppConfig = {
  apiBaseUrl: '/api',
  mlApiBaseUrl: '/api/ml',
  forecastQueueMonitorRefreshMs: 30000,
  forecastQueueFailedJobsLimit: 20,
};

export { appConfig };
